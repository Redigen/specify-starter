import { parseSpec } from '../read.js';
import type { PreviewClient } from './client.js';

export interface AnchorDefinition {
  id: string;
  labels: string[];
}

export interface AnchorReport {
  targets: string[];
  missingTargets: string[];
  reached: string[];
  unreached: string[];
  withoutTrigger: Array<{ id: string; labels: string[] }>;
}

function collectLabels(node: unknown, labels: Set<string>): void {
  if (Array.isArray(node)) {
    node.forEach((item) => collectLabels(item, labels));
    return;
  }
  if (!node || typeof node !== 'object') return;
  for (const [key, value] of Object.entries(node)) {
    if (key === 'content' || key === 'label') {
      if (typeof value === 'string' && !value.includes('{{')) labels.add(value);
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        for (const localized of Object.values(value)) {
          if (typeof localized === 'string' && !localized.includes('{{')) labels.add(localized);
        }
      }
    }
    collectLabels(value, labels);
  }
}

/** Collect `scroll-to.frame-id` targets and the text of the layers that trigger them. */
export function collectAnchors(specFile: string): AnchorDefinition[] {
  const spec = parseSpec(specFile);
  const anchors = new Map<string, Set<string>>();

  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (!node || typeof node !== 'object') return;
    const record = node as Record<string, unknown>;
    const onClick = record['on-click'];
    const scrollTo =
      (onClick && typeof onClick === 'object'
        ? (onClick as Record<string, unknown>)['scroll-to']
        : undefined) ?? record['scroll-to'];
    if (scrollTo && typeof scrollTo === 'object') {
      const target = (scrollTo as Record<string, unknown>)['frame-id'];
      if (typeof target === 'string' && !target.includes('{{')) {
        const labels = anchors.get(target) ?? new Set<string>();
        collectLabels(record, labels);
        anchors.set(target, labels);
      }
    }
    Object.values(record).forEach(walk);
  };

  walk(spec);
  return [...anchors.entries()]
    .map(([id, labels]) => ({ id, labels: [...labels] }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** Verify anchor targets exist and their labelled triggers scroll to them. */
export async function checkAnchors(
  client: PreviewClient,
  anchors: AnchorDefinition[],
): Promise<AnchorReport> {
  const report: AnchorReport = {
    targets: anchors.map((anchor) => anchor.id),
    missingTargets: [],
    reached: [],
    unreached: [],
    withoutTrigger: [],
  };
  if (anchors.length === 0) return report;

  report.missingTargets = await client.evaluate(`(() => {
    const ids = ${JSON.stringify(anchors.map((anchor) => anchor.id))};
    return ids.filter((id) => !document.getElementById(id));
  })()`);

  for (const anchor of anchors) {
    if (report.missingTargets.includes(anchor.id)) continue;
    await client.evaluate(`(() => { window.scrollTo(0, 0); return true; })()`);
    const selector = await client.evaluate<string | null>(`(() => {
      const labels = ${JSON.stringify(anchor.labels)};
      const candidates = [...document.querySelectorAll('button, a, [role="button"], [onclick]')];
      const trigger = candidates.find((element) =>
        labels.some((label) => element.textContent?.trim() === label),
      );
      if (!trigger) return null;
      if (trigger.id) return '#' + CSS.escape(trigger.id);
      trigger.setAttribute('data-specify-preview-anchor', ${JSON.stringify(anchor.id)});
      return '[data-specify-preview-anchor=' + JSON.stringify(${JSON.stringify(anchor.id)}) + ']';
    })()`);
    if (!selector) {
      report.withoutTrigger.push({ id: anchor.id, labels: anchor.labels });
      continue;
    }
    await client.click(selector);
    await client.evaluate(`(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      let frames = 0;
      await new Promise((resolve) => {
        const settle = () => ++frames >= 30 ? resolve(true) : requestAnimationFrame(settle);
        requestAnimationFrame(settle);
      });
      return true;
    })()`);
    const top = await client.evaluate<number | null>(
      `document.getElementById(${JSON.stringify(anchor.id)})?.getBoundingClientRect().top ?? null`,
    );
    if (top !== null && Math.abs(top) < 200) report.reached.push(anchor.id);
    else report.unreached.push(anchor.id);
  }

  return report;
}
