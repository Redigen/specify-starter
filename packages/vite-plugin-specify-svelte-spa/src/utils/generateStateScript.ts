import { stringifyConfig } from "./stringifyConfig.ts";

export function generateStateScript(stateConfig: Record<string, any>, script: Set<string>): void {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(stateConfig)) {
    const varName = `state_${key}`;

    let rune = "$state";
    if ((String(value).includes('props.') || String(value).includes('params.')) && String(value).includes('{{')) rune = "$derived";

    const dataStr = stringifyConfig(value, 0);
    lines.push(`let ${varName} = ${rune}(${dataStr});`);
  }

  if (lines.length > 0) {
    script.add(lines.join("\n"));
  }
}
