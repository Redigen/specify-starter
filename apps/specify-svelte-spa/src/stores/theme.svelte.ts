import { appConfig } from '../generated/appConfig';

const STORAGE_KEY = 'app-theme-mode';
type ThemeMode = string;
type SystemTheme = 'light' | 'dark';

const themesDiffer = appConfig.themes.light !== appConfig.themes.dark;

// --- Helpers ---
function getSystemTheme(): SystemTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getCurrentTheme(mode: ThemeMode, systemTheme: SystemTheme): string {
  if (mode === 'system') {
    return systemTheme === 'dark' ? appConfig.themes.dark : appConfig.themes.light;
  }
  return mode === 'dark' ? appConfig.themes.dark : appConfig.themes.light;
}

function applyTheme(themeName: string) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', themeName);
  }
}

// --- Store Class ---
class ThemeStore {
  private mediaQuery: MediaQueryList | null = null;

  // Внутреннее состояние
  private _mode = $state<ThemeMode>(
    typeof window !== 'undefined'
      ? (localStorage.getItem(STORAGE_KEY) as ThemeMode) || 'system'
      : 'system'
  );
  private _systemTheme = $state<SystemTheme>(getSystemTheme());

  canToggle = themesDiffer;

  constructor() {
    // При импорте файла сразу применяем тему к DOM
    applyTheme(this.name);

    // И сразу запускаем слушатель, если режим системный
    if (this._mode === 'system') {
      this.startSystemListener();
    }
  }

  // Геттер для чтения (остается реактивным)
  get mode(): ThemeMode {
    return this._mode;
  }

  // Сеттер для записи (заменяет $effect и mode.set)
  set mode(value: ThemeMode) {
    if (!themesDiffer && value !== 'system') return;

    this._mode = value;

    if (value === 'system') {
      if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY);
      this.startSystemListener();
    } else {
      if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, value);
      this.stopSystemListener();
    }

    // Меняем атрибут при каждом изменении
    applyTheme(this.name);
  }

  // Геттер для производного значения (заменяет derived)
  get name(): string {
    return getCurrentTheme(this._mode, this._systemTheme);
  }

  private mediaHandler = (e: MediaQueryListEvent) => {
    // Обновляем внутреннее состояние
    this._systemTheme = e.matches ? 'dark' : 'light';

    // Если приложение следует системной теме, меняем DOM немедленно
    if (this._mode === 'system') {
      applyTheme(this.name);
    }
  };

  private startSystemListener() {
    if (!themesDiffer || this.mediaQuery || typeof window === 'undefined') return;
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.mediaQuery.addEventListener('change', this.mediaHandler);
  }

  private stopSystemListener() {
    if (this.mediaQuery) {
      this.mediaQuery.removeEventListener('change', this.mediaHandler);
      this.mediaQuery = null;
    }
  }

  // Публичные методы
  setTheme(value: ThemeMode) {
    this.mode = value;
  }

  toggleTheme() {
    if (!themesDiffer) return;
    this.mode = this.name === appConfig.themes.dark ? 'light' : 'dark';
  }
}

// Создаем экземпляр. Конструктор сработает в момент первого импорта!
export const theme = new ThemeStore();
