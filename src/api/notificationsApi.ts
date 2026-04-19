import type { AppNotification, NotificationPriority } from "../types/notification";

const STORAGE_KEY = "manageme_notifications";

type CreateNotificationInput = {
  title: string;
  message: string;
  priority?: NotificationPriority;
};

class NotificationsApi {
  private read(): AppNotification[] {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return [];

    try {
      return JSON.parse(raw) as AppNotification[];
    } catch {
      return [];
    }
  }

  private write(items: AppNotification[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  getAll(): AppNotification[] {
    return this.read().sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getUnreadCount(): number {
    return this.read().filter((item) => !item.read).length;
  }

  create(input: CreateNotificationInput): AppNotification {
    const items = this.read();

    const newItem: AppNotification = {
      id: crypto.randomUUID(),
      title: input.title,
      message: input.message,
      priority: input.priority ?? "low",
      createdAt: new Date().toISOString(),
      read: false,
    };

    items.push(newItem);
    this.write(items);

    return newItem;
  }

  markAsRead(id: string) {
    const items = this.read().map((item) =>
      item.id === id ? { ...item, read: true } : item
    );

    this.write(items);
  }

  markAllAsRead() {
    const items = this.read().map((item) => ({
      ...item,
      read: true,
    }));

    this.write(items);
  }

  delete(id: string) {
    const items = this.read().filter((item) => item.id !== id);
    this.write(items);
  }

  clearAll() {
    this.write([]);
  }
}

export const notificationsApi = new NotificationsApi();