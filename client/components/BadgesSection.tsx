import { useState, useEffect } from "react";

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  requiredPoints: number;
  color: string;
}

interface BadgesSectionProps {
  userId: string;
}

export default function BadgesSection({ userId }: BadgesSectionProps) {
  const [userStats, setUserStats] = useState<{
    points: number;
    badges: Badge[];
    nextBadge: Badge | null;
    pointsToNext: number;
    allBadges: Badge[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        console.log(`[BadgesSection] Buscando stats para usuário: ${userId}`);

        // Buscar stats do usuário autenticado
        const response = await fetch(`/api/user/stats`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`[BadgesSection] Dados recebidos:`, data);
          setUserStats(data);
        } else {
          console.error("Erro ao buscar stats:", response.status);
          // Fallback para dados básicos
          setUserStats({
            points: 0,
            badges: [],
            nextBadge: null,
            pointsToNext: 0,
            allBadges: [],
          });
        }
      } catch (error) {
        console.error("Erro ao buscar stats:", error);
        // Fallback para dados básicos
        setUserStats({
          points: 0,
          badges: [],
          nextBadge: null,
          pointsToNext: 0,
          allBadges: [],
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserStats();
  }, [userId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!userStats) {
    return (
      <div className="text-center py-8 text-gray-500">
        Erro ao carregar badges
      </div>
    );
  }

  const getBadgeColorClasses = (color: string, earned: boolean) => {
    const baseClasses = earned ? "" : "opacity-30 grayscale";

    switch (color) {
      case "purple":
        return `bg-purple-100 border-purple-200 ${baseClasses}`;
      case "blue":
        return `bg-blue-100 border-blue-200 ${baseClasses}`;
      case "yellow":
        return `bg-yellow-100 border-yellow-200 ${baseClasses}`;
      case "cyan":
        return `bg-cyan-100 border-cyan-200 ${baseClasses}`;
      case "gold":
        return `bg-yellow-200 border-yellow-300 ${baseClasses}`;
      default:
        return `bg-gray-100 border-gray-200 ${baseClasses}`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progresso para próximo badge */}
      {userStats.nextBadge && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-2xl">🎯</div>
            <div>
              <h4 className="font-semibold text-black">Próximo Objetivo</h4>
              <p className="text-sm text-gray-600">
                Faltam {userStats.pointsToNext} likes para conquistar "
                {userStats.nextBadge.name}"
              </p>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${Math.max(0, Math.min(100, ((userStats.nextBadge.requiredPoints - userStats.pointsToNext) / userStats.nextBadge.requiredPoints) * 100))}%`,
              }}
            ></div>
          </div>
        </div>
      )}

      {/* Grid de badges */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {userStats.allBadges.map((badge) => {
          const isEarned = userStats.badges.some((b) => b.id === badge.id);

          return (
            <div
              key={badge.id}
              className={`relative border-2 rounded-lg p-4 text-center transition-all duration-200 hover:scale-105 ${getBadgeColorClasses(badge.color, isEarned)}`}
            >
              {isEarned && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}

              <div className="mb-2">
                {badge.icon.startsWith("http") ? (
                  <img
                    src={badge.icon}
                    alt={badge.name}
                    className="w-12 h-12 mx-auto object-contain"
                  />
                ) : (
                  <div className="text-3xl">{badge.icon}</div>
                )}
              </div>

              <h5 className="font-semibold text-sm text-black mb-1">
                {badge.name}
              </h5>
              <p className="text-xs text-gray-600 mb-2">{badge.description}</p>
              <div className="text-xs text-gray-500">
                {badge.requiredPoints} ❤️
              </div>

              {!isEarned && userStats.points < badge.requiredPoints && (
                <div className="text-xs text-red-500 mt-1">
                  Faltam {badge.requiredPoints - userStats.points} ❤️
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Estatísticas */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-black mb-3">Suas Estatísticas</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-700 flex items-center justify-center gap-1">
              ❤️ {userStats.points}
            </div>
            <div className="text-sm text-gray-600">Likes Totais</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {userStats.badges.length}
            </div>
            <div className="text-sm text-gray-600">Badges Conquistados</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {userStats.allBadges.length > 0
                ? Math.round(
                    (userStats.badges.length / userStats.allBadges.length) *
                      100,
                  )
                : 0}
              %
            </div>
            <div className="text-sm text-gray-600">Progresso</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">
              #
              {userStats.allBadges.length > 0
                ? userStats.allBadges.findIndex(
                    (b) => userStats.points < b.requiredPoints,
                  ) + 1 || userStats.allBadges.length + 1
                : 1}
            </div>
            <div className="text-sm text-gray-600">Ranking</div>
          </div>
        </div>
      </div>
    </div>
  );
}
