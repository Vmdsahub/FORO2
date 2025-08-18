import React, { createContext, useContext, useState, ReactNode } from "react";
import BadgeNotification from "@/components/BadgeNotification";

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface BadgeNotificationContextType {
  showBadgeNotification: (badge: Badge) => void;
}

const BadgeNotificationContext = createContext<
  BadgeNotificationContextType | undefined
>(undefined);

export const useBadgeNotification = () => {
  const context = useContext(BadgeNotificationContext);
  if (!context) {
    throw new Error(
      "useBadgeNotification must be used within a BadgeNotificationProvider",
    );
  }
  return context;
};

interface BadgeNotificationProviderProps {
  children: ReactNode;
}

export const BadgeNotificationProvider: React.FC<
  BadgeNotificationProviderProps
> = ({ children }) => {
  const [currentBadge, setCurrentBadge] = useState<Badge | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const showBadgeNotification = (badge: Badge) => {
    setCurrentBadge(badge);
    setIsVisible(true);
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => setCurrentBadge(null), 300); // Aguardar animação
  };

  return (
    <BadgeNotificationContext.Provider value={{ showBadgeNotification }}>
      {children}
      <BadgeNotification
        badge={currentBadge}
        isVisible={isVisible}
        onClose={handleClose}
      />
    </BadgeNotificationContext.Provider>
  );
};
