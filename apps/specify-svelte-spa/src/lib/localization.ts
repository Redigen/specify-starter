export type Localization = string | Record<string, string>;

const SCRIPT_MAP: Record<string, string[]> = {
  cyrillic: [
    "ru",
    "be",
    "uk",
    "bg",
    "sr",
    "mk",
    "mn",
    "kk",
    "ky",
    "uz",
    "tg",
    "tt",
    "ba",
  ],
  latin: [
    "en",
    "es",
    "fr",
    "de",
    "it",
    "pt",
    "nl",
    "pl",
    "ro",
    "hu",
    "cs",
    "sk",
    "sl",
    "hr",
    "da",
    "sv",
    "no",
    "fi",
    "et",
    "lv",
    "lt",
    "is",
    "ga",
    "cy",
    "ca",
    "gl",
    "af",
    "sq",
    "eo",
    "id",
    "ms",
    "sw",
    "tl",
    "tr",
    "vi",
  ],
  cjk: ["zh", "ja", "ko"],
  arabic: ["ar", "fa", "ur", "ps", "ug", "ku"],
  devanagari: ["hi", "ne", "mr", "sa"],
  bengali: ["bn", "as"],
  greek: ["el"],
  hebrew: ["he"],
  thai: ["th"],
  georgian: ["ka"],
  armenian: ["hy"],
  korean: ["ko"],
  japanese: ["ja"],
};

function getScript(code: string): string {
  const base = code.split("-")[0].toLowerCase();
  for (const [script, langs] of Object.entries(SCRIPT_MAP)) {
    if (langs.includes(base)) return script;
  }
  return "unknown";
}

export function localization(content: string | number | Record<string, string>): string {
  if (typeof content === "number") return Number.isNaN(content) ? "" : String(content);
  if (!content) return "";
  if (typeof content === "string") return content;

  const entries = Object.entries(content);
  if (entries.length === 0) return "";

  const locale = (
    typeof navigator !== "undefined"
      ? navigator.languages?.[0] || navigator.language || "en"
      : "en"
  ).toLowerCase();

  const base = locale.split("-")[0];
  const targetScript = getScript(locale);

  // Переменная для хранения найденного языка
  let resolvedLang = "";

  try {
    // 1. Точное совпадение
    if (content[locale]) {
      resolvedLang = locale;
      return content[locale]!;
    }

    // 2. Базовый код
    if (content[base]) {
      resolvedLang = base;
      return content[base]!;
    }

    // 3. Скрипт с приоритетом по порядку в SCRIPT_MAP
    const scriptLangs = SCRIPT_MAP[targetScript];
    if (scriptLangs) {
      for (const preferredLang of scriptLangs) {
        // Ищем точное совпадение или базовый код
        for (const [code, text] of entries) {
          const codeBase = code.split("-")[0].toLowerCase();
          if (codeBase === preferredLang) {
            resolvedLang = code;
            return text;
          }
        }
      }
    }

    // 4. Любой en или en-XX
    for (const [code, text] of entries) {
      if (code.split("-")[0] === "en") {
        resolvedLang = code;
        return text;
      }
    }

    // 5. Первый доступный
    const first = entries[0];
    resolvedLang = first?.[0] ?? "";
    return first?.[1] ?? "";
  } finally {
    if (
      typeof document !== "undefined" &&
      resolvedLang &&
      document.documentElement.lang !== resolvedLang
    ) {
      document.documentElement.lang = resolvedLang;
    }
  }
}
