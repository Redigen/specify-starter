import { createHash } from 'crypto';
import type { Layers, ComponentLayer } from "../types/layers.ts";
import type { Lay } from "../types/styles.ts";

function sortObjectKeysDeep(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sortObjectKeysDeep);
  return Object.keys(obj).sort().reduce((acc, key) => {
    acc[key] = sortObjectKeysDeep(obj[key]);
    return acc;
  }, {} as any);
}

export function getStylesHash(
  node: Layers,
  parentLay: Lay | "block" | undefined,
  interactiveParent: string | undefined
): string {
  const hashSource: any = {
    parentLay,
    hasInteractiveParent: !!interactiveParent,
    styles: {}
  };

  const extract = (type: string, styles: any, extra: any = {}) => {
    if (styles && Object.keys(styles).length > 0) {
      hashSource.styles[type] = { ...sortObjectKeysDeep(styles), ...extra };
    }
  };

  if (node?.frame) extract('frame', node.frame?.styles);
  if (node?.text) extract('text', node.text?.styles);
  if (node?.image) extract('image', node.image?.styles, { fit: node.image?.fit, position: node.image?.position });
  if (node?.vector) extract('vector', node.vector?.styles);
  if (node?.field) extract('field', node.field?.styles);
  if (node?.iframe) extract('iframe', node.iframe?.styles);
  if (node?.canvas) extract('canvas', node.canvas?.styles);
  // if (node?.audio) extract('iframe', node.iframe?.styles);
  // if (node?.video) extract('canvas', node.canvas?.styles);

  const componentEntry = Object.entries(node).find(([key]) => key.startsWith('c.'));
  if (componentEntry) {
    extract('component', (componentEntry[1] as ComponentLayer)?.styles);
  }

  const str = JSON.stringify(hashSource);

  // Используем MD5 и берем первые 8 символов
  const hash = createHash('md5').update(str).digest('hex').substring(0, 8);

  return `specify-${hash}`;
}
