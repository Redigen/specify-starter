import { spawn, type ChildProcess } from 'node:child_process';
import { PROJECT_ROOT } from '../schema-registry.js';

export interface PreviewServer {
  baseUrl: string;
  /** Stop a server started by this command. Existing servers are never stopped. */
  stop: () => void;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function isReachable(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
    return response.status < 500;
  } catch {
    return false;
  }
}

async function waitForServer(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isReachable(url)) return;
    await sleep(300);
  }
  throw new Error(`Preview server did not respond at ${url} within ${timeoutMs}ms`);
}

/** Reuse a running dev server, or start the SPA dev server when none responds. */
export async function ensurePreviewServer(timeoutMs = 60000): Promise<PreviewServer> {
  const explicit = process.env.SPECIFY_PREVIEW_URL;
  if (explicit) {
    const baseUrl = explicit.replace(/\/$/, '');
    await waitForServer(`${baseUrl}/`, 10000);
    return { baseUrl, stop: () => {} };
  }

  for (const port of [5173, 5199, 4173]) {
    const baseUrl = `http://localhost:${port}`;
    if (await isReachable(`${baseUrl}/`)) {
      return { baseUrl, stop: () => {} };
    }
  }

  const port = Number(process.env.SPECIFY_PREVIEW_PORT ?? 5199);
  const baseUrl = `http://localhost:${port}`;
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  let output = '';
  const child: ChildProcess = spawn(
    npmCommand,
    ['run', 'dev', '-w', 'specify-svelte-spa', '--', '--port', String(port), '--strictPort'],
    {
      cwd: PROJECT_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
    },
  );
  child.stdout?.on('data', (chunk) => {
    output = `${output}${chunk}`.slice(-4000);
  });
  child.stderr?.on('data', (chunk) => {
    output = `${output}${chunk}`.slice(-4000);
  });

  const stop = () => {
    try {
      if (process.platform === 'win32') {
        child.kill();
      } else if (child.pid) {
        // Kill the whole npm/vite process group, not only the npm wrapper.
        process.kill(-child.pid, 'SIGTERM');
      }
    } catch {
      // Best effort shutdown only.
    }
  };

  try {
    await waitForServer(`${baseUrl}/`, timeoutMs);
  } catch (error) {
    stop();
    const details = output.trim();
    throw new Error(
      `${(error as Error).message}${details ? `\nDev server output:\n${details}` : ''}`,
    );
  }

  return { baseUrl, stop };
}

export function joinRoute(baseUrl: string, route: string): string {
  const normalized = route.startsWith('/') ? route : `/${route}`;
  return `${baseUrl}${normalized}`;
}
