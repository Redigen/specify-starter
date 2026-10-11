import { writeFileSync } from "fs";
import path from "path";
import type { AppConfig } from "../types/app.ts";

function stringifyTs(obj: unknown, indent: number = 0): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }

  const str = JSON.stringify(obj, null, 2);
  const indentStr = " ".repeat(indent);

  const indentedStr = str.replace(/\n/g, `\n${indentStr}`);
  return indentedStr.replace(/^(\s*)"([a-zA-Z_$][\w$]*)":/gm, '$1$2:');
}

export function generateAppConfig(yamlApp: AppConfig, outputDir: string) {
  const ts = `// Auto-generated from app.yaml
// Do not edit manually

export interface AppConfig {
  "specs-version": number;
  lang: string;
  meta: MetaData;
  "app-label": AppLabel;
  themes: AppThemes;
  integrations: any;
}

export interface MetaData {
  title: string;
  description: string;
}

export interface AppLabel {
  name: string;
  "short-name": string;
}

export interface AppThemes {
  light: string;
  dark: string;
}

export const appConfig: AppConfig = {
  "specs-version": ${yamlApp["specs-version"]},
  lang: ${JSON.stringify(yamlApp.lang)},
  meta: {
    title: ${JSON.stringify(yamlApp.meta.title)},
    description: ${JSON.stringify(yamlApp.meta.description)},
  },
  "app-label": {
    name: ${JSON.stringify(yamlApp["app-label"].name)},
    "short-name": ${JSON.stringify(yamlApp["app-label"]["short-name"])}
  },
  themes: {
    light: ${JSON.stringify(yamlApp.themes.light)},
    dark: ${JSON.stringify(yamlApp.themes.dark)},
  },
  integrations: ${stringifyTs(yamlApp.integrations, 2)},
};
`;

  writeFileSync(path.join(outputDir, "appConfig.ts"), ts, "utf-8");
}
