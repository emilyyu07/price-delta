import { useState, useEffect, useCallback } from "react";
import { notificationsApi } from "../api/notifications";
import type { Notification } from "../types";

interface NotificationStream {
  type: "connected" | "notifications";
  message?: string;
  data?: Notification[];
  timestamp?: string;
  serverProcessingTime?: number;
  count?: number;
  userId?: string;
}

export const useRealTimeNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEventTime, setLastEventTime] = useState<Date | null>(null);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationsApi.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, isRead: true } : notif,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }, []);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    const apiBaseUrl =
      import.meta.env.VITE_API_URL || "http://localhost:3001/api";

    const connectToStream = () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setIsConnected(false);
          return;
        }

        eventSource?.close();
        eventSource = new EventSource(
          `${apiBaseUrl}/notifications/stream?token=${encodeURIComponent(token)}`,
        );

        eventSource.onopen = () => {
          console.log(
            "[Real-time Notifications] ✅ Connected to notification stream",
          );
          setIsConnected(true);
        };

        eventSource.onmessage = (event) => {
          try {
            const clientReceiveTime = new Date();
            const streamData: NotificationStream = JSON.parse(event.data);

            if (streamData.type === "connected") {
              console.log(
                `[Real-time Notifications] 🔌 Connection confirmed at ${streamData.timestamp}`,
                streamData.userId ? `for user ${streamData.userId}` : ""
              );
            }

            if (streamData.type === "notifications" && streamData.data) {
              const newNotifications = streamData.data;
              const newUnreadCount = newNotifications.filter(
                (n) => !n.isRead,
              ).length;

              // Calculate timing metrics
              const serverTime = streamData.timestamp ? new Date(streamData.timestamp) : null;
              const serverProcessingTime = streamData.serverProcessingTime || 0;
              
              if (serverTime) {
                const networkLatency = clientReceiveTime.getTime() - serverTime.getTime();
                console.log(
                  `[Real-time Notifications] 📊 Timing:\n` +
                  `  - Server query: ${serverProcessingTime}ms\n` +
                  `  - Network latency: ${networkLatency}ms\n` +
                  `  - Total: ${serverProcessingTime + networkLatency}ms\n` +
                  `  - Notification count: ${streamData.count || 0}`
                );
              }

              setNotifications(newNotifications);
              setUnreadCount(newUnreadCount);
              setLastEventTime(clientReceiveTime);

              // Show popup notification for new unread notifications
              newNotifications.forEach((notification) => {
                if (!notification.isRead) {
                  showPopupNotification(notification, clientReceiveTime);
                }
              });
            }
          } catch (error) {
            console.error(
              "[Real-time Notifications] Error parsing stream data:",
              error,
            );
          }
        };

        eventSource.onerror = (error) => {
          console.error("[Real-time Notifications] Stream error:", error);
          setIsConnected(false);

          // Auto-reconnect after 5 seconds
          setTimeout(() => {
            console.log("[Real-time Notifications] Attempting to reconnect...");
            connectToStream();
          }, 5000);
        };
      } catch (error) {
        console.error("[Real-time Notifications] Failed to connect:", error);
        setIsConnected(false);
      }
    };

    connectToStream();

    return () => {
      if (eventSource) {
        eventSource.close();
        console.log(
          "[Real-time Notifications] Disconnected from notification stream",
        );
      }
    };
  }, []);

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    lastEventTime,
  };
};

// Popup notification function
const showPopupNotification = (notification: Notification, receivedAt: Date) => {
  // Calculate time from notification creation to client receipt
  const createdAt = new Date(notification.createdAt);
  const totalLatency = receivedAt.getTime() - createdAt.getTime();
  
  console.log(
    `[Real-time Notifications] 🔔 New notification received!\n` +
    `  - Title: ${notification.title}\n` +
    `  - Created: ${createdAt.toISOString()}\n` +
    `  - Received: ${receivedAt.toISOString()}\n` +
    `  - Total latency: ${totalLatency}ms (${(totalLatency / 1000).toFixed(1)}s)`
  );
  
  // Create popup element
  const popup = document.createElement("div");
  popup.className =
    "fixed top-4 right-4 bg-white border border-primary-300 rounded-lg shadow-lg p-4 z-50 max-w-sm animate-pulse";
  popup.style.zIndex = "9999";

  popup.innerHTML = `
    <div class="flex items-start space-x-3">
      <div class="shrink-0">
        <div class="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
          <svg class="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538.214 1.055.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
          </svg>
        </div>
      </div>
      <div class="flex-1">
        <h4 class="text-sm font-semibold text-primary-900">${notification.title}</h4>
        <p class="text-sm text-primary-600 mt-1">${notification.message}</p>
        <p class="text-xs text-primary-400 mt-1">${new Date(notification.createdAt).toLocaleTimeString()}</p>
      </div>
      <button class="shrink-0 ml-2 text-primary-400 hover:text-primary-600" onclick="this.parentElement.parentElement.remove()">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  `;

  // Add to page
  document.body.appendChild(popup);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (popup.parentElement) {
      popup.remove();
    }
  }, 5000);

  // Remove on click
  popup.addEventListener("click", () => {
    popup.remove();
  });
};
