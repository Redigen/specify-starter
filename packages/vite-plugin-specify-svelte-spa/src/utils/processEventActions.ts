import { camelCase } from "./camelCase.ts";
import { generateHandlerName } from "./generateHandlerName.ts";

export function parseCallFn(callFn: string) {
  // 1. Разбиваем по ";", тримим пробелы и убираем пустые строки (чтобы избежать ";;")
  const fnCalls = callFn
    .split(';')
    .map(s => s.trim())
    .filter(Boolean);

  const fnNames = new Set<string>();

  // 2. Ищем слова, после которых идет открывающая скобка
  const nameRegex = /([a-zA-Z_$][\w$]*)(?=\s*\()/g;

  // 3. Исключаем ключевые слова JS и нативные методы (DOM, Array, Math, Console и т.д.)
  const jsKeywordsAndBuiltinMethods = new Set([
    // Ключевые слова
    'if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'do', 'else',
    // Методы массивов
    'map', 'filter', 'forEach', 'push', 'pop', 'shift', 'unshift', 'splice', 'slice', 'reduce', 'find', 'some', 'every', 'concat', 'join', 'sort', 'reverse', 'includes', 'indexOf',
    // Методы объектов
    'keys', 'values', 'entries', 'assign', 'freeze', 'toString', 'valueOf',
    // Методы строк
    'split', 'replace', 'match', 'charAt', 'toUpperCase', 'toLowerCase', 'trim', 'substring', 'startsWith', 'endsWith',
    // Методы DOM и BOM
    'focus', 'blur', 'querySelector', 'querySelectorAll', 'getElementById', 'getElementsByClassName',
    'addEventListener', 'removeEventListener', 'preventDefault', 'stopPropagation',
    'setAttribute', 'removeAttribute', 'getAttribute', 'scrollTo', 'scrollIntoView',
    'log', 'warn', 'error', 'info', 'fetch', 'alert', 'confirm', 'prompt',
    // Промисы и таймеры
    'then', 'catch', 'finally', 'resolve', 'reject', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
    // JSON / Math
    'parse', 'stringify', 'random', 'floor', 'ceil', 'round', 'max', 'min'
  ]);

  // 4. Собираем имена функций, которые нужно импортировать
  fnCalls.forEach(code => {
    let match;
    while ((match = nameRegex.exec(code)) !== null) {
      const fnName = match[1];
      if (!jsKeywordsAndBuiltinMethods.has(fnName)) {
        fnNames.add(fnName);
      }
    }
  });

  return { fnCalls, fnNames };
}

type ActionGenerator = (config: any, script: Set<string>, resolveValue: Function) => string;

const actionHandlers: Record<string, ActionGenerator> = {
  "navigate-to": (config, script, resolveValue) => {
    script.add(`import { navigateTo } from '../../lib/navigate';`);
    const link = resolveValue(config.link);
    const frameId = config?.["frame-id"] ? resolveValue(config["frame-id"]) : `""`;
    const animation = config?.animation ? resolveValue(config.animation) : `"instant"`;
    const direction = config?.direction ? resolveValue(config.direction) : `"left"`;
    const easing = config?.easing ? resolveValue(config.easing) : `"ease-out"`;
    const duration = config?.duration ?? 300;
    const target = config?.target ? resolveValue(config.target) : `"_self"`;
    return `navigateTo(${link}, ${frameId}, ${animation}, ${direction}, ${easing}, ${duration}, ${target})`;
  },

  "navigate-back": (config, script, resolveValue) => {
    script.add(`import { navigateBack } from '../../lib/navigate';`);
    return `navigateBack(${resolveValue(config.link)})`;
  },

  "scroll-to": (config, script, resolveValue) => {
    script.add(`import { scrollToElement } from '../../lib/navigate';`);
    const frameId = resolveValue(config?.["frame-id"]);
    const animation = resolveValue(config?.animation || "smooth");
    return `scrollToElement(${frameId}, ${animation})`;
  },

  "set-state": (config, _script, resolveValue) => {
    const setStates = Object.entries(config).map(
      ([key, value]) => `state_${key} = ${resolveValue(value)}`
    );
    return setStates.join("; ");
  },

  "set-props": (config, _script, resolveValue) => {
    const setStates = Object.entries(config).map(
      ([key, value]) => `${key.startsWith(".") ? key.slice(1) : key} = ${resolveValue(value)}`
    );
    return setStates.join("; ");
  },

  "set-notification": (config, script, resolveValue) => {
    script.add(`import { notifications as stores_notifications } from '../../stores/notifications.svelte';`);
    return `stores_notifications.add({type: ${resolveValue(config.type)}, message: ${resolveValue(config.message)}, duration: ${config.duration || 0}})`;
  },

  "run": (config, _script, resolveValue) => {
    return `${resolveValue(config)}`;
  },

  "post-data": (config, script, resolveValue) => {
    script.add(`import { postData } from '../../lib/postData';`);
    const fnName = generateHandlerName(config, "postData");
    const { success, error, ...cleanConfig } = config;
    const successBlock = success ? `${processEventActions(success, script, resolveValue).join("; ")};` : "";
    const errorBlock = error ? `${processEventActions(error, script, resolveValue).join("; ")};` : "";
    script.add(`async function ${fnName}() {
  try {
    const response = await postData(${resolveValue(cleanConfig)});${successBlock ? `\n    ${successBlock}` : ""}
  } catch (error) {${errorBlock ? `\n    ${errorBlock}\n  ` : ""}}
}`);
    return `${fnName}()`;
  },

  "submit": (config, _script, _resolveValue) => {
    return `${camelCase(config)}?.requestSubmit()`;
  },

  "reset": (config, _script, _resolveValue) => {
    return `${camelCase(config)}?.reset()`;
  },
};

export function processEventActions(eventConfig: any, script: Set<string>, resolveValue: Function): string[] {
  if (!eventConfig) return [];

  const actions: string[] = [];
  for (const [key, handler] of Object.entries(actionHandlers)) {
    if (eventConfig[key]) {
      const actionStr = handler(eventConfig[key], script, resolveValue);
      if (actionStr) actions.push(actionStr);
    }
  }
  return actions;
}
