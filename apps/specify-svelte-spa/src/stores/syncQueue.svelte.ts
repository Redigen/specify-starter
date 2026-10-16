import { networkState } from "./networkState.svelte";
import type { PostData } from "../lib/postData";
import { postData } from "../lib/postData";
import { runBackendAction } from "../logic/runBackendAction";
import { notifications } from "./notifications.svelte";
import { appConfig } from '../generated/appConfig';

export type QueueItemStatus = 'pending' | 'syncing' | 'failed';
export type QueueItemType = 'data' | 'action';

export interface QueueItem {
  id: string;
  body: PostData | any;
  type: QueueItemType;
  status: QueueItemStatus;
  retries: number;
}

const STORAGE_KEY = 'appwrite-sync-queue';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class SyncQueue {
  items = $state<QueueItem[]>([]);
  isSyncing = $state(false);

  constructor() {
    // В конструкторе оставляем ТОЛЬКО работу с локальным хранилищем.
    // localStorage не зависит от других модулей, поэтому здесь ошибки не будет.
    this.loadFromStorage();
  }

  // Метод инициализации, который мы вызовем из App.svelte
  init() {
    if (networkState.isBackendAvailable && this.items.length > 0) {
      this.sync();
    }
  }

  add(item: Omit<QueueItem, 'id' | 'status' | 'retries'>) {
    const newItem: QueueItem = {
      ...item,
      type: item.type || 'data',
      id: crypto.randomUUID(),
      status: 'pending',
      retries: 0,
    };

    this.items.push(newItem);
    this.saveToStorage();

    if (networkState.isBackendAvailable) {
      this.sync();
    }
  }

  async sync() {
    if (this.isSyncing) return;
    if (!networkState.isBackendAvailable) return;

    const pendingItems = this.items.filter(i => i.status === 'pending' || i.status === 'failed');
    if (pendingItems.length === 0) {
      if (appConfig?.notifications?.["server-available"]) notifications.add({ type: "server-available", message: appConfig.notifications["server-available"], duration: 4000 });
      return;
    }

    this.isSyncing = true;

    if (appConfig?.notifications?.sync) notifications.add({ type: "sync", message: appConfig.notifications.sync, duration: 0 });

    for (const item of pendingItems) {
      item.status = 'syncing';
      this.saveToStorage();

      try {
        if (item.type === 'action') {
          await runBackendAction({ ...item.body });
        } else {
          await postData({ ...item.body });
        }

        this.items = this.items.filter(i => i.id !== item.id);
        this.saveToStorage();
      } catch (err: any) {
        console.error('Sync failed for item', item.id, err);

        // Если есть код ошибки (например, Appwrite вернул 404 или 400) - это логическая ошибка,
        // повторять нет смысла, удаляем item
        if (err.code != null && err.code !== 429) {
          this.items = this.items.filter(i => i.id !== item.id);
          this.saveToStorage();
          if (err.message) notifications.add({ type: "error", message: err.message, duration: 4000 });
        } else {
          // Сетевая ошибка - ставим в очередь и ждем интернета
          item.status = 'failed';
          item.retries += 1;
          this.saveToStorage();

          this.isSyncing = false;
          if (!err.code) networkState.markBackendUnavailable();
          return;
        }
      }
    }

    if (this.items.length > 0) {
      await delay(300);
    }

    if (!networkState.isBackendAvailable) {
      this.isSyncing = false;
      return;
    }

    this.isSyncing = false;
  }

  private loadFromStorage() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed: QueueItem[] = JSON.parse(raw);
        this.items = parsed.map(i => ({ ...i, status: 'pending' }));
      } catch (e) {
        console.error('Failed to parse items from localStorage', e);
      }
    }
  }

  private saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
  }
}

export const syncQueue = new SyncQueue();
