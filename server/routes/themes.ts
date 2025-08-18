import { RequestHandler } from "express";

// Mock data - em produção seria um banco de dados
const userThemes: Record<
  string,
  Array<{ themeId: string; purchasedAt: string }>
> = {};

// Função para calcular likes reais de um usuário
function calculateUserLikes(userId: string): number {
  let totalLikes = 0;

  try {
    // Importar likes do sistema de comentários (simple-comments.ts)
    const simpleCommentsModule = require("./simple-comments");
    if (simpleCommentsModule.getCommentLikesForUser) {
      totalLikes += simpleCommentsModule.getCommentLikesForUser(userId);
    }

    // Importar likes do sistema de fórum (forum.ts)
    const forumModule = require("./forum");
    if (forumModule.getTopicLikesForUser) {
      totalLikes += forumModule.getTopicLikesForUser(userId);
    }

    // Importar likes dos comentários do fórum (forum.ts)
    if (forumModule.getForumCommentLikesForUser) {
      totalLikes += forumModule.getForumCommentLikesForUser(userId);
    }
  } catch (error) {
    console.error("[THEMES] Erro ao calcular likes:", error);
    return 0;
  }

  return totalLikes;
}

// Storage para likes gastos em compras
const userSpentLikes: Record<string, number> = {};

// Função para obter likes gastos por um usuário
export function getUserSpentLikes(userId: string): number {
  return userSpentLikes[userId] || 0;
}

export const getUserThemes: RequestHandler = (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }

    const themes = userThemes[userId] || [];
    res.json({ themes });
  } catch (error) {
    console.error("Error getting user themes:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};

export const getUserLikes: RequestHandler = (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }

    const earnedLikes = calculateUserLikes(userId);
    const spentLikes = userSpentLikes[userId] || 0;
    const totalLikes = earnedLikes - spentLikes;

    res.json({ totalLikes: Math.max(0, totalLikes) });
  } catch (error) {
    console.error("Error getting user likes:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};

export const purchaseTheme: RequestHandler = (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }

    const { themeId } = req.body;
    if (!themeId) {
      return res.status(400).json({ message: "ID do tema é obrigatório" });
    }

    // Verificar se o tema existe
    const availableThemes = ["dark", "glassmorphism-liquid"]; // Lista de temas disponíveis
    if (!availableThemes.includes(themeId)) {
      return res.status(404).json({ message: "Tema não encontrado" });
    }

    // Verificar se o usuário já possui o tema
    const currentThemes = userThemes[userId] || [];
    if (currentThemes.some((t) => t.themeId === themeId)) {
      return res.status(400).json({ message: "Usuário já possui este tema" });
    }

    // Verificar preço do tema
    const themesPrices = { dark: 1, "glassmorphism-liquid": 1 };
    const themePrice = themesPrices[themeId as keyof typeof themesPrices];

    const earnedLikes = calculateUserLikes(userId);
    const spentLikes = userSpentLikes[userId] || 0;
    const availableLikes = earnedLikes - spentLikes;

    if (availableLikes < themePrice) {
      return res.status(400).json({
        message: `Likes insuficientes. Necessário: ${themePrice}, disponível: ${availableLikes}`,
      });
    }

    // Realizar a compra
    userSpentLikes[userId] = spentLikes + themePrice;
    if (!userThemes[userId]) {
      userThemes[userId] = [];
    }
    userThemes[userId].push({
      themeId,
      purchasedAt: new Date().toISOString(),
    });

    const remainingLikes = earnedLikes - userSpentLikes[userId];

    res.json({
      success: true,
      remainingLikes: Math.max(0, remainingLikes),
      message: "Tema comprado com sucesso",
    });
  } catch (error) {
    console.error("Error purchasing theme:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};
