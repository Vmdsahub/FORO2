export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  requiredPoints: number;
  color: string;
}

// Badge Iniciante obtido aos 5 likes (trofeu roxo)
export const BADGES: Badge[] = [
  {
    id: "iniciante",
    name: "Iniciante",
    description: "Primeiros passos no fórum",
    icon: "https://cdn.builder.io/api/v1/image/assets%2Feb4ab92cf61440af8e31a540e9165539%2F94f143c3d8d0424f901c1f5e6f7c61e5?format=webp&width=100",
    requiredPoints: 5,
    color: "purple",
  },
];

export interface UserStats {
  points: number; // pontos = total de likes recebidos
  badges: Badge[];
  postsCreated: number;
  commentsCreated: number;
  likesReceived: number; // igual aos pontos
}

// Função para cálculo de badges baseada em likes (pontos)
export function calculateUserBadges(likesReceived: number): Badge[] {
  return BADGES.filter((badge) => likesReceived >= badge.requiredPoints);
}

export function getNextBadge(likesReceived: number): Badge | null {
  const nextBadge = BADGES.find(
    (badge) => likesReceived < badge.requiredPoints,
  );
  return nextBadge || null;
}

export function getPointsToNextBadge(likesReceived: number): number {
  const nextBadge = getNextBadge(likesReceived);
  return nextBadge ? nextBadge.requiredPoints - likesReceived : 0;
}
