import { writeFileSync, mkdirSync } from "fs";
import path from "path";

import type { Localization } from "../types/localization.ts";
import type { Styles } from "../types/styles.ts";
import type { Layers } from "../types/layers.ts";

// Для отладки
import util from "util";
util.inspect.defaultOptions.depth = null;
util.inspect.defaultOptions.colors = true;

interface Meta {
  title: Localization;
  description: Localization;
}

export interface Screen {
  [screenId: string]: {
    path: string | string[];
    meta?: Meta;
    data?: GetData | any;
    styles?: Styles;
    layers?: Layers[];
  };
}

export interface GetData {
  source: "databases" | "user-account" | "teems" | "teem-memberships";
  database?: string;
  table?: string;
  team?: string;
  query?: GetDataQuery;
  cache?: "localStorage" | "sessionStorage";
  realtime?: boolean;
  "infinite-scroll"?: boolean;
}

export interface GetDataQuery {
  columns?: string[];
  rules?: GetDataRules;
  order?: GetDataOrder[];
  limit?: number;
  offset?: number;
}

export interface GetDataRules {
  and?: GetDataRule[];
  or?: GetDataRule[];
}

export interface GetDataRule extends GetDataRules {
  column: string;
  operator: string;
  value: any;
}

export interface GetDataOrder {
  column: string;
  type: "asc" | "desc" | "random";
}

export function generateRouting(screens: Screen[], outputDir: string): void {
  const imports: string[] = [];
  const routes = screens.flatMap((screenObj) =>
    Object.entries(screenObj).map(([screenId, config]) => {
      imports.push(`import ${pascalCase(screenId)} from "./${pascalCase(screenId)}.svelte";`);
      return {
        id: screenId,
        path: Array.isArray(config.path) ? config.path : [config.path],
        component: pascalCase(screenId),
      };
    }),
  );

  const routesCode = routes
    .map(
      (r) => `  {
    id: "${r.id}",
    path: [${r.path.map((p) => `"${p}"`).join(", ")}],
    component: ${r.component},
  }`,
    )
    .join(",\n");


  const content = `
import type { Component } from "svelte";
${imports.join("\n")}

export interface ScreenDefinition {
  id: string;
  path: string[];
  component: Component<any, any, any>;
}

export const screens: ScreenDefinition[] = [
${routesCode}
];
  `;

  const outPath = path.join(
    outputDir,
    "screens",
    `index.ts`,
  );
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, content, "utf-8");
}

function pascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
}

`

import type { Component } from "svelte";
import Landing from "./Landing.svelte";
import Main from "./Main.svelte";

export interface ScreenDefinition {
  id: string;
  path: string[];
  component: Component<any, any, any>;
}

export const screens: ScreenDefinition[] = [
  {
    id: "landing",
    path: ["/"],
    component: Landing,
  },
  {
    id: "main",
    path: ["/:tenantId", "/:tenantId/about", "/:tenantId/cart", "/:tenantId/my-orders"],
    component: Main,
  }
];

`
