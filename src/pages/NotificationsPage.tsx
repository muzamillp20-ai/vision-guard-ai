import { useEffect, useState } from 'react';
import { getNotifications, markAsRead, markAllAsRead, deleteNotification, requestNotificationPermission } from '../services/notifications';
import type { Notification as VGNotification } from '../types/auth';
import { Bell, Check, CheckCheck, Trash2, AlertTriangle, Info, AlertCircle } from 'lucide-react';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<VGNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    loadNotifications();
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionGranted((window as any).Notification.permission === 'granted');
    }
  }, []);

  async function loadNotifications() {
    const data = await getNotifications({ limit: 50 });
    setNotifications(data);
    setLoading(false);
  }

  async function handleMarkRead(id: string) {
    await markAsRead(id);
    await loadNotifications();
  }

  async function handleMarkAllRead() {
    await markAllAsRead();
    await loadNotifications();
  }

  async function handleDelete(id: string) {
    await deleteNotification(id);
    await loadNotifications();
  }

  async function handleRequestPermission() {
    const granted = await requestNotificationPermission();
    setPermissionGranted(granted);
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  function getIcon(type: string) {
    switch (type) {
      case 'incident': return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'info': return <Info className="w-4 h-4 text-blue-600" />;
      default: return <Bell className="w-4 h-4 text-gray-600" />;
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-3 border-b border-gray-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600">{unreadCount} unread</span>
        </div>
        <div className="flex items-center gap-2">
          {!permissionGranted && (
            <button
              onClick={handleRequestPermission}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-md hover:bg-gray-50"
            >
              Enable Browser Notifications
            </button>
          )}
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark All Read
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-gray-500">Loading notifications…</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Bell className="w-10 h-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No notifications yet.</p>
            <p className="text-xs text-gray-400 mt-1">Incidents and system events will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map(n => (
              <div key={n.id} className={`px-6 py-3 flex items-start gap-3 ${!n.read ? 'bg-blue-50/50' : ''}`}>
                <div className="mt-0.5">{getIcon(n.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{n.title}</p>
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-1">
                  {!n.read && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="p-1 hover:bg-gray-100 rounded"
                      title="Mark as read"
                    >
                      <Check className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(n.id)}
                    className="p-1 hover:bg-red-50 rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
