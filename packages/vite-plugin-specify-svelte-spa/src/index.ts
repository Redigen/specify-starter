import type { Plugin } from "vite";
import { readFileSync, readdirSync, existsSync, unlinkSync, mkdirSync } from "fs";
import { parse } from "yaml";
import path from "path";
import { generateTokensCSS } from "./generator/tokens.ts";
import { generateScreens, type Screen } from "./generator/screens.ts";
import { generateComponents, type Component } from "./generator/components.ts";
import { generateRouting } from "./generator/routing.ts";
import { generateAppConfig } from "./generator/appConfig.ts";
import { updateWebFiles } from "./generator/updateWebFiles.ts";
import type { AppConfig } from "./types/app.ts";

const VIRTUAL_PREFIX = "\0generated/";

interface PluginOptions {
  specsDir: string;
  appDir: string;
  generatedDir: string;
}

export default function specifyPlugin(options: PluginOptions): Plugin {
  const { specsDir, appDir, generatedDir } = options;

  let screenPathsCache: Record<string, string | string[]> = {};
  const normalizePath = (p: any): string => Array.isArray(p) ? p.join(",") : (p || "");

  function cleanGenerated() {
    const dirsToClean = [
      generatedDir,
      path.join(generatedDir, "components"),
      path.join(generatedDir, "screens"),
    ];

    for (const dir of dirsToClean) {
      if (existsSync(dir)) {
        for (const file of readdirSync(dir)) {
          if (/\.(svelte)$/.test(file)) {
            try {
              unlinkSync(path.join(dir, file));
            } catch (e) {
              console.error(`❌ [Specify-Plugin] Deletion error ${file}:`, e);
            }
          }
        }
      } else {
        mkdirSync(dir, { recursive: true });
      }
    }
  }

  function readBaseConfigs() {
    const rawApp = readFileSync(`${specsDir}/app.yaml`, "utf-8");
    const yamlApp = parse(rawApp) as AppConfig;
    const rawTokens = readFileSync(`${specsDir}/tokens.yaml`, "utf-8");
    const yamlTokens = parse(rawTokens);
    return { yamlApp, yamlTokens };
  }

  function regenerateComponents() {
    const componentsDir = path.join(specsDir, "components");
    if (!existsSync(componentsDir)) return;

    const { yamlApp, yamlTokens } = readBaseConfigs();
    for (const file of readdirSync(componentsDir)) {
      if (!file.endsWith(".yaml")) continue;
      const raw = readFileSync(path.join(componentsDir, file), "utf-8");
      if (!raw.trim()) continue;
      const component = parse(raw) as Component;
      if (component) {
        generateComponents(component, generatedDir, yamlApp, yamlTokens);
      }
    }
  }

  function regenerateScreens() {
    const screensDir = path.join(specsDir, "screens");
    if (!existsSync(screensDir)) return;

    const { yamlApp, yamlTokens } = readBaseConfigs();
    const screens: Screen[] = [];
    screenPathsCache = {};

    for (const file of readdirSync(screensDir)) {
      if (!file.endsWith(".yaml")) continue;
      const raw = readFileSync(path.join(screensDir, file), "utf-8");
      if (!raw.trim()) continue;
      const parsed = parse(raw);
      if (parsed) {
        for (const [screenId, screenData] of Object.entries(parsed)) {
          screenPathsCache[screenId] = (screenData as any)?.path || "";
        }
        screens.push(parsed as Screen);
      }
    }

    for (const screen of screens) {
      generateScreens(screen, generatedDir, yamlApp, yamlTokens);
    }

    if (screens.length > 0) {
      generateRouting(screens, generatedDir);
    }
  }

  return {
    name: "Specify-Plugin",

    resolveId(id) {
      if (id === "generated/tokens.css") {
        return VIRTUAL_PREFIX + id.slice("generated/".length);
      }
      return null;
    },

    load(id) {
      if (!id.startsWith(VIRTUAL_PREFIX)) {
        return null;
      }

      const name = id.slice(VIRTUAL_PREFIX.length);

      if (name === "tokens.css" || name === "app.css") {
        const { yamlApp, yamlTokens } = readBaseConfigs();
        return generateTokensCSS(yamlTokens, yamlApp);
      }

      return null;
    },

    buildStart() {
      cleanGenerated();

      this.addWatchFile(path.join(specsDir, "tokens.yaml"));
      this.addWatchFile(path.join(specsDir, "app.yaml"));

      const componentsDir = path.join(specsDir, "components");
      if (existsSync(componentsDir)) {
        for (const file of readdirSync(componentsDir)) {
          if (file.endsWith(".yaml")) this.addWatchFile(path.join(componentsDir, file));
        }
      }

      const screensDir = path.join(specsDir, "screens");
      if (existsSync(screensDir)) {
        for (const file of readdirSync(screensDir)) {
          if (file.endsWith(".yaml")) this.addWatchFile(path.join(screensDir, file));
        }
      }

      const { yamlApp } = readBaseConfigs();
      generateAppConfig(yamlApp, generatedDir);
      updateWebFiles(yamlApp, appDir);

      regenerateComponents();
      regenerateScreens();
    },

    configureServer(server) {
      const screensDir = path.join(specsDir, "screens");
      const componentsDir = path.join(specsDir, "components");

      if (existsSync(specsDir)) server.watcher.add(specsDir);
      if (existsSync(screensDir)) server.watcher.add(screensDir);
      if (existsSync(componentsDir)) server.watcher.add(componentsDir);
    },

    handleHotUpdate({ file, server }) {
      const normalizedFile = file.replace(/\\/g, "/");

      if (normalizedFile.endsWith("app.yaml")) {
        const { yamlApp, yamlTokens } = readBaseConfigs();
        generateAppConfig(yamlApp, generatedDir);
        updateWebFiles(yamlApp, appDir);

        const cssModId = VIRTUAL_PREFIX + "tokens.css";
        const cssMod = server.moduleGraph.getModuleById(cssModId);
        if (cssMod) {
          server.moduleGraph.invalidateModule(cssMod);
        }

        server.ws.send({ type: "full-reload" });
        return [];
      }

      if (normalizedFile.endsWith("tokens.yaml")) {
        const cssModId = VIRTUAL_PREFIX + "tokens.css";
        const cssMod = server.moduleGraph.getModuleById(cssModId);
        if (cssMod) {
          server.moduleGraph.invalidateModule(cssMod);
          return [cssMod];
        }
        return [];
      }

      if (normalizedFile.includes("/components/") && normalizedFile.endsWith(".yaml")) {
        const { yamlApp, yamlTokens } = readBaseConfigs();
        const raw = readFileSync(file, "utf-8");

        if (raw.trim()) {
          const parsed = parse(raw) as Component;
          if (parsed) {
            generateComponents(parsed, generatedDir, yamlApp, yamlTokens);
          }
        }

        return [];
      }

      if (normalizedFile.includes("/screens/") && normalizedFile.endsWith(".yaml")) {
        const { yamlApp, yamlTokens } = readBaseConfigs();
        const raw = readFileSync(file, "utf-8");

        let needRoutingUpdate = false;

        if (raw.trim()) {
          const parsed = parse(raw) as Screen;
          if (parsed) {
            generateScreens(parsed, generatedDir, yamlApp, yamlTokens);

            for (const [screenId, screenData] of Object.entries(parsed)) {
              const currentPath = (screenData as any)?.path || "";
              const cachedPath = screenPathsCache[screenId];

              if (!cachedPath || normalizePath(cachedPath) !== normalizePath(currentPath)) {
                needRoutingUpdate = true;
                screenPathsCache[screenId] = currentPath;
              }
            }
          }
        }

        if (needRoutingUpdate) {
          const screensDir = path.join(specsDir, "screens");
          const screens: Screen[] = [];
          if (existsSync(screensDir)) {
            for (const f of readdirSync(screensDir)) {
              if (!f.endsWith(".yaml")) continue;
              const r = readFileSync(path.join(screensDir, f), "utf-8");
              if (r.trim()) {
                const s = parse(r) as Screen;
                if (s) screens.push(s);
              }
            }
          }
          if (screens.length > 0) {
            generateRouting(screens, generatedDir);
          }
        }

        return [];
      }

    },
  };
}
