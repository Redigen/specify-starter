type LangContent = string | Record<string, string>;

interface NotificationItem {
  id: number;
  key?: string;
  type: string;
  message: LangContent;
  duration: number;
  show?: boolean;
}

type AddNotificationOptions = Omit<NotificationItem, "id" | "duration"> & {
  duration?: number;
};

class NotificationStore {
  items = $state<NotificationItem[]>([]);
  nextId = 1;

  add(options: AddNotificationOptions): number {
    if (options.key) {
      const existingIndex = this.items.findIndex((item) => item.key === options.key);
      if (existingIndex !== -1) {
        this.items.splice(existingIndex, 1);
      }
    }

    const id = this.nextId++;
    const duration = options.duration ?? 4000;

    this.items.push({
      id,
      key: options.key,
      type: options.type,
      message: options.message,
      duration,
      show: false
    });

    setTimeout(() => {
      const item = this.items.find((item) => item.id === id);
      if (item) {
        item.show = true;
      }
    }, 50);

    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration + 50);
    }

    return id;
  }

  remove(id: number): void {
    const index = this.items.findIndex((item) => item.id === id);
    if (index !== -1) {
      const item = this.items[index];
      item.show = false;

      setTimeout(() => {
        const currentIndex = this.items.findIndex((i) => i.id === id);
        if (currentIndex !== -1) {
          this.items.splice(currentIndex, 1);
        }
      }, 200);
    }
  }

  clear(): void {
    this.items = [];
  }
}

export const notifications = new NotificationStore();
