import { writeFileSync, mkdirSync } from "fs";
import path from "path";

import { pascalCase } from "../utils/pascalCase.ts";
import type { Screen } from "../types/screens.ts";

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

