import { createHash } from 'crypto';

export function generateHandlerName(obj: any, prefix = 'handle') {
  const str = JSON.stringify(obj, Object.keys(obj).sort());
  const suffix = createHash('md5').update(str).digest('hex').substring(0, 8);
  return `${prefix}_${suffix}`;
}
