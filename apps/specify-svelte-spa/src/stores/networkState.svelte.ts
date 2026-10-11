import { appConfig } from '../generated/appConfig';
import { syncQueue } from './syncQueue.svelte';
import { notifications } from './notifications.svelte';

const appwriteEndpoint = appConfig.integrations.appwrite.endpoint || null;
const RETRY_INTERVAL = 30000; // Интервал проверки, если сервер упал (30 сек)
const REQUEST_TIMEOUT = 5000; // Таймаут на сам запрос (5 сек)

class NetworkState {
  isOnline = $state(typeof navigator !== 'undefined' ? navigator.onLine : true);
  isBackendAvailable = $state(true);
  isRateLimited = $state(false);
  lastSync = $state<Date | null>(null);

  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private rateLimitTimer: ReturnType<typeof setTimeout> | null = null;

  private onlineHandler = () => {
    this.isOnline = true;
  };

  private offlineHandler = () => {
    this.isOnline = false;
    this.isBackendAvailable = false;
    notifications.add({type: "offline", message: { "ru": "Нет интернета, изменения сохранятся позже", "en": "No internet, changes will be saved later" }, duration: 4000});
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
    this.checkBackendHealth();
    this.healthCheckTimer = setInterval(() => this.checkBackendHealth(), RETRY_INTERVAL);
  }

  private stopRetry(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  async checkBackendHealth(): Promise<boolean> {
    if (!this.isOnline) {
      this.markBackendUnavailable();
      return false;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      // Если сервер ответил хоть 404, хоть 500 — значит он жив
      await fetch(appwriteEndpoint, {
        method: 'HEAD',
        signal: controller.signal
      });

      clearTimeout(timeout);

      this.isBackendAvailable = true;
      this.lastSync = new Date();

      if (!this.isRateLimited) {
        syncQueue.sync();
      }

      return true;
    } catch (error) {
      console.error('Backend unavailable:', error);
      // this.markBackendUnavailable();
      return false;
    }
  }

  markBackendUnavailable(): void {
    console.error("Network error — server down");
    if (this.isBackendAvailable) notifications.add({type: "server-unavailable", message: { "ru": "Сервер недоступен, изменения сохранятся позже", "en": "Server unavailable, changes will be saved later" }, duration: 4000});
    this.isBackendAvailable = false;
  }

  markRateLimited(interval: number): void {
    console.error("Too many requests");
    // if (!this.isRateLimited) {
      notifications.add({ type: "too-many-requests", message: { "ru": "Слишком частые обращения к серверу. Подождите немного", "en": "Too many attempts. Please wait a moment" }, duration: 4000 });
    // }

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
    if (this.rateLimitTimer) clearTimeout(this.rateLimitTimer);

    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.onlineHandler);
      window.removeEventListener('offline', this.offlineHandler);
    }
  }
}

export const networkState = new NetworkState();
