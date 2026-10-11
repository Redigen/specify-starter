import { stringifyConfig } from "./stringifyConfig.ts";

function getRealtimeEffectCode(varName: string): string {
  return `$effect(() => {
  return () => {
    cleanupRealtime(${varName});
  };
});`;
}

export function generateDataScript(dataConfig: Record<string, any>, script: Set<string>, infiniteScrollKeys: Set<string>): void {
  infiniteScrollKeys.clear();

  const dataScript: string[] = [];

  if (!dataConfig || Object.keys(dataConfig).length === 0) return;

  let hasDynamicData = false;
  let hasRealtime = false;

  for (const [key, value] of Object.entries(dataConfig)) {
    const varName = `data_${key}`;

    if (value && typeof value === "object" && value["get-data"]) {
      hasDynamicData = true;

      if (value["get-data"]?.realtime) {
        hasRealtime = true;
        dataScript.push(getRealtimeEffectCode(varName));
      }

      if (value["get-data"]?.["infinite-scroll"]) {
        infiniteScrollKeys.add(key);
        dataScript.push(`let ${varName}_page = $state(window.history.state?.${varName}_page || 1);`);
        value["get-data"].query.page = `{{${varName}_page}}`;
      }

      const configStr = stringifyConfig(value["get-data"], 2);
      dataScript.push(`const ${varName} = getData(() => {
  return ${configStr};
});`);

    } else {
      const dataStr = stringifyConfig(value, 0);
      dataScript.push(`const ${varName} = ${dataStr};`);
    }
  }

  if (hasDynamicData) {
    const imports = `import { getData${hasRealtime ? ', cleanupRealtime' : ''} } from '../../lib/getData.svelte';`;
    script.add(imports);
  }

  if (dataScript.length > 0) {
    script.add(dataScript.join("\n"));
  }
}
