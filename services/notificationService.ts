
/**
 * Service for handling browser notifications.
 */
export const notificationService = {
  /**
   * Requests permission to show notifications.
   */
  requestPermission: async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn("This browser does not support desktop notifications");
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  },

  /**
   * Shows a notification if permission is granted.
   */
  showNotification: (title: string, options?: NotificationOptions) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    // Don't show if the tab is already focused
    if (document.visibilityState === 'visible') {
      return;
    }

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error("Error showing notification:", error);
    }
  }
};
