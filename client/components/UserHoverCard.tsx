import { useState, useEffect } from "react";

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  requiredPoints: number;
  color: string;
}

interface UserProfileData {
  points: number;
  badges: Badge[];
  createdAt: string;
}

interface BadgeSelectionData {
  selectedBadges: string[];
}

interface UserHoverCardProps {
  userId: string;
  userName: string;
  userAvatar: string;
  isTopicAuthor?: boolean;
  size?: "sm" | "md";
  children: React.ReactNode;
}

export default function UserHoverCard({
  userId,
  userName,
  userAvatar,
  isTopicAuthor = false,
  size = "sm",
  children,
}: UserHoverCardProps) {
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [realLikes, setRealLikes] = useState<number>(0);
  const [badgeSelection, setBadgeSelection] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCard, setShowCard] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        console.log(`[UserHoverCard] Buscando perfil para usuário: ${userId}`);

        // Buscar dados do perfil do usuário com cache busting
        const timestamp = Date.now();
        const profileResponse = await fetch(
          `/api/user/profile/${userId}?t=${timestamp}`,
        );

        console.log(
          `[UserHoverCard] URL da requisição: /api/user/profile/${userId}`,
        );
        console.log(
          `[UserHoverCard] Status da resposta: ${profileResponse.status}`,
        );

        // Buscar seleção de badges do usuário específico
        let userSelection: string[] = [];
        try {
          const selectionResponse = await fetch(
            `/api/user/badge-selection/${userId}`,
          );
          if (selectionResponse.ok) {
            const selectionData = await selectionResponse.json();
            userSelection = selectionData.selectedBadges || [];
            console.log(
              `[UserHoverCard] Seleção de badges do usuário ${userId}:`,
              userSelection,
            );
          }
        } catch (error) {
          console.log(
            "Não foi possível buscar seleção de badges (usuário pode não ter seleção)",
          );
        }

        if (profileResponse.ok) {
          const profileData = await profileResponse.json();

          console.log(`[UserHoverCard] Dados do perfil:`, profileData);

          setRealLikes(profileData.points);
          setUserProfile({
            points: profileData.points, // Usar pontos do perfil
            badges: profileData.badges,
            createdAt: profileData.createdAt,
          });
          setBadgeSelection(userSelection);
        } else {
          console.error("Erro ao buscar dados do usuário");
          // Fallback para dados básicos em caso de erro
          setUserProfile({
            points: 0,
            badges: [],
            createdAt: new Date().toISOString(),
          });
          setRealLikes(0);
          setBadgeSelection([]);
        }
      } catch (error) {
        console.error("Erro ao buscar perfil do usuário:", error);
        // Fallback para dados básicos em caso de erro
        setUserProfile({
          points: 0,
          badges: [],
          createdAt: new Date().toISOString(),
        });
        setRealLikes(0);
        setBadgeSelection([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (showCard) {
      fetchUserProfile();
    }
  }, [userId, showCard, refreshTrigger]);

  // Listen for like changes to refresh user data
  useEffect(() => {
    const handleLikeUpdate = () => {
      setRefreshTrigger((prev) => prev + 1);
    };

    window.addEventListener("userLikeUpdate", handleLikeUpdate);
    return () => {
      window.removeEventListener("userLikeUpdate", handleLikeUpdate);
    };
  }, []);

  const formatMemberSince = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Mostrar apenas emblemas selecionados pelo usuário, até 9 (3x3)
  const availableBadges =
    userProfile?.badges
      ?.filter((badge) => badgeSelection.includes(badge.id))
      .slice(0, 9) || [];

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShowCard(true)}
      onMouseLeave={() => setShowCard(false)}
    >
      {children}

      {showCard && (
        <div className="absolute z-50 left-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-4 animate-fade-in">
          {isLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
            </div>
          ) : userProfile ? (
            <>
              {/* Header com avatar, nome e likes */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center text-lg font-semibold overflow-hidden">
                  {userAvatar.startsWith("http") ? (
                    <img
                      src={userAvatar}
                      alt={userName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    userAvatar
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <h3 className="font-semibold text-gray-900">{userName}</h3>
                    <span className="text-base font-medium text-gray-700 px-2 py-1 rounded-full flex items-center gap-1">
                      <span className="text-lg">❤️</span>{" "}
                      <span className="text-base">{userProfile.points}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Emblemas */}
              {availableBadges.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Emblemas ({availableBadges.length})
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {availableBadges.map((badge) => (
                      <div
                        key={badge.id}
                        className="group relative flex flex-col items-center p-2"
                        title={badge.description}
                      >
                        <div className="text-lg mb-1">
                          {badge.icon.startsWith("http") ? (
                            <img
                              src={badge.icon}
                              alt={badge.name}
                              className="w-6 h-6 object-contain"
                            />
                          ) : (
                            <span>{badge.icon}</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-600 text-center leading-tight">
                          {badge.name}
                        </span>

                        {/* Tooltip para descrição */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-20">
                          {badge.description}
                        </div>
                      </div>
                    ))}

                    {/* Preencher espaços vazios para manter grid 3x3 */}
                    {availableBadges.length < 9 &&
                      Array.from({ length: 9 - availableBadges.length }).map(
                        (_, index) => (
                          <div key={`empty-${index}`} className="p-2"></div>
                        ),
                      )}
                  </div>
                </div>
              )}

              {/* 3. Tags (seguido dos emblemas) */}
              {isTopicAuthor && (
                <div className="mb-4">
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    Autor do Tópico
                  </span>
                </div>
              )}

              {/* 4. Data de criação da conta (por fim) */}
              <div className="text-sm text-gray-500">
                Membro desde {formatMemberSince(userProfile.createdAt)}
              </div>
            </>
          ) : (
            <div className="text-center py-4 text-gray-500">
              Erro ao carregar dados do usuário
            </div>
          )}
        </div>
      )}
    </div>
  );
}
