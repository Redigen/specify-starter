export function camelCase(str: string): string {
  return str
    .split(/[-_]/)
    .map((s, index) => {
      if (index === 0) {
        return s.charAt(0).toLowerCase() + s.slice(1);
      }
      return s.charAt(0).toUpperCase() + s.slice(1);
    })
    .join("");
}
