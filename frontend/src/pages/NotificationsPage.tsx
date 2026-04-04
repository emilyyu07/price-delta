import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { notificationsApi } from '../api/notifications';
import { useDemo } from '../hooks/useDemo';
import type { Notification } from '../types';
import { useAuth } from '../hooks/useAuth';

export const NotificationsPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { isDemoMode, notifications: demoNotificationsList } = useDemo();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const fetchedNotifications: Notification[] = await notificationsApi.getNotifications();
      setNotifications(fetchedNotifications);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // If in demo mode, use demo data
    if (isDemoMode) {
      setNotifications(demoNotificationsList);
      setLoading(false);
      return;
    }

    // Otherwise, fetch from API if authenticated
    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated, isDemoMode, demoNotificationsList]);

  const handleMarkAsRead = async (notificationId: string) => {
    // Disable mark as read in demo mode
    if (isDemoMode) {
      setError('Marking notifications is not available in demo mode.');
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      await notificationsApi.markAsRead(notificationId);
      setNotifications(prevNotifications => 
        prevNotifications.map(notif => 
          notif.id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
      setError('Failed to mark notification as read. Please try again.');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-primary-900 mb-2">Notifications</h1>
        <p className="text-primary-600">The news that actually saves you money.</p>
      </div>

      {loading ? (
        <div className="text-center py-10 text-primary-800">Loading your notifications...</div>
      ) : error ? (
        <div className="text-red-500 text-center py-10">{error}</div>
      ) : notifications.length === 0 ? (
        <Card className="frosted-surface text-center py-8">
          <Bell className="h-12 w-12 text-primary-400 mx-auto mb-4" />
          <p className="text-primary-600 mb-4">
            All quiet on the savings front.
          </p>
          <p className="text-sm text-primary-500">
            Price drops don't sneak past us. When your moment arrives, you'll be the first to know.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <Card key={notification.id} className="frosted-surface flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={notification.alert?.product?.imageUrl || 'https://via.placeholder.com/48'}
                  alt={notification.alert?.product?.title || 'Product'}
                  className="h-12 w-12 rounded-lg object-cover flex-shrink-0"
                />
                <div>
                  <h3 className="text-lg font-semibold text-primary-800">{notification.title}</h3>
                  <p className="text-primary-600">{notification.message}</p>
                  <p className="text-sm text-primary-500">
                    {new Date(notification.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              {!notification.isRead && (
                <Button size="sm" onClick={() => handleMarkAsRead(notification.id)}>
                  <CheckCircle className="h-4 w-4 mr-2" /> Mark as Read
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
