export function resolveToken(value: string | undefined): string {
  if (value === undefined) return "";
  return value.replace(/\bt\.[\w-]+\.[\w-]+(?:\.[\w-]+)*/g, (match) => {
    const varName = match.slice(2).replace(/\./g, "-");
    return `var(--${varName})`;
  });
}
