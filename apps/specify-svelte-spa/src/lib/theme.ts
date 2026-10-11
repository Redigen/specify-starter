import { writable, derived, get } from 'svelte/store';
import { appConfig } from '../generated/appConfig';

const STORAGE_KEY = 'app-theme-mode';
type ThemeMode = 'light' | 'dark' | 'system';

const themesDiffer = appConfig.themes.light !== appConfig.themes.dark;

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getCurrentTheme(mode: ThemeMode): string {
  if (mode === 'system') {
    return getSystemTheme() === 'dark' ? appConfig.themes.dark : appConfig.themes.light;
  }
  return mode === 'dark' ? appConfig.themes.dark : appConfig.themes.light;
}

function applyTheme(themeName: string) {
  document.documentElement.setAttribute('data-theme', themeName);
}

const savedMode = (localStorage.getItem(STORAGE_KEY) as ThemeMode) || 'system';
export const mode = writable<ThemeMode>(savedMode);

export const theme = derived(mode, ($mode) => getCurrentTheme($mode));

export const canToggle = themesDiffer;

theme.subscribe((themeName) => {
  applyTheme(themeName);
});

let mediaQuery: MediaQueryList | null = null;

function startSystemListener() {
  if (!themesDiffer || mediaQuery) return;

  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handler = (e: MediaQueryListEvent) => {
    const currentMode = get(mode);
    if (currentMode !== 'system') return;

    const newTheme = e.matches ? appConfig.themes.dark : appConfig.themes.light;
    applyTheme(newTheme);
  };

  mediaQuery.addEventListener('change', handler);
}

function stopSystemListener() {
  if (mediaQuery) {
    mediaQuery.removeEventListener('change', () => {});
    mediaQuery = null;
  }
}

if (get(mode) === 'system') {
  startSystemListener();
}

mode.subscribe(($mode) => {
  if ($mode === 'system') {
    localStorage.removeItem(STORAGE_KEY);
    startSystemListener();
  } else {
    localStorage.setItem(STORAGE_KEY, $mode);
    stopSystemListener();
  }
});

export function setTheme(value: ThemeMode) {
  if (!themesDiffer && value !== 'system') return;
  mode.set(value);
}

export function toggleTheme() {
  if (!themesDiffer) return;

  const currentMode = get(mode);
  const currentTheme = get(theme);

  const newMode = currentTheme === appConfig.themes.dark ? 'light' : 'dark';
  mode.set(newMode);
}
