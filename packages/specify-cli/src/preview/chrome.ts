import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { chromium, type Browser } from 'playwright-core';

const MAC_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
];

const LINUX_CANDIDATES = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'];

const WINDOWS_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];

/** Locate a local Chrome/Chromium binary, or return null when unavailable. */
export function findChromeExecutable(): string | null {
  const fromEnv = process.env.SPECIFY_CHROME_PATH;
  if (fromEnv) return existsSync(fromEnv) ? fromEnv : null;

  const candidates = process.platform === 'darwin'
    ? MAC_CANDIDATES
    : process.platform === 'win32'
      ? WINDOWS_CANDIDATES
      : [];
  const installed = candidates.find((candidate) => existsSync(candidate));
  if (installed) return installed;

  if (process.platform !== 'win32') {
    for (const candidate of LINUX_CANDIDATES) {
      const result = spawnSync('which', [candidate], { encoding: 'utf8' });
      if (result.status === 0 && result.stdout.trim()) return result.stdout.trim();
    }
  }
  return null;
}

/** Launch the installed browser through Playwright; no browser download is required. */
export async function launchChrome(timeoutMs = 20000): Promise<Browser> {
  const executablePath = findChromeExecutable();
  if (!executablePath) {
    throw new Error(
      'Chrome/Chromium not found. Install Chrome or set SPECIFY_CHROME_PATH to its executable. ' +
        'Browser verification is unavailable without it.',
    );
  }
  return chromium.launch({
    executablePath,
    headless: true,
    timeout: timeoutMs,
    args: ['--hide-scrollbars'],
  });
}
