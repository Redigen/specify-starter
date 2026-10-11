import { formatDimension } from "./formatDimension.ts";
import { resolveToken } from "./resolveToken.ts";
import type { Stroke } from "../types/styles.ts";

export function generateStrokeCSS(strokes: Stroke[]): string {
  if (!strokes || strokes.length === 0) return "none";

  const list = strokes.map((s) => {
    let {
      color,
      weight,
      "weight-top": weightTop,
      "weight-right": weightRight,
      "weight-bottom": weightBottom,
      "weight-left": weightLeft,
      position,
    } = s;

    if (!weight) {
      weight = 0;
    }

    if (
      weight === 0 &&
      !weightTop &&
      !weightRight &&
      !weightBottom &&
      !weightLeft
    ) {
      weight = "1px";
    }

    if (!position) {
      position = "inside";
    }

    const item: string[] = [];

    if (position === "inside") {
      if (
        weight &&
        !weightTop &&
        !weightRight &&
        !weightBottom &&
        !weightLeft
      ) {
        item.push(
          `inset 0px 0px 0px ${formatDimension(weight)} ${resolveToken(color as string)}`,
        );
      } else {
        item.push(
          `inset ${formatDimension(weightLeft || (weight as string | number))} ${formatDimension(weightTop || (weight as string | number))} 0px 0px ${resolveToken(color as string)}`,
        );
        item.push(
          `inset ${formatDimension(weightLeft || (weight as string | number))} -${formatDimension(weightBottom || (weight as string | number))} 0px 0px ${resolveToken(color as string)}`,
        );
        item.push(
          `inset -${formatDimension(weightRight || (weight as string | number))} ${formatDimension(weightTop || (weight as string | number))} 0px 0px ${resolveToken(color as string)}`,
        );
        item.push(
          `inset -${formatDimension(weightRight || (weight as string | number))} -${formatDimension(weightBottom || (weight as string | number))} 0px 0px ${resolveToken(color as string)}`,
        );
      }
    } else if (position === "outside") {
      if (
        weight &&
        !weightTop &&
        !weightRight &&
        !weightBottom &&
        !weightLeft
      ) {
        item.push(
          `0px 0px 0px ${formatDimension(weight)} ${resolveToken(color as string)}`,
        );
      } else {
        item.push(
          `-${formatDimension(weightLeft || (weight as string | number))} -${formatDimension(weightTop || (weight as string | number))} 0px 0px ${resolveToken(color as string)}`,
        );
        item.push(
          `-${formatDimension(weightLeft || (weight as string | number))} ${formatDimension(weightBottom || (weight as string | number))} 0px 0px ${resolveToken(color as string)}`,
        );
        item.push(
          `${formatDimension(weightRight || (weight as string | number))} -${formatDimension(weightTop || (weight as string | number))} 0px 0px ${resolveToken(color as string)}`,
        );
        item.push(
          `${formatDimension(weightRight || (weight as string | number))} ${formatDimension(weightBottom || (weight as string | number))} 0px 0px ${resolveToken(color as string)}`,
        );
      }
    } else if (position === "center") {
      if (
        weight &&
        !weightTop &&
        !weightRight &&
        !weightBottom &&
        !weightLeft
      ) {
        item.push(
          `inset 0px 0px 0px calc(${formatDimension(weight)} / 2) ${resolveToken(color as string)}`,
        );
        item.push(
          `0px 0px 0px calc(${formatDimension(weight)} / 2) ${resolveToken(color as string)}`,
        );
      } else {
        item.push(
          `inset calc(${formatDimension(weightLeft || (weight as string | number))} / 2) calc(${formatDimension(weightTop || (weight as string | number))} / 2) 0px 0px ${resolveToken(color as string)}`,
        );
        item.push(
          `inset calc(${formatDimension(weightLeft || (weight as string | number))} / 2) calc(-${formatDimension(weightBottom || (weight as string | number))} / 2) 0px 0px ${resolveToken(color as string)}`,
        );
        item.push(
          `inset calc(-${formatDimension(weightRight || (weight as string | number))} / 2) calc(${formatDimension(weightTop || (weight as string | number))} / 2) 0px 0px ${resolveToken(color as string)}`,
        );
        item.push(
          `inset calc(-${formatDimension(weightRight || (weight as string | number))} / 2) calc(-${formatDimension(weightBottom || (weight as string | number))} / 2) 0px 0px ${resolveToken(color as string)}`,
        );

        item.push(
          `calc(-${formatDimension(weightLeft || (weight as string | number))} / 2) calc(-${formatDimension(weightTop || (weight as string | number))} / 2) 0px 0px ${resolveToken(color as string)}`,
        );
        item.push(
          `calc(-${formatDimension(weightLeft || (weight as string | number))} / 2) calc(${formatDimension(weightBottom || (weight as string | number))} / 2) 0px 0px ${resolveToken(color as string)}`,
        );
        item.push(
          `calc(${formatDimension(weightRight || (weight as string | number))} / 2) calc(-${formatDimension(weightTop || (weight as string | number))} / 2) 0px 0px ${resolveToken(color as string)}`,
        );
        item.push(
          `calc(${formatDimension(weightRight || (weight as string | number))} / 2) calc(${formatDimension(weightBottom || (weight as string | number))} / 2) 0px 0px ${resolveToken(color as string)}`,
        );
      }
    }
    return item.join(", ");
  });

  return list.reverse().join(", ");
}
