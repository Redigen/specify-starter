import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { pascalCase } from "../utils/pascalCase.ts";
import { kebabCase } from "../utils/kebabCase.ts";
import { generateHTML } from "./html.ts";
import { generateCSS } from "./css.ts";

import type { Localization } from "../types/localization.ts";
import type { Styles } from "../types/styles.ts";
import type { Layers, OnKeydown } from "../types/layers.ts";
import type { GetData } from "../types/getdata.ts";

import util from "util";
import type { AppConfig } from "../types/app.ts";
import type { TokensThemes } from "../types/tokens.ts";
util.inspect.defaultOptions.depth = null;
util.inspect.defaultOptions.colors = true;

interface MetaData {
  title: Localization;
  description: Localization;
}

export interface Component {
  [componentId: string]: {
    props?: Record<string, any>;
    state?: Record<string, any>;
    data?: GetData | Record<string, any>;
    stores?: string[];
    logic?: string[];
    meta: MetaData;
    "html-tag"?: string;
    contenteditable?: boolean | "plaintext-only";
    "on-keydown"?: OnKeydown[];
    selected?: boolean;
    disabled?: boolean;
    tabindex?: number | string;
    theme?: string;
    styles?: Styles;
    layers?: Layers[];
  };
}

export function generateComponents(
  raw: Component,
  outputDir: string,
  app: AppConfig,
  tokens: TokensThemes,
): void {

  for (const [componentId, component] of Object.entries(raw)) {
    let interfaceProps: string[] = [];
    let props: string[] = [];

    if (component?.props) {
      for (const [key] of Object.entries(component.props)) {
        if (key.startsWith('.')) {
          props.push(`${key.slice(1)} = $bindable()`);
          interfaceProps.push(`  ${key.slice(1)}?: any;`)
        }
      }
    }

    const root: Layers = {
      frame: {
        stores: component.stores,
        logic: component.logic,
        state: component.state,
        data: component.data,
        meta: component.meta,
        "html-tag": component["html-tag"] || "div",
        contenteditable: component.contenteditable,
        "on-keydown": component["on-keydown"],
        selected: component.selected,
        disabled: component.disabled,
        tabindex: component.tabindex,
        theme: component.theme,
        styles: component.styles,
        layers: component.layers as Layers[],
      },
    };

    const { html, script } = generateHTML(root, kebabCase("component-" + componentId), []);

    const css = generateCSS(
      app,
      tokens,
      root,
      kebabCase("component-" + componentId),
      [],
      0,
    );

    const content = `<!-- AUTO-GENERATED — DO NOT EDIT -->
<script lang="ts">
import { localization } from '../../lib/localization';
import { pressEffect } from '../../lib/pressEffect';

interface Props {${interfaceProps.length > 0 ? "\n" + interfaceProps.join("\n") : ''}
  inheritedСlass?: any;
  transitionIn?: any;
  transitionOut?: any;
  stylesWithImages?: any;
  onclick?: any;
  [key: string]: any;
}
let { ${props.length > 0 ? `${props.join(", ")}, ` : ""}inheritedСlass, transitionIn, transitionOut, stylesWithImages, onclick, ...props }: Props = $props();
${script.size > 0 ? `\n${Array.from(script).join('\n')}` : ""}
</script>

${html}
${css && css.length > 0 ? `\n<style>\n${css}\n</style>` : ""}`;

    const outPath = path.join(
      outputDir,
      "components",
      `${pascalCase(componentId)}.svelte`,
    );
    mkdirSync(path.dirname(outPath), { recursive: true });
    writeFileSync(outPath, content, "utf-8");
  }
}
