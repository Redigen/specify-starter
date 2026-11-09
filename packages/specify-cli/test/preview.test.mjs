import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('../dist/cli.js', import.meta.url));
const API = fileURLToPath(new URL('../dist/index.js', import.meta.url));
const { parseArgs, flagWidthList, flagAssertList, collectAnchors, findChromeExecutable, PreviewClient, launchChrome } =
  await import(API);

function runCli(args, env = {}) {
  return spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf8',
    timeout: 120000,
    env: { ...process.env, ...env },
  });
}

/** Async variant: the fixture HTTP server lives in this process and must stay responsive. */
function runCliAsync(args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [CLI, ...args], {
      env: { ...process.env, ...env },
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`CLI timed out: ${args.join(' ')}\n${stdout}\n${stderr}`));
    }, 30000);
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once('close', (status) => {
      clearTimeout(timer);
      resolve({ status, stdout, stderr });
    });
  });
}

test('parseArgs handles values, equals form and boolean flags', () => {
  const parsed = parseArgs([
    '--path', '/landing',
    '--widths=390,1440',
    '--full-page',
    '--out', '/tmp/shot.png',
    'positional',
  ]);
  assert.equal(parsed.flags.path, '/landing');
  assert.equal(parsed.flags.widths, '390,1440');
  assert.equal(parsed.flags['full-page'], true);
  assert.equal(parsed.flags.out, '/tmp/shot.png');
  assert.deepEqual(parsed.positionals, ['positional']);
  assert.deepEqual(flagWidthList(parsed.flags, 'widths', [1440]), [390, 1440]);
  assert.deepEqual(flagWidthList(parsed.flags, 'width', [1440]), [390, 1440]);
});

test('flagAssertList parses selector:count pairs', () => {
  const { flags } = parseArgs(['--assert', '#faq button:5,section[id]:6']);
  assert.deepEqual(flagAssertList(flags), ['#faq button:5', 'section[id]:6']);
});

test('collectAnchors finds nested scroll-to targets and localized labels', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'specify-anchors-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const spec = join(dir, 'screen.yaml');
  writeFileSync(
    spec,
    [
      'screen:',
      '  path: /x',
      '  layers:',
      '    - frame:',
      '        on-click:',
      '          scroll-to:',
      '            frame-id: process',
      '        layers:',
      '          - text:',
      '              content: Process',
      '    - c.button-md:',
      '        props:',
      '          label:',
      '            ru: Оставить заявку',
      '            en: Request a call',
      '        on-click:',
      '          scroll-to:',
      '            frame-id: request',
      '    - frame:',
      '        on-click:',
      '          scroll-to:',
      '            frame-id: "{{ item.target }}"',
      '',
    ].join('\n'),
  );
  const anchors = collectAnchors(spec);
  assert.deepEqual(anchors.map((anchor) => anchor.id), ['process', 'request']);
  assert.deepEqual(anchors[0].labels, ['Process']);
  assert.deepEqual(anchors[1].labels.sort(), ['Request a call', 'Оставить заявку'].sort());
});

test('findChromeExecutable honours SPECIFY_CHROME_PATH', () => {
  const original = process.env.SPECIFY_CHROME_PATH;
  try {
    process.env.SPECIFY_CHROME_PATH = process.execPath;
    assert.equal(findChromeExecutable(), process.execPath);
    process.env.SPECIFY_CHROME_PATH = '/definitely/missing/chrome';
    assert.equal(findChromeExecutable(), null);
  } finally {
    if (original === undefined) delete process.env.SPECIFY_CHROME_PATH;
    else process.env.SPECIFY_CHROME_PATH = original;
  }
});

test('preview run rejects an invalid scenario before launching Chrome', () => {
  const dir = mkdtempSync(join(tmpdir(), 'specify-scenario-'));
  const file = join(dir, 'bad.yaml');
  writeFileSync(file, 'path: /x\nsteps: []\n');
  const result = runCli(['preview', 'run', file], { SPECIFY_ROOT: dir });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /non-empty "steps" list/);
  rmSync(dir, { recursive: true, force: true });
});

const CHROME_AVAILABLE = Boolean(findChromeExecutable());

const FIXTURE_INDEX = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>body{margin:0}section{height:1100px}#process{background:#e8f4ec}</style></head>
<body>
<h1>Fixture</h1>
<button onclick="document.getElementById('process').scrollIntoView({behavior:'instant'})">Process</button>
<button onclick="document.getElementById('benefits').scrollIntoView({behavior:'instant'})">Benefits</button>
<section id="process">Process section</section>
<section id="benefits">Benefits section</section>
</body></html>`;

const FIXTURE_OVERFLOW = `<!doctype html><html><body style="margin:0">
<div style="width:2400px;height:80px;background:#eee">Too wide</div>
</body></html>`;

const FIXTURE_CLIPPED = `<!doctype html><html><body style="margin:0">
<div style="width:100px;overflow:hidden"><div style="width:2400px;height:80px">Intentionally clipped</div></div>
</body></html>`;

const FIXTURE_ACTIONABILITY = `<!doctype html><html><body>
<button id="hidden" style="display:none" onclick="document.body.dataset.clicked='hidden'">Hidden</button>
<div style="position:relative;width:100px;height:40px">
  <button id="covered" style="width:100px;height:40px">Covered</button>
  <div style="position:absolute;inset:0;background:white"></div>
</div>
</body></html>`;

const FIXTURE_THEME = `<!doctype html><html><head><style>
:root{--card-bg:#fffffe;--card-fg:#22211e}
[data-theme="dark"]{--card-bg:#0f0f0e;--card-fg:#f3f2ee}
body{margin:0;background:var(--card-bg)}
#card{background:var(--card-bg);color:var(--card-fg);transition:background-color 150ms ease-out;padding:20px}
#spinner{width:20px;height:20px;animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
</style></head><body><div id="card">Theme card</div><div id="spinner"></div>
<button id="recolor" onclick="document.getElementById('card').style.backgroundColor='rgb(15, 15, 14)'">Recolor</button>
</body></html>`;

test(
  'preview settles finite theme and click transitions without waiting for infinite animations',
  { skip: CHROME_AVAILABLE ? false : 'Chrome/Chromium not found', timeout: 120000 },
  async (t) => {
    const root = mkdtempSync(join(tmpdir(), 'specify-preview-transition-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const server = createServer((request, response) => {
      response.setHeader('content-type', 'text/html; charset=utf-8');
      response.end(FIXTURE_THEME);
    });
    await new Promise((resolve) => server.listen(0, resolve));
    const baseUrl = `http://localhost:${server.address().port}`;
    t.after(() => {
      server.closeAllConnections();
      server.close();
    });

    const env = { SPECIFY_ROOT: root, SPECIFY_PREVIEW_URL: baseUrl };
    const shot = await runCliAsync(
      ['preview', 'shot', '--path', '/theme', '--theme', 'dark', '--out', join(root, 'dark.png')],
      env,
    );
    assert.equal(shot.status, 0, shot.stdout + shot.stderr);
    assert.ok(existsSync(join(root, 'dark.png')));

    const browser = await launchChrome();
    try {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
      const client = new PreviewClient(page);
      await client.navigate(`${baseUrl}/theme`, 0);
      await client.setTheme('dark');
      const themed = await client.evaluate(`(() => ({
        background: getComputedStyle(document.getElementById('card')).backgroundColor,
        finiteAnimations: document.getAnimations().filter((animation) =>
          animation.effect?.getComputedTiming().iterations !== Infinity).length,
        infiniteAnimations: document.getAnimations().filter((animation) =>
          animation.effect?.getComputedTiming().iterations === Infinity).length,
      }))()`);
      assert.deepEqual(themed, {
        background: 'rgb(15, 15, 14)',
        finiteAnimations: 0,
        infiniteAnimations: 1,
      });

      await client.click('#recolor');
      await client.screenshot({ out: join(root, 'after-click.png') });
      assert.equal(
        await client.evaluate("getComputedStyle(document.getElementById('card')).backgroundColor"),
        'rgb(15, 15, 14)',
      );
    } finally {
      await browser.close();
    }
  },
);

test(
  'preview shot/check/run against a static fixture',
  { skip: CHROME_AVAILABLE ? false : 'Chrome/Chromium not found', timeout: 120000 },
  async (t) => {
    const root = mkdtempSync(join(tmpdir(), 'specify-preview-it-'));
    const specFile = join(root, 'screen.yaml');
    writeFileSync(
      specFile,
      [
        'fixture:',
        '  path: /index',
        '  layers:',
        '    - frame:',
        '        on-click:',
        '          scroll-to:',
        '            frame-id: process',
        '        layers:',
        '          - text:',
        '              content: Process',
        '    - frame:',
        '        on-click:',
        '          scroll-to:',
        '            frame-id: benefits',
        '        layers:',
        '          - text:',
        '              content:',
        '                en: Benefits',
        '                ru: Преимущества',
        '',
      ].join('\n'),
    );
    const stepsFile = join(root, 'steps.yaml');
    writeFileSync(
      stepsFile,
      [
        'path: /index',
        'viewport:',
        '  width: 1440',
        '  height: 1000',
        'steps:',
        '  - assert-text: Fixture',
        '  - click: button',
        '  - wait-for: "#process"',
        '  - assert:',
        '      selector: "#process"',
        '      count: 1',
        '  - screenshot: ' + join(root, 'after.png'),
        '',
      ].join('\n'),
    );

    const server = createServer((request, response) => {
      response.setHeader('content-type', 'text/html; charset=utf-8');
      const fixtures = {
        '/overflow.html': FIXTURE_OVERFLOW,
        '/clipped.html': FIXTURE_CLIPPED,
        '/actionability.html': FIXTURE_ACTIONABILITY,
      };
      response.end(fixtures[request.url] ?? FIXTURE_INDEX);
    });
    await new Promise((resolve) => server.listen(0, resolve));
    const baseUrl = `http://localhost:${server.address().port}`;
    t.after(() => {
      server.close();
      rmSync(root, { recursive: true, force: true });
    });
    const env = { SPECIFY_ROOT: root, SPECIFY_PREVIEW_URL: baseUrl };

    const out = join(root, 'shot.png');
    const shot = await runCliAsync(['preview', 'shot', '--path', '/index.html', '--widths', '1440', '--out', out], env);
    assert.equal(shot.status, 0, shot.stderr);
    assert.ok(existsSync(out));
    assert.equal(readFileSync(out).subarray(0, 4).toString('hex'), '89504e47');

    const clean = await runCliAsync(
      ['preview', 'check', '--path', '/index.html', '--widths', '1440', '--overflow', '--anchors', '--spec', specFile],
      env,
    );
    assert.equal(clean.status, 0, clean.stdout + clean.stderr);
    assert.match(clean.stdout, /PASS 1440px anchors/);

    const overflow = await runCliAsync(
      ['preview', 'check', '--path', '/overflow.html', '--widths', '390', '--overflow'],
      env,
    );
    assert.equal(overflow.status, 1);
    assert.match(overflow.stdout, /FAIL 390px no-overflow/);

    const clipped = await runCliAsync(
      ['preview', 'check', '--path', '/clipped.html', '--widths', '390', '--overflow'],
      env,
    );
    assert.equal(clipped.status, 0, clipped.stdout + clipped.stderr);

    for (const selector of ['#hidden', '#covered']) {
      const scenario = join(root, `${selector.slice(1)}.yaml`);
      writeFileSync(scenario, `path: /actionability\nsteps:\n  - click: '${selector}'\n`);
      const rejected = await runCliAsync(['preview', 'run', scenario], env);
      assert.equal(rejected.status, 1, rejected.stdout + rejected.stderr);
      assert.match(rejected.stdout, /FAIL step 1/);
    }

    const steps = await runCliAsync(['preview', 'run', stepsFile], env);
    assert.equal(steps.status, 0, steps.stdout + steps.stderr);
    assert.match(steps.stdout, /OK: 5 step\(s\) passed/);
    assert.ok(existsSync(join(root, 'after.png')));
  },
);

