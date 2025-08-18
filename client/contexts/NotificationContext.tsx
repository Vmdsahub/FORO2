import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { useAuth } from "@/contexts/AuthContext";

interface Notification {
  id: string;
  message: string;
  time: string;
  type: "badge" | "quote" | "general";
  icon?: string;
  read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (
    message: string,
    type?: "badge" | "quote" | "general",
    icon?: string,
  ) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  markAllAsRead: () => void;
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider",
    );
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Limpar notificações quando usuário faz logout
  useEffect(() => {
    if (!user) {
      setNotifications([]);
    }
  }, [user]);

  const addNotification = (
    message: string,
    type: "badge" | "quote" | "general" = "general",
    icon?: string,
  ) => {
    if (!user) return; // Só adiciona se usuário logado

    const newNotification: Notification = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message,
      time: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      type,
      icon,
      read: false,
    };

    setNotifications((prev) => [newNotification, ...prev]);

    // Log para debug
    console.log(`[NOTIFICATION] Adicionada para ${user.name}: ${message}`);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
        clearNotifications,
        markAllAsRead,
        unreadCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
