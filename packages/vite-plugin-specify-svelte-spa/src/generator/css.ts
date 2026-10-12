import type {
  Styles,
  Lay,
  Stroke,
  Breakpoints,
} from "../types/styles.ts";
import type { Layers, LayerTypes, ComponentLayer } from "../types/layers.ts";
import type { AppConfig } from "../types/app.ts";
import type { TokensThemes } from "../types/tokens.ts";
import { formatDimension } from "../utils/formatDimension.ts";
import { resolveToken } from "../utils/resolveToken.ts";
import { generateGradientCSS } from "../utils/generateGradientCSS.ts";
import { generateShadowCSS } from "../utils/generateShadowCSS.ts";
import { generateStrokeCSS } from "../utils/generateStrokeCSS.ts";
import { getStylesHash } from "../utils/getStylesHash.ts";

const hasValue = (val: any): boolean => val !== undefined && val !== null;

const ALIGN_MAP: Record<string, string> = {
  start: "start", top: "start", center: "center", end: "end", bottom: "end", left: "start", right: "end",
};

const POSITION_MAP: Record<string, string> = {
  normal: "static", offset: "relative", absolute: "absolute", fixed: "fixed", sticky: "sticky",
};

const OVERFLOW_MAP: Record<string, string> = {
  unclip: "visible", clip: "clip", scroll: "scroll", "auto-scroll": "auto",
};

const TXT_DECORATION_MAP: Record<string, string> = {
  none: "none", underline: "underline", strikethrough: "line-through", overline: "overline",
};

const TXT_CASE_MAP: Record<string, string> = {
  normal: "none", "Capitalize": "capitalize", "UPPERCASE": "uppercase", "lowercase": "lowercase",
};

const LIST_STYLE_MAP: Record<string, string> = {
  none: "none", bullet: "disc", circle: "circle", square: "square", number: "decimal",
};

const GRID_FLOW_MAP: Record<string, string> = {
  row: "row", column: "column", dense: "dense", "row-dense": "row dense", "column-dense": "column dense",
};

const TRANSITION_MAP: Record<string, string | string[]> = {
  "all": "all",
  "pos-top": "inset-block-start",
  "pos-bottom": "inset-block-end",
  "pos-left": "inset-inline-start",
  "pos-right": "inset-inline-end",
  "pos-rotation": "transform",
  "lay-width": "width",
  "lay-min-width": "min-width",
  "lay-max-width": "max-width",
  "lay-height": "height",
  "lay-min-height": "min-height",
  "lay-max-height": "max-height",
  "lay-gap": "gap",
  "lay-gap-col": "column-gap",
  "lay-gap-row": "row-gap",
  "lay-padding": "padding",
  "lay-pad-v": ["padding-block-start", "padding-block-end"],
  "lay-pad-h": ["padding-inline-start", "padding-inline-end"],
  "lay-pad-top": "padding-block-start",
  "lay-pad-right": "padding-inline-end",
  "lay-pad-bottom": "padding-block-end",
  "lay-pad-left": "padding-inline-start",
  "lay-margin": "margin",
  "lay-mar-v": ["margin-block-start", "margin-block-end"],
  "lay-mar-h": ["margin-inline-start", "margin-inline-end"],
  "lay-mar-top": "margin-block-start",
  "lay-mar-right": "margin-inline-end",
  "lay-mar-bottom": "margin-block-end",
  "lay-mar-left": "margin-inline-start",
  "vis-opacity": "opacity",
  "vis-radius": "border-radius",
  "vis-radius-top-left": "border-start-start-radius",
  "vis-radius-top-right": "border-start-end-radius",
  "vis-radius-bottom-right": "border-end-end-radius",
  "vis-radius-bottom-left": "border-end-start-radius",
  "txt-size": "font-size",
  "txt-line-height": "line-height",
  "txt-letter-spacing": "letter-spacing",
  "txt-indent": "text-indent",
  "txt-deco-color": "text-decoration-color",
  "txt-deco-weight": "text-decoration-thickness",
  "blur-layer": "filter",
  "blur-background": "backdrop-filter",
};

function resolveDisplayStyle(mergedStyles: Styles, layerType: LayerTypes): Record<string, string> {
  const reverse = mergedStyles?.["lay-reverse"] === true ? "-reverse" : "";
  const out: Record<string, string> = {};

  if (mergedStyles?.lay) {
    switch (mergedStyles.lay) {
      case "column": out.display = "flex"; out["flex-direction"] = `column${reverse}`; break;
      case "row": out.display = "flex"; out["flex-direction"] = `row${reverse}`; break;
      case "grid": out.display = "grid"; break;
      case "block": out.display = "block"; break;
      case "inline": out.display = "inline"; break;
    }
  } else if (layerType === "text") {
    if (hasValue(mergedStyles?.["lay-width"])) {
      let width = formatDimension(mergedStyles["lay-width"]);
      if (width === "hug-contents") out.display = "inline";
      else if (width === "fill-container") out.display = "block";
      else if (width !== "hug-contents") out.display = "inline-block";
    }
    if (hasValue(mergedStyles?.["lay-height"])) {
      let height = formatDimension(mergedStyles["lay-height"]);
      if (height !== "hug-contents" && out.display !== "block") out.display = "inline-block";
    }
    if (hasValue(mergedStyles?.["lay-min-width"]) || hasValue(mergedStyles?.["lay-max-width"]) || hasValue(mergedStyles?.["lay-min-height"]) || hasValue(mergedStyles?.["lay-max-height"]) || hasValue(mergedStyles?.["lay-padding"]) || hasValue(mergedStyles?.["lay-pad-v"]) || hasValue(mergedStyles?.["lay-pad-top"]) || hasValue(mergedStyles?.["lay-pad-bottom"]) || hasValue(mergedStyles?.["lay-aspect-ratio"]) || hasValue(mergedStyles?.["pos-rotation"])) {
      if (!out.display || out.display === "inline") out.display = "inline-block";
    }
    if (!out.display && !hasValue(mergedStyles["lay-width"]) && !hasValue(mergedStyles["lay-min-width"])) {
      out.display = "inline";
    }
  } else {
    out.display = "block";
  }
  if (mergedStyles?.["txt-list-style"] && mergedStyles["txt-list-style"] !== "none") {
    out.display = "list-item";
  }
  return out;
}

function formatGridTrack(track: any, type: "width" | "height"): string {
  let size = hasValue(track?.[type]) ? formatDimension(track[type]) : "auto";
  if (size === "hug-contents" || size === "auto") size = "auto";
  if (size === "fill-container") size = "1fr";

  const minKey = type === "width" ? "min-width" : "min-height";
  const maxKey = type === "width" ? "max-width" : "max-height";

  const minVal = hasValue(track?.[minKey]) ? formatDimension(track[minKey]) : undefined;
  const maxVal = hasValue(track?.[maxKey]) ? formatDimension(track[maxKey]) : undefined;
  const isAuto = size === "auto";

  if (minVal !== undefined && maxVal !== undefined) return `minmax(${minVal}, ${maxVal})`;
  if (minVal !== undefined) return `minmax(${minVal}, ${size})`;
  if (maxVal !== undefined) return isAuto ? `minmax(0px, ${maxVal})` : `minmax(${size}, ${maxVal})`;
  return size;
}

export function generateCssFromYaml(
  layerType: LayerTypes,
  inheritedStyles: Styles,
  styles: Styles,
  parentLay?: Lay,
  stateSelector: boolean = false
): string {
  const mergedStyles = { ...inheritedStyles, ...styles };
  const css: Record<string, string> = {};

  // 1. Position
  if (styles?.pos) css.position = POSITION_MAP[styles.pos];
  if (hasValue(styles?.["pos-elevation"])) css["z-index"] = `${styles["pos-elevation"]}`;
  if (hasValue(styles?.["pos-top"])) css["inset-block-start"] = formatDimension(styles["pos-top"]);
  if (hasValue(styles?.["pos-bottom"])) css["inset-block-end"] = formatDimension(styles["pos-bottom"]);
  if (hasValue(styles?.["pos-left"])) css["inset-inline-start"] = formatDimension(styles["pos-left"]);
  if (hasValue(styles?.["pos-right"])) css["inset-inline-end"] = formatDimension(styles["pos-right"]);

  // 2. Align item (Parent Layout)
  if (parentLay) {
    const setAlign = (prop: string, value: string) => {
      const mapped = ALIGN_MAP[value];
      if (mapped) css[prop] = mapped;
    };

    const applyMarginAuto = (align: string, blockOrInline: "block" | "inline") => {
      const start = blockOrInline === "block" ? "margin-block-start" : "margin-inline-start";
      const end = blockOrInline === "block" ? "margin-block-end" : "margin-inline-end";
      const isStart = align === "start" || (blockOrInline === "inline" && align === "left") || (blockOrInline === "block" && align === "top");
      const isCenter = align === "center";
      const isEnd = align === "end" || (blockOrInline === "inline" && align === "right") || (blockOrInline === "block" && align === "bottom");

      if (isStart) css[end] = "auto";
      if (isCenter) { css[start] = "auto"; css[end] = "auto"; }
      if (isEnd) css[start] = "auto";
    };

    if (parentLay === "row") {
      if (styles?.["pos-align-v"]) setAlign("align-self", styles["pos-align-v"]);
      if (styles?.["pos-align-h"]) applyMarginAuto(styles["pos-align-h"], "inline");
    } else if (parentLay === "column") {
      if (styles?.["pos-align-h"]) setAlign("align-self", styles["pos-align-h"]);
      if (styles?.["pos-align-v"]) applyMarginAuto(styles["pos-align-v"], "block");
    } else if (parentLay === "grid") {
      if (styles?.["pos-align-v"]) setAlign("align-self", styles["pos-align-v"]);
      if (styles?.["pos-align-h"]) setAlign("justify-self", styles["pos-align-h"]);
    } else if (parentLay === "block") {
      if (styles?.["pos-align-v"]) applyMarginAuto(styles["pos-align-v"], "block");
      if (styles?.["pos-align-h"]) applyMarginAuto(styles["pos-align-h"], "inline");
    }
  }

  // 3. Rotation
  if (hasValue(styles?.["pos-rotation"])) {
    css.transform = `rotate(${styles["pos-rotation"]}deg)`;
  }

  // 4. Layout Display
  const reverse = mergedStyles?.["lay-reverse"] === true ? "-reverse" : "";
  if (styles?.lay) {
    if (styles.lay === "column" || styles.lay === "row") {
      css.display = "flex";
      css["flex-direction"] = `${styles.lay}${reverse}`;
      css["align-items"] = "start";
      css["justify-content"] = "start";
    } else if (styles.lay === "grid") {
      css.display = "grid";
      css["align-items"] = "start";
      css["justify-items"] = "start";
    } else if (styles.lay === "block" || styles.lay === "inline") {
      css.display = styles.lay;
    }
  } else if (layerType === "vector") {
    css.display = "inline-flex";
  }

  if (styles?.["lay-reverse"] === false && (mergedStyles?.lay === "column" || mergedStyles?.lay === "row")) {
    css.display = "flex";
    css["flex-direction"] = `${mergedStyles.lay}`;
  }

  // 5. Flex Wrap
  if (styles?.["lay-wrap"] === false) css["flex-wrap"] = "nowrap";
  else if (styles?.["lay-wrap"] === true) css["flex-wrap"] = "wrap";

  // 6. Gap
  const processGap = (key: keyof Styles, cssProp: string, skipSpecial: boolean = false) => {
    if (hasValue(styles?.[key])) {
      const val = styles[key];
      if (!["auto", "around", "evenly"].includes(val as string) || skipSpecial) {
        if (!["auto", "around", "evenly"].includes(val as string)) {
          css[cssProp] = formatDimension(val as string | number);
        }
      }
    }
  };
  processGap("lay-gap", "gap");
  processGap("lay-gap-col", "column-gap");
  processGap("lay-gap-row", "row-gap");

  // 7. Layout Alignment (Row/Column/Grid)
  const applyLayoutAlign = (layType: "row" | "column" | "grid") => {
    const isRow = layType === "row";
    const isCol = layType === "column";
    const isGrid = layType === "grid";

    const gapZeroH = styles?.["lay-gap"] === 0 || styles?.["lay-gap-col"] === 0;
    const gapZeroV = styles?.["lay-gap"] === 0 || styles?.["lay-gap-row"] === 0;

    let effectiveAlignH = styles?.["lay-align-h"];
    if (!effectiveAlignH && gapZeroH) {
      effectiveAlignH = mergedStyles?.["lay-align-h"] || "start";
    }

    let effectiveAlignV = styles?.["lay-align-v"];
    if (!effectiveAlignV && gapZeroV) {
      effectiveAlignV = mergedStyles?.["lay-align-v"] || "start";
    }

    const hMap: Record<string, string> = { start: "start", left: "start", center: "center", end: "end", right: "end" };
    const vMap: Record<string, string> = { start: "start", top: "start", center: "center", end: "end", bottom: "end" };

    if (effectiveAlignH) {
      if (isRow) {
        css["justify-content"] = hMap[effectiveAlignH] || "start";
      } else if (isCol) {
        const prop = effectiveAlignH === "stretch" ? "stretch" : (hMap[effectiveAlignH] || "start");
        css["align-items"] = prop;
      } else if (isGrid) {
        css["justify-items"] = effectiveAlignH === "stretch" ? "stretch" : (hMap[effectiveAlignH] || "start");
      }
    }

    if (effectiveAlignV) {
      if (isRow) {
        const prop = effectiveAlignV === "stretch" ? "stretch" : (vMap[effectiveAlignV] || "start");
        css["align-items"] = prop;
      } else if (isCol) {
        css["justify-content"] = vMap[effectiveAlignV] || "start";
      } else if (isGrid) {
        css["align-items"] = effectiveAlignV === "stretch" ? "stretch" : (vMap[effectiveAlignV] || "start");
      }
    }

    if (isGrid) {
      if (styles?.["lay-grid-align-cols"]) {
        const val = styles["lay-grid-align-cols"];
        css["justify-content"] = (val === "start" || val === "left") ? "start" : (val === "center" ? "center" : "end");
      }
      if (styles?.["lay-grid-align-rows"]) {
        const val = styles["lay-grid-align-rows"];
        css["align-content"] = (val === "start" || val === "top") ? "start" : (val === "center" ? "center" : "end");
      }
    }
  };

  if (mergedStyles?.lay === "row" || mergedStyles?.lay === "column" || mergedStyles?.lay === "grid") {
    applyLayoutAlign(mergedStyles.lay);
  }

  // 8. Special Gap Mappings (space-between, etc.)
  const specialGaps: Record<string, string> = {
    auto: "space-between",
    around: "space-around",
    evenly: "space-evenly"
  };

  const applySpecialGap = (gapKey: keyof Styles, cssProp: string) => {
    const val = styles?.[gapKey] as string;
    if (val && specialGaps[val]) {
      css[cssProp] = specialGaps[val];
    }
  };

  if (mergedStyles?.lay === "row") {
    // Главная ось (горизонталь)
    applySpecialGap("lay-gap", "justify-content");
    applySpecialGap("lay-gap-col", "justify-content");

    // Поперечная ось (вертикаль) - только если wrap
    if (mergedStyles?.["lay-wrap"]) {
      applySpecialGap("lay-gap", "align-content");
      applySpecialGap("lay-gap-row", "align-content");
    }
  }
  else if (mergedStyles?.lay === "column") {
    // Главная ось (вертикаль)
    applySpecialGap("lay-gap", "justify-content");
    applySpecialGap("lay-gap-row", "justify-content");

    // Поперечная ось (горизонталь) - только если wrap
    if (mergedStyles?.["lay-wrap"]) {
      applySpecialGap("lay-gap", "align-content");
      applySpecialGap("lay-gap-col", "align-content");
    }
  }
  else if (mergedStyles?.lay === "grid") {
    // У грида обе оси работают одновременно
    applySpecialGap("lay-gap", "justify-content");
    applySpecialGap("lay-gap", "align-content");

    applySpecialGap("lay-gap-col", "justify-content");
    applySpecialGap("lay-gap-row", "align-content");
  }

  // 9. Grid configuration
  if (styles?.["lay-grid-flow"]) css["grid-auto-flow"] = GRID_FLOW_MAP[styles["lay-grid-flow"]];

  if (Array.isArray(styles?.["lay-grid-cols"])) {
    css["grid-template-columns"] = styles["lay-grid-cols"].map(c => formatGridTrack(c, "width")).join(" ");
  }
  if (Array.isArray(styles?.["lay-grid-rows"])) {
    css["grid-template-rows"] = styles["lay-grid-rows"].map(r => formatGridTrack(r, "height")).join(" ");
  }

  const processGridRest = (key: keyof Styles, cssProp: string) => {
    if (hasValue(styles?.[key])) {
      let val = formatDimension(styles[key] as string | number);
      if (val === "hug-contents") val = "auto";
      if (val === "fill-container") val = "1fr";
      css[cssProp] = val;
    }
  };
  processGridRest("lay-grid-cols-rest", "grid-auto-columns");
  processGridRest("lay-grid-rows-rest", "grid-auto-rows");

  if (hasValue(styles?.["lay-grid-column-span"])) css["grid-column"] = `span ${styles["lay-grid-column-span"]}`;
  if (hasValue(styles?.["lay-grid-row-span"])) css["grid-row"] = `span ${styles["lay-grid-row-span"]}`;

  // 10. Base dimensions
  if (!stateSelector && layerType !== "component" && !mergedStyles["lay-min-width"]) css["min-width"] = "0";
  // if (!stateSelector && layerType !== "component" && !mergedStyles["lay-min-height"]) css["min-height"] = "0";

  // 11. Width & Height
  const processDimension = (key: keyof Styles, cssProp: string, isWidth: boolean) => {
    if (!hasValue(styles?.[key])) return;
    let val = formatDimension(styles[key] as string | number);

    if (val === "hug-contents") {
      if (layerType === "field") {
        css[cssProp] = "auto"
      } else {
        css[cssProp] = "fit-content";
      }
      if (isWidth) {
        if (!mergedStyles?.lay) {
          css.display = layerType === "text" ? "inline" : "inline-block";
        } else if (mergedStyles.lay === "block") {
          css.display = "inline-block";
        } else if (["row", "column"].includes(mergedStyles.lay)) {
          css.display = "inline-flex";
        } else if (mergedStyles.lay === "grid") {
          css.display = "inline-grid";
        }
      }

      if (parentLay === (isWidth ? "row" : "column")) css.flex = "initial";

    } else if (val === "fill-container") {
      if (parentLay === (isWidth ? "row" : "column")) {
        css.flex = "1";
      } else if (parentLay === (isWidth ? "column" : "row")) {
        const maxKey = isWidth ? "lay-max-width" : "lay-max-height";
        if (mergedStyles[maxKey]) {
          css[cssProp] = "100%";
        } else {
          css[cssProp] = "initial";
          css["align-self"] = "stretch";
        }
      } else if (parentLay === "grid") {
        if (isWidth) css.width = "100%";
        else css["align-self"] = "stretch";
      } else if (parentLay === "block" && !isWidth) {
        css.height = "100%";
      } else if (layerType !== "text" && isWidth) {
        css.width = "100%";
      }

      if (isWidth) {
        if (mergedStyles?.lay === "inline" || layerType === "text") css.display = "block";
      } else {
        if (layerType === "text" && css.display !== "block") css.display = "inline-block";
        if (mergedStyles?.lay === "inline" || css.display === "inline") css.display = "inline-block";
      }

      if (!isWidth && !mergedStyles["lay-min-height"]) css["min-height"] = "0";
    } else {
      css[cssProp] = val;
      if (!val.includes('%')) css[`min-${isWidth ? 'width' : 'height'}`] = val;
    }
  };

  processDimension("lay-width", "width", true);
  processDimension("lay-height", "height", false);

  // 12. Min/Max Constraints
  const constraints: { key: keyof Styles; prop: string }[] = [
    { key: "lay-min-width", prop: "min-width" },
    { key: "lay-max-width", prop: "max-width" },
    { key: "lay-min-height", prop: "min-height" },
    { key: "lay-max-height", prop: "max-height" },
  ];
  for (const { key, prop } of constraints) {
    if (hasValue(styles?.[key])) {
      css[prop] = formatDimension(styles[key] as string | number);
      if (mergedStyles?.lay === "inline" || css.display === "inline") css.display = "inline-block";
    }
  }

  if (styles?.["lay-aspect-ratio"]) css["aspect-ratio"] = styles["lay-aspect-ratio"];

  // 13. Spacing (Padding / Margin)
  const spacingConfig: { key: keyof Styles; props: string[] }[] = [
    { key: "lay-padding", props: ["padding-inline-start", "padding-inline-end", "padding-block-start", "padding-block-end"] },
    { key: "lay-pad-v", props: ["padding-block-start", "padding-block-end"] },
    { key: "lay-pad-h", props: ["padding-inline-start", "padding-inline-end"] },
    { key: "lay-pad-top", props: ["padding-block-start"] },
    { key: "lay-pad-right", props: ["padding-inline-end"] },
    { key: "lay-pad-bottom", props: ["padding-block-end"] },
    { key: "lay-pad-left", props: ["padding-inline-start"] },
    { key: "lay-margin", props: ["margin-inline-start", "margin-inline-end", "margin-block-start", "margin-block-end"] },
    { key: "lay-mar-v", props: ["margin-block-start", "margin-block-end"] },
    { key: "lay-mar-h", props: ["margin-inline-start", "margin-inline-end"] },
    { key: "lay-mar-top", props: ["margin-block-start"] },
    { key: "lay-mar-right", props: ["margin-inline-end"] },
    { key: "lay-mar-bottom", props: ["margin-block-end"] },
    { key: "lay-mar-left", props: ["margin-inline-start"] },
  ];
  for (const { key, props } of spacingConfig) {
    if (hasValue(styles?.[key])) {
      const formatted = formatDimension(styles[key] as string | number);
      props.forEach(p => css[p] = formatted);
    }
  }

  // 14. Overflow
  if (styles?.["lay-clip"]) css.overflow = OVERFLOW_MAP[styles["lay-clip"]];
  if (styles?.["lay-clip-h"]) css["overflow-x"] = OVERFLOW_MAP[styles["lay-clip-h"]];
  if (styles?.["lay-clip-v"]) css["overflow-y"] = OVERFLOW_MAP[styles["lay-clip-v"]];

  // 15. Visibility
  if (styles?.vis === "hide") {
    css.display = "none";
  } else if (styles?.vis === "show") {
    Object.assign(css, resolveDisplayStyle(mergedStyles, layerType));
  }

  // 16. Blends & Opacity
  if (styles?.["vis-blend"]) css["mix-blend-mode"] = styles["vis-blend"];
  if (hasValue(styles?.["vis-opacity"])) {
    css.opacity = typeof styles["vis-opacity"] === "number" ? `${styles["vis-opacity"] / 100}` : resolveToken(styles["vis-opacity"]);
  }

  // 17. Radius
  if (hasValue(styles?.["vis-radius"])) css["border-radius"] = formatDimension(styles["vis-radius"]);
  if (hasValue(styles?.["vis-radius-top-left"])) css["border-start-start-radius"] = formatDimension(styles["vis-radius-top-left"]);
  if (hasValue(styles?.["vis-radius-top-right"])) css["border-start-end-radius"] = formatDimension(styles["vis-radius-top-right"]);
  if (hasValue(styles?.["vis-radius-bottom-right"])) css["border-end-end-radius"] = formatDimension(styles["vis-radius-bottom-right"]);
  if (hasValue(styles?.["vis-radius-bottom-left"])) css["border-end-start-radius"] = formatDimension(styles["vis-radius-bottom-left"]);

  // 18. Typography
  if (layerType === "text" && !stateSelector) {
    css["white-space"] = "pre-wrap";
    css["overflow-wrap"] = "break-word";
    Object.assign(css, resolveDisplayStyle(mergedStyles, layerType));
  }

  if (styles?.txt) {
    css["font-family"] = resolveToken(styles.txt + "-family");
    css["font-weight"] = resolveToken(styles.txt + "-weight");
    css["font-size"] = resolveToken(styles.txt + "-size");
    css["line-height"] = resolveToken(styles.txt + "-line-height");
    css["letter-spacing"] = resolveToken(styles.txt + "-letter-spacing");
  }
  if (styles?.["txt-family"]) css["font-family"] = `${styles["txt-family"]}`;
  if (styles?.["txt-weight"]) css["font-weight"] = `${styles["txt-weight"]}`;
  if (hasValue(styles?.["txt-size"])) css["font-size"] = formatDimension(styles["txt-size"]);
  if (hasValue(styles?.["txt-line-height"])) css["line-height"] = formatDimension(styles["txt-line-height"]);
  if (hasValue(styles?.["txt-letter-spacing"])) css["letter-spacing"] = formatDimension(styles["txt-letter-spacing"]);

  const txtAlignMap: Record<string, string> = { left: "start", start: "start", center: "center", right: "end", end: "end", justify: "justify" };
  if (styles?.["txt-align"]) css["text-align"] = txtAlignMap[styles["txt-align"]];
  if (styles?.["txt-position"]) css["vertical-align"] = `${styles["txt-position"]}`;
  if (hasValue(styles?.["txt-indent"])) css["text-indent"] = formatDimension(styles["txt-indent"]);

  if (styles?.["txt-wrap"]) {
    const WRAP_MODES = {
      wrap: { textWrap: "wrap", overflowWrap: "break-word", hyphens: "none" },
      "no-wrap": { textWrap: "nowrap", overflowWrap: "normal", hyphens: "none" },
      balance: { textWrap: "balance", overflowWrap: "break-word", hyphens: "none" },
      pretty: { textWrap: "pretty", overflowWrap: "break-word", hyphens: "none" },
      hyphens: { textWrap: "wrap", overflowWrap: "break-word", hyphens: "auto" },
    } as const;

    const mode = WRAP_MODES[styles["txt-wrap"]];

    css["text-wrap"] = mode.textWrap;
    css["overflow-wrap"] = mode.overflowWrap;
    css.hyphens = mode.hyphens;
  }

  // Truncate
  if (styles?.["txt-truncate"] === true) {
    if (styles?.["txt-lines"] && styles?.["txt-lines"] !== 1) {
      css.display = "-webkit-box";
      css["-webkit-line-clamp"] = `${styles["txt-lines"]}`;
      css["-webkit-box-orient"] = "vertical";
    } else {
      css.display = "block";
      css["white-space"] = "nowrap";
    }
    css.overflow = "hidden";
    css["text-overflow"] = "ellipsis";
  } else if (styles?.["txt-truncate"] === false) {
    css["-webkit-line-clamp"] = "initial";
    css["-webkit-box-orient"] = "initial";
    css["white-space"] = "pre-wrap";
    css.overflow = "initial";
    css["text-overflow"] = "initial";
    Object.assign(css, resolveDisplayStyle(mergedStyles, layerType));
  }

  if (styles?.["txt-vertical-trim"]) {
    if (styles["txt-vertical-trim"] === "none") css["text-box"] = "normal";
    if (styles["txt-vertical-trim"] === "cap-height") css["text-box"] = "trim-both cap alphabetic";
    if (styles["txt-vertical-trim"] === "x-height") css["text-box"] = "trim-both ex alphabetic";
  }

  if (styles?.["txt-decoration"]) css["text-decoration"] = TXT_DECORATION_MAP[styles["txt-decoration"]] || "none";
  if (styles?.["txt-deco-style"]) css["text-decoration-style"] = `${styles["txt-deco-style"]}`;
  if (styles?.["txt-deco-color"]) css["text-decoration-color"] = resolveToken(styles["txt-deco-color"]);
  if (hasValue(styles?.["txt-deco-weight"])) css["text-decoration-thickness"] = formatDimension(styles["txt-deco-weight"]);
  if (hasValue(styles?.["txt-deco-skip-ink"])) css["text-decoration-skip-ink"] = styles["txt-deco-skip-ink"] ? "all" : "none";

  if (styles?.["txt-case"]) css["text-transform"] = TXT_CASE_MAP[styles["txt-case"]] || "none";
  if (styles?.["txt-list-style"]) css["list-style"] = LIST_STYLE_MAP[styles["txt-list-style"]] || "none";
  if (styles?.["txt-list-style-pos"]) css["list-style-position"] = `${styles["txt-list-style-pos"]}`;

  if (styles?.["txt-list-style"] && layerType !== "text") Object.assign(css, resolveDisplayStyle(mergedStyles, layerType));

  // 19. Fill
  if (styles?.fill) {
    if (typeof styles.fill === "string") {
      if (layerType === "text") {
        if (styles.fill.includes("gradient")) {
          css.background = resolveToken(styles.fill);
          css["-webkit-background-clip"] = "text";
          css["background-clip"] = "text";
          css["color"] = "transparent";
        } else { css.color = resolveToken(styles.fill); }
      } else if (layerType !== "vector") {
        css.background = resolveToken(styles.fill);
      }
    } else if (Array.isArray(styles.fill)) {
      const value: string[] = [];
      for (const item of styles.fill) {
        if (item?.color) value.push(`linear-gradient(${resolveToken(item.color)}, ${resolveToken(item.color)})`);
        else if (item?.gradient) {
          if (typeof item.gradient === "string") value.push(resolveToken(item.gradient));
          else if (typeof item.gradient === "object" && !Array.isArray(item.gradient)) value.push(generateGradientCSS(item.gradient));
        }
      }
      if (value.length > 0 && layerType !== "vector") {
        css.background = [...value].reverse().join(", ");
        if (layerType === "text") {
          css["-webkit-background-clip"] = "text";
          css["background-clip"] = "text";
          css["color"] = "transparent";
        }
      }
    }
  }
  if (styles?.value?.fill) css.color = resolveToken(styles.value.fill);

  // 20. Shadows & Strokes
  if (mergedStyles?.shadow || mergedStyles?.stroke) {
    const value: string[] = [];
    const shadow = styles?.shadow || mergedStyles?.shadow;
    if (shadow) {
      if (layerType === "text") {
        if (typeof shadow === "string") css.filter = `drop-shadow(${resolveToken(shadow)})`;
        else if (Array.isArray(shadow)) {
          const textShadows = shadow.map(item => `drop-shadow(${formatDimension(item.x)} ${formatDimension(item.y)} ${formatDimension(item.blur)} ${resolveToken(item.color)})`);
          css.filter = `${css.filter || ""} ${textShadows.reverse().join(" ")}`.trim();
        }
      } else {
        if (typeof shadow === "string") value.push(resolveToken(shadow));
        else if (Array.isArray(shadow)) value.push(generateShadowCSS(shadow));
      }
    }
    const stroke = styles?.stroke || mergedStyles?.stroke;
    if (stroke && layerType !== "vector") {
      if (typeof stroke === "string") value.push(`inset 0px 0px 0px 1px ${resolveToken(stroke)}`);
      else if (Array.isArray(stroke)) value.push(generateStrokeCSS(stroke));
    }
    if (value.length > 0 && layerType !== "vector") css["box-shadow"] = [...value].reverse().join(", ");
  }

  // 21. Blur
  if (hasValue(styles?.["blur-layer"])) css.filter = `${css.filter || ""}  blur(${formatDimension(styles["blur-layer"])})`.trim();
  if (hasValue(styles?.["blur-background"])) css["backdrop-filter"] = `blur(${formatDimension(styles["blur-background"])})`;

  // 22. Transitions
  if (Array.isArray(styles?.transitions)) {
    const value: string[] = [];
    for (const item of styles.transitions) {
      const delay = hasValue(item.delay) ? ` ${item.delay}ms` : "";
      const easing = resolveToken(item.easing);
      const format = (prop: string) => value.push(`${prop} ${item.duration}ms${delay} ${easing}`);

      if (item.property === "fill" && mergedStyles?.fill) {
        if (typeof mergedStyles.fill === "string") {
          if (layerType === "text") format(mergedStyles.fill.includes("gradient") ? "background" : "color");
          else if (layerType !== "vector") format("background");
        } else if (Array.isArray(styles.fill) && layerType !== "vector") format("background");
      } else if (item.property === "shadow") {
        format(layerType === "text" ? "filter" : "box-shadow");
      } else {
        const cssProps = TRANSITION_MAP[item.property];
        if (cssProps) (Array.isArray(cssProps) ? cssProps : [cssProps]).forEach(format);
      }
    }
    if (value.length > 0) css.transition = value.join(", ");
  }

  // 23. Custom CSS
  if (styles?.["cursor-type"]) css.cursor = `${styles["cursor-type"]}`;
  if (styles?.css) {
    for (const [key, val] of Object.entries(styles.css)) css[`${key}`] = `${resolveToken(val)}`;
  }

  return Object.entries(css).map(([prop, val]) => `${prop}: ${val};`).join(" ");
}

export function generateSvgCssFromYaml(
  layerType: LayerTypes,
  styles: Styles,
): string {
  const css: Record<string, string> = {};

  if (layerType !== "vector") return "";

  if (styles?.fill) {
    if (typeof styles.fill === "string" && !styles.fill.includes("gradient")) {
      css.fill = resolveToken(styles.fill);
    }
  }
  if (styles?.stroke) {
    if (
      typeof styles.stroke === "string" &&
      !styles.stroke.includes("gradient")
    ) {
      css.stroke = resolveToken(styles.stroke);
    } else if (
      typeof styles.stroke === "object" &&
      styles.stroke !== null &&
      !Array.isArray(styles.stroke)
    ) {
      const stroke = styles.stroke as Stroke;
      if (stroke?.color) {
        css.stroke = resolveToken(stroke.color);
      }
      if (stroke?.weight) {
        css["stroke-width"] = formatDimension(stroke.weight);
      }
      if (stroke?.linejoin) {
        css["stroke-linejoin"] = stroke.linejoin;
      }
    }
  }
  if (styles?.transitions && Array.isArray(styles?.transitions)) {
    const value: string[] = [];

    for (const item of styles.transitions) {
      if (item.property === "fill") {
        value.push(
          `fill ${item.duration}ms${item?.delay ? ` ${item.delay}ms` : ""} ${resolveToken(item.easing)}`,
        );
      }
      if (item.property === "stroke") {
        value.push(
          `stroke ${item.duration}ms${item?.delay ? ` ${item.delay}ms` : ""} ${resolveToken(item.easing)}`,
        );
      }
    }

    if (value.length > 0) {
      css.transition = value.join(", ");
    }
  }

  return Object.entries(css)
    .map(([prop, val]) => `${prop}: ${val};`)
    .join(" ");
}

function generateStateSelectors(
  layerType: LayerTypes,
  className: string,
  styles: Styles,
  parentLay?: Lay | "block",
  interactiveParent?: string,
): string {
  const lines: string[] = [];

  if (styles?.hover) {
    lines.push("@media (hover: hover) and (pointer: fine) {");
    lines.push(
      `  :global(.${interactiveParent ?? className}:hover${interactiveParent ? ` .${className}` : ""}) {`,
    );
    lines.push(
      `    ${generateCssFromYaml(layerType, styles, styles.hover, parentLay, true)}`,
    );
    lines.push("  }");

    if (layerType === "vector" && (styles.hover?.fill || styles.hover?.stroke)) {
      lines.push(
        `  :global(.${interactiveParent ?? className}:hover${interactiveParent ? ` .${className}` : ""} svg *) {`,
      );
      lines.push(`    ${generateSvgCssFromYaml("vector", styles.hover)}`);
      lines.push("  }");
    }

    if (styles?.hover?.placeholder) {
      lines.push(`  :global(.${interactiveParent ?? className}:hover${interactiveParent ? ` .${className}` : ""}::placeholder) {`);
      lines.push(
        `    color: ${resolveToken(styles.hover.placeholder.fill)}; -webkit-text-fill-color: ${resolveToken(styles.hover.placeholder.fill)};`,
      );
      lines.push(`  }`);
    }

    lines.push("}");
  }
  if (styles?.focus) {
    !interactiveParent
      ? lines.push(`:global(.${className}:focus) { outline: none; }`)
      : "";
    lines.push(
      `:global(.${interactiveParent ?? className}:focus-visible${interactiveParent ? ` .${className}` : ""}, .${interactiveParent ?? className}:has(:focus-visible)${interactiveParent ? ` .${className}` : ""}) {`,
    );
    lines.push(
      `  ${generateCssFromYaml(layerType, styles, styles.focus, parentLay, true)}`,
    );
    lines.push("}");

    if (layerType === "vector" && (styles.focus?.fill || styles.focus?.stroke)) {
      lines.push(
        `:global(.${interactiveParent ?? className}:focus-visible${interactiveParent ? ` .${className}` : ""} svg *, .${interactiveParent ?? className}:has(:focus-visible)${interactiveParent ? ` .${className}` : ""} svg *) {`,
      );
      lines.push(`  ${generateSvgCssFromYaml("vector", styles.focus)}`);
      lines.push("}");
    }

    if (styles?.focus?.placeholder) {
      lines.push(`:global(.${interactiveParent ?? className}:focus-visible${interactiveParent ? ` .${className}` : ""}::placeholder, .${interactiveParent ?? className}:has(:focus-visible)${interactiveParent ? ` .${className}` : ""}::placeholder) {`);
      lines.push(
        `  color: ${resolveToken(styles.focus.placeholder.fill)}; -webkit-text-fill-color: ${resolveToken(styles.focus.placeholder.fill)};`,
      );
      lines.push(`}`);
    }
  }
  if (styles?.pressed) {
    lines.push(
      `:global(.${interactiveParent ?? className}:active${interactiveParent ? ` .${className}` : ""}, .${interactiveParent ?? className}.pressed${interactiveParent ? ` .${className}` : ""}) {`,
    );
    lines.push(
      `  ${generateCssFromYaml(layerType, styles, styles.pressed, parentLay, true)}`,
    );
    lines.push("}");

    if (
      layerType === "vector" &&
      (styles.pressed?.fill || styles.pressed?.stroke)
    ) {
      lines.push(
        `:global(.${interactiveParent ?? className}:active${interactiveParent ? ` .${className}` : ""} svg *, .${interactiveParent ?? className}.pressed${interactiveParent ? ` .${className}` : ""} svg *) {`,
      );
      lines.push(`  ${generateSvgCssFromYaml("vector", styles.pressed)}`);
      lines.push("}");
    }

    if (styles?.pressed?.placeholder) {
      lines.push(`:global(.${interactiveParent ?? className}:active${interactiveParent ? ` .${className}` : ""}::placeholder, .${interactiveParent ?? className}.pressed${interactiveParent ? ` .${className}` : ""}::placeholder) {`);
      lines.push(
        `  color: ${resolveToken(styles.pressed.placeholder.fill)}; -webkit-text-fill-color: ${resolveToken(styles.pressed.placeholder.fill)};`,
      );
      lines.push(`}`);
    }
  }
  if (styles?.disabled) {
    lines.push(
      `:global(.${interactiveParent ?? className}.disabled${interactiveParent ? ` .${className}` : ""}) {`,
    );
    lines.push(
      `  ${generateCssFromYaml(layerType, styles, styles.disabled, parentLay, true)}`,
    );
    lines.push("}");

    if (
      layerType === "vector" &&
      (styles.disabled?.fill || styles.disabled?.stroke)
    ) {
      lines.push(
        `:global(.${interactiveParent ?? className}.disabled${interactiveParent ? ` .${className}` : ""} svg *) {`,
      );
      lines.push(`  ${generateSvgCssFromYaml("vector", styles.disabled)}`);
      lines.push("}");
    }

    if (styles?.disabled?.placeholder) {
      lines.push(`:global(.${interactiveParent ?? className}.disabled${interactiveParent ? ` .${className}` : ""}::placeholder) {`);
      lines.push(
        `  color: ${resolveToken(styles.disabled.placeholder.fill)}; -webkit-text-fill-color: ${resolveToken(styles.disabled.placeholder.fill)};`,
      );
      lines.push(`}`);
    }
  }
  if (styles?.selected) {
    const selectedStyles = styles.selected;
    lines.push(
      `:global(.${interactiveParent ?? className}.selected${interactiveParent ? ` .${className}` : ""}) {`,
    );
    lines.push(
      `  ${generateCssFromYaml(layerType, styles, selectedStyles, parentLay, true)}`,
    );
    lines.push("}");

    if (
      layerType === "vector" &&
      (selectedStyles?.fill || selectedStyles?.stroke)
    ) {
      lines.push(
        `:global(.${interactiveParent ?? className}.selected${interactiveParent ? ` .${className}` : ""} svg *) {`,
      );
      lines.push(`  ${generateSvgCssFromYaml("vector", selectedStyles)}`);
      lines.push("}");
    }

    if (selectedStyles?.placeholder) {
      lines.push(`:global(.${interactiveParent ?? className}.selected${interactiveParent ? ` .${className}` : ""}::placeholder) {`);
      lines.push(
        `  color: ${resolveToken(selectedStyles.placeholder.fill)}; -webkit-text-fill-color: ${resolveToken(selectedStyles.placeholder.fill)};`,
      );
      lines.push(`}`);
    }

    let mergedStyles = { ...styles, ...selectedStyles };
    if (selectedStyles?.hover) {
      lines.push("@media (hover: hover) and (pointer: fine) {");
      lines.push(
        `  :global(.${interactiveParent ?? className}.selected:hover${interactiveParent ? ` .${className}` : ""}) {`,
      );
      lines.push(
        `    ${generateCssFromYaml(layerType, mergedStyles, selectedStyles.hover, parentLay, true)}`,
      );
      lines.push("  }");

      if (
        layerType === "vector" &&
        (selectedStyles.hover?.fill || selectedStyles.hover?.stroke)
      ) {
        lines.push(
          `  :global(.${interactiveParent ?? className}.selected:hover${interactiveParent ? ` .${className}` : ""} svg *) {`,
        );
        lines.push(
          `    ${generateSvgCssFromYaml("vector", selectedStyles.hover)}`,
        );
        lines.push("  }");
      }

      if (selectedStyles?.hover?.placeholder) {
        lines.push(`  :global(.${interactiveParent ?? className}.selected:hover${interactiveParent ? ` .${className}` : ""}::placeholder) {`);
        lines.push(
          `    color: ${resolveToken(selectedStyles.hover.placeholder.fill)}; -webkit-text-fill-color: ${resolveToken(selectedStyles.hover.placeholder.fill)};`,
        );
        lines.push(`  }`);
      }

      lines.push("}");
    }
    if (selectedStyles?.focus) {
      lines.push(
        `:global(.${interactiveParent ?? className}.selected:focus-visible${interactiveParent ? ` .${className}` : ""}, .${interactiveParent ?? className}.selected:has(:focus-visible)${interactiveParent ? ` .${className}` : ""}) {`,
      );
      lines.push(
        `  ${generateCssFromYaml(layerType, mergedStyles, selectedStyles.focus, parentLay, true)}`,
      );
      lines.push("}");

      if (
        layerType === "vector" &&
        (selectedStyles.focus?.fill || selectedStyles.focus?.stroke)
      ) {
        lines.push(
          `:global(.${interactiveParent ?? className}.selected:focus-visible${interactiveParent ? ` .${className}` : ""} svg *, .${interactiveParent ?? className}.selected:has(:focus-visible)${interactiveParent ? ` .${className}` : ""} svg *) {`,
        );
        lines.push(`  ${generateSvgCssFromYaml("vector", selectedStyles.focus)}`);
        lines.push("}");
      }

      if (selectedStyles.focus?.placeholder) {
        lines.push(`:global(.${interactiveParent ?? className}.selected:focus-visible${interactiveParent ? ` .${className}` : ""}::placeholder, .${interactiveParent ?? className}.selected:has(:focus-visible)${interactiveParent ? ` .${className}` : ""}::placeholder) {`);
        lines.push(
          `  color: ${resolveToken(selectedStyles.focus.placeholder.fill)}; -webkit-text-fill-color: ${resolveToken(selectedStyles.focus.placeholder.fill)};`,
        );
        lines.push(`}`);
      }
    }
    if (selectedStyles?.pressed) {
      lines.push(
        `:global(.${interactiveParent ?? className}.selected:active${interactiveParent ? ` .${className}` : ""}, .${interactiveParent ?? className}.selected.pressed${interactiveParent ? ` .${className}` : ""}) {`,
      );
      lines.push(
        `  ${generateCssFromYaml(layerType, mergedStyles, selectedStyles.pressed, parentLay, true)}`,
      );
      lines.push("}");

      if (
        layerType === "vector" &&
        (selectedStyles.pressed?.fill || selectedStyles.pressed?.stroke)
      ) {
        lines.push(
          `:global(.${interactiveParent ?? className}.selected:active${interactiveParent ? ` .${className}` : ""} svg *, .${interactiveParent ?? className}.selected.pressed${interactiveParent ? ` .${className}` : ""} svg *) {`,
        );
        lines.push(
          `  ${generateSvgCssFromYaml("vector", selectedStyles.pressed)}`,
        );
        lines.push("}");
      }

      if (selectedStyles.pressed?.placeholder) {
        lines.push(`:global(.${interactiveParent ?? className}.selected:active${interactiveParent ? ` .${className}` : ""}::placeholder, .${interactiveParent ?? className}.selected.pressed${interactiveParent ? ` .${className}` : ""}::placeholder) {`);
        lines.push(
          `  color: ${resolveToken(selectedStyles.pressed.placeholder.fill)}; -webkit-text-fill-color: ${resolveToken(selectedStyles.pressed.placeholder.fill)};`,
        );
        lines.push(`}`);
      }
    }
    if (selectedStyles?.disabled) {
      lines.push(
        `:global(.${interactiveParent ?? className}.selected.disabled${interactiveParent ? ` .${className}` : ""}) {`,
      );
      lines.push(
        `  ${generateCssFromYaml(layerType, mergedStyles, selectedStyles.disabled, parentLay, true)}`,
      );
      lines.push("}");
    }

    if (
      layerType === "vector" &&
      (selectedStyles.disabled?.fill || selectedStyles.disabled?.stroke)
    ) {
      lines.push(
        `:global(.${interactiveParent ?? className}.selected.disabled${interactiveParent ? ` .${className}` : ""} svg *) {`,
      );
      lines.push(
        `  ${generateSvgCssFromYaml("vector", selectedStyles.disabled)}`,
      );
      lines.push("}");
    }

    if (selectedStyles.disabled?.placeholder) {
      lines.push(`:global(.${interactiveParent ?? className}.selected.disabled${interactiveParent ? ` .${className}` : ""}::placeholder) {`);
      lines.push(
        `  color: ${resolveToken(selectedStyles.disabled.placeholder.fill)}; -webkit-text-fill-color: ${resolveToken(selectedStyles.disabled.placeholder.fill)};`,
      );
      lines.push(`}`);
    }
  }
  if (styles?.valid) {
    const validStyles = styles.valid;
    lines.push(
      `:global(.${interactiveParent ?? className}:user-valid${interactiveParent ? ` .${className}` : ""}, .${interactiveParent ?? className}:has(:user-valid)${interactiveParent ? ` .${className}` : ""}) {`,
    );
    lines.push(
      `  ${generateCssFromYaml(layerType, styles, validStyles, parentLay, true)}`,
    );
    lines.push("}");

    if (layerType === "vector" && (validStyles?.fill || validStyles?.stroke)) {
      lines.push(
        `:global(.${interactiveParent ?? className}:user-valid${interactiveParent ? ` .${className}` : ""} svg *, .${interactiveParent ?? className}:has(:user-valid)${interactiveParent ? ` .${className}` : ""} svg *) {`,
      );
      lines.push(`  ${generateSvgCssFromYaml("vector", validStyles)}`);
      lines.push("}");
    }

    if (validStyles?.placeholder) {
      lines.push(`:global(.${interactiveParent ?? className}:user-valid${interactiveParent ? ` .${className}` : ""}::placeholder, .${interactiveParent ?? className}:has(:user-valid)${interactiveParent ? ` .${className}` : ""}::placeholder) {`);
      lines.push(
        `  color: ${resolveToken(validStyles.placeholder.fill)}; -webkit-text-fill-color: ${resolveToken(validStyles.placeholder.fill)};`,
      );
      lines.push(`}`);
    }

    let mergedStyles = { ...styles, ...validStyles };
    if (validStyles?.hover) {
      lines.push("@media (hover: hover) and (pointer: fine) {");
      lines.push(
        `  :global(.${interactiveParent ?? className}:user-valid:hover${interactiveParent ? ` .${className}` : ""}, .${interactiveParent ?? className}:has(:user-valid):hover${interactiveParent ? ` .${className}` : ""}) {`,
      );
      lines.push(
        `    ${generateCssFromYaml(layerType, mergedStyles, validStyles.hover, parentLay, true)}`,
      );
      lines.push("  }");

      if (
        layerType === "vector" &&
        (validStyles.hover?.fill || validStyles.hover?.stroke)
      ) {
        lines.push(
          `  :global(.${interactiveParent ?? className}:user-valid:hover${interactiveParent ? ` .${className}` : ""} svg *, .${interactiveParent ?? className}:has(:user-valid):hover${interactiveParent ? ` .${className}` : ""} svg *) {`,
        );
        lines.push(`    ${generateSvgCssFromYaml("vector", validStyles.hover)}`);
        lines.push("  }");
      }

      if (validStyles?.hover?.placeholder) {
        lines.push(`  :global(.${interactiveParent ?? className}:user-valid:hover${interactiveParent ? ` .${className}` : ""}::placeholder, .${interactiveParent ?? className}:has(:user-valid):hover${interactiveParent ? ` .${className}` : ""}::placeholder) {`);
        lines.push(
          `    color: ${resolveToken(validStyles.hover.placeholder.fill)}; -webkit-text-fill-color: ${resolveToken(validStyles.hover.placeholder.fill)};`,
        );
        lines.push(`  }`);
      }

      lines.push("}");
    }
    if (validStyles?.focus) {
      lines.push(
        `:global(.${interactiveParent ?? className}:user-valid:focus-visible${interactiveParent ? ` .${className}` : ""}, .${interactiveParent ?? className}:has(:user-valid:focus-visible)${interactiveParent ? ` .${className}` : ""}) {`,
      );
      lines.push(
        `  ${generateCssFromYaml(layerType, mergedStyles, validStyles.focus, parentLay, true)}`,
      );
      lines.push("}");

      if (
        layerType === "vector" &&
        (validStyles.focus?.fill || validStyles.focus?.stroke)
      ) {
        lines.push(
          `:global(.${interactiveParent ?? className}:user-valid:focus-visible${interactiveParent ? ` .${className}` : ""} svg *, .${interactiveParent ?? className}:has(:user-valid:focus-visible)${interactiveParent ? ` .${className}` : ""} svg *) {`,
        );
        lines.push(`  ${generateSvgCssFromYaml("vector", validStyles.focus)}`);
        lines.push("}");
      }

      if (validStyles.focus?.placeholder) {
        lines.push(`:global(.${interactiveParent ?? className}:user-valid:focus-visible${interactiveParent ? ` .${className}` : ""}::placeholder, .${interactiveParent ?? className}:has(:user-valid:focus-visible)${interactiveParent ? ` .${className}` : ""}::placeholder) {`);
        lines.push(
          `  color: ${resolveToken(validStyles.focus.placeholder.fill)}; -webkit-text-fill-color: ${resolveToken(validStyles.focus.placeholder.fill)};`,
        );
        lines.push(`}`);
      }
    }
    if (validStyles?.pressed) {
      lines.push(
        `:global(.${interactiveParent ?? className}:user-valid:active${interactiveParent ? ` .${className}` : ""}, .${interactiveParent ?? className}:user-valid.pressed${interactiveParent ? ` .${className}` : ""}, .${interactiveParent ?? className}:has(:user-valid):active${interactiveParent ? ` .${className}` : ""}, .${interactiveParent ?? className}:has(:user-valid).pressed${interactiveParent ? ` .${className}` : ""}) {`,
      );
      lines.push(
        `  ${generateCssFromYaml(layerType, mergedStyles, validStyles.pressed, parentLay, true)}`,
      );
      lines.push("}");

      if (
        layerType === "vector" &&
        (validStyles.pressed?.fill || validStyles.pressed?.stroke)
      ) {
        lines.push(
          `:global(.${interactiveParent ?? className}:has(:user-valid):active${interactiveParent ? ` .${className}` : ""} svg *, .${interactiveParent ?? className}:has(:user-valid).pressed${interactiveParent ? ` .${className}` : ""} svg *, .${interactiveParent ?? className}:has(:user-valid:focus-visible):active${interactiveParent ? ` .${className}` : ""} svg *, .${interactiveParent ?? className}:has(:user-valid:focus-visible).pressed${interactiveParent ? ` .${className}` : ""} svg *) {`,
        );
        lines.push(`  ${generateSvgCssFromYaml("vector", validStyles.pressed)}`);
        lines.push("}");
      }

      if (validStyles.pressed?.placeholder) {
        lines.push(`:global(.${interactiveParent ?? className}:user-valid:active${interactiveParent ? ` .${className}` : ""}::placeholder, .${interactiveParent ?? className}:user-valid.pressed${interactiveParent ? ` .${className}` : ""}::placeholder, .${interactiveParent ?? className}:has(:user-valid):active${interactiveParent ? ` .${className}` : ""}::placeholder, .${interactiveParent ?? className}:has(:user-valid).pressed${interactiveParent ? ` .${className}` : ""}::placeholder) {`);
        lines.push(
          `  color: ${resolveToken(validStyles.pressed.placeholder.fill)}; -webkit-text-fill-color: ${resolveToken(validStyles.pressed.placeholder.fill)};`,
        );
        lines.push(`}`);
      }
    }
    if (validStyles?.disabled) {
      lines.push(
        `:global(.${interactiveParent ?? className}:user-valid.disabled${interactiveParent ? ` .${className}` : ""}, .${interactiveParent ?? className}:has(:user-valid).disabled${interactiveParent ? ` .${className}` : ""}) {`,
      );
      lines.push(
        `  ${generateCssFromYaml(layerType, mergedStyles, validStyles.disabled, parentLay, true)}`,
      );
      lines.push("}");

      if (
        layerType === "vector" &&
        (validStyles.disabled?.fill || validStyles.disabled?.stroke)
      ) {
        lines.push(
          `:global(.${interactiveParent ?? className}:user-valid.disabled${interactiveParent ? ` .${className}` : ""} svg *, .${interactiveParent ?? className}:has(:user-valid).disabled${interactiveParent ? ` .${className}` : ""} svg *) {`,
        );
        lines.push(`  ${generateSvgCssFromYaml("vector", validStyles.disabled)}`);
        lines.push("}");
      }

      if (validStyles.disabled?.placeholder) {
        lines.push(`:global(.${interactiveParent ?? className}:user-valid.disabled${interactiveParent ? ` .${className}` : ""}::placeholder, .${interactiveParent ?? className}:has(:user-valid).disabled${interactiveParent ? ` .${className}` : ""}::placeholder) {`);
        lines.push(
          `  color: ${resolveToken(validStyles.disabled.placeholder.fill)}; -webkit-text-fill-color: ${resolveToken(validStyles.disabled.placeholder.fill)};`,
        );
        lines.push(`}`);
      }
    }

    if (validStyles?.selected) {
      const validSelectedStyles = validStyles.selected;
      lines.push(
        `:global(.${interactiveParent ?? className}:user-valid.selected${interactiveParent ? ` .${className}` : ""}, .${interactiveParent ?? className}:has(:user-valid).selected${interactiveParent ? ` .${className}` : ""}) {`,
      );
      lines.push(
        `  ${generateCssFromYaml(layerType, mergedStyles, validSelectedStyles, parentLay, true)}`,
      );
      lines.push("}");

      if (
        layerType === "vector" &&
        (validSelectedStyles?.fill || validSelectedStyles?.stroke)
      ) {
        lines.push(
          `:global(.${interactiveParent ?? className}:user-valid.selected${interactiveParent ? ` .${className}` : ""} svg *, .${interactiveParent ?? className}:has(:user-valid).selected${interactiveParent ? ` .${className}` : ""} svg *) {`,
        );
        lines.push(`  ${generateSvgCssFromYaml("vector", validSelectedStyles)}`);
        lines.push("}");
      }

      if (validSelectedStyles?.placeholder) {
        lines.push(`:global(.${interactiveParent ?? className}:user-valid.selected${interactiveParent ? ` .${className}` : ""}::placeholder, .${interactiveParent ?? className}:has(:user-valid).selected${interactiveParent ? ` .${className}` : ""}::placeholder) {`);
        lines.push(
          `  color: ${resolveToken(validSelectedStyles.placeholder.fill)}; -webkit-text-fill-color: ${resolveToken(validSelectedStyles.placeholder.fill)};`,
        );
        lines.push(`}`);
      }

      mergedStyles = { ...mergedStyles, ...validSelectedStyles };
      if (validSelectedStyles?.hover) {
        lines.push("@media (hover: hover) and (pointer: fine) {");
        lines.push(
          `  :global(.${interactiveParent ?? className}:user-valid.selected:hover${interactiveParent ? ` .${className}` : ""}, .${interactiveParent ?? className}:has(:user-valid).selected:hover${interactiveParent ? ` .${className}` : ""}) {`,
        );
        lines.push(
          `    ${generateCssFromYaml(layerType, mergedStyles, validSelectedStyles.hover, parentLay, true)}`,
        );
        lines.push("  }");

        if (
          layerType === "vector" &&
          (validSelectedStyles.hover?.fill || validSelectedStyles.hover?.stroke)
        ) {
          lines.push(
            `  :global(.${interactiveParent ?? className}:user-valid.selected:hover${interactiveParent ? ` .${className}` : ""} svg *, .${interactiveParent ?? className}:has(:user-valid).selected:hover${interactiveParent ? ` .${className}` : ""} svg *) {`,
          );
          lines.push(
            `    ${generateSvgCssFromYaml("vector", validSelectedStyles.hover)}`,
          );
          lines.push("  }");
        }

        if (validSelectedStyles?.hover?.placeholder) {
          lines.push(`  :global(.${interactiveParent ?? className}:user-valid.selected:hover${interactiveParent ? ` .${className}` : ""}::placeholder, .${interactiveParent ?? className}:has(:user-valid).selected:hover${interactiveParent ? ` .${className}` : ""}::placeholder) {`);
          lines.push(
            `    color: ${resolveToken(validSelectedStyles.hover.placeholder.fill)}; -webkit-text-fill-color: ${resolveToken(validSelectedStyles.hover.placeholder.fill)};`,
          );
          lines.push(`  }`);
        }

        lines.push("}");
      }
      if (validSelectedStyles?.focus) {
        lines.push(
          `:global(.${interactiveParent ?? className}:user-valid:focus-visible.selected${interactiveParent ? ` .${className}` : ""}, .${interactiveParent ?? className}:has(:user-valid:focus-visible).selected${interactiveParent ? ` .${className}` : ""}) {`,
        );
        lines.push(
          `  ${generateCssFromYaml(layerType, mergedStyles, validSelectedStyles.focus, parentLay, true)}`,
        );
        lines.push("}");

        if (
          layerType === "vector" &&
          (validSelectedStyles.focus?.fill || validSelectedStyles.focus?.stroke)
        ) {
          lines.push(
            `:global(.${interactiveParent ?? className}:user-valid:focus-visible.selected${interactiveParent ? ` .${className}` : ""} svg *, .${interactiveParent ?? className}:has(:user-valid:focus-visible).selected${interactiveParent ? ` .${className}` : ""} svg *) {`,
          );
          lines.push(
            `  ${generateSvgCssFromYaml("vector", validSelectedStyles.focus)}`,
          );
          lines.push("}");
        }

        if (validSelectedStyles.focus?.placeholder) {
          lines.push(`:global(.${interactiveParent ?? className}:user-valid:focus-visible.selected${interactiveParent ? ` .${className}` : ""}::placeholder, .${interactiveParent ?? className}:has(:user-valid:focus-visible).selected${interactiveParent ? ` .${className}` : ""}::placeholder) {`);
          lines.push(
            `  color: ${resolveToken(validSelectedStyles.focus.placeholder.fill)}; -webkit-text-fill-color: ${resolveToken(validSelectedStyles.focus.placeholder.fill)};`,
          );
          lines.push(`}`);
        }
      }
      if (validSelectedStyles?.pressed) {
        lines.push(
          `:global(.${interactiveParent ?? className}:user-valid.selected:active${interactiveParent ? ` .${className}` : ""}, .${interactiveParent ?? className}:user-valid.selected.pressed${interactiveParent ? ` .${className}` : ""}, .${interactiveParent ?? className}:has(:user-valid).selected:active${interactiveParent ? ` .${className}` : ""}, .${interactiveParent ?? className}:has(:user-valid).selected.pressed${interactiveParent ? ` .${className}` : ""}) {`,
        );
        lines.push(
          `  ${generateCssFromYaml(layerType, mergedStyles, validSelectedStyles.pressed, parentLay, true)}`,
        );
        lines.push("}");

        if (
          layerType === "vector" &&
          (validSelectedStyles.pressed?.fill ||
            validSelectedStyles.pressed?.stroke)
        ) {
          lines.push(
            `:global(.${interactiveParent ?? className}:user-valid.selected:active${interactiveParent ? ` .${className}` : ""} svg *, .${interactiveParent ?? className}:user-valid.selected.pressed${interactiveParent ? ` .${className}` : ""} svg *, .${interactiveParent ?? className}:has(:user-valid).selected:active${interactiveParent ? ` .${className}` : ""} svg *, .${interactiveParent ?? className}:has(:user-valid).selected.pressed${interactiveParent ? ` .${className}` : ""} svg *) {`,
          );
          lines.push(
            `  ${generateSvgCssFromYaml("vector", validSelectedStyles.pressed)}`,
          );
          lines.push("}");
        }

        if (validSelectedStyles.pressed?.placeholder) {
          lines.push(`:global(.${interactiveParent ?? className}:user-valid.selected:active${interactiveParent ? ` .${className}` : ""}::placeholder, .${interactiveParent ?? className}:user-valid.selected.pressed${interactiveParent ? ` .${className}` : ""}::placeholder, .${interactiveParent ?? className}:has(:user-valid).selected:active${interactiveParent ? ` .${className}` : ""}::placeholder, .${interactiveParent ?? className}:has(:user-valid).selected.pressed${interactiveParent ? ` .${className}` : ""}::placeholder) {`);
          lines.push(
            `  color: ${resolveToken(validSelectedStyles.pressed.placeholder.fill)}; -webkit-text-fill-color: ${resolveToken(validSelectedStyles.pressed.placeholder.fill)};`,
          );
          lines.push(`}`);
        }
      }
      if (validSelectedStyles?.disabled) {
        lines.push(
          `:global(.${interactiveParent ?? className}:user-valid.selected.disabled${interactiveParent ? ` .${className}` : ""}, .${interactiveParent ?? className}:has(:user-valid).selected.disabled${interactiveParent ? ` .${className}` : ""}) {`,
        );
        lines.push(
          `  ${generateCssFromYaml(layerType, mergedStyles, validSelectedStyles.disabled, parentLay, true)}`,
        );
        lines.push("}");

        if (
          layerType === "vector" &&
          (validSelectedStyles.disabled?.fill ||
            validSelectedStyles.disabled?.stroke)
        ) {
          lines.push(
            `:global(.${interactiveParent ?? className}:user-valid.selected.disabled${interactiveParent ? ` .${className}` : ""} svg *, .${interactiveParent ?? className}:has(:user-valid).selected.disabled${interactiveParent ? ` .${className}` : ""} svg *) {`,
          );
          lines.push(
            `  ${generateSvgCssFromYaml("vector", validSelectedStyles.disabled)}`,
          );
          lines.push("}");
        }

        if (validSelectedStyles.disabled?.placeholder) {
          lines.push(`:global(.${interactiveParent ?? className}:user-valid.selected.disabled${interactiveParent ? ` .${className}` : ""}::placeholder, .${interactiveParent ?? className}:has(:user-valid).selected.disabled${interactiveParent ? ` .${className}` : ""}::placeholder) {`);
          lines.push(
            `  color: ${resolveToken(validSelectedStyles.disabled.placeholder.fill)}; -webkit-text-fill-color: ${resolveToken(validSelectedStyles.disabled.placeholder.fill)};`,
          );
          lines.push(`}`);
        }
      }
    }
  }
  if (styles?.invalid) {
    const invalidStyles = styles.invalid;
    lines.push(
      `:global(.${interactiveParent ?? className}:user-invalid${interactiveParent ? ` .${className}` : ""}, .${interactiveParent ?? className}:has(:user-invalid)${interactiveParent ? ` .${className}` : ""}) {`,
    );
    lines.push(
      `  ${generateCssFromYaml(layerType, styles, invalidStyles, parentLay, true)}`,
    );
    lines.push("}");

    if (
      layerType === "vector" &&
      (invalidStyles?.fill || invalidStyles?.stroke)
    ) {
      lines.push(
        `:global(.${interactiveParent ?? className}:user-invalid${interactiveParent ? ` .${className}` : ""} svg *, .${interactiveParent ?? className}:has(:user-invalid)${interactiveParent ? ` .${className}` : ""} svg *) {`,
      );
      lines.push(`  ${generateSvgCssFromYaml("vector", invalidStyles)}`);
      lines.push("}");
    }

    if (invalidStyles?.placeholder) {
      lines.push(`:global(.${interactiveParent ?? className}:user-invalid${interactiveParent ? ` .${className}` : ""}::placeholder, .${interactiveParent ?? className}:has(:user-invalid)${interactiveParent ? ` .${className}` : ""}::placeholder) {`);
      lines.push(
        `  color: ${resolveToken(invalidStyles.placeholder.fill)}; -webkit-text-fill-color: ${resolveToken(invalidStyles.placeholder.fill)};`,
      );
      lines.push(`}`);
    }

    let mergedStyles = { ...styles, ...invalidStyles };
    if (invalidStyles?.hover) {
      lines.push("@media (hover: hover) and (pointer: fine) {");
      lines.push(
        `  :global(.${interactiveParent ?? className}:user-invalid:hover${interactiveParent ? ` .${className}` : ""}, .${interactiveParent ?? className}:has(:user-invalid):hover${interactiveParent ? ` .${className}` : ""}) {`,
      );
      lines.push(
        `    ${generateCssFromYaml(layerType, mergedStyles, invalidStyles.hover, parentLay, true)}`,
      );
      lines.push("  }");

      if (
        layerType === "vector" &&
        (invalidStyles.hover?.fill || invalidStyles.hover?.stroke)
      ) {
        lines.push(
          `  :global(.${interactiveParent ?? className}:user-invalid:hover${interactiveParent ? ` .${className}` : ""} svg *, .${interactiveParent ?? className}:has(:user-invalid):hover${interactiveParent ? ` .${className}` : ""} svg *) {`,
        );
        lines.push(
          `    ${generateSvgCssFromYaml("vector", invalidStyles.hover)}`,
        );
        lines.push("  }");
      }

      if (invalidStyles?.hover?.placeholder) {
        lines.push(`  :global(.${interactiveParent ?? className}:user-invalid:hover${interactiveParent ? ` .${className}` : ""}::placeholder, .${interactiveParent ?? className}:has(:user-invalid):hover${interactiveParent ? ` .${className}` : ""}::placeholder) {`);
        lines.push(
          `    color: ${resolveToken(invalidStyles.hover.placeholder.fill)}; -webkit-text-fill-color: ${resolveToken(invalidStyles.hover.placeholder.fill)};`,
        );
        lines.push(`  }`);
      }

      lines.push("}");
    }
    if (invalidStyles?.focus) {
      lines.push(
        `:global(.${interactiveParent ?? className}:user-invalid:focus-visible${interactiveParent ? ` .${className}` : ""}, .${interactiveParent ?? className}:has(:user-invalid:focus-visible)${interactiveParent ? ` .${className}` : ""}) {`,
      );
      lines.push(
        `  ${generateCssFromYaml(layerType, mergedStyles, invalidStyles.focus, parentLay, true)}`,
      );
      lines.push("}");

      if (
        layerType === "vector" &&
        (invalidStyles.focus?.fill || invalidStyles.focus?.stroke)
      ) {
        lines.push(
          `:global(.${interactiveParent ?? className}:user-invalid:focus-visible${interactiveParent ? ` .${className}` : ""} svg *, .${interactiveParent ?? className}:has(:user-invalid:focus-visible)${interactiveParent ? ` .${className}` : ""} svg *) {`,
        );
        lines.push(`  ${generateSvgCssFromYaml("vector", invalidStyles.focus)}`);
        lines.push("}");
      }

      if (invalidStyles.focus?.placeholder) {
        lines.push(`:global(.${interactiveParent ?? className}:user-invalid:focus-visible${interactiveParent ? ` .${className}` : ""}::placeholder, .${interactiveParent ?? className}:has(:user-invalid:focus-visible)${interactiveParent ? ` .${className}` : ""}::placeholder) {`);
        lines.push(
          `  color: ${resolveToken(invalidStyles.focus.placeholder.fill)}; -webkit-text-fill-color: ${resolveToken(invalidStyles.focus.placeholder.fill)};`,
        );
        lines.push(`}`);
      }
    }
    if (invalidStyles?.pressed) {
      lines.push(
        `:global(.${interactiveParent ?? className}:user-invalid:active${interactiveParent ? ` .${className}` : ""}, .${interactiveParent ?? className}:user-invalid.pressed${interactiveParent ? ` .${className}` : ""}, .${interactiveParent ?? className}:has(:user-invalid):active${interactiveParent ? ` .${className}` : ""}, .${interactiveParent ?? className}:has(:user-invalid).pressed${interactiveParent ? ` .${className}` : ""}) {`,
      );
      lines.push(
        `  ${generateCssFromYaml(layerType, mergedStyles, invalidStyles.pressed, parentLay, true)}`,
      );
      lines.push("}");

      if (
        layerType === "vector" &&
        (invalidStyles.pressed?.fill || invalidStyles.pressed?.stroke)
      ) {
        lines.push(
          `:global(.${interactiveParent ?? className}:user-invalid:active${interactiveParent ? ` .${className}` : ""} svg *, .${interactiveParent ?? className}:user-invalid.pressed${interactiveParent ? ` .${className}` : ""} svg *, .${interactiveParent ?? className}:has(:user-invalid):active${interactiveParent ? ` .${className}` : ""} svg *, .${interactiveParent ?? className}:has(:user-invalid).pressed${interactiveParent ? ` .${className}` : ""} svg *) {`,
        );
        lines.push(
          `  ${generateSvgCssFromYaml("vector", invalidStyles.pressed)}`,
        );
        lines.push("}");
      }

      if (invalidStyles.pressed?.placeholder) {
        lines.push(`:global(.${interactiveParent ?? className}:user-invalid:active${interactiveParent ? ` .${className}` : ""}::placeholder, .${interactiveParent ?? className}:user-invalid.pressed${interactiveParent ? ` .${className}` : ""}::placeholder, .${interactiveParent ?? className}:has(:user-invalid):active${interactiveParent ? ` .${className}` : ""}::placeholder, .${interactiveParent ?? className}:has(:user-invalid).pressed${interactiveParent ? ` .${className}` : ""}::placeholder) {`);
        lines.push(
          `  color: ${resolveToken(invalidStyles.pressed.placeholder.fill)}; -webkit-text-fill-color: ${resolveToken(invalidStyles.pressed.placeholder.fill)};`,
        );
        lines.push(`}`);
      }
    }
    if (invalidStyles?.disabled) {
      lines.push(
        `:global(.${interactiveParent ?? className}:user-invalid.disabled${interactiveParent ? ` .${className}` : ""}, .${interactiveParent ?? className}:has(:user-invalid).disabled${interactiveParent ? ` .${className}` : ""}) {`,
      );
      lines.push(
        `  ${generateCssFromYaml(layerType, mergedStyles, invalidStyles.disabled, parentLay, true)}`,
      );
      lines.push("}");

      if (
        layerType === "vector" &&
        (invalidStyles.disabled?.fill || invalidStyles.disabled?.stroke)
      ) {
        lines.push(
          `:global(.${interactiveParent ?? className}:user-invalid.disabled${interactiveParent ? ` .${className}` : ""} svg *, .${interactiveParent ?? className}:has(:user-invalid).disabled${interactiveParent ? ` .${className}` : ""} svg *) {`,
        );
        lines.push(
          `  ${generateSvgCssFromYaml("vector", invalidStyles.disabled)}`,
        );
        lines.push("}");
      }

      if (invalidStyles.disabled?.placeholder) {
        lines.push(`:global(.${interactiveParent ?? className}:user-invalid.disabled${interactiveParent ? ` .${className}` : ""}::placeholder, .${interactiveParent ?? className}:has(:user-invalid).disabled${interactiveParent ? ` .${className}` : ""}::placeholder) {`);
        lines.push(
          `  color: ${resolveToken(invalidStyles.disabled.placeholder.fill)}; -webkit-text-fill-color: ${resolveToken(invalidStyles.disabled.placeholder.fill)};`,
        );
        lines.push(`}`);
      }
    }

    if (invalidStyles?.selected) {
      const invalidSelectedStyles = invalidStyles.selected;
      lines.push(
        `:global(.${interactiveParent ?? className}:user-invalid.selected${interactiveParent ? ` .${className}` : ""}, .${interactiveParent ?? className}:has(:user-invalid).selected${interactiveParent ? ` .${className}` : ""}) {`,
      );
      lines.push(
        `  ${generateCssFromYaml(layerType, mergedStyles, invalidSelectedStyles, parentLay, true)}`,
      );
      lines.push("}");

      if (
        layerType === "vector" &&
        (invalidSelectedStyles?.fill || invalidSelectedStyles?.stroke)
      ) {
        lines.push(
          `:global(.${interactiveParent ?? className}:user-invalid.selected${interactiveParent ? ` .${className}` : ""} svg *, .${interactiveParent ?? className}:has(:user-invalid).selected${interactiveParent ? ` .${className}` : ""} svg *) {`,
        );
        lines.push(
          `  ${generateSvgCssFromYaml("vector", invalidSelectedStyles)}`,
        );
        lines.push("}");
      }

      if (invalidSelectedStyles?.placeholder) {
        lines.push(`:global(.${interactiveParent ?? className}:user-invalid.selected${interactiveParent ? ` .${className}` : ""}::placeholder, .${interactiveParent ?? className}:has(:user-invalid).selected${interactiveParent ? ` .${className}` : ""}::placeholder) {`);
        lines.push(
          `  color: ${resolveToken(invalidSelectedStyles.placeholder.fill)}; -webkit-text-fill-color: ${resolveToken(invalidSelectedStyles.placeholder.fill)};`,
        );
        lines.push(`}`);
      }

      mergedStyles = { ...mergedStyles, ...invalidSelectedStyles };
      if (invalidSelectedStyles?.hover) {
        lines.push("@media (hover: hover) and (pointer: fine) {");
        lines.push(
          `  :global(.${interactiveParent ?? className}:user-invalid.selected:hover${interactiveParent ? ` .${className}` : ""}, .${interactiveParent ?? className}:has(:user-invalid).selected:hover${interactiveParent ? ` .${className}` : ""}) {`,
        );
        lines.push(
          `    ${generateCssFromYaml(layerType, mergedStyles, invalidSelectedStyles.hover, parentLay, true)}`,
        );
        lines.push("  }");

        if (
          layerType === "vector" &&
          (invalidSelectedStyles.hover?.fill ||
            invalidSelectedStyles.hover?.stroke)
        ) {
          lines.push(
            `  :global(.${interactiveParent ?? className}:user-invalid.selected:hover${interactiveParent ? ` .${className}` : ""} svg *, .${interactiveParent ?? className}:has(:user-invalid).selected:hover${interactiveParent ? ` .${className}` : ""} svg *) {`,
          );
          lines.push(
            `    ${generateSvgCssFromYaml("vector", invalidSelectedStyles.hover)}`,
          );
          lines.push("  }");
        }

        if (invalidSelectedStyles?.hover?.placeholder) {
          lines.push(`  :global(.${interactiveParent ?? className}:user-invalid.selected:hover${interactiveParent ? ` .${className}` : ""}::placeholder, .${interactiveParent ?? className}:has(:user-invalid).selected:hover${interactiveParent ? ` .${className}` : ""}::placeholder) {`);
          lines.push(
            `    color: ${resolveToken(invalidSelectedStyles.hover.placeholder.fill)}; -webkit-text-fill-color: ${resolveToken(invalidSelectedStyles.hover.placeholder.fill)};`,
          );
          lines.push(`  }`);
        }

        lines.push("}");
      }
      if (invalidSelectedStyles?.focus) {
        lines.push(
          `:global(.${interactiveParent ?? className}:user-invalid:focus-visible.selected${interactiveParent ? ` .${className}` : ""}, .${interactiveParent ?? className}:has(:user-invalid:focus-visible).selected${interactiveParent ? ` .${className}` : ""}) {`,
        );
        lines.push(
          `  ${generateCssFromYaml(layerType, mergedStyles, invalidSelectedStyles.focus, parentLay, true)}`,
        );
        lines.push("}");

        if (
          layerType === "vector" &&
          (invalidSelectedStyles.focus?.fill ||
            invalidSelectedStyles.focus?.stroke)
        ) {
          lines.push(
            `:global(.${interactiveParent ?? className}:user-invalid:focus-visible.selected${interactiveParent ? ` .${className}` : ""} svg *, .${interactiveParent ?? className}:has(:user-invalid:focus-visible).selected${interactiveParent ? ` .${className}` : ""} svg *) {`,
          );
          lines.push(
            `  ${generateSvgCssFromYaml("vector", invalidSelectedStyles.focus)}`,
          );
          lines.push("}");
        }

        if (invalidSelectedStyles.focus?.placeholder) {
          lines.push(`:global(.${interactiveParent ?? className}:user-invalid:focus-visible.selected${interactiveParent ? ` .${className}` : ""}::placeholder, .${interactiveParent ?? className}:has(:user-invalid:focus-visible).selected${interactiveParent ? ` .${className}` : ""}::placeholder) {`);
          lines.push(
            `  color: ${resolveToken(invalidSelectedStyles.focus.placeholder.fill)}; -webkit-text-fill-color: ${resolveToken(invalidSelectedStyles.focus.placeholder.fill)};`,
          );
          lines.push(`}`);
        }
      }
      if (invalidSelectedStyles?.pressed) {
        lines.push(
          `:global(.${interactiveParent ?? className}:user-invalid.selected:active${interactiveParent ? ` .${className}` : ""}, .${interactiveParent ?? className}:user-invalid.selected.pressed${interactiveParent ? ` .${className}` : ""}, .${interactiveParent ?? className}:has(:user-invalid).selected:active${interactiveParent ? ` .${className}` : ""}, .${interactiveParent ?? className}:has(:user-invalid).selected.pressed${interactiveParent ? ` .${className}` : ""}) {`,
        );
        lines.push(
          `  ${generateCssFromYaml(layerType, mergedStyles, invalidSelectedStyles.pressed, parentLay, true)}`,
        );
        lines.push("}");

        if (
          layerType === "vector" &&
          (invalidSelectedStyles.pressed?.fill ||
            invalidSelectedStyles.pressed?.stroke)
        ) {
          lines.push(
            `:global(.${interactiveParent ?? className}:user-invalid.selected:active${interactiveParent ? ` .${className}` : ""} svg *, .${interactiveParent ?? className}:user-invalid.selected.pressed${interactiveParent ? ` .${className}` : ""} svg *, .${interactiveParent ?? className}:has(:user-invalid).selected:active${interactiveParent ? ` .${className}` : ""} svg *, .${interactiveParent ?? className}:has(:user-invalid).selected.pressed${interactiveParent ? ` .${className}` : ""} svg *) {`,
          );
          lines.push(
            `  ${generateSvgCssFromYaml("vector", invalidSelectedStyles.pressed)}`,
          );
          lines.push("}");
        }

        if (invalidSelectedStyles.pressed?.placeholder) {
          lines.push(`:global(.${interactiveParent ?? className}:user-invalid.selected:active${interactiveParent ? ` .${className}` : ""}::placeholder, .${interactiveParent ?? className}:user-invalid.selected.pressed${interactiveParent ? ` .${className}` : ""}::placeholder, .${interactiveParent ?? className}:has(:user-invalid).selected:active${interactiveParent ? ` .${className}` : ""}::placeholder, .${interactiveParent ?? className}:has(:user-invalid).selected.pressed${interactiveParent ? ` .${className}` : ""}::placeholder) {`);
          lines.push(
            `  color: ${resolveToken(invalidSelectedStyles.pressed.placeholder.fill)}; -webkit-text-fill-color: ${resolveToken(invalidSelectedStyles.pressed.placeholder.fill)};`,
          );
          lines.push(`}`);
        }
      }
      if (invalidSelectedStyles?.disabled) {
        lines.push(
          `:global(.${interactiveParent ?? className}:user-invalid.selected.disabled${interactiveParent ? ` .${className}` : ""}, .${interactiveParent ?? className}:has(:user-invalid).selected.disabled${interactiveParent ? ` .${className}` : ""}) {`,
        );
        lines.push(
          `  ${generateCssFromYaml(layerType, mergedStyles, invalidSelectedStyles.disabled, parentLay, true)}`,
        );
        lines.push("}");

        if (
          layerType === "vector" &&
          (invalidSelectedStyles.disabled?.fill ||
            invalidSelectedStyles.disabled?.stroke)
        ) {
          lines.push(
            `:global(.${interactiveParent ?? className}:user-invalid.selected.disabled${interactiveParent ? ` .${className}` : ""} svg *, .${interactiveParent ?? className}:has(:user-invalid).selected.disabled${interactiveParent ? ` .${className}` : ""} svg *) {`,
          );
          lines.push(
            `  ${generateSvgCssFromYaml("vector", invalidSelectedStyles.disabled)}`,
          );
          lines.push("}");
        }

        if (invalidSelectedStyles.disabled?.placeholder) {
          lines.push(`:global(.${interactiveParent ?? className}:user-invalid.selected.disabled${interactiveParent ? ` .${className}` : ""}::placeholder, .${interactiveParent ?? className}:has(:user-invalid).selected.disabled${interactiveParent ? ` .${className}` : ""}::placeholder) {`);
          lines.push(
            `  color: ${resolveToken(invalidSelectedStyles.disabled.placeholder.fill)}; -webkit-text-fill-color: ${resolveToken(invalidSelectedStyles.disabled.placeholder.fill)};`,
          );
          lines.push(`}`);
        }
      }
    }
  }

  return lines.join("\n");
}

function parseToPixels(value: string): number {
  const match = value.match(/^([\d.]+)(px|rem|em|%)?$/);
  if (match) {
    const num = parseFloat(match[1]);
    const unit = match[2] || "px";
    switch (unit) {
      case "px":
        return num;
      case "rem":
      case "em":
        return num * 16;
      case "vh":
      case "vw":
      case "%":
        return num;
      default:
        return 0;
    }
  }
  return 0;
}

export function generateMediaQueries(
  layerType: LayerTypes,
  prefix: string,
  className: string,
  path: number[] = [],
  parentLay: Lay,
  app: AppConfig,
  tokens: TokensThemes,
  styles: Styles,
  indent: number = 0,
  layers?: Layers[],
  interactiveParent?: string,
): string {
  const lines: string[] = [];
  const breakpoints = styles?.breakpoints || [];
  let currentLay = parentLay;
  const spaces = " ".repeat(indent);

  // Сортируем брейкпоинты по возрастанию
  const sortedBreakpoints = [...breakpoints].sort((a, b) => {
    const aFormatted =
      a.width !== undefined
        ? formatDimension(a.width, app.themes.light, tokens)
        : a.height !== undefined
          ? formatDimension(a.height, app.themes.light, tokens)
          : "0px";
    const bFormatted =
      b.width !== undefined
        ? formatDimension(b.width, app.themes.light, tokens)
        : b.height !== undefined
          ? formatDimension(b.height, app.themes.light, tokens)
          : "0px";

    const aVal = parseToPixels(aFormatted);
    const bVal = parseToPixels(bFormatted);
    return aVal - bVal;
  });

  sortedBreakpoints.map((bp: Breakpoints, index: number) => {
    const conditions: string[] = [];

    if (bp?.width !== undefined) {
      conditions.push(
        `(min-width: ${formatDimension(bp.width, app.themes.light, tokens)})`,
      );

      // Верхняя граница из следующего bp в ОТСОРТИРОВАННОМ массиве
      const nextBpWithWidth = sortedBreakpoints
        .slice(index + 1)
        .find((b) => b.width !== undefined);

      if (nextBpWithWidth) {
        const nextWidthFormatted = formatDimension(
          nextBpWithWidth.width || 0,
          app.themes.light,
          tokens,
        );
        conditions.push(`(max-width: ${nextWidthFormatted})`);
      }
    }

    if (bp?.height !== undefined) {
      conditions.push(
        `(min-height: ${formatDimension(bp.height, app.themes.light, tokens)})`,
      );

      // Верхняя граница из следующего bp в ОТСОРТИРОВАННОМ массиве
      const nextBpWithHeight = sortedBreakpoints
        .slice(index + 1)
        .find((b) => b.height !== undefined);

      if (nextBpWithHeight) {
        const nextHeightFormatted = formatDimension(
          nextBpWithHeight.height || 0,
          app.themes.light,
          tokens,
        );
        conditions.push(`(max-height: ${nextHeightFormatted})`);
      }
    }

    if (bp?.orientation) {
      conditions.push(`(orientation: ${bp.orientation})`);
    }

    if (conditions.length > 0) {
      lines.push(`${spaces}@media ${conditions.join(" and ")} {`);
      if (Object.keys(bp?.styles || {}).length > 0) {
        lines.push(`${spaces}  :global(.${className}) {`);
        lines.push(
          `${spaces}    ${generateCssFromYaml(layerType, styles, bp.styles as Styles, parentLay)}`,
        );
        lines.push(`${spaces}  }`);
        if (bp.styles?.fill || bp.styles?.stroke) {
          lines.push(`${spaces}  :global(.${className} svg *) {`);
          lines.push(`${spaces}    ${generateSvgCssFromYaml("vector", bp.styles)}`);
          lines.push(`${spaces}  }`);
        }
        if (bp.styles?.lay && layers) {
          currentLay = bp.styles.lay;
          layers
            .map((layer: Layers, layerIndex: number) =>
              lines.push(
                `${spaces}${generateCSS(app, tokens, layer, prefix, [...(path as number[]), layerIndex], indent + 2, currentLay as Lay, interactiveParent, false)}`,
              ),
            )
            .join("\n");
        }
      }
      lines.push(`${spaces}}`);
    }
  });

  return lines.join("\n");
}

export function generateCSS(
  app: AppConfig,
  tokens: TokensThemes,
  node: Layers,
  prefix: string,
  path: number[] = [],
  indent: number = 0,
  parentLay?: Lay | "block",
  interactiveParent?: string,
  recursion: boolean = true,
): string | undefined {
  const className = getStylesHash(node, parentLay, interactiveParent);
  const nodeId = `${prefix}${path.length > 0 ? "-" : ""}${path.join("-")}`;

  const lines: string[] = [];
  let currentLay = "block";

  const spaces = " ".repeat(indent);

  if (node?.frame) {
    const styles = node.frame?.styles || {};
    if (Object.keys(styles).length > 0) {
      lines.push(`${spaces}:global(.${className}) {`);
      lines.push(
        `${spaces}  ${generateCssFromYaml("frame", {}, styles, parentLay)}`,
      );
      lines.push(`${spaces}}`);
      if (styles?.lay) {
        currentLay = styles.lay;
      }
    }

    if (
      styles?.hover ||
      styles?.focus ||
      styles?.pressed ||
      styles?.disabled ||
      styles?.selected ||
      styles?.valid ||
      styles?.invalid
    ) {
      lines.push(
        generateStateSelectors(
          "frame",
          className,
          styles,
          parentLay,
          interactiveParent,
        ),
      );
    }

    if (
      !interactiveParent &&
      (styles?.hover ||
        styles?.focus ||
        styles?.pressed ||
        styles?.disabled ||
        styles?.selected ||
        styles?.valid ||
        styles?.invalid)
    ) {
      interactiveParent = className;
    }

    const layers = node.frame?.layers || [];
    if (recursion) {
      for (let index = 0; index < layers.length; index++) {
        const layer = layers[index];

        const css = generateCSS(
          app,
          tokens,
          layer,
          prefix,
          [...(path as number[]), index],
          indent,
          currentLay as Lay,
          interactiveParent
        );

        if (css) {
          lines.push(css);
        }
      }
    }

    if (styles?.breakpoints) {
      lines.push(
        generateMediaQueries(
          "frame",
          prefix,
          className,
          path,
          parentLay as Lay,
          app,
          tokens,
          styles,
          indent,
          layers,
          interactiveParent,
        ),
      );
    }
  }

  if (node?.text) {
    const styles = node.text?.styles || {};
    if (Object.keys(styles).length > 0) {
      lines.push(`${spaces}:global(.${className}) {`);
      lines.push(
        `${spaces}  ${generateCssFromYaml("text", {}, styles, parentLay)}`,
      );
      lines.push(`${spaces}}`);

      if (
        styles?.hover ||
        styles?.focus ||
        styles?.pressed ||
        styles?.disabled ||
        styles?.selected ||
        styles?.valid ||
        styles?.invalid
      ) {
        lines.push(
          generateStateSelectors(
            "text",
            className,
            styles,
            parentLay,
            interactiveParent,
          ),
        );
      }

      if (styles?.breakpoints) {
        lines.push(
          generateMediaQueries(
            "text",
            prefix,
            className,
            path,
            parentLay as Lay,
            app,
            tokens,
            styles,
            indent,
            [],
            interactiveParent,
          ),
        );
      }
    }
  }

  if (node?.image) {
    const styles = node.image?.styles || {};
    const addStyles = `${node.image?.fit ? ` object-fit: ${node.image?.fit};` : ""}${node.image?.position ? ` object-position: ${node.image?.position};` : ""}`;
    if (Object.keys(styles).length > 0) {
      lines.push(`${spaces}:global(.${className}) {`);
      lines.push(
        `${spaces}  ${generateCssFromYaml("image", {}, styles, parentLay)}${addStyles}`,
      );
      lines.push(`${spaces}}`);

      if (
        styles?.hover ||
        styles?.focus ||
        styles?.pressed ||
        styles?.disabled ||
        styles?.selected ||
        styles?.valid ||
        styles?.invalid
      ) {
        lines.push(
          generateStateSelectors(
            "image",
            className,
            styles,
            parentLay,
            interactiveParent,
          ),
        );
      }

      if (styles?.breakpoints) {
        lines.push(
          generateMediaQueries(
            "image",
            prefix,
            className,
            path,
            parentLay as Lay,
            app,
            tokens,
            styles,
            indent,
            [],
            interactiveParent,
          ),
        );
      }
    }
  }

  if (node?.vector) {
    const styles = node.vector?.styles || {};
    if (Object.keys(styles).length > 0) {
      lines.push(`${spaces}:global(.${className}) {`);
      lines.push(
        `${spaces}  ${generateCssFromYaml("vector", {}, styles, parentLay)}`,
      );
      lines.push(`${spaces}}`);
      if (styles?.fill || styles?.stroke) {
        lines.push(`${spaces}:global(.${className} svg *) {`);
        lines.push(`${spaces}  ${generateSvgCssFromYaml("vector", styles)}`);
        lines.push(`${spaces}}`);
      }

      if (
        styles?.hover ||
        styles?.focus ||
        styles?.pressed ||
        styles?.disabled ||
        styles?.selected ||
        styles?.valid ||
        styles?.invalid
      ) {
        lines.push(
          generateStateSelectors(
            "vector",
            className,
            styles,
            parentLay,
            interactiveParent,
          ),
        );
      }

      if (styles?.breakpoints) {
        lines.push(
          generateMediaQueries(
            "vector",
            prefix,
            className,
            path,
            parentLay as Lay,
            app,
            tokens,
            styles,
            indent,
            [],
            interactiveParent,
          ),
        );
      }
    }
  }

  if (node?.field) {
    const styles = node.field?.styles || {};
    if (Object.keys(styles).length > 0) {
      lines.push(`${spaces}:global(.${className}) {`);
      lines.push(
        `${spaces}  ${generateCssFromYaml("field", {}, styles, parentLay)}`,
      );
      lines.push(`${spaces}}`);
      if (styles?.placeholder?.fill) {
        lines.push(`${spaces}:global(.${className}::placeholder) {`);
        lines.push(
          `${spaces}  color: ${resolveToken(styles.placeholder.fill)}; -webkit-text-fill-color: ${resolveToken(styles.placeholder.fill)};`,
        );
        lines.push(`${spaces}}`);
      }

      if (
        styles?.hover ||
        styles?.focus ||
        styles?.pressed ||
        styles?.disabled ||
        styles?.selected ||
        styles?.valid ||
        styles?.invalid ||
        styles?.value ||
        styles?.placeholder
      ) {
        lines.push(
          generateStateSelectors(
            "field",
            className,
            styles,
            parentLay,
            interactiveParent,
          ),
        );
      }

      if (styles?.breakpoints) {
        lines.push(
          generateMediaQueries(
            "field",
            prefix,
            className,
            path,
            parentLay as Lay,
            app,
            tokens,
            styles,
            indent,
            [],
            interactiveParent,
          ),
        );
      }
    }
  }

  if (node?.iframe) {
    const styles = node.iframe?.styles || {};
    if (Object.keys(styles).length > 0) {
      lines.push(`${spaces}:global(.${className}) {`);
      lines.push(
        `${spaces}  ${generateCssFromYaml("iframe", {}, styles, parentLay)}`,
      );
      lines.push(`${spaces}}`);
    }

    if (
      styles?.hover ||
      styles?.focus ||
      styles?.pressed ||
      styles?.disabled ||
      styles?.selected ||
      styles?.valid ||
      styles?.invalid
    ) {
      lines.push(
        generateStateSelectors(
          "iframe",
          className,
          styles,
          parentLay,
          interactiveParent,
        ),
      );
    }

    if (styles?.breakpoints) {
      lines.push(
        generateMediaQueries(
          "iframe",
          prefix,
          className,
          path,
          parentLay as Lay,
          app,
          tokens,
          styles,
          indent,
          [],
          interactiveParent,
        ),
      );
    }
  }

  if (node?.canvas) {
    const styles = node.canvas?.styles || {};
    if (Object.keys(styles).length > 0) {
      lines.push(`${spaces}:global(.${className}) {`);
      lines.push(
        `${spaces}  ${generateCssFromYaml("canvas", {}, styles, parentLay)}`,
      );
      lines.push(`${spaces}}`);
    }

    if (
      styles?.hover ||
      styles?.focus ||
      styles?.pressed ||
      styles?.disabled ||
      styles?.selected ||
      styles?.valid ||
      styles?.invalid
    ) {
      lines.push(
        generateStateSelectors(
          "canvas",
          className,
          styles,
          parentLay,
          interactiveParent,
        ),
      );
    }

    if (styles?.breakpoints) {
      lines.push(
        generateMediaQueries(
          "canvas",
          prefix,
          className,
          path,
          parentLay as Lay,
          app,
          tokens,
          styles,
          indent,
          [],
          interactiveParent,
        ),
      );
    }
  }

  const componentEntry = Object.entries(node).find(([key]) => key.startsWith('c.'));
  if (componentEntry) {
    const [key, layer] = componentEntry as [string, ComponentLayer];
    const styles = layer?.styles || {};
    if (Object.keys(styles).length > 0) {
      lines.push(`${spaces}:global(.${className}) {`);
      lines.push(
        `${spaces}  ${generateCssFromYaml("component", {}, styles, parentLay)}`,
      );
      lines.push(`${spaces}}`);

      if (
        styles?.hover ||
        styles?.focus ||
        styles?.pressed ||
        styles?.disabled ||
        styles?.selected ||
        styles?.valid ||
        styles?.invalid
      ) {
        lines.push(
          generateStateSelectors(
            "component",
            className,
            styles,
            parentLay,
            interactiveParent,
          ),
        );
      }

      if (styles?.breakpoints) {
        lines.push(
          generateMediaQueries(
            "component",
            prefix,
            className,
            path,
            parentLay as Lay,
            app,
            tokens,
            styles,
            indent,
            [],
            interactiveParent,
          ),
        );
      }
    }
  }

  if (lines.length > 0) return lines.join("\n");
}
