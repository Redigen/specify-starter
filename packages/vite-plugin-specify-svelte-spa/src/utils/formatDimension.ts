import type { TokensThemes } from "../types/tokens.ts";
import { getTokenValue } from "./getTokenValue.ts";
import { resolveToken } from "./resolveToken.ts";

export function formatDimension(
  value: string | number | undefined,
  theme?: string,
  tokens?: TokensThemes,
): string {
  if (value === undefined) return '';
  if (typeof value === "number") {
    return `${value / 16}rem`;
  }

  if (typeof value === "string" && value.startsWith("t.") && theme && tokens) {
    const path = value.slice(2);
    const tokenValue = getTokenValue(tokens, theme, path);

    if (typeof tokenValue === "number") {
      return `${tokenValue / 16}rem`;
    }
    if (typeof tokenValue === "string") {
      return tokenValue;
    }
  }

  return resolveToken(value);
}
