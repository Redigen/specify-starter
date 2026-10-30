import { transformRefs } from "./transformRefs.ts";
import { escapeBraces } from "./escapeBraces.ts";

export function resolveValue(
  value: string | number | boolean | null | RegExp | Record<string, any>,
  context: 'js' | 'text' | 'expression' = 'js'
): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return String(value);

  if (value && typeof value === 'object' && Object.prototype.toString.call(value) === '[object RegExp]') {
    return value.toString();
  }

  if (typeof value === 'string') {
    const escaped = escapeBraces(value);

    if (context === 'expression') {
      const refs = transformRefs(value);
      return refs;
    }

    // const refs = escaped.replace(/\{\{(.*?)\}\}/g, (match, innerContent) => {
    //   return `{{${transformRefs(innerContent)}}}`;
    // });
    const refs = escaped.replace(/\{\{([\s\S]*?)\}\}/g, (_match, innerContent) => {
      return `{{${transformRefs(innerContent)}}}`;
    });

    if (context === 'text') {
      if (refs.includes('{{')) {
        // return refs.replace(/\{\{(.*?)\}\}/g, "{$1}");
        return refs.replace(/\{\{([\s\S]*?)\}\}/g, "{$1}");
      } else {
        return escaped;
      }
    }

    if (!refs.includes('{{')) {
        return JSON.stringify(refs);
    }

    const trimmed = refs.trim();

    if (trimmed.startsWith('{{') && trimmed.endsWith('}}')) {
      const inner = trimmed.slice(2, -2).trim();
      if (!inner.includes('}}')) {
        return inner;
      }
    }

    // const template = refs.replace(/\{\{(.*?)\}\}/g, '${$1}');
    const template = refs
      .replace(/\{\{([\s\S]*?)\}\}/g, '${$1}')
      .replace(/`/g, '\\`');
    return `\`${template}\``;
  }

  if (Array.isArray(value)) {
    const items = value.map(val => resolveValue(val, context));
    return `[${items.join(", ")}]`;
  }

  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value).map(([key, val]) => {
      return `${JSON.stringify(key)}: ${resolveValue(val, context)}`;
    });
    return `{ ${entries.join(", ")} }`;
  }

  return JSON.stringify(value);
}
