import { useState, useEffect } from "react";

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface BadgeNotificationProps {
  badge: Badge | null;
  isVisible: boolean;
  onClose: () => void;
}

export default function BadgeNotification({
  badge,
  isVisible,
  onClose,
}: BadgeNotificationProps) {
  useEffect(() => {
    if (isVisible && badge) {
      // Auto-fechar após 5 segundos
      const timer = setTimeout(() => {
        onClose();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, badge, onClose]);

  if (!isVisible || !badge) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-6 w-80 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-green-600">🎉 Parabéns!</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <img
            src={badge.icon}
            alt={badge.name}
            className="w-16 h-16 object-contain"
          />
        </div>
        <div className="flex-1">
          <p className="text-gray-800 mb-2">
            Você recebeu o emblema <strong>{badge.name}</strong>!
          </p>
          <p className="text-sm text-gray-600">{badge.description}</p>
        </div>
      </div>

      <div className="mt-4 bg-gradient-to-r from-green-50 to-blue-50 p-3 rounded-lg">
        <p className="text-xs text-gray-600 text-center">
          O emblema foi adicionado à sua coleção e pode ser selecionado para
          exibição nos coment��rios.
        </p>
      </div>
    </div>
  );
}
