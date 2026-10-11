export type Lay =
  | "column"
  | "row"
  | "grid"
  | "grid-column"
  | "block"
  | "inline";

export interface LayGridCols {
  width?: number | string;
  "min-width"?: number | string;
  "max-width"?: number | string;
}

export interface LayGridRows {
  height?: number | string;
  "min-height"?: number | string;
  "max-height"?: number | string;
}

export type LayClip = "unclip" | "clip" | "scroll" | "auto-scroll";

export interface Fill {
  color?: string;
  gradient?: FillGradient;
  image?: FillImage;
}

export interface FillGradient {
  type?: "linear" | "radial" | "angular";
  deg?: number;
  width?: number | string;
  height?: number | string;
  position?: string;
  repeat?: boolean;
  stops: Array<{ color: string; offset: string }>;
}

export interface FillImage {
  source: "assets" | "appwrite" | "web";
  file?: string | FillImageAppwriteFile;
  position?: string;
  fit?: "cover" | "contain" | string;
  repeat?:
    | "repeat"
    | "horizontal"
    | "vertical"
    | "space"
    | "round"
    | "no-repeat";
  attachment?: "scroll" | "fixed" | "local";
}

export interface FillImageAppwriteFile {
  "bucket-id": string;
  "file-id": string;
  width?: number | string;
  height?: number | string;
  quality?: number;
  format?: "jpeg" | "jpg" | "png" | "gif" | "webp" | "avif" | "heic";
}

export interface Stroke {
  color?: string;
  weight?: number | string;
  "weight-top"?: number | string;
  "weight-right"?: number | string;
  "weight-bottom"?: number | string;
  "weight-left"?: number | string;
  position?: "inside" | "center" | "outside";
  linejoin?: "miter" | "round" | "bevel";
}

export interface Shadow {
  x: number | string;
  y: number | string;
  blur: number | string;
  spread?: number | string;
  position?: "outside" | "inside";
  color: string;
}

export interface States {
  hover?: Styles;
  focus?: Styles;
  pressed?: Styles;
  disabled?: Styles;
  selected?: NestedStates;
  valid?: NestedStates;
  invalid?: NestedStates;
}

export interface NestedStates extends Styles, States {}

export interface Breakpoints {
  "bp-min-width"?: number | string;
  "bp-max-width"?: number | string;
  "bp-min-height"?: number | string;
  "bp-max-height"?: number | string;
  "bp-orientation"?: "landscape" | "portrait";
  width?: number | string;
  height?: number | string;
  orientation?: "landscape" | "portrait";
  styles?: Styles;
}

export interface Transitions {
  property:
    | "all"
    | "pos-top"
    | "pos-right"
    | "pos-bottom"
    | "pos-left"
    | "pos-rotation"
    | "lay-width"
    | "lay-min-width"
    | "lay-max-width"
    | "lay-height"
    | "lay-min-height"
    | "lay-max-height"
    | "lay-gap"
    | "lay-gap-col"
    | "lay-gap-row"
    | "lay-padding"
    | "lay-pad-v"
    | "lay-pad-h"
    | "lay-pad-top"
    | "lay-pad-right"
    | "lay-pad-bottom"
    | "lay-pad-left"
    | "vis-opacity"
    | "vis-radius"
    | "vis-radius-top-left"
    | "vis-radius-top-right"
    | "vis-radius-bottom-right"
    | "vis-radius-bottom-left"
    | "txt-size"
    | "txt-line-height"
    | "txt-letter-spacing"
    | "txt-indent"
    | "txt-deco-color"
    | "txt-deco-weight"
    | "fill"
    | "stroke"
    | "shadow"
    | "blur-layer"
    | "blur-background";
  duration: number;
  delay?: number;
  easing: string;
}

export interface Styles extends States {
  in?: Styles;
  out?: Styles;
  pos?: "normal" | "offset" | "absolute" | "fixed" | "sticky";
  "pos-elevation"?: number;
  "pos-top"?: number | string;
  "pos-right"?: number | string;
  "pos-bottom"?: number | string;
  "pos-left"?: number | string;
  "pos-align-h"?: "start" | "left" | "center" | "end" | "right";
  "pos-align-v"?: "start" | "top" | "center" | "end" | "bottom";
  "pos-rotation"?: number;

  lay?: Lay;
  "lay-gap"?: number | string | "auto" | "around" | "evenly";
  "lay-gap-col"?: number | string | "auto" | "around" | "evenly";
  "lay-gap-row"?: number | string | "auto" | "around" | "evenly";
  "lay-wrap"?: boolean;
  "lay-reverse"?: boolean;
  "lay-align-h"?: "left" | "start" | "center" | "right" | "end" | "stretch";
  "lay-align-v"?: "top" | "start" | "center" | "bottom" | "end" | "stretch";
  "lay-grid-align-rows"?: "top" | "start" | "center" | "bottom" | "end";
  "lay-grid-align-cols"?: "left" | "start" | "center" | "right" | "end";
  "lay-grid-flow"?: "row" | "column" | "dense" | "row-dense" | "column-dense";
  "lay-grid-cols"?: LayGridCols;
  "lay-grid-cols-rest"?: number | string;
  "lay-grid-rows"?: LayGridRows;
  "lay-grid-rows-rest"?: number | string;
  "lay-grid-column-span"?: number;
  "lay-grid-row-span"?: number;
  "lay-width"?: number | string;
  "lay-min-width"?: number | string;
  "lay-max-width"?: number | string;
  "lay-height"?: number | string;
  "lay-min-height"?: number | string;
  "lay-max-height"?: number | string;
  "lay-aspect-ratio"?: string;
  "lay-padding"?: number | string;
  "lay-pad-v"?: number | string;
  "lay-pad-h"?: number | string;
  "lay-pad-top"?: number | string;
  "lay-pad-right"?: number | string;
  "lay-pad-bottom"?: number | string;
  "lay-pad-left"?: number | string;
  "lay-margin"?: number | string;
  "lay-mar-v"?: number | string;
  "lay-mar-h"?: number | string;
  "lay-mar-top"?: number | string;
  "lay-mar-right"?: number | string;
  "lay-mar-bottom"?: number | string;
  "lay-mar-left"?: number | string;
  "lay-clip"?: LayClip;
  "lay-clip-h"?: LayClip;
  "lay-clip-v"?: LayClip;

  vis?: "hide" | "show";
  "vis-blend"?:
    | "normal"
    | "darken"
    | "multiply"
    | "color-burn"
    | "lighten"
    | "screen"
    | "color-dodge"
    | "overlay"
    | "soft-light"
    | "hard-light"
    | "difference"
    | "exclusion"
    | "hue"
    | "saturation"
    | "color"
    | "luminosity";
  "vis-opacity"?: number | string;
  "vis-radius"?: number | string;
  "vis-radius-top-left"?: number | string;
  "vis-radius-top-right"?: number | string;
  "vis-radius-bottom-right"?: number | string;
  "vis-radius-bottom-left"?: number | string;

  txt?: string;
  "txt-family"?: string;
  "txt-weight"?: number | string;
  "txt-size"?: number | string;
  "txt-line-height"?: number | string;
  "txt-letter-spacing"?: number | string;
  "txt-align"?: "left" | "start" | "center" | "right" | "end" | "justify";
  "txt-position"?: "baseline" | "subscript" | "superscript";
  "txt-indent"?: number | string;
  "txt-wrap"?: "hyphens";
  "txt-truncate"?: boolean;
  "txt-lines"?: number;
  "txt-decoration"?: "none" | "underline" | "strikethrough" | "overline";
  "txt-deco-style"?: "line" | "dashed" | "dotted" | "double" | "wavy";
  "txt-deco-color"?: string;
  "txt-deco-weight"?: number | string;
  "txt-deco-skip-ink"?: boolean;
  "txt-case"?: "normal" | "Capitalize" | "UPPERCASE" | "lowercase";
  "txt-list-style"?: "none" | "bullet" | "circle" | "square" | "number";
  "txt-list-style-pos"?: "inside" | "outside";
  "txt-vertical-trim"?: "none" | "cap-height" | "x-height";

  fill?: string | Fill[];
  stroke?: string | Stroke[];

  value?: { fill: string };
  placeholder?: { fill: string };

  shadow?: string | Shadow[];
  "blur-layer"?: number | string;
  "blur-background"?: number | string;

  transitions?: Transitions[];

  "cursor-type"?:
    | "auto"
    | "default"
    | "none"
    | "context-menu"
    | "help"
    | "pointer"
    | "progress"
    | "wait"
    | "cell"
    | "crosshair"
    | "text"
    | "vertical-text"
    | "alias"
    | "copy"
    | "move"
    | "no-drop"
    | "not-allowed"
    | "grab"
    | "grabbing"
    | "all-scroll"
    | "col-resize"
    | "row-resize"
    | "n-resize"
    | "e-resize"
    | "s-resize"
    | "w-resize"
    | "ne-resize"
    | "se-resize"
    | "sw-resize"
    | "ew-resize"
    | "ns-resize"
    | "nesw-resize"
    | "nwse-resize"
    | "zoom-in"
    | "zoom-out";
  "cursor-file"?: string;
  "cursor-offset"?: CursorOffset;

  css?: Record<string, string>;

  breakpoints?: Breakpoints[];
}

export interface CursorOffset {
  horizontal: number;
  vertical: number;
}
