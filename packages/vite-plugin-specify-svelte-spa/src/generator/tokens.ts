import { generateShadowCSS } from "../utils/generateShadowCSS.ts";
import { resolveToken } from "../utils/resolveToken.ts";
import { formatDimension } from "../utils/formatDimension.ts";
import type { AppConfig } from "../types/app.ts";
import type {
  TokensThemes,
  GradientValue,
} from "../types/tokens.ts";

function generateGradientCSS(g: GradientValue): string {
  const stops = g.stops
    .map((s) => `${resolveToken(s.color)} ${s.offset}`)
    .join(", ");

  const repeatPrefix = g.repeat ? "repeating-" : "";
  switch (g.type) {
    case "linear":
      return `${repeatPrefix}linear-gradient(${g.deg ? g.deg + 180 : 180}deg, ${stops})`;
    case "radial": {
      const size = g.width ?? g.height;
      return `${repeatPrefix}radial-gradient(${size ? `ellipse ${g.width} ${g.height}` : "circle"} at ${g.position ?? "center"}, ${stops})`;
    }
    case "angular":
      return `${repeatPrefix}conic-gradient(from ${g.deg ?? 0}deg at ${g.position ?? "center"}, ${stops})`;
    default:
      return `linear-gradient(${stops})`;
  }
}

export function generateTokensCSS(tokens: TokensThemes, app: AppConfig): string {
  const lines: string[] = [];

  if (!tokens.themes) return "";

  const themeNames = Object.keys(tokens.themes);
  // const rootThemeName = themeNames.includes(app.themes.light)
  //   ? app.themes.light
  //   : themeNames[0];

  for (const [themeName, theme] of Object.entries(tokens.themes)) {
    const selector =
      themeName === "default"
        ? `:root, [data-theme="${themeName}"]`
        : `[data-theme="${themeName}"]`;

    lines.push(`${selector} {`);

    if (theme.palette) {
      for (const [key, value] of Object.entries(theme.palette)) {
        lines.push(`  --palette-${key}: ${value};`);
      }
    }

    if (theme.color) {
      for (const [key, value] of Object.entries(theme.color)) {
        lines.push(`  --color-${key}: ${resolveToken(value)};`);
      }
    }

    if (theme.gradient) {
      for (const [key, value] of Object.entries(theme.gradient)) {
        lines.push(`  --gradient-${key}: ${generateGradientCSS(value)};`);
      }
    }

    if (theme.typography) {
      for (const [key, value] of Object.entries(theme.typography)) {
        lines.push(
          `  --typography-${key}-family: ${resolveToken(value.family)};`,
        );
        lines.push(
          `  --typography-${key}-weight: ${resolveToken(String(value.weight))};`,
        );
        lines.push(
          `  --typography-${key}-size: ${formatDimension(value.size)};`,
        );
        lines.push(
          `  --typography-${key}-line-height: ${formatDimension(value["line-height"])};`,
        );
        if (value["letter-spacing"]) {
          lines.push(
            `  --typography-${key}-letter-spacing: ${formatDimension(value["letter-spacing"])};`,
          );
        }
      }
    }

    if (theme.radius) {
      for (const [key, value] of Object.entries(theme.radius)) {
        lines.push(`  --radius-${key}: ${formatDimension(value)};`);
      }
    }

    if (theme.sizing) {
      for (const [key, value] of Object.entries(theme.sizing)) {
        lines.push(`  --sizing-${key}: ${formatDimension(value)};`);
      }
    }

    if (theme.spacing) {
      for (const [key, value] of Object.entries(theme.spacing)) {
        lines.push(`  --spacing-${key}: ${formatDimension(value)};`);
      }
    }

    if (theme.opacity) {
      for (const [key, value] of Object.entries(theme.opacity)) {
        lines.push(`  --opacity-${key}: ${value / 100};`);
      }
    }

    if (theme.shadow) {
      for (const [key, value] of Object.entries(theme.shadow)) {
        lines.push(`  --shadow-${key}: ${generateShadowCSS(value)};`);
      }
    }

    if (theme.blur) {
      for (const [key, value] of Object.entries(theme.blur)) {
        lines.push(`  --blur-${key}: ${formatDimension(value)};`);
      }
    }

    if (theme.easing) {
      for (const [key, value] of Object.entries(theme.easing)) {
        lines.push(`  --easing-${key}: cubic-bezier(${value});`);
      }
    }

    lines.push("}");
  }

  return lines.join("\n");
}
