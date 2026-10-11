export function getPagination(
  current: number,
  total: number,
  size = 3,
): { start: number[]; middle: number[]; end: number[] } {
  const clamp = (p: number): number => Math.min(Math.max(1, p), total);

  const range = (from: number, to: number): number[] => {
    const out: number[] = [];
    for (let p = clamp(from); p <= clamp(to); p++) out.push(p);
    return out;
  };

  const merge = (a: number[], b: number[]): number[] | null => {
    if (a.length === 0 || b.length === 0) return null;

    const aStart = a[0];
    const aEnd = a[a.length - 1];
    const bStart = b[0];
    const bEnd = b[b.length - 1];

    // Строгая проверка: массивы пересекаются или соприкасаются (в любую сторону),
    // если интервалы накладываются друг на друга с допуском в 1 (разрыв для многоточия)
    const overlaps = (bStart <= aEnd + 1) && (bEnd >= aStart - 1);

    if (overlaps) {
      // Просто объединяем уникальные значения и сортируем по возрастанию
      return Array.from(new Set([...a, ...b])).sort((x, y) => x - y);
    }
    return null;
  };

  let start  = range(1, size);                    // [1..size]
  let end    = range(total - size + 1, total);    // [total-size+1..total]
  let middle = range(current - Math.floor((size - 1) / 2), current + Math.floor(size / 2));

  const toStart = merge(start, middle);
  if (toStart) {
    start = toStart;
    middle = [];
  } else {
    const toEnd = merge(middle, end);
    if (toEnd) {
      end = toEnd;
      middle = [];
    }
  }

  const all = merge(start, end);
  if (all) return { start: all, middle: [], end: [] };

  return { start, middle, end };
}
