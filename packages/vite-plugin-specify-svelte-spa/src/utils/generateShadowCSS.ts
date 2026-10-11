import { formatDimension } from "./formatDimension.ts";
import { resolveToken } from "./resolveToken.ts";
import type { Shadow } from "../types/styles.ts";

export function generateShadowCSS(shadows: Shadow[]): string {
  if (!shadows || shadows.length === 0) return "none";

  const layers = shadows.map((s) => {
    const { x, y, blur, spread, position, color } = s;
    const inset = position === "inside" ? "inset " : "";
    return `${inset}${formatDimension(x)} ${formatDimension(y)} ${formatDimension(blur)}${spread ? ` ${formatDimension(spread)}` : ""} ${resolveToken(color)}`;
  });

  return layers.reverse().join(", ");
}
