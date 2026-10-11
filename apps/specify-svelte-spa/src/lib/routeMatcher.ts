// Тип для функции динамического импорта, которую будет возвращать ваш генератор
type ComponentImporter = () => Promise<any>; // или более строгий тип Svelte-компонента, если нужно

/**
 * Описание сгенерированного экрана
 */
export interface ScreenDefinition {
  id: string;
  path: string[];
  component: ComponentImporter;
}

/**
 * Результат успешного поиска маршрута
 */
export interface RouteMatch {
  screen: ScreenDefinition;
  params: Record<string, string>;
  matchedUrl: string;
}

/**
 * Ищет подходящий экран по массиву URL шаблонов.
 * Возвращает самое точное совпадение (где меньше всего динамических параметров).
 *
 * @param pathname - Текущий путь (например, window.location.pathname)
 * @param screens - Массив описаний сгенерированных экранов
 * @returns Объект с найденным экраном и параметрами, или null, если ничего не найдено
 */
export function findBestMatch(
  pathname: string,
  screens: ScreenDefinition[],
): RouteMatch | null {
  // Нормализуем путь (убираем слэш на конце, кроме корневого)
  const normalizedPathname = pathname.replace(/\/$/, "") || "/";
  const urlParts: string[] = normalizedPathname.split("/");

  let bestMatch: RouteMatch | null = null;
  let lowestParamCount: number = Infinity;

  for (const screen of screens) {
    for (const tplPath of screen.path) {
      const routePath: string = tplPath.replace(/\/$/, "") || "/";
      const tplParts: string[] = routePath.split("/");

      // Количество сегментов должно совпадать строго
      if (tplParts.length !== urlParts.length) continue;

      let isMatch: boolean = true;
      let paramCount: number = 0;
      const params: Record<string, string> = {};

      for (let i = 0; i < tplParts.length; i++) {
        const templatePart = tplParts[i];
        const urlPart = urlParts[i];

        if (templatePart.startsWith(":")) {
          // Извлекаем имя параметра (убираем ведущее ":")
          const paramName = templatePart.slice(1);
          params[paramName] = decodeURIComponent(urlPart);
          paramCount++;
        } else if (templatePart !== urlPart) {
          // Статичный сегмент не совпал — этот шаблон не подходит
          isMatch = false;
          break;
        }
      }

      // Если нашли совпадение и оно точнее предыдущего (меньше плейсхолдеров)
      if (isMatch && paramCount < lowestParamCount) {
        lowestParamCount = paramCount;
        bestMatch = {
          screen,
          params,
          matchedUrl: tplPath,
        };

        // Exact-совпадение (без динамических параметров) — нельзя найти лучше
        if (paramCount === 0) break;
      }
    }

    // Если уже нашли exact-совпадение на уровне экрана, прерываем внешний цикл
    if (lowestParamCount === 0) break;
  }

  return bestMatch;
}
