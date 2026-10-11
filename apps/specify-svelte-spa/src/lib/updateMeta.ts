import { appConfig } from "../generated/appConfig";
import { localization } from "./localization";
import type { Localization } from "./localization";

// Типы для window
declare global {
  interface Window {
    ym?: (counterId: number, method: string, url: string, options?: Record<string, unknown>) => void;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: Record<string, unknown>[];
  }
}

const EXCLUDED_PARAMS = new Set([
  'type',
  'userId',
  'secret',
  'expire',
  'membershipId',
  'teamId',
]);

/**
 * Формирует URL без исключённых параметров
 */
function buildCleanUrl(): string {
  const url = new URL(window.location.href);

  // Удаляем исключённые параметры
  EXCLUDED_PARAMS.forEach((param) => {
    url.searchParams.delete(param);
  });

  // Убираем пустой search, если параметров не осталось
  const search = url.searchParams.toString();
  const searchString = search ? `?${search}` : '';
  const hash = url.hash;

  return url.pathname + searchString + hash;
}

/**
 * Отправляет событие page_view в Google Analytics 4 (gtag)
 */
function sendGa4PageView(cleanUrl: string, title: string): void {
  if (typeof window.gtag !== 'function') return;

  const fullUrl = window.location.origin + cleanUrl;

  window.gtag('event', 'page_view', {
    page_title: title,
    page_location: fullUrl,
    page_path: cleanUrl,
  });
}

/**
 * Отправляет событие в Google Tag Manager через dataLayer
 */
function sendGtmPageView(cleanUrl: string, title: string): void {
  if (!Array.isArray(window.dataLayer)) return;

  window.dataLayer.push({
    event: 'pageview',
    pagePath: cleanUrl,
    pageTitle: title,
    pageLocation: window.location.origin + cleanUrl,
  });
}

/**
 * Отправляет хит в Яндекс.Метрику
 */
function sendYandexHit(url: string): void {
  if (typeof window.ym !== 'function') return;

  window.ym(appConfig.integrations?.ym, 'hit', url);
}

/**
 * Обновляет тег <title>
 */
function updateTitle(title: string): void {
  document.title = title;
}

/**
 * Обновляет или создаёт тег <meta name="description">
 */
function updateMetaDescription(description: string): void {
  let metaTag = document.querySelector<HTMLMetaElement>('meta[name="description"]');

  if (!metaTag) {
    metaTag = document.createElement('meta');
    metaTag.name = 'description';
    document.head.appendChild(metaTag);
  }

  metaTag.content = description;
}

/**
 * Основная функция обновления метаданных и отправки аналитики
 */
function updateMeta(title: Localization, description: Localization): void {
  const cleanUrl = buildCleanUrl();

  const _title = localization(title);
  const _description = localization(description);

  // Если заголовок не изменился — ничего не делаем
  if (document.title === _title) return;

  updateTitle(_title);
  updateMetaDescription(_description);

  // Пропускаем 404-страницы
  if (_title.includes('404')) return;

  requestAnimationFrame(() => {
    sendYandexHit(cleanUrl);
    sendGa4PageView(cleanUrl, _title);
    sendGtmPageView(cleanUrl, _title);
  });
}

export { updateMeta, buildCleanUrl };
export default updateMeta;
