import chokidar from "chokidar";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import fg from "fast-glob";

const ROOT = process.cwd();
const ASSETS_DIR = path.join(ROOT, "assets");
const SPECS_DIR = path.join(ROOT, "specs");
const SCHEMAS_DIR = path.join(SPECS_DIR, "schemas");
const COMPONENTS_DIR = path.join(SPECS_DIR, "components");
const VSCODE_DIR = path.join(ROOT, ".vscode");

const REMOVE_MARKER = "__REMOVE_ME__";

// 1. Функция сканирования ассетов
function getAssetsList(folderName: string): string[] {
  const normalizedFolder = folderName.replace(/\\/g, "/");
  const folderPath = path.join(ASSETS_DIR, normalizedFolder);
  if (!fs.existsSync(folderPath)) return [];

  try {
    const files = fg.sync("**/*", { cwd: folderPath, onlyFiles: true });
    return files.map((f) => `./assets/${normalizedFolder}/${f}`);
  } catch (err) {
    console.error(`❌ [Specify-Sync] Scan error ${folderPath}:`, err);
    return [];
  }
}

function getThemes(): string[] {
  const tokensPath = path.join(SPECS_DIR, "tokens.yaml");
  if (!fs.existsSync(tokensPath)) return [];

  try {
    const tokensYaml = yaml.load(
      fs.readFileSync(tokensPath, "utf-8"),
    ) as Record<string, any>;

    const themes = tokensYaml.themes;
    if (!themes || typeof themes !== "object") return [];

    return Object.keys(themes);
  } catch (err) {
    console.error("❌ [Specify-Sync] Error reading themes:", err);
    return [];
  }
}

// 2. Функция чтения токенов из tokens.yaml с разделением по группам
function getTokensByGroup(): Record<string, string[]> {
  const tokensPath = path.join(SPECS_DIR, "tokens.yaml");
  if (!fs.existsSync(tokensPath)) return {};

  try {
    const tokensYaml = yaml.load(
      fs.readFileSync(tokensPath, "utf-8"),
    ) as Record<string, any>;

    const result: Record<string, string[]> = {};

    // 1. Сначала берём группы с корневого уровня (palette, typography, spacing, etc.)
    for (const groupName in tokensYaml) {
      // Пропускаем themes — это отдельная секция
      if (groupName === "themes") continue;

      const groupObj = tokensYaml[groupName];
      if (typeof groupObj !== "object" || groupObj === null) continue;

      const groupTokens = Object.keys(groupObj).map(
        (key) => `t.${groupName}.${key}`,
      );
      result[groupName.toLowerCase()] = groupTokens;
    }

    // 2. Мёрджим группы из themes.default (color, gradient, shadow)
    const themes = tokensYaml.themes;
    if (themes && typeof themes === "object") {
      // Берём первую тему или явно default
      const baseTheme = themes.default || Object.values(themes)[0];

      if (baseTheme && typeof baseTheme === "object") {
        for (const groupName in baseTheme) {
          const groupObj = baseTheme[groupName];
          if (typeof groupObj !== "object" || groupObj === null) continue;

          const groupTokens = Object.keys(groupObj).map(
            (key) => `t.${groupName}.${key}`,
          );

          // Объединяем с корневыми токенами (если группа есть в обоих)
          const existing = result[groupName.toLowerCase()] || [];
          const merged = [...new Set([...existing, ...groupTokens])];
          result[groupName.toLowerCase()] = merged;
        }
      }
    }

    return result;
  } catch (err) {
    console.error("❌ [Specify-Sync] Error reading tokens.yaml:", err);
    return {};
  }
}

// Удаляет маркер из JSON-строки, корректно обрабатывая запятые и скобки
function cleanRemoveMarkers(jsonStr: string): string {
  let result = jsonStr;

  // Повторяем, пока есть маркеры (для случаев нескольких подряд)
  let prev;
  do {
    prev = result;

    // Маркер между двумя элементами: "a", "__REMOVE_ME__", "b" → "a", "b"
    result = result.replace(/,\s*"__REMOVE_ME__"\s*,/g, ",");

    // Маркер в начале массива: ["__REMOVE_ME__", "a"] → ["a"]
    result = result.replace(/\[\s*"__REMOVE_ME__"\s*,/g, "[");

    // Маркер в конце массива: ["a", "__REMOVE_ME__"] → ["a"]
    result = result.replace(/,\s*"__REMOVE_ME__"\s*\]/g, "]");

    // Маркер — единственный элемент: ["__REMOVE_ME__"] → []
    result = result.replace(/\[\s*"__REMOVE_ME__"\s*\]/g, "[]");

    // Маркер в объекте как значение: "key": "__REMOVE_ME__" → "key": null
    result = result.replace(/:\s*"__REMOVE_ME__"/g, ": null");

    // Одиночный маркер без контекста
    result = result.replace(/"__REMOVE_ME__"/g, "null");
  } while (result !== prev);

  // Чистим лишние запятые
  result = result.replace(/,\s*,/g, ",");
  result = result.replace(/\[\s*,/g, "[");
  result = result.replace(/,\s*\]/g, "]");

  // Удаляем пустые enum: "enum": [] (с запятой перед или после, или без)
  result = result.replace(/,\s*"enum"\s*:\s*\[\s*\]/g, "");
  result = result.replace(/"enum"\s*:\s*\[\s*\]\s*,/g, "");
  result = result.replace(/"enum"\s*:\s*\[\s*\]/g, "");

  // Чистим оставшиеся лишние запятые в объектах после удаления enum
  result = result.replace(/,\s*}/g, "}");
  result = result.replace(/{\s*,/g, "{");

  return result;
}

// 3. Главная функция обновления base.schema.json
export function updateBaseSchema() {
  const templatePath = path.join(SCHEMAS_DIR, "base.template.json");
  if (!fs.existsSync(templatePath)) {
    console.warn("⚠️ [Specify-Sync] base.template.json not found.");
    return;
  }

  try {
    let templateStr = fs.readFileSync(templatePath, "utf-8");

    const tokensByGroup = getTokensByGroup();
    const themes = getThemes();
    tokensByGroup["themes"] = themes;

    templateStr = templateStr.replace(
      /"t\.([a-zA-Z_][a-zA-Z0-9_-]*)"/g,
      (match, groupName) => {
        const groupKey = groupName.toLowerCase();
        const tokens = tokensByGroup[groupKey];
        if (tokens && tokens.length > 0) {
          return tokens.map((t) => `"${t}"`).join(", ");
        }

        return `"${REMOVE_MARKER}"`;
      },
    );

    // Заменяем маркеры ассетов
    const images = getAssetsList("images");
    const vectors = getAssetsList("vectors");
    const audio = getAssetsList("audio");
    const video = getAssetsList("video");
    const cursors = getAssetsList("cursors");

    templateStr = templateStr.replaceAll(
      '"./assets/images/"',
      images.length > 0
        ? images.map((i) => `"${i}"`).join(", ")
        : `"${REMOVE_MARKER}"`,
    );
    templateStr = templateStr.replaceAll(
      '"./assets/vectors/"',
      vectors.length > 0
        ? vectors.map((i) => `"${i}"`).join(", ")
        : `"${REMOVE_MARKER}"`,
    );
    templateStr = templateStr.replaceAll(
      '"./assets/audio/"',
      audio.length > 0
        ? audio.map((i) => `"${i}"`).join(", ")
        : `"${REMOVE_MARKER}"`,
    );
    templateStr = templateStr.replaceAll(
      '"./assets/video/"',
      video.length > 0
        ? video.map((i) => `"${i}"`).join(", ")
        : `"${REMOVE_MARKER}"`,
    );
    templateStr = templateStr.replaceAll(
      '"./assets/cursors/"',
      cursors.length > 0
        ? cursors.map((i) => `"${i}"`).join(", ")
        : `"${REMOVE_MARKER}"`,
    );

    // Чистим маркеры из JSON
    templateStr = cleanRemoveMarkers(templateStr);

    // Валидация: проверяем, что получился валидный JSON
    JSON.parse(templateStr);

    // Сохраняем
    const outPath = path.join(SCHEMAS_DIR, "base.schema.json");
    fs.writeFileSync(outPath, templateStr);
    console.log("✅ [Specify-Sync] base.schema.json updated.");
  } catch (err) {
    console.error("❌ [Specify-Sync] Generation error base.schema.json:", err);
  }
}

// 4. Функция генерации сниппетов
export function updateSnippets() {
  if (!fs.existsSync(COMPONENTS_DIR)) return;

  try {
    const snippets: Record<string, any> = {};
    const files = fg.sync("**/*.yaml", { cwd: COMPONENTS_DIR, absolute: true });

    for (const file of files) {
      let doc: any;
      try {
        doc = yaml.load(fs.readFileSync(file, "utf-8")) as any;
      } catch (err) {
        console.error(`❌ [Specify-Sync] Parsing error ${file}:`, err);
        continue;
      }

      if (!doc || typeof doc !== "object") continue;

      const compName = Object.keys(doc)[0];
      const compDef = doc[compName];

      let bodyLines = [`c.${compName}:`, `\t\tprops:`];

      if (compDef && compDef.props && typeof compDef.props === "object") {
        let placeholderCounter = 1;

        // ИСПРАВЛЕНО: Экранируем только \, $ и }. Открывающую { НЕ трогаем!
        const escapePlaceholder = (str: string) =>
          str
            .replace(/\\/g, "\\\\") // Сначала экранируем бэкслеши
            .replace(/\$/g, "\\$")  // Затем доллары
            .replace(/\}/g, "\\}"); // И закрывающие скобки

        // Вспомогательная функция для форматирования любого значения
        const formatValue = (rawValue: any) => {
          let placeholder = "value";
          if (rawValue !== null && rawValue !== undefined) {
            placeholder = typeof rawValue === "object" ? JSON.stringify(rawValue) : String(rawValue);
          }

          // Если строка содержит шаблонные выражения {{ }},
          // принудительно оборачиваем её в двойные кавычки для валидности YAML
          if (typeof rawValue === "string" && (rawValue.includes("{{") || rawValue.includes("}}"))) {
            placeholder = `"${placeholder}"`;
          }

          return escapePlaceholder(placeholder);
        };

        // Рекурсивная функция для обработки свойств
        const processProps = (propsObj: any, indent: string) => {
          Object.keys(propsObj).forEach((prop) => {
            const rawValue = propsObj[prop];

            if (rawValue !== null && typeof rawValue === "object") {
              if (Array.isArray(rawValue)) {
                bodyLines.push(`${indent}${prop}:`);
                rawValue.forEach((item) => {
                  const placeholder = formatValue(item);
                  bodyLines.push(`${indent}\t- \${${placeholderCounter}:${placeholder}}`);
                  placeholderCounter++;
                });
              } else {
                bodyLines.push(`${indent}${prop}:`);
                processProps(rawValue, indent + "\t");
              }
            } else {
              const placeholder = formatValue(rawValue);
              bodyLines.push(`${indent}${prop}: \${${placeholderCounter}:${placeholder}}`);
              placeholderCounter++;
            }
          });
        };

        processProps(compDef.props, "\t\t\t");
      }

      const prefix = `c.${compName}`;
      snippets[prefix] = {
        prefix: prefix,
        body: bodyLines,
        description: `Insert a component ${compName}`,
      };
    }

    if (!fs.existsSync(VSCODE_DIR)) fs.mkdirSync(VSCODE_DIR);
    const outPath = path.join(VSCODE_DIR, "components.code-snippets");
    fs.writeFileSync(outPath, JSON.stringify(snippets, null, 2));
    console.log("✅ [Specify-Sync] VS Code snippets updated.");
  } catch (err) {
    console.error("❌ [Specify-Sync] Snippet generation error:", err);
  }
}

// 5. Запуск и настройка вотчера
export function startWatcher() {
  updateBaseSchema();
  updateSnippets();

  console.log("👀 [Specify-Sync] Watcher is running...");

  const watcher = chokidar.watch(
    [
      "assets/images",
      "assets/vectors",
      "assets/audio",
      "assets/video",
      "assets/cursors",
      "specs/tokens.yaml",
      "specs/components",
    ],
    {
      cwd: ROOT,
      ignoreInitial: true,
    },
  );

  watcher.on("all", (event, filePath) => {
    console.log(`🔄 [Spec-Engine] Change: ${filePath}`);

    const normalizedPath = filePath.replace(/\\/g, "/");

    if (
      normalizedPath.includes("tokens.yaml") ||
      normalizedPath.startsWith("assets/")
    ) {
      updateBaseSchema();
    }
    if (normalizedPath.startsWith("specs/components/")) {
      updateSnippets();
    }
  });
}

import { fileURLToPath } from "url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startWatcher();
}
