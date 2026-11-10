import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { pascalCase } from "../utils/pascalCase.ts";
import { kebabCase } from "../utils/kebabCase.ts";
import { generateHTML } from "./html.ts";
import { generateCSS } from "./css.ts";
import { processEventActions } from "../utils/processEventActions.ts";
import { resolveValue } from "../utils/resolveValue.ts";
import { getKeyCondition } from "../utils/getKeyCondition.ts";

import type { Layers } from "../types/layers.ts";
import type { Screen } from "../types/screens.ts";
import type { AppConfig } from "../types/app.ts";
import type { TokensThemes } from "../types/tokens.ts";

export function generateScreens(
  raw: Screen,
  outputDir: string,
  app: AppConfig,
  tokens: TokensThemes,
): void {

  for (const [screenId, screen] of Object.entries(raw)) {
    let keydownScript: string[] = [];

    const root: Layers = {
      frame: {
        id: "screen",
        stores: screen.stores,
        logic: screen.logic,
        state: screen.state,
        data: screen.data,
        meta: screen.meta,
        "html-tag": "div",
        theme: screen.theme,
        styles: screen.styles,
        layers: screen.layers as Layers[],
      },
    };

    const { html, script } = generateHTML(root, kebabCase("screen-" + screenId), []);

    const css = generateCSS(
      app,
      tokens,
      root,
      0,
    );

    if (screen?.["on-keydown"] && screen["on-keydown"].length > 0) {
      keydownScript.push(`function handleGlobalKeydown(event: KeyboardEvent) {`);
      for (const item of screen["on-keydown"]) {
        const keyActions = processEventActions(item, script, resolveValue);

        keydownScript.push(`  if (${getKeyCondition(item.key)}) {`);
        keydownScript.push(`    event.preventDefault();`);
        if (keyActions.length > 0) {
          keydownScript.push(`    ${keyActions.join("; ")};`);
        }
        keydownScript.push(`  }`);
      }
      keydownScript.push(`}`);
    }

    const content = `<!-- AUTO-GENERATED — DO NOT EDIT -->
<script lang="ts">
import { localization } from '../../lib/localization';
import { pressEffect } from '../../lib/pressEffect';

let { params, path } = $props();
${script.size > 0 ? `\n${Array.from(script).join('\n')}` : ""}${keydownScript.length > 0 ? `\n\n${keydownScript.join("\n")}` : ""}
</script>

${keydownScript.length > 0 ? `<svelte:window onkeydown={handleGlobalKeydown} />\n` : ""}${html}
${css && css.length > 0 ? `\n<style>\n${css}\n</style>` : ""}`;

    const outPath = path.join(
      outputDir,
      "screens",
      `${pascalCase(screenId)}.svelte`,
    );
    mkdirSync(path.dirname(outPath), { recursive: true });
    writeFileSync(outPath, content, "utf-8");
  }
}
