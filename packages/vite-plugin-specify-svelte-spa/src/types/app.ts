export interface AppConfig {
  "specs-version": number;
  lang: string;
  meta: MetaData;
  "app-label": AppLabel;
  themes: AppThemes;
  integrations?: Record<string, any>;
  notifications?: Record<string, string | Record<string, string>>;
}

export interface MetaData {
  title: string;
  description: string;
}

export interface AppLabel {
  name: string;
  "short-name": string;
}

export interface AppThemes {
  light: string;
  dark: string;
}
