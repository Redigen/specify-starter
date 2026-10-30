import type { Layers, ComponentLayer, EventActions } from "../types/layers.ts";
import { transformRefs } from "../utils/transformRefs.ts";
import { resolveValue } from "../utils/resolveValue.ts";
import { formatDimension } from "../utils/formatDimension.ts";
import { pascalCase } from "../utils/pascalCase.ts";
import { processEventActions } from "../utils/processEventActions.ts";
import { getKeyCondition } from "../utils/getKeyCondition.ts";
import { resolveToken } from "../utils/resolveToken.ts";
import { generateGradientCSS } from "../utils/generateGradientCSS.ts";
import { isDynamicValue } from "../utils/isDynamicValue.ts";
import { generateStateScript } from "../utils/generateStateScript.ts";
import { generateDataScript } from "../utils/generateDataScript.ts";
import { generateSvelteTransitions } from "../utils/generateSvelteTransitions.ts";
import type { Lay, Styles } from "../types/styles.ts";
import { getStylesHash } from "../utils/getStylesHash.ts";
import { generateHandlerName } from "../utils/generateHandlerName.ts";

function getIntersectionObserverCode(varName: string, sentinelName: string): string {
  return `
let ${sentinelName} = $state<HTMLElement>();
$effect(() => {
  if (!${sentinelName}) return;

  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      if (${varName} && ${varName}.items && ${varName}.items.length < (${varName}.total || 0)) {
        let nextPage = ${varName}_page + 1;
        ${varName}_page = nextPage;
        if (typeof window !== 'undefined') {
          window.history.replaceState(
            { ...window.history.state, ${varName}_page: nextPage },
            '',
            window.location.href
          );
        }
      }
    }
  }, { rootMargin: '200px', threshold: 0.1 });

  observer.observe(${sentinelName});

  return () => {
    observer.disconnect();
  };
});`;
}

function parseForSyntax(forValue: string): { variable: string, expression: string } {
  const match = forValue.trim().match(/^(\w+)\s+in\s+(.+)$/);
  if (!match) {
    throw new Error(`Invalid 'for' syntax: "${forValue}". Expected: "item in expression"`);
  }
  return { variable: match[1], expression: match[2].trim() };
}

const infiniteScrollKeys = new Set<string>();

function compileEachBlock(forValue: string, forKey: string, nodeId: string, script: Set<string>): { each: string, sentinelName: string } {
  const { variable, expression } = parseForSyntax(forValue);

  const dataPrefix = "data.";
  let matchedKey = "";

  if (expression.startsWith(dataPrefix)) {
    const remainingExpr = expression.slice(dataPrefix.length);
    const possibleKey = remainingExpr.split(".")[0];

    if (infiniteScrollKeys.has(possibleKey)) {
      matchedKey = possibleKey;
    }
  }

  let sentinelName = "";

  if (matchedKey) {
    const varName = `data_${matchedKey}`;

    sentinelName = generateHandlerName(nodeId, "sentinel");

    script.add(getIntersectionObserverCode(varName, sentinelName));
  }

  return {
    each: `{#each ${transformRefs(expression)} as ${variable} (${forKey})}`,
    sentinelName
  };
}

function backgroundImages(layerType: "frame" | "text", styles: Styles, script: Set<string>): string {
  if (styles.fill && Array.isArray(styles.fill) && styles.fill.some(item => "image" in item)) {
    const background: string[] = [];

    for (const item of styles.fill) {
      if (item?.color) {
        background.push(
          `linear-gradient(${resolveToken(item.color)}, ${resolveToken(item.color)})`,
        );
      } else if (item?.gradient) {
        if (typeof item.gradient === "string") {
          background.push(resolveToken(item.gradient));
        } else if (
          typeof item.gradient === "object" &&
          item.gradient !== null &&
          !Array.isArray(item.gradient)
        ) {
          background.push(generateGradientCSS(item.gradient));
        }
      } else if (item?.image) {
        let url: string = "";

        const position = item.image?.position || "top left";
        const size = item.image?.fit ? formatDimension(item.image.fit) : "";
        let repeat = item.image?.repeat || "";

        if (repeat === "horizontal") {
          repeat = "repeat-x";
        } else if (repeat === "vertical") {
          repeat = "repeat-y";
        }

        switch (item.image?.source) {
          case "assets":
            typeof item.image?.file === "string" ? url = item.image.file.replace(/^\.\/assets/, '$assets') : "";
            const fileName = url.split('/').pop()!.replace(/\.svg$/, '').replace(/\.webp$/, '').replace(/\.png$/, '').replace(/\.jpg$/, '').replace(/\.jpeg/, '').replace(/\.gif/, '').replace(/\.avif/, '');
            const importName = 'Image' + pascalCase(fileName);

            script.add(`import ${importName} from '${url}';`);
            background.push(`url({${importName}})${position ? ` ${position}` : ""}${position && size ? " /" : ""}${size ? ` ${size}` : ""}${repeat ? ` ${repeat}` : ""}`);
            break;
          case "web":
            typeof item.image?.file === "string" ? url = item.image.file : "";
            background.push(`url(${url})${position ? ` ${position}` : ""}${position && size ? " /" : ""}${size ? ` ${size}` : ""}${repeat ? ` ${repeat}` : ""}`);
            break;
          case "appwrite":
            script.add(`import { appConfig } from '../appConfig';`);
            if (typeof item.image.file === "object" &&
              item.image.file !== null &&
              !Array.isArray(item.image.file)) {
              const fileData = item.image.file;
              const width = fileData.width
                ? `Math.round((${resolveValue(fileData.width)}) * (window.devicePixelRatio || 1))`
                : null;
              const height = fileData.height
                ? `Math.round((${resolveValue(fileData.height)}) * (window.devicePixelRatio || 1))`
                : null;
              const quality = fileData.quality || null;
              const output = fileData.format || '{supportedImageFormat}';
              if (!fileData.format) script.add(`import { supportedImageFormat } from '../../lib/supportedImageFormat';`);

              const queryParts: string[] = [];
              if (width) queryParts.push(`width={${width}}`);
              if (height) queryParts.push(`height={${height}}`);
              if (quality) queryParts.push(`quality=${encodeURIComponent(quality)}`);
              if (output) queryParts.push(`output=${output}`);
              queryParts.push(`project={appConfig?.integrations?.appwrite?.projectId}`);

              const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

              url = `{appConfig?.integrations?.appwrite?.endpoint}/storage/buckets/${resolveValue(fileData["bucket-id"], "text")}/files/${resolveValue(fileData["file-id"], "text")}/preview${queryString}`;
              background.push(`url(${url})${position ? ` ${position}` : ""}${position && size ? " /" : ""}${size ? ` ${size}` : ""}${repeat ? ` ${repeat}` : ""}`);
            }
            break;
        }
      }
    }

    if (background.length > 0) {
      return `background: ${background.reverse().join(", ")};${layerType === "text" ? " -webkit-background-clip: text; background-clip: text; color: transparent;" : ""}`;
    }
  }
  return "";
}

function cursorImage(styles: Styles, script: Set<string>): string {
  if (!styles["cursor-file"]) return "";

  const file = styles["cursor-file"].replace(/^\.\/assets/, '$assets');
  const fileName = file.split('/').pop()!.replace(/\.cur$/, '').replace(/\.ani/, '').replace(/\.svg$/, '').replace(/\.webp$/, '').replace(/\.png$/, '').replace(/\.jpg$/, '').replace(/\.jpeg/, '').replace(/\.gif/, '').replace(/\.avif/, '');
  const importName = 'Cursor' + pascalCase(fileName);

  script.add(`import ${importName} from '${file}';`);

  return `cursor: url({${importName}})${styles?.["cursor-offset"] ? ` ${styles["cursor-offset"].horizontal} ${styles["cursor-offset"].vertical}` : ""}, ${styles["cursor-type"] ? styles["cursor-type"] : "default"};`;
}

function processAssetPath(path: string) {
  if (path.startsWith('./assets/images')) {
    const imagePath = path.replace(/^\.\/assets/, '$assets');
    const fileName = imagePath.split('/').pop()!
      .replace(/\.svg$/, '').replace(/\.webp$/, '').replace(/\.png$/, '')
      .replace(/\.jpg$/, '').replace(/\.jpeg/, '').replace(/\.gif$/, '').replace(/\.avif/, '').replace(/\.heic/, '');

    const varName = 'Image' + pascalCase(fileName);

    return { varName, importStr: `import ${varName} from '${imagePath}';` };
  }

  if (path.startsWith('./assets/vectors')) {
    const vectorPath = path.replace(/^\.\/assets/, '$assets');
    const fileName = vectorPath.split('/').pop()!.replace(/\.svg$/, '');

    const varName = 'Vector' + pascalCase(fileName);

    return { varName, importStr: `import ${varName} from '${vectorPath}';` };
  }

  return null;
}

function buildLifecycleActions(
  script: Set<string>,
  cond?: string,
  onMountConfig?: EventActions,
  onUnMountConfig?: EventActions
): void {
  const hasCond = !!cond;
  let hasReactiveData = false;
  let isEffectGenerated = false;

  const mountActions = processEventActions(onMountConfig, script, resolveValue);
  const unmountActions = processEventActions(onUnMountConfig, script, resolveValue);

  if (mountActions.length === 0 && unmountActions.length === 0) {
    return;
  }

  for (const [, action] of Object.entries(onMountConfig || [])) {
    if (isDynamicValue(action)) hasReactiveData = true;
  }

  if (!hasReactiveData) {
    for (const [, action] of Object.entries(unmountActions || [])) {
      if (isDynamicValue(action)) hasReactiveData = true;
    }
  }

  // 1. Если есть cond ИЛИ реактивные данные -> ВСЕГДА генерируем $effect
  if (hasCond || hasReactiveData) {
    let effectScript: string[] = [];
    effectScript.push(`$effect(() => {`);

    if (hasCond) effectScript.push(`  if (${resolveValue(cond)}) {`);

    // Добавляем mount действия, если они есть
    if (mountActions.length > 0) {
      effectScript.push(`${hasCond ? `  ` : ''}  ${mountActions.join("; ")};`);
    }

    // Добавляем unmount действия в return, если они есть
    if (unmountActions.length > 0) {
      effectScript.push(`${hasCond ? `  ` : ''}  return () => {`);
      effectScript.push(`${hasCond ? `  ` : ''}    ${unmountActions.join("; ")};`);
      effectScript.push(`${hasCond ? `  ` : ''}  };`);
    }

    if (hasCond) effectScript.push(`  }`);

    effectScript.push(`});`);

    script.add(effectScript.join("\n"));
    isEffectGenerated = true;
  }

  // 2. Если $effect не сгенерирован (нет cond и нет реактивности), но есть onMountConfig -> onMount
  if (!isEffectGenerated && onMountConfig) {
    if (mountActions.length > 0) {
      script.add(`import { onMount } from 'svelte';`);
      let mountScript: string[] = [];
      mountScript.push(`onMount(() => {`);
      mountScript.push(`  ${mountActions.join("; ")};`);
      mountScript.push(`});`);
      script.add(mountScript.join("\n"));
    }
  }

  // 3. Если $effect не сгенерирован, но есть onUnMountConfig -> onDestroy
  if (!isEffectGenerated && onUnMountConfig) {
    if (unmountActions.length > 0) {
      script.add(`import { onDestroy } from 'svelte';`);
      let unmountScript: string[] = [];
      unmountScript.push(`onDestroy(() => {`);
      unmountScript.push(`  ${unmountActions.join("; ")};`);
      unmountScript.push(`});`);
      script.add(unmountScript.join("\n"));
    }
  }
}

export function generateHTML(
  node: Layers,
  prefix: string,
  path: number[],
  indent: number = 0,
  parentLay?: Lay | "block",
  interactiveParent?: string,
  inlineMode: boolean = false
): { script: Set<string>; html: string } {
  const className = getStylesHash(node, parentLay, interactiveParent);
  const nodeId = `${prefix}${path.length > 0 ? "-" : ""}${path.join("-")}`;
  const ind = () => inlineMode ? "" : " ".repeat(indent);

  const script = new Set<string>();
  const html: string[] = [];

  if (node.frame) {
    const isRootComponentFrame = prefix.startsWith("component-") && path.length === 0;
    const layer = node.frame;
    let tag = layer["html-tag"] || "div";
    const theme = layer?.theme ? resolveValue(layer?.theme) : "";
    const cond = layer["cond-if"];
    let each: string = "";
    let sentinelName: string = "";
    const contenteditable = layer?.contenteditable ?? "";

    let tabindexAttr = false as boolean;
    let clickEvent: string[] = [];
    let changeEvent: string[] = [];
    let submitEvent: string[] = [];
    let keydownAttr: string = "";
    let styleAttr: string[] = [];

    if (layer?.stores && layer?.stores.length > 0) {
      for (const storeName of layer.stores) {
        script.add(`import { ${storeName} as stores_${storeName} } from '../../stores/${storeName}.svelte';`);
      }
    }

    if (layer?.logic && layer.logic.length > 0) {
      for (const logicName of layer.logic) {
        script.add(`import { ${logicName} as logic_${logicName} } from '../../logic/${logicName}';`);
      }
    }

    if (layer?.state) generateStateScript(layer.state, script);

    if (layer?.data) generateDataScript(layer.data, script, infiniteScrollKeys);

    if (layer?.meta) {
      script.add(`import { updateMeta } from '../../lib/updateMeta';`);

      let metaScript: string[] = [];

      metaScript.push(`$effect(() => {`);
      if (cond) metaScript.push(`  if (${resolveValue(cond)}) {`);
      metaScript.push(`    updateMeta(${resolveValue(layer.meta.title)}, ${resolveValue(layer.meta.description)});`);
      if (cond) metaScript.push(`  }`);
      metaScript.push(`});`);

      script.add(metaScript.join("\n"));
    }

    if (layer?.tabindex || layer.tabindex === 0) {
      tabindexAttr = true;
    }

    if (layer?.for && layer?.key) {
      ({ each, sentinelName } = compileEachBlock(layer.for, layer.key, nodeId, script));
    }

    if (layer?.["on-click"]) {
      if (!layer["html-tag"]) tag = "button";
      tabindexAttr = true;
      const actions = processEventActions(layer["on-click"], script, resolveValue);
      actions.forEach(action => clickEvent.push(`${action};`));
    }

    if (layer?.["on-change"] && contenteditable) {
      const actions = processEventActions(layer["on-change"], script, resolveValue);
      actions.forEach(action => changeEvent.push(`${action};`));
    }

    if (layer?.["on-mount"] || layer?.["on-unmount"]) buildLifecycleActions(script, cond, layer["on-mount"], layer?.["on-unmount"]);

    if (layer?.["on-keydown"] && layer["on-keydown"].length > 0) {
      tabindexAttr = true;
      keydownAttr = ` onkeydown={handle${pascalCase(nodeId)}Keydown}`;
      let keydownScript: string[] = [];

      keydownScript.push(`function handle${pascalCase(nodeId)}Keydown(event: KeyboardEvent) {`);
      for (const item of layer["on-keydown"]) {
        const keyActions = processEventActions(item, script, resolveValue);

        keydownScript.push(`  if (${getKeyCondition(item.key)}) {`);
        keydownScript.push(`    event.preventDefault();`);
        if (keyActions.length > 0) {
          keydownScript.push(`    ${keyActions.join("; ")};`);
        }
        keydownScript.push(`  }`);
      }
      keydownScript.push(`}`);
      script.add(keydownScript.join("\n"));
    }

    if (layer?.["on-submit"]) {
      if (!layer["html-tag"]) tag = "form";
      const actions = processEventActions(layer["on-submit"], script, resolveValue);
      actions.forEach(action => submitEvent.push(`${action};`));
    }

    if (layer?.this) {
      if (tag === "button") {
        script.add(`let ${layer.this} = $state<HTMLButtonElement>();`);
      } else if (tag === "form") {
        script.add(`let ${layer.this} = $state<HTMLFormElement>();`);
      } else {
        script.add(`let ${layer.this} = $state<HTMLElement>();`);
      }
    }

    if (layer?.styles?.fill && Array.isArray(layer.styles.fill) && layer.styles.fill.some(item => "image" in item)) {
      styleAttr.push(backgroundImages("frame", layer.styles, script));
    }

    if (layer?.styles?.["cursor-file"]) {
      styleAttr.push(cursorImage(layer.styles, script))
    }

    if (
      !interactiveParent &&
      (layer?.styles?.hover ||
        layer?.styles?.focus ||
        layer?.styles?.pressed ||
        layer?.styles?.disabled ||
        layer?.styles?.selected ||
        layer?.styles?.valid ||
        layer?.styles?.invalid)
    ) {
      interactiveParent = className;
    }
    let currentLay = "block";
    if (layer?.styles?.lay) {
      currentLay = layer.styles.lay;
    }

    const layers = layer?.layers || [];

    const isInlineContainer = layers.length > 0 && (
      layer?.styles?.lay === "inline" ||
      layer?.styles?.css?.display?.includes("inline") ||
      layers.every(l =>
        l.text ||
        l.vector ||
        l.image ||
        (l.frame && (l.frame?.styles?.lay === "inline" || l.frame?.styles?.css?.display?.includes("inline")))
      )
    );

    let childInd = indent;
    if (cond && each) {
      childInd = indent + 6;
    } else if (cond || each) {
      childInd = indent + 4;
    } else {
      childInd = indent + 2;
    }
    const childResults = layers.map((layer: Layers, index: number) =>
      generateHTML(
        layer,
        prefix,
        [...path, index],
        childInd,
        currentLay as Lay,
        interactiveParent,
        isInlineContainer
      ),
    );

    const layersHtml = childResults.map((r) => r.html).join(isInlineContainer ? "" : "\n");

    childResults.forEach((r) => {
      r.script.forEach(imp => script.add(imp));
    });

    if (isRootComponentFrame) script.add(`import { stylesIn, stylesOut } from '../../lib/transitions';`);
    const transitionSvelte = isRootComponentFrame ? "" : generateSvelteTransitions(layer?.styles, 'frame', parentLay, script);

    const open = `<${tag}${tag === "button" ? ` title="" type="button" ${isRootComponentFrame && tag === "button" ? '{onclick}' : ''}` : ""}${layer?.this ? ` bind:this={${layer.this}}` : ""}${layer?.id ? ` id={${resolveValue(layer.id)}}` : ""} class="${className}${layer.class ? ` ${layer.class}` : ""}${isRootComponentFrame ? ` {inheritedСlass}` : ""}"${layer?.disabled ? ` class:disabled={${resolveValue(layer?.disabled)}}${tag === "button" ? ` disabled={${resolveValue(layer?.disabled)}}` : ""}` : ""}${layer?.selected ? ` class:selected={${resolveValue(layer?.selected)}}` : ""}${submitEvent.length > 0 ? ` onsubmit={(event) => {event.preventDefault(); ${submitEvent.join(" ")}}}` : ""}${styleAttr.length > 0 ? ` style="${styleAttr.join(" ")}"` : ""}${theme ? ` data-theme={${theme}}` : ""}${contenteditable !== "" ? ` contenteditable="${contenteditable}"` : ""}${changeEvent.length > 0 ? ` onblur={(event) => {${changeEvent.join(" ")}}}` : ""}${layer?.styles?.pressed ? " use:pressEffect" : ""}${clickEvent.length > 0 ? ` onclick={() => {${clickEvent.join(" ")}}}` : ""}${keydownAttr}${tabindexAttr ? ` tabindex={${resolveValue(layer.tabindex || 0)}}` : ""}${isRootComponentFrame ? ` in:stylesIn={transitionIn ?? { duration: 0 }} out:stylesOut={transitionOut ?? { duration: 0 }} style={stylesWithImages ?? ""}` : transitionSvelte}>`;
    const close = `</${tag}>`;

    if (cond) {
      html.push(`${ind()}{#if ${resolveValue(cond)}}`);
      indent += 2;
    }
    if (each) {
      html.push(`${ind()}${each}`);
      indent += 2;
    }

    if (layersHtml) {
      if (isInlineContainer || inlineMode) {
        html.push(`${ind()}${open}${layersHtml}${close}`);
      } else {
        html.push(`${ind()}${open}`);
        html.push(`${layersHtml}`);
        html.push(`${ind()}${close}`);
      }
    } else {
      html.push(`${ind()}${open}${close}`);
    }

    if (each) {
      indent -= 2;
      html.push(`${ind()}{/each}`);
      if (sentinelName) html.push(`${ind()}<div bind:this={${sentinelName}} style="height: 1px; width: 1px;"></div>`);
    }
    if (cond) {
      indent -= 2;
      html.push(`${ind()}{/if}`);
    }
  }

  if (node.text) {
    const layer = node.text;
    let tag = layer["html-tag"] || "span";
    const cond = layer["cond-if"];
    let each: string = "";
    let sentinelName: string = "";
    const contenteditable = layer?.contenteditable ?? "";

    let tabindexAttr = false as boolean;
    let clickEvent: string[] = [];
    let changeEvent: string[] = [];
    let hrefAttr: string = "";
    let targetAttr: string = "";
    let styleAttr: string[] = [];

    if (layer?.this) {
      script.add(`let ${layer.this} = $state<HTMLElement>();`);
    }

    if (layer?.tabindex || layer.tabindex === 0) {
      tabindexAttr = true;
    }

    if (layer?.for && layer?.key) {
      ({ each, sentinelName } = compileEachBlock(layer.for, layer.key, className, script));
    }

    if (layer?.["on-click"]) {
      if (layer["on-click"]?.["navigate-to"] || layer["on-click"]?.["navigate-back"]) {
        if (!layer["html-tag"]) tag = "a";
        hrefAttr = layer["on-click"]["navigate-to"]?.link || layer["on-click"]?.["navigate-back"]?.link || "";
        targetAttr = layer["on-click"]["navigate-to"]?.target || "_self";
      } else if (!layer["html-tag"]) {
        tag = "button";
      }
      tabindexAttr = true;
      const actions = processEventActions(layer["on-click"], script, resolveValue);
      actions.forEach(action => clickEvent.push(`${action};`));
    }

    if (layer?.["on-change"] && contenteditable) {
      const actions = processEventActions(layer["on-change"], script, resolveValue);
      actions.forEach(action => changeEvent.push(`${action};`));
    }

    if (layer?.["on-mount"] || layer?.["on-unmount"]) buildLifecycleActions(script, cond, layer["on-mount"], layer?.["on-unmount"]);

    if (layer?.styles?.fill && Array.isArray(layer.styles.fill) && layer.styles.fill.some(item => "image" in item)) {
      styleAttr.push(backgroundImages("text", layer.styles, script));
    }

    if (layer?.styles?.["cursor-file"]) {
      styleAttr.push(cursorImage(layer.styles, script))
    }

    const transitionSvelte = generateSvelteTransitions(layer?.styles, 'text', parentLay, script);

    if (layer?.content) {
      const open = (cond ? `{#if ${resolveValue(cond)}}` : "") + (each ? `${each}` : "");
      const close = (each ? `{/each}` : "") + (sentinelName ? `<div bind:this={${sentinelName}} style="height: 1px; width: 1px;"></div>` : "") + (cond ? `{/if}` : "");
      const layerHtml = `${open}<${tag}${layer?.this ? ` bind:this={${layer.this}}` : ""}${layer?.id ? ` id={${resolveValue(layer.id)}}` : ""} class="${className}${layer.class ? ` ${layer.class}` : ""}"${styleAttr.length > 0 ? ` style="${styleAttr.join(" ")}"` : ""}${contenteditable !== "" ? ` contenteditable="${contenteditable}"` : ""}${contenteditable === "plaintext-only" && isDynamicValue(layer.content) ? ` bind:textContent={${resolveValue(layer.content)}}` : ""}${contenteditable === true && isDynamicValue(layer.content) ? ` bind:innerHTML={${resolveValue(layer.content)}}` : ""}${changeEvent.length > 0 ? ` onblur={(event) => {${changeEvent.join(" ")}}}` : ""}${transitionSvelte}${hrefAttr ? ` href="${resolveValue(hrefAttr, "text")}"` : ""}${targetAttr ? ` target="${targetAttr}"` : ""}${clickEvent.length > 0 ? ` onclick={() => {${clickEvent.join(" ")}}}` : ""}${tabindexAttr ? ` tabindex={${resolveValue(layer.tabindex || 0)}}` : ""}>{localization(${resolveValue(layer.content)})}</${tag}>${close}`;

      html.push(`${ind()}${layerHtml}`);
    }
  }

  if (node.image) {
    const layer = node.image;
    const cond = layer["cond-if"];
    let each: string = "";
    let sentinelName: string = "";

    let tabindexAttr = false as boolean;
    let clickEvent: string[] = [];
    let styleAttr: string[] = [];

    if (layer?.this) {
      script.add(`let ${layer.this} = $state<HTMLImageElement>();`);
    }

    if (layer?.for && layer?.key) {
      ({ each, sentinelName } = compileEachBlock(layer.for, layer.key, className, script));
    }

    if (layer?.["on-click"]) {
      tabindexAttr = true;
      const actions = processEventActions(layer["on-click"], script, resolveValue);
      actions.forEach(action => clickEvent.push(`${action};`));
    }

    if (layer?.["on-mount"] || layer?.["on-unmount"]) buildLifecycleActions(script, cond, layer["on-mount"], layer?.["on-unmount"]);

    if (layer?.styles?.["cursor-file"]) {
      styleAttr.push(cursorImage(layer.styles, script))
    }

    const transitionSvelte = generateSvelteTransitions(layer?.styles, 'image', parentLay, script);

    const open = (cond ? `{#if ${resolveValue(cond)}}` : "") + (each ? `${each}` : "");
    const close = (each ? `{/each}` : "") + (sentinelName ? `<div bind:this={${sentinelName}} style="height: 1px; width: 1px;"></div>` : "") + (cond ? `{/if}` : "");
    let layerHtml: string = "";

    switch (layer?.source) {
      case "assets":
        if (isDynamicValue(layer.file)) {
          layerHtml = `${open}<img${layer?.this ? ` bind:this={${layer.this}}` : ""}${layer?.id ? ` id={${resolveValue(layer.id)}}` : ""} class="${className}${layer.class ? ` ${layer.class}` : ""}" src="{${resolveValue(layer.file ?? "")}}"${styleAttr.length > 0 ? ` style="${styleAttr.join(" ")}"` : ""}${transitionSvelte} alt="{localization(${resolveValue(layer?.alt ?? "")})}" />${close}`;
        } else {
          const imagePath = typeof layer.file === "string" ? layer.file.replace(/^\.\/assets/, '$assets') : "";
          const fileName = imagePath.split('/').pop()!.replace(/\.svg$/, '').replace(/\.webp$/, '').replace(/\.png$/, '').replace(/\.jpg$/, '').replace(/\.jpeg/, '').replace(/\.gif/, '').replace(/\.avif/, '').replace(/\.heic/, '');
          const componentName = 'Image' + pascalCase(fileName);
          script.add(`import ${componentName} from '${imagePath}';`);
          layerHtml = `${open}<img${layer?.this ? ` bind:this={${layer.this}}` : ""}${layer?.id ? ` id={${resolveValue(layer.id)}}` : ""} class="${className}${layer.class ? ` ${layer.class}` : ""}" src="{${componentName}}"${styleAttr.length > 0 ? ` style="${styleAttr.join(" ")}"` : ""}${transitionSvelte} alt="{localization(${resolveValue(layer?.alt ?? "")})}"${clickEvent.length > 0 ? ` onclick={() => {${clickEvent.join(" ")}}}` : ""}${tabindexAttr ? ` tabindex="0"` : ""} />${close}`;
        }
        break;
      case "web":
        if (isDynamicValue(layer.file)) {
          layerHtml = `${open}<img${layer?.this ? ` bind:this={${layer.this}}` : ""}${layer?.id ? ` id={${resolveValue(layer.id)}}` : ""} class="${className}${layer.class ? ` ${layer.class}` : ""}" src="{${resolveValue(layer.file ?? "")}}"${styleAttr.length > 0 ? ` style="${styleAttr.join(" ")}"` : ""}${transitionSvelte} alt="{localization(${resolveValue(layer?.alt ?? "")})}"${clickEvent.length > 0 ? ` onclick={() => {${clickEvent.join(" ")}}}` : ""}${tabindexAttr ? ` tabindex="0"` : ""} />${close}`;
        } else {
          const imageSrc = typeof layer.file === "string" ? layer.file : "";
          layerHtml = `${open}<img${layer?.this ? ` bind:this={${layer.this}}` : ""}${layer?.id ? ` id={${resolveValue(layer.id)}}` : ""} class="${className}${layer.class ? ` ${layer.class}` : ""}" src="${imageSrc}"${styleAttr.length > 0 ? ` style="${styleAttr.join(" ")}"` : ""}${transitionSvelte} alt="{localization(${resolveValue(layer?.alt ?? "")})}"${clickEvent.length > 0 ? ` onclick={() => {${clickEvent.join(" ")}}}` : ""}${tabindexAttr ? ` tabindex="0"` : ""} />${close}`;
        }
        break;
      case "appwrite":
        script.add(`import { appConfig } from '../appConfig';`);
        if (typeof layer.file === "object" &&
          layer.file !== null &&
          !Array.isArray(layer.file)) {
          const fileData = layer.file;
          const width = fileData.width
            ? `Math.round((${resolveValue(fileData.width)}) * (window.devicePixelRatio || 1))`
            : null;
          const height = fileData.height
            ? `Math.round((${resolveValue(fileData.height)}) * (window.devicePixelRatio || 1))`
            : null;
          const quality = fileData.quality || null;
          const output = fileData.format || '{supportedImageFormat}';
          if (!fileData.format) script.add(`import { supportedImageFormat } from '../../lib/supportedImageFormat';`);

          const queryParts: string[] = [];
          if (width) queryParts.push(`width={${width}}`);
          if (height) queryParts.push(`height={${height}}`);
          if (quality) queryParts.push(`quality=${encodeURIComponent(quality)}`);
          if (output) queryParts.push(`output=${output}`);
          queryParts.push(`project={appConfig?.integrations?.appwrite?.projectId}`);

          const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

          const imageSrc = `{appConfig?.integrations?.appwrite?.endpoint}/storage/buckets/${resolveValue(fileData["bucket-id"], "text")}/files/${resolveValue(fileData["file-id"], "text")}/preview${queryString}`;
          layerHtml = `${open}<img${layer?.this ? ` bind:this={${layer.this}}` : ""}${layer?.id ? ` id={${resolveValue(layer.id)}}` : ""} class="${className}${layer.class ? ` ${layer.class}` : ""}" src="${imageSrc}"${styleAttr.length > 0 ? ` style="${styleAttr.join(" ")}"` : ""}${transitionSvelte} alt="{localization(${resolveValue(layer?.alt ?? "")})}"${clickEvent.length > 0 ? ` onclick={() => {${clickEvent.join(" ")}}}` : ""}${tabindexAttr ? ` tabindex="0"` : ""} />${close}`;
        }
        break;
    }

    html.push(`${ind()}${layerHtml}`);
  }

  if (node.vector) {
    const layer = node.vector;
    let tag = "span";
    const cond = layer["cond-if"];
    let each: string = "";
    let sentinelName: string = "";

    let tabindexAttr = false as boolean;
    let clickEvent: string[] = [];
    let hrefAttr: string = "";
    let targetAttr: string = "";
    let styleAttr: string[] = [];

    if (layer?.this) {
      script.add(`let ${layer.this} = $state<HTMLElement>();`);
    }

    if (layer?.for && layer?.key) {
      ({ each, sentinelName } = compileEachBlock(layer.for, layer.key, className, script));
    }
    if (layer?.["on-click"]) {
      if (layer["on-click"]?.["navigate-to"] || layer["on-click"]?.["navigate-back"]) {
        tag = "a";
        hrefAttr = layer["on-click"]["navigate-to"]?.link || layer["on-click"]?.["navigate-back"]?.link || "";
        targetAttr = layer["on-click"]["navigate-to"]?.target || "_self";
      } else {
        tag = "button";
      }
      tabindexAttr = true;
      const actions = processEventActions(layer["on-click"], script, resolveValue);
      actions.forEach(action => clickEvent.push(`${action};`));
    }

    if (layer?.["on-mount"] || layer?.["on-unmount"]) buildLifecycleActions(script, cond, layer["on-mount"], layer?.["on-unmount"]);

    if (layer?.styles?.["cursor-file"]) {
      styleAttr.push(cursorImage(layer.styles, script))
    }

    const transitionSvelte = generateSvelteTransitions(layer?.styles, 'vector', parentLay, script);

    if (layer?.file) {
      const open = (cond ? `{#if ${resolveValue(cond)}}` : "") + (each ? `${each}` : "");
      const close = (each ? `{/each}` : "") + (sentinelName ? `<div bind:this={${sentinelName}} style="height: 1px; width: 1px;"></div>` : "") + (cond ? `{/if}` : "");
      let layerHtml = "";
      let width = layer.styles?.["lay-width"] || 'auto';
      let height = layer.styles?.["lay-height"] || 'auto';

      if (isDynamicValue(layer.file)) {
        layerHtml = `${open}<${tag}${layer?.this ? ` bind:this={${layer.this}}` : ""}${layer?.id ? ` id={${resolveValue(layer.id)}}` : ""} class="${className}${layer.class ? ` ${layer.class}` : ""}"${styleAttr.length > 0 ? ` style="${styleAttr.join(" ")}"` : ""}${transitionSvelte}${hrefAttr ? ` href="${resolveValue(hrefAttr, "text")}"` : ""}${targetAttr ? ` target="${targetAttr}"` : ""}${clickEvent.length > 0 ? ` onclick={() => {${clickEvent.join(" ")}}}` : ""}${tabindexAttr ? ` tabindex="0"` : ""}><${resolveValue(layer.file)}${width ? ` width="${width}"` : ""}${height ? ` height="${height}"` : ""} /></${tag}>${close}`;
      } else {
        const vectorPath = layer.file.replace(/^\.\/assets/, '$assets');
        const fileName = vectorPath.split('/').pop()!.replace(/\.svg$/, '');
        const componentName = 'Vector' + pascalCase(fileName);

        script.add(`import ${componentName} from '${vectorPath}';`);
        layerHtml = `${open}<${tag}${layer?.this ? ` bind:this={${layer.this}}` : ""}${layer?.id ? ` id={${resolveValue(layer.id)}}` : ""} class="${className}${layer.class ? ` ${layer.class}` : ""}"${styleAttr.length > 0 ? ` style="${styleAttr.join(" ")}"` : ""}${transitionSvelte}${hrefAttr ? ` href="${resolveValue(hrefAttr, "text")}"` : ""}${targetAttr ? ` target="${targetAttr}"` : ""}${clickEvent.length > 0 ? ` onclick={() => {${clickEvent.join(" ")}}}` : ""}${tabindexAttr ? ` tabindex="0"` : ""}><${componentName}${width ? ` width="${width}"` : ""}${height ? ` height="${height}"` : ""} /></${tag}>${close}`;
      }

      if (layerHtml) html.push(`${ind()}${layerHtml}`);
    }
  }

  if (node.field) {
    const layer = node.field;
    const cond = layer["cond-if"];
    let each: string = "";
    let sentinelName: string = "";
    let clickEvent: string[] = [];
    let changeEvent: string[] = [];

    let styleAttr: string[] = [];

    if (layer?.for && layer?.key) {
      ({ each, sentinelName } = compileEachBlock(layer.for, layer.key, className, script));
    }

    if (layer?.["on-click"]) {
      const actions = processEventActions(layer["on-click"], script, resolveValue);
      actions.forEach(action => clickEvent.push(`${action};`));
    }

    if (layer?.["on-change"]) {
      const actions = processEventActions(layer["on-change"], script, resolveValue);
      actions.forEach(action => changeEvent.push(`${action};`));
    }

    if (layer?.["on-mount"] || layer?.["on-unmount"]) buildLifecycleActions(script, cond, layer["on-mount"], layer?.["on-unmount"]);

    if (layer?.styles?.["cursor-file"]) {
      styleAttr.push(cursorImage(layer.styles, script))
    }

    const transitionSvelte = generateSvelteTransitions(layer?.styles, 'field', parentLay, script);

    const open = (cond ? `{#if ${resolveValue(cond)}}` : "") + (each ? `${each}` : "");
    const close = (each ? `{/each}` : "") + (sentinelName ? `<div bind:this={${sentinelName}} style="height: 1px; width: 1px;"></div>` : "") + (cond ? `{/if}` : "");
    let layerHtml: string = "";

    const fieldType = layer?.type || "text";

    let pattern = layer?.pattern ? resolveValue(layer.pattern) : "";
    let mask = layer?.mask ? resolveValue(layer.mask) : "";
    let useFormat = false;
    if (!pattern && (layer.inputmode === "decimal" || layer.inputmode === "numeric")) {
      useFormat = true;
    }
    if (useFormat || mask) {
      script.add(`import { useFormat } from '../../lib/useFormat';`);
    }

    if (fieldType === "textarea") {
      if (layer?.this) {
        script.add(`let ${layer.this} = $state<HTMLTextAreaElement>();`);
      }
      let autoresize = false;
      if (layer?.styles?.["lay-height"] && layer.styles["lay-height"] === "hug-contents") {
        autoresize = true;
        script.add(`import { textareaAutoResize } from '../../lib/textareaAutoResize';`);
      }
      layerHtml = `${open}<textarea${layer?.inputmode ? ` inputmode={${resolveValue(layer.inputmode)}}` : ""}${layer?.id ? ` id={${resolveValue(layer.id)}}` : ""} class="${className}${layer.class ? ` ${layer.class}` : ""}"${styleAttr.length > 0 ? ` style="${styleAttr.join(" ")}"` : ""}${layer?.this ? ` bind:this={${layer.this}}` : ""} ${isDynamicValue(layer.value) ? "bind:" : ""}value="${resolveValue(layer.value, "text")}" placeholder="{localization(${resolveValue(layer?.placeholder ?? "")})}"${layer?.name ? ` name="${layer.name}"` : ""}${layer?.disabled ? ` class:disabled={${resolveValue(layer?.disabled)}} disabled={${resolveValue(layer.disabled)}}` : ""}${layer?.selected ? ` class:selected={${resolveValue(layer?.selected)}}` : ""}${layer?.readonly ? ` readonly={${resolveValue(layer.readonly)}}` : ""}${layer?.hidden ? ` hidden={${resolveValue(layer.hidden)}}` : ""}${layer?.required ? ` required={${resolveValue(layer.required)}}` : ""}${layer?.minlength ? ` minlength={${resolveValue(layer.minlength)}}` : ""}${layer?.maxlength ? ` maxlength={${resolveValue(layer.maxlength)}}` : ""}${useFormat || mask ? ` use:useFormat${mask ? `={${mask}}` : ""}` : ""}${layer?.autocomplete ? ` autocomplete={${resolveValue(layer.autocomplete)}}` : ""}${layer?.rows ? ` rows={${resolveValue(layer.rows)}}` : ""}${autoresize ? ` use:textareaAutoResize` : ""}${changeEvent.length > 0 ? ` onchange={(event: Event & { currentTarget: EventTarget & HTMLInputElement }) => {${changeEvent.join(" ")}}}` : ""}${layer?.styles?.pressed ? " use:pressEffect" : ""}${clickEvent.length > 0 ? ` onclick={() => {${clickEvent.join(" ")}}}` : ""}${transitionSvelte}></textarea>${close}`;
    } else {
      if (layer?.this) {
        script.add(`let ${layer.this} = $state<HTMLInputElement>();`);
      }
      layerHtml = `${open}<input type={${resolveValue(fieldType)}}${layer?.inputmode ? ` inputmode={${resolveValue(layer.inputmode)}}` : ""}${layer?.id ? ` id={${resolveValue(layer.id)}}` : ""} class="${className}${layer.class ? ` ${layer.class}` : ""}"${styleAttr.length > 0 ? ` style="${styleAttr.join(" ")}"` : ""}${layer?.this ? ` bind:this={${layer.this}}` : ""} ${isDynamicValue(layer.value) ? "bind:" : ""}value="${resolveValue(layer.value, "text")}" placeholder="{localization(${resolveValue(layer?.placeholder ?? "")})}"${layer?.name ? ` name="${layer.name}"` : ""}${layer?.disabled ? ` class:disabled={${resolveValue(layer?.disabled)}} disabled={${resolveValue(layer.disabled)}}` : ""}${layer?.selected ? ` class:selected={${resolveValue(layer?.selected)}}` : ""}${layer?.readonly ? ` readonly={${resolveValue(layer.readonly)}}` : ""}${layer?.hidden ? ` hidden={${resolveValue(layer.hidden)}}` : ""}${layer?.required ? ` required={${resolveValue(layer.required)}}` : ""}${layer?.min ? ` min={${resolveValue(layer.min)}}` : ""}${layer?.max ? ` max={${resolveValue(layer.max)}}` : ""}${layer?.minlength ? ` minlength={${resolveValue(layer.minlength)}}` : ""}${layer?.maxlength ? ` maxlength={${resolveValue(layer.maxlength)}}` : ""}${pattern ? ` pattern={${pattern}}` : ""}${useFormat || mask ? ` use:useFormat${mask ? `={${mask}}` : ""}` : ""}${layer?.accept ? ` accept={${resolveValue(layer.accept)}}` : ""}${layer?.multiple ? " multiple" : ""}${layer?.autocomplete ? ` autocomplete={${resolveValue(layer.autocomplete)}}` : ""}${layer?.step ? ` step={${resolveValue(layer.step)}}` : ""}${layer?.selected ? ` checked={${resolveValue(layer.selected)}}` : ""}${changeEvent.length > 0 ? ` onchange={(event: Event & { currentTarget: EventTarget & HTMLInputElement }) => {${changeEvent.join(" ")}}}` : ""}${layer?.styles?.pressed ? " use:pressEffect" : ""}${clickEvent.length > 0 ? ` onclick={() => {${clickEvent.join(" ")}}}` : ""}${transitionSvelte} />${close}`;
    }

    html.push(`${ind()}${layerHtml}`);
  }

  if (node.iframe) {
    const layer = node.iframe;
    const cond = layer["cond-if"];

    let tabindexAttr = false as boolean;
    let clickEvent: string[] = [];
    let keydownAttr: string = "";
    let styleAttr: string[] = [];

    if (layer?.this) {
      script.add(`let ${layer.this} = $state<HTMLIFrameElement>();`);
    }

    if (layer?.tabindex || layer.tabindex === 0) {
      tabindexAttr = true;
    }

    if (layer?.["on-click"]) {
      tabindexAttr = true;
      const actions = processEventActions(layer["on-click"], script, resolveValue);
      actions.forEach(action => clickEvent.push(`${action};`));
    }

    if (layer?.["on-mount"] || layer?.["on-unmount"]) buildLifecycleActions(script, cond, layer["on-mount"], layer?.["on-unmount"]);

    if (layer?.["on-keydown"] && layer["on-keydown"].length > 0) {
      tabindexAttr = true;
      keydownAttr = ` onkeydown={handle${pascalCase(nodeId)}Keydown}`;
      let keydownScript: string[] = [];

      keydownScript.push(`function handle${pascalCase(nodeId)}Keydown(event: KeyboardEvent) {`);
      for (const item of layer["on-keydown"]) {
        const keyActions = processEventActions(item, script, resolveValue);

        keydownScript.push(`  if (${getKeyCondition(item.key)}) {`);
        keydownScript.push(`    event.preventDefault();`);
        if (keyActions.length > 0) {
          keydownScript.push(`    ${keyActions.join("; ")};`);
        }
        keydownScript.push(`  }`);
      }
      keydownScript.push(`}`);
      script.add(keydownScript.join("\n"));
    }

    if (layer?.styles?.["cursor-file"]) {
      styleAttr.push(cursorImage(layer.styles, script))
    }

    const transitionSvelte = generateSvelteTransitions(layer?.styles, 'iframe', parentLay, script);

    if (layer?.src) {
      const open = cond ? `{#if ${resolveValue(cond)}}` : "";
      const close = cond ? `{/if}` : "";
      const layerHtml = `${open}<iframe${layer?.this ? ` bind:this={${layer.this}}` : ""}${layer?.id ? ` id={${resolveValue(layer.id)}}` : ""} src={${resolveValue(layer.src)}} class="${className}${layer.class ? ` ${layer.class}` : ""}"${styleAttr.length > 0 ? ` style="${styleAttr.join(" ")}"` : ""}${clickEvent.length > 0 ? ` onclick={() => {${clickEvent.join(" ")}}}` : ""}${keydownAttr}${tabindexAttr ? ` tabindex={${resolveValue(layer.tabindex || 0)}}` : ""}${transitionSvelte} /></iframe>${close}`;

      html.push(`${ind()}${layerHtml}`);
    }
  }

  if (node.canvas) {
    const layer = node.canvas;
    const cond = layer["cond-if"];

    let tabindexAttr = false as boolean;
    let clickEvent: string[] = [];
    let keydownAttr: string = "";
    let styleAttr: string[] = [];

    if (layer?.this) {
      script.add(`let ${layer.this} = $state<HTMLCanvasElement>();`);
    }

    if (layer?.tabindex || layer.tabindex === 0) {
      tabindexAttr = true;
    }

    if (layer?.["on-click"]) {
      tabindexAttr = true;
      const actions = processEventActions(layer["on-click"], script, resolveValue);
      actions.forEach(action => clickEvent.push(`${action};`));
    }

    if (layer?.["on-mount"] || layer?.["on-unmount"]) buildLifecycleActions(script, cond, layer["on-mount"], layer?.["on-unmount"]);

    if (layer?.["on-keydown"] && layer["on-keydown"].length > 0) {
      tabindexAttr = true;
      keydownAttr = ` onkeydown={handle${pascalCase(className)}Keydown}`;
      let keydownScript: string[] = [];

      keydownScript.push(`function handle${pascalCase(className)}Keydown(event: KeyboardEvent) {`);
      for (const item of layer["on-keydown"]) {
        const keyActions = processEventActions(item, script, resolveValue);

        keydownScript.push(`  if (${getKeyCondition(item.key)}) {`);
        keydownScript.push(`    event.preventDefault();`);
        if (keyActions.length > 0) {
          keydownScript.push(`    ${keyActions.join("; ")};`);
        }
        keydownScript.push(`  }`);
      }
      keydownScript.push(`}`);
      script.add(keydownScript.join("\n"));
    }

    if (layer?.styles?.["cursor-file"]) {
      styleAttr.push(cursorImage(layer.styles, script))
    }

    const transitionSvelte = generateSvelteTransitions(layer?.styles, 'canvas', parentLay, script);

    const open = cond ? `{#if ${resolveValue(cond)}}` : "";
    const close = cond ? `{/if}` : "";
    const layerHtml = `${open}<canvas${layer?.this ? ` bind:this={${layer.this}}` : ""}${layer?.id ? ` id={${resolveValue(layer.id)}}` : ""} class="${className}${layer.class ? ` ${layer.class}` : ""}"${styleAttr.length > 0 ? ` style="${styleAttr.join(" ")}"` : ""}${clickEvent.length > 0 ? ` onclick={() => {${clickEvent.join(" ")}}}` : ""}${keydownAttr}${tabindexAttr ? ` tabindex={${resolveValue(layer.tabindex || 0)}}` : ""}${transitionSvelte} /></canvas>${close}`;

    html.push(`${ind()}${layerHtml}`);
  }

  const componentEntry = Object.entries(node).find(([key]) => key.startsWith('c.'));
  if (componentEntry) {
    const [key, layer] = componentEntry as [string, ComponentLayer];
    const componentProps: string[] = [];
    if (layer?.props) {
      for (const [key, value] of Object.entries(layer.props)) {
        const isBind = key.startsWith('.');
        let newKey = isBind ? key.slice(1) : key;
        let newValue;

        if (typeof value === 'string' && value.includes('./assets')) {
          // 1. Ищем пути в кавычках (например, './assets/vectors/eye.svg' или "./assets/images/pic.png")
          // Регулярка найдет путь, окруженный одинарными или двойными кавычками
          const quotedPathRegex = /(['"])(\.\/assets\/(?:images|vectors)\/[^'"]+)\1/g;

          const imports = new Set<string>();
          let hasMatch = false;

          // Заменяем найденные пути на переменные прямо в строке value
          newValue = value.replace(quotedPathRegex, (fullMatch, _quote, path) => {
            const result = processAssetPath(path);
            if (result) {
              hasMatch = true;
              imports.add(result.importStr);
              return result.varName;
            }
            return fullMatch;
          });
          newValue = resolveValue(newValue ?? '');

          if (!hasMatch) {
            if (value.startsWith('./assets/images') || value.startsWith('./assets/vectors')) {
              const result = processAssetPath(value);
              if (result) {
                hasMatch = true;
                imports.add(result.importStr);
                newValue = result.varName;
              }
            }
          }

          // 3. Добавляем импорты в скрипт
          if (hasMatch) {
            imports.forEach(imp => script.add(imp));
          } else {
            newValue = resolveValue(value ?? "");
          }
        } else {
          newValue = resolveValue(value ?? "");
        }

        componentProps.push(`${isBind ? "bind:" : ""}${newKey}={${newValue}}`);
      }
    }

    const cond = layer["cond-if"];
    let each: string = "";
    let sentinelName: string = "";

    let clickEvent: string[] = [];
    let styleAttr: string[] = [];

    if (layer?.this) {
      script.add(`let ${layer.this} = $state<HTMLElement>();`);
      componentProps.push(`bind:this={${layer.this}}`);
    }

    if (layer?.for && layer?.key) {
      ({ each, sentinelName } = compileEachBlock(layer.for, layer.key, className, script));
    }

    if (layer?.["on-click"]) {
      const actions = processEventActions(layer["on-click"], script, resolveValue);
      actions.forEach(action => clickEvent.push(`${action};`));
    }

    if (layer?.["on-mount"] || layer?.["on-unmount"]) buildLifecycleActions(script, cond, layer["on-mount"], layer?.["on-unmount"]);

    if (layer?.styles?.fill && Array.isArray(layer.styles.fill) && layer.styles.fill.some(item => "image" in item)) {
      styleAttr.push(backgroundImages("frame", layer.styles, script));
    }

    if (layer?.styles?.["cursor-file"]) {
      styleAttr.push(cursorImage(layer.styles, script))
    }

    if (className) {
      componentProps.push(`inheritedСlass="${className}"`);
    }
    if (styleAttr.length > 0) {
      componentProps.push(`stylesWithImages="${styleAttr.join(" ")}"`);
    }
    if (clickEvent.length) {
      componentProps.push(`onclick={() => {${clickEvent.join(" ")}}}`);
    }

    const transitionSvelte = generateSvelteTransitions(layer?.styles, 'component', parentLay, script);

    const componentName = pascalCase(key.slice(2));
    script.add(`import ${componentName} from '../components/${componentName}.svelte';`);

    const open = (cond ? `{#if ${resolveValue(cond)}}` : "") + (each ? `${each}` : "");
    const close = (each ? `{/each}` : "") + (sentinelName ? `<div bind:this={${sentinelName}} style="height: 1px; width: 1px;"></div>` : "") + (cond ? `{/if}` : "");
    html.push(`${ind()}${open}<${componentName}${componentProps.length > 0 ? ` ${componentProps.join(" ")}${transitionSvelte}` : ""} />${close}`)
  }

  return {
    script: script,
    html: html.join(inlineMode ? "" : "\n"),
  };
}

type LocalizedText = Record<string, string>;
export function escapeHtml(text: string | LocalizedText): string | LocalizedText {
  const escape = (s: string): string =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  if (typeof text === "string") {
    return escape(text);
  }

  const result: LocalizedText = {};
  for (const key in text) {
    result[key] = escape(text[key]);
  }
  return result;
}
