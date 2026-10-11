export const isDynamicValue = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;

  // const dynamicPrefixes = ['data.', 'state.', 'props.'];

  // return value.startsWith('{{') &&
  //        dynamicPrefixes.some(prefix => value.includes(prefix));
  const hasPrefix = /(?<![\w\)\]\}"'`?])(?:data|state|props)\./.test(value);
  const hasOrphanProp = /(?<![\w\)\]\}"'`?])\.\w+/.test(value);

  return value.startsWith('{{') && (hasPrefix || hasOrphanProp);
};
