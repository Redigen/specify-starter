import type { Styles, FillImageAppwriteFile } from "./styles.ts";
import type { Localization } from "./localization.ts";

type AnimationTypes = "instant" | "slide-in" | "slide-out" | "move-in" | "move-out" | "push" | "dissolve";
type AnimationDirections = "left" | "right" | "up" | "down";

export interface Layers {
  frame?: FrameLayer;
  text?: TextLayer;
  image?: ImageLayer;
  vector?: VectorLayer;
  field?: FieldLayer;
  // audio?: any;
  // video?: any;
  iframe?: IframeLayer;
  canvas?: CanvasLayer;
  [key: `c.${string}`]: any;
}

export interface FrameLayer {
  logic?: string[];
  state?: Record<string, any>;
  data?: Record<string, any>;
  stores?: string[];
  meta?: MetaData;
  selected?: string | boolean;
  disabled?: string | boolean;
  "cond-if"?: string;
  for?: string;
  key?: string;
  "html-tag"?: string;
  contenteditable?: boolean | "plaintext-only";
  this?: string;
  id?: string;
  class?: string;
  tabindex?: number | string;
  theme?: string;
  styles?: Styles;
  layers?: Layers[];

  "on-mount"?: EventActions;
  "on-unmount"?: EventActions;
  "on-click"?: EventActions;
  "on-submit"?: EventActions;
  "on-change"?: EventActions;
  "on-keydown"?: OnKeydown[];
}

export interface MetaData {
  title: Localization;
  description: Localization;
}

export interface EventActions {
  "navigate-to"?: NavigateTo;
  "navigate-back"?: NavigateBack;
  "scroll-to"?: ScrollTo;
  "set-state"?: Record<string, any>;
  "run"?: string;
}


export interface NavigateTo {
  link: string;
  "frame-id"?: string;
  animation?: AnimationTypes;
  direction?: AnimationDirections;
  easing?: string;
  duration?: number;
  target?: "_self" | "_blank";
}

export interface NavigateBack {
  link: string;
}

export interface ScrollTo {
  "frame-id": string;
  animation?: "smooth" | "instant";
}

export interface OnKeydown extends EventActions {
  key: string;
}

export interface TextLayer {
  content: Localization;
  "cond-if"?: string;
  for?: string;
  key?: string;
  "html-tag"?: string;
  contenteditable?: boolean | "plaintext-only";
  this?: string;
  id?: string;
  class?: string;
  tabindex?: number | string;
  styles?: Styles;

  "on-mount"?: EventActions;
  "on-unmount"?: EventActions;
  "on-click"?: EventActions;
  "on-change"?: EventActions;
}

export interface ImageLayer {
  source: "assets" | "appwrite" | "web";
  file?: string | FillImageAppwriteFile;
  position?: string;
  fit?: "fill" | "cover" | "contain";
  alt?: Localization;
  "cond-if"?: string;
  for?: string;
  key?: string;
  this?: string;
  id?: string;
  class?: string;
  styles?: Styles;
  "on-mount"?: EventActions;
  "on-unmount"?: EventActions;
  "on-click"?: EventActions;
}

export interface VectorLayer {
  file?: string;
  "cond-if"?: string;
  for?: string;
  key?: string;
  this?: string;
  id?: string;
  class?: string;
  styles?: Styles;
  "on-mount"?: EventActions;
  "on-unmount"?: EventActions;
  "on-click"?: EventActions;
}

export interface FieldLayer {
  value: string | number | boolean;
  placeholder?: Localization;
  name?: string;
  type?: "text" | "textarea" | "email" | "search" | "tel" | "url" | "password" | "number" | "date" | "datetime-local" | "time" | "checkbox" | "radio" | "range" | "file";
  inputmode?: "none" | "text" | "decimal" | "numeric" | "tel" | "search" | "email" | "url";
  selected?: string | boolean;
  disabled?: string | boolean;
  readonly?: string | boolean;
  hidden?: boolean;
  required?: string | boolean;
  min?: string | boolean;
  max?: string | boolean;
  minlength?: string | boolean;
  maxlength?: string | boolean;
  pattern?: string;
  mask?: string;
  accept?: string;
  multiple?: boolean;
  autocomplete?: string;
  rows?: number;
  step?: number;
  "cond-if"?: string;
  for?: string;
  key?: string;
  this?: string;
  id?: string;
  class?: string;
  tabindex?: number | string;
  styles?: Styles;

  "on-mount"?: EventActions;
  "on-unmount"?: EventActions;
  "on-click"?: EventActions;
  "on-change"?: EventActions;
}

export interface IframeLayer {
  "cond-if"?: string;
  src?: string;
  this?: string;
  id?: string;
  class?: string;
  tabindex?: number | string;
  styles?: Styles;
  layers?: Layers[];

  "on-mount"?: EventActions;
  "on-unmount"?: EventActions;
  "on-click"?: EventActions;
  "on-keydown"?: OnKeydown[];
}

export interface CanvasLayer {
  "cond-if"?: string;
  this?: string;
  id?: string;
  class?: string;
  tabindex?: number | string;
  styles?: Styles;
  layers?: Layers[];

  "on-mount"?: EventActions;
  "on-unmount"?: EventActions;
  "on-click"?: EventActions;
  "on-keydown"?: OnKeydown[];
}

export interface ComponentLayer {
  "cond-if"?: string;
  for?: string;
  key?: string;
  this?: string;
  props?: Record<string, any>;
  theme?: string;
  styles?: Styles;

  "on-mount"?: EventActions;
  "on-unmount"?: EventActions;
  "on-click"?: EventActions;
}

export type LayerTypes =
  | "component"
  | "frame"
  | "text"
  | "image"
  | "audio"
  | "video"
  | "vector"
  | "field"
  | "iframe"
  | "canvas";
