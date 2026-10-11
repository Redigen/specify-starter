export function transformRefs(str: any): any {
  if (typeof str !== 'string') return str;

  return str
    .replace(/\bdata\./g, 'data_')
    .replace(/\bstate\./g, 'state_')
    .replace(/\bstores\./g, 'stores_')
    .replace(/\blogic\./g, 'logic_')
    //.replace(/\.props\./g, '');
    .replace(/(?<![\w\)\]\}"'`?])\.(\w+)/g, '$1');
}
