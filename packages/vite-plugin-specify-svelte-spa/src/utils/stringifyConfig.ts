import { resolveValue } from "./resolveValue.ts";

export function stringifyConfig(obj: any, indent: number = 0): string {
  const spaces = " ".repeat(indent);

  if (obj === null || obj === undefined) return "null";
  if (typeof obj === "number" || typeof obj === "boolean") return String(obj);

  if (typeof obj === "string") {
    return resolveValue(obj);
    // Если строка содержит наши маркеры интерполяции
    // if (obj.includes("{{")) {
    //   // Проверяем, является ли строка ТОЛЬКО одной переменной (например, "{{ path.id }}")
    //   const singleMatch = obj.match(/^\{\{\s*(.*?)\s*\}\}$/);
    //   if (singleMatch) {
    //     // Если да, возвращаем просто имя переменной БЕЗ кавычек и бэктиков
    //     // Результат: path.id
    //     return singleMatch[1];
    //   }

    //   // Если это смешанная строка (например, "prefix_{{ path.id }}_suffix")
    //   // Результат: `prefix_${path.id}_suffix`
    //   return `\`${obj.replace(/\{\{\s*(.*?)\s*\}\}/g, "${$1}")}\``;
    // }

    // // Обычная строка — оборачиваем в одинарные кавычки
    // return `'${obj.replace(/'/g, "\\'")}'`;
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return "[]";
    const items = obj.map((item) => stringifyConfig(item, indent + 2));
    return `[\n${items.map((i) => spaces + "  " + i).join(",\n")}\n${spaces}]`;
  }

  if (typeof obj === "object") {
    const entries = Object.entries(obj).map(([key, val]) => {
      const valStr = stringifyConfig(val, indent + 2);
      // Проверяем ключ на валидность JS имени (например, "Infinite-scroll" нужно обернуть в кавычки)
      const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `'${key}'`;
      return `${spaces}  ${safeKey}: ${valStr}`;
    });
    return `{\n${entries.join(",\n")}\n${spaces}}`;
  }

  return String(obj);
}
