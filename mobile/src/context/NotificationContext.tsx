import React, { createContext, useContext, useState, useCallback } from 'react';
import { AppNotification, NotificationBanner } from '../components/NotificationBanner';

interface NotificationContextType {
  showNotification: (notification: Omit<AppNotification, 'id'>) => void;
  hideNotification: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  showNotification: () => {},
  hideNotification: () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [currentNotification, setCurrentNotification] = useState<AppNotification | null>(null);

  const showNotification = useCallback((notification: Omit<AppNotification, 'id'>) => {
    const fullNotification: AppNotification = {
      id: `notif_${Date.now()}`,
      ...notification,
    };
    setCurrentNotification(fullNotification);
  }, []);

  const hideNotification = useCallback(() => {
    setCurrentNotification(null);
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification, hideNotification }}>
      {children}
      <NotificationBanner
        notification={currentNotification}
        onDismiss={hideNotification}
      />
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  return useContext(NotificationContext);
}
