import { appConfig } from '../generated/appConfig';
import { syncQueue } from './syncQueue.svelte';
import { notifications } from './notifications.svelte';

const appwriteEndpoint = appConfig?.integrations?.appwrite?.endpoint || null;
const RETRY_BASE_DELAY = 1000;  // Задержка перед первой повторной проверкой (1 сек)
const RETRY_MAX_DELAY = 30000;  // Потолок экспоненциального backoff (30 сек)
const REQUEST_TIMEOUT = 5000;   // Таймаут на сам запрос (5 сек)

class NetworkState {
  isOnline = $state(typeof navigator !== 'undefined' ? navigator.onLine : true);
  isBackendAvailable = $state(true);
  isRateLimited = $state(false);
  lastSync = $state<Date | null>(null);

  private healthCheckTimer: ReturnType<typeof setTimeout> | null = null;
  private rateLimitTimer: ReturnType<typeof setTimeout> | null = null;
  private retryAttempt = 0;
  private hasLoggedFailure = false;

  private onlineHandler = () => {
    this.isOnline = true;
  };

  private offlineHandler = () => {
    this.isOnline = false;
    this.isBackendAvailable = false;
    if (appConfig?.notifications?.offline) notifications.add({ type: "offline", message: appConfig.notifications.offline, duration: 4000 });
  };

  init(): void {
    if (typeof window === 'undefined') return;

    this.destroy();

    $effect(() => {
      if (!this.isBackendAvailable && this.isOnline) {
        this.startRetry();
      } else {
        this.stopRetry();
      }
    });

    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);
  }

  private startRetry(): void {
    this.stopRetry();
    this.retryAttempt = 0;
    this.scheduleHealthCheck(RETRY_BASE_DELAY);
  }

  // Самопланирующаяся цепочка с экспоненциальным backoff:
  // 1s → 2s → 4s → … → 30s (cap), с джиттером ±25%.
  // Единственный надёжный способ узнать, что DNS/Wi-Fi/DHCP готовы, — попробовать запрос,
  // поэтому вместо угадывания задержки проверки повторяются с растущим интервалом.
  private scheduleHealthCheck(delay: number): void {
    this.healthCheckTimer = setTimeout(async () => {
      this.healthCheckTimer = null;

      const ok = await this.checkBackendHealth();

      // После успеха цепочку не продолжаем: $effect остановит ретраи через isBackendAvailable
      if (ok || !this.isOnline || this.isBackendAvailable) return;

      this.retryAttempt += 1;
      const next = Math.min(RETRY_BASE_DELAY * 2 ** this.retryAttempt, RETRY_MAX_DELAY);
      this.scheduleHealthCheck(next * (0.75 + Math.random() * 0.5));
    }, delay);
  }

  private stopRetry(): void {
    if (this.healthCheckTimer) {
      clearTimeout(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  async checkBackendHealth(): Promise<boolean> {
    if (!this.isOnline) {
      this.markBackendUnavailable();
      return false;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      // Если сервер ответил хоть 404, хоть 500 — значит он жив
      await fetch(appwriteEndpoint, {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal
      });

      // Пока запрос был в полёте, сеть могла снова пропасть — не считаем бэкенд доступным
      if (!this.isOnline) return false;

      this.isBackendAvailable = true;
      this.lastSync = new Date();
      this.hasLoggedFailure = false;

      if (!this.isRateLimited) {
        syncQueue.sync();
      }

      return true;
    } catch (error) {
      const isAbort = error instanceof DOMException && error.name === 'AbortError';

      // Таймаут (AbortError) — тихая неудача; сетевые ошибки логируем один раз на серию ретраев
      if (!isAbort && !this.hasLoggedFailure) {
        console.warn('Backend unavailable, will retry:', error);
        this.hasLoggedFailure = true;
      }

      this.markBackendUnavailable();
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  markBackendUnavailable(): void {
    if (this.isBackendAvailable) {
      console.error("Network error — server down");
      if (appConfig?.notifications?.["server-unavailable"]) notifications.add({ type: "server-unavailable", message: appConfig.notifications["server-unavailable"], duration: 4000 });
    }
    this.isBackendAvailable = false;
  }

  markRateLimited(interval: number): void {
    console.error("Too many requests");
    if (appConfig?.notifications?.["too-many-requests"]) notifications.add({ type: "too-many-requests", message: appConfig.notifications["too-many-requests"], duration: 4000 });

    this.isRateLimited = true;

    if (this.rateLimitTimer) clearTimeout(this.rateLimitTimer);

    // Через 1 час автоматически снимаем блокировку и пробуем синхронизироваться
    this.rateLimitTimer = setTimeout(() => {
      this.isRateLimited = false;

      // Если на момент снятия блокировки сервер всё ещё доступен и мы онлайн — синкаем задачи
      if (this.isBackendAvailable && this.isOnline) {
        syncQueue.sync();
      }
    }, interval);
  }

  destroy(): void {
    this.stopRetry();
    if (this.rateLimitTimer) {
      clearTimeout(this.rateLimitTimer);
      this.rateLimitTimer = null;
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.onlineHandler);
      window.removeEventListener('offline', this.offlineHandler);
    }
  }
}

export const networkState = new NetworkState();
