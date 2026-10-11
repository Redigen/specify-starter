export interface TokensThemes {
  themes: Record<string, Partial<Tokens>>;
}

export interface Tokens {
  palette: Record<string, string>;
  color: Record<string, string>;
  gradient: Record<string, GradientValue>;
  typography: Record<string, TypographyValue>;
  radius: Record<string, string | number>;
  sizing: Record<string, string | number>;
  spacing: Record<string, string | number>;
  opacity: Record<string, number>;
  shadow: Record<string, ShadowValue[]>;
  blur: Record<string, string | number>;
  easing: Record<string, string>;
}

export interface GradientValue {
  type: "linear" | "radial" | "angular";
  deg?: number;
  repeat?: boolean;
  width?: string;
  height?: string;
  position?: string;
  stops: Array<{ color: string; offset: string }>;
}

export interface ShadowValue {
  x: string | number;
  y: string | number;
  blur: string | number;
  spread?: string | number;
  position?: "outside" | "inside";
  color: string;
}

export interface TypographyValue {
  family: string;
  weight: string | number;
  size: string | number;
  "line-height": string | number;
  "letter-spacing"?: string | number;
}
