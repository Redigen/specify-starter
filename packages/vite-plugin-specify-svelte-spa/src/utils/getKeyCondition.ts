export const getKeyCondition = (keyCombo: any): string => {
  const keyStr = String(keyCombo || '');
  if (!keyStr) return 'false';

  const parts = keyStr.split('+').map(p => p.trim());
  const mainKey = parts.pop()!;
  const conditions: string[] = [];

  if (parts.some(p => /^(control|ctrl)$/i.test(p))) {
    conditions.push('event.ctrlKey === true');
  }
  if (parts.some(p => /^alt$/i.test(p))) {
    conditions.push('event.altKey === true');
  }
  if (parts.some(p => /^shift$/i.test(p))) {
    conditions.push('event.shiftKey === true');
  }
  if (parts.some(p => /^(meta|cmd|command)$/i.test(p))) {
    conditions.push('event.metaKey === true');
  }

  if (/^space$/i.test(mainKey)) {
    conditions.push(`event.key === ' '`);
  } else if (mainKey.length === 1 && /[a-zA-Z]/.test(mainKey)) {
    conditions.push(`event.key.toLowerCase() === '${mainKey.toLowerCase()}'`);
  } else {
    conditions.push(`event.key === '${mainKey}'`);
  }

  return conditions.join(' && ');
};
