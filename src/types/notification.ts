export type NotificationPriority = "low" | "medium" | "high";

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  createdAt: string;
  read: boolean;
};