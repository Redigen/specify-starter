import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import type { AppConfig } from "../types/app.ts";

export function updateWebFiles(yamlApp: AppConfig, rootDir: string) {
  const htmlPath = path.join(rootDir, "index.html");
  const manifestPath = path.join(rootDir, "app.webmanifest");

  // 1. Обновление index.html
  if (existsSync(htmlPath)) {
    const oldHtml = readFileSync(htmlPath, "utf-8");
    let newHtml = oldHtml;

    // Обновляем <html lang="...">
    newHtml = newHtml.replace(
      /(<html\s+lang=")[^"]*(")/i,
      `$1${yamlApp.lang}$2`
    );

    // Обновляем <title>...</title>
    newHtml = newHtml.replace(
      /(<title>)[\s\S]*?(<\/title>)/i,
      `$1${yamlApp.meta.title}$2`
    );

    // Обновляем <meta name="description" content="..." />
    newHtml = newHtml.replace(
      /(<meta\s+name=["']description["']\s+content=["'])([^"']*)(["']\s*\/?>)/i,
      `$1${yamlApp.meta.description}$3`
    );

    // СВЕРКА: Записываем только если HTML действительно изменился
    if (newHtml !== oldHtml) {
      writeFileSync(htmlPath, newHtml, "utf-8");
      console.log("✅ [Specify-Plugin] index.html updated.");
    }
  } else {
    console.warn(`⚠️ [Specify-Plugin] index.html not found: ${htmlPath}`);
  }

  // 2. Обновление app.webmanifest
  if (existsSync(manifestPath)) {
    try {
      const oldManifestContent = readFileSync(manifestPath, "utf-8");
      const manifest = JSON.parse(oldManifestContent);

      // В манифесте используется snake_case, а в YAML kebab-case
      manifest.name = yamlApp["app-label"].name;
      manifest.short_name = yamlApp["app-label"]["short-name"];

      const newManifestContent = JSON.stringify(manifest, null, 2);

      // СВЕРКА: Записываем только если содержимое манифеста изменилось
      if (newManifestContent !== oldManifestContent) {
        writeFileSync(manifestPath, newManifestContent, "utf-8");
        console.log("✅ [Specify-Plugin] app.webmanifest updated.");
      }
    } catch (error) {
      console.error("❌ [Specify-Plugin] Parsing error app.webmanifest:", error);
    }
  } else {
    console.warn(`⚠️ [Specify-Plugin] app.webmanifest not found: ${manifestPath}`);
  }
}
