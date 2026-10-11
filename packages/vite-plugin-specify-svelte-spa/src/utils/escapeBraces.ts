export function escapeBraces(str: string): string {
  return str.replace(/\{\{\{\{/g, "\u200B{").replace(/\}\}\}\}/g, "\u200B}");
}
