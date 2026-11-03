import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import YAML from 'js-yaml';
import { flagNumber, flagString, parseArgs } from './args.js';
import type { PreviewClient } from './client.js';
import { resolveSpecPath } from '../schema-registry.js';
import { openAt, withPreview } from './session.js';

interface Scenario {
  path: string;
  viewport?: { width: number; height?: number };
  theme?: string;
  steps: Array<Record<string, unknown>>;
}

function loadScenario(file: string): Scenario {
  const scenario = YAML.load(readFileSync(resolveSpecPath(file), 'utf8')) as Scenario;
  if (!scenario || typeof scenario !== 'object') {
    throw new Error(`Scenario is not a mapping: ${file}`);
  }
  if (!scenario.path) throw new Error('Scenario requires a "path" field');
  if (!Array.isArray(scenario.steps) || scenario.steps.length === 0) {
    throw new Error('Scenario requires a non-empty "steps" list');
  }
  return scenario;
}

async function runStep(client: PreviewClient, baseUrl: string, step: Record<string, unknown>): Promise<string> {
  if (typeof step.click === 'string') {
    await client.click(step.click);
    return `click ${step.click}`;
  }
  if (step.click && typeof step.click === 'object') {
    const { selector, index = 0 } = step.click as { selector: string; index?: number };
    await client.click(selector, index);
    return `click ${selector}[${index}]`;
  }
  if (step.fill && typeof step.fill === 'object') {
    const { selector, value, index = 0 } = step.fill as {
      selector: string;
      value: string;
      index?: number;
    };
    await client.fill(selector, String(value ?? ''), index);
    return `fill ${selector}`;
  }
  if (step['wait-for'] !== undefined) {
    const target = typeof step['wait-for'] === 'string'
      ? step['wait-for']
      : String((step['wait-for'] as Record<string, unknown>).selector ?? '');
    const timeout = typeof step['wait-for'] === 'object'
      ? Number((step['wait-for'] as Record<string, unknown>).timeout ?? 10000)
      : 10000;
    if (!target) throw new Error('wait-for requires a selector');
    await client.waitForSelector(target, timeout);
    return `wait-for ${target}`;
  }
  if (step.wait !== undefined) {
    const ms = Number(step.wait);
    if (!Number.isFinite(ms) || ms < 0) throw new Error(`Invalid wait value: ${step.wait}`);
    await new Promise((resolve) => setTimeout(resolve, ms));
    return `wait ${ms}ms`;
  }
  if (step.theme) {
    await client.setTheme(String(step.theme));
    return `theme ${step.theme}`;
  }
  if (step.viewport && typeof step.viewport === 'object') {
    await client.setViewport(step.viewport as { width: number });
    return 'viewport';
  }
  if (step.goto) {
    await client.navigate(`${baseUrl}${String(step.goto)}`, 500);
    return `goto ${step.goto}`;
  }
  if (step['assert-text']) {
    const text = String(step['assert-text']);
    const found = await client.evaluate(
      `document.body.innerText.includes(${JSON.stringify(text)})`,
    );
    if (!found) throw new Error(`Text not found on page: "${text}"`);
    return `assert-text "${text}"`;
  }
  if (step.assert) {
    const selector = typeof step.assert === 'string'
      ? step.assert
      : String((step.assert as Record<string, unknown>).selector);
    const expected = typeof step.assert === 'object'
      ? Number((step.assert as Record<string, unknown>).count ?? 1)
      : 1;
    const count = await client.evaluate(
      `document.querySelectorAll(${JSON.stringify(selector)}).length`,
    );
    if (typeof step.assert === 'string' ? count === 0 : count !== expected) {
      throw new Error(`Assertion failed: ${selector} count=${count}, expected=${expected}`);
    }
    return `assert ${selector}`;
  }
  if (step.screenshot) {
    const out = resolve(String(step.screenshot));
    mkdirSync(dirname(out), { recursive: true });
    await client.screenshot({ out, fullPage: true });
    return `screenshot ${out}`;
  }
  throw new Error(`Unknown scenario step: ${JSON.stringify(step)}`);
}

/** `specify-cli preview run <scenario.yaml>` — declarative interaction checks. */
export async function runPreviewSteps(argv: string[]): Promise<void> {
  const { positionals, flags } = parseArgs(argv);
  const file = positionals[0] ?? flagString(flags, 'scenario');
  if (!file) throw new Error('Usage: specify-cli preview run <scenario.yaml>');
  const waitMs = flagNumber(flags, 'wait', 1500);
  const scenario = loadScenario(file);

  await withPreview(scenario.path, async (client, baseUrl) => {
    await openAt(client, baseUrl, scenario.path, {
      viewport: scenario.viewport ?? { width: 1440, height: 1000 },
      theme: scenario.theme,
      waitMs,
    });
    for (const [index, step] of scenario.steps.entries()) {
      try {
        const label = await runStep(client, baseUrl, step);
        process.stdout.write(`[specify-cli] PASS step ${index + 1}: ${label}\n`);
      } catch (error) {
        process.stdout.write(
          `[specify-cli] FAIL step ${index + 1}: ${(error as Error).message}\n`,
        );
        process.exitCode = 1;
        return;
      }
    }
    if (!process.exitCode) {
      process.stdout.write(`[specify-cli] OK: ${scenario.steps.length} step(s) passed\n`);
    }
  });
}
