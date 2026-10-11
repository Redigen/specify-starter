import type { FillGradient } from "../types/styles.ts";
import { resolveToken } from "./resolveToken.ts";
import { formatDimension } from "./formatDimension.ts";

export function generateGradientCSS(g: FillGradient): string {
  const stops = g.stops
    .map((s) => `${resolveToken(s.color)} ${s.offset}`)
    .join(", ");

  const repeatPrefix = g.repeat ? "repeating-" : "";
  switch (g.type) {
    case "linear":
      return `${repeatPrefix}linear-gradient(${g.deg ? g.deg + 180 : 180}deg, ${stops})`;
    case "radial": {
      const hasWidth = g.width != null;
      const hasHeight = g.height != null;
      const size = hasWidth ? g.width : g.height;
      const shape =
        hasWidth && hasHeight
          ? `ellipse ${formatDimension(g.width as string | number)} ${formatDimension(g.height as string | number)}`
          : hasWidth || hasHeight
            ? `circle ${formatDimension(size as string | number)}`
            : "circle";
      return `${repeatPrefix}radial-gradient(${shape} at ${g.position ?? "center"}, ${stops})`;
    }
    case "angular":
      return `${repeatPrefix}conic-gradient(from ${g.deg ?? 0}deg at ${g.position ?? "center"}, ${stops})`;
    default:
      return `linear-gradient(${stops})`;
  }
}
