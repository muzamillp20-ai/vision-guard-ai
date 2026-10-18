import type { Notification } from '../types/auth';
import { db } from '../db';

// Create notification
export async function createNotification(
  type: Notification['type'],
  title: string,
  message: string,
  relatedId?: string
): Promise<Notification> {
  const notification: Notification = {
    id: crypto.randomUUID(),
    type,
    title,
    message,
    read: false,
    createdAt: new Date().toISOString(),
    relatedId
  };

  await db.notifications.add(notification);

  // Try to show browser notification if permitted
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      new window.Notification(title, {
        body: message,
        icon: '/favicon.ico',
        tag: notification.id
      });
    } catch {
      // Browser notification failed, that's OK
    }
  }

  return notification;
}

// Get notifications
export async function getNotifications(options?: {
  unreadOnly?: boolean;
  limit?: number;
}): Promise<Notification[]> {
  let notifications = await db.notifications.orderBy('createdAt').reverse().toArray();

  if (options?.unreadOnly) {
    notifications = notifications.filter(n => !n.read);
  }

  if (options?.limit) {
    notifications = notifications.slice(0, options.limit);
  }

  return notifications;
}

// Get unread count
export async function getUnreadCount(): Promise<number> {
  const notifications = await db.notifications.where('read').equals(0).toArray();
  return notifications.length;
}

// Mark notification as read
export async function markAsRead(notificationId: string): Promise<void> {
  await db.notifications.update(notificationId, { read: true });
}

// Mark all as read
export async function markAllAsRead(): Promise<void> {
  const notifications = await db.notifications.where('read').equals(0).toArray();
  for (const notification of notifications) {
    await db.notifications.update(notification.id, { read: true });
  }
}

// Delete notification
export async function deleteNotification(notificationId: string): Promise<void> {
  await db.notifications.delete(notificationId);
}

// Request browser notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

// Notification types helper
export function notifyIncident(sourceName: string, severity: string, relatedId?: string) {
  return createNotification(
    'incident',
    `New ${severity} Incident`,
    `Restricted zone intrusion detected at ${sourceName}`,
    relatedId
  );
}

export function notifySystemError(title: string, message: string) {
  return createNotification('error', title, message);
}

export function notifyInfo(title: string, message: string) {
  return createNotification('info', title, message);
}
