import { RequestHandler } from "express";

// Storage para seleções de emblemas dos usuários
const userBadgeSelections: Map<string, string[]> = new Map();

// Rota para salvar seleção de emblemas do usuário
export const handleSaveBadgeSelection: RequestHandler = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Autenticação necessária" });
  }

  try {
    const { selectedBadges } = req.body;

    if (!Array.isArray(selectedBadges)) {
      return res
        .status(400)
        .json({ message: "selectedBadges deve ser um array" });
    }

    if (selectedBadges.length > 9) {
      return res
        .status(400)
        .json({ message: "Máximo de 9 emblemas permitidos" });
    }

    const userId = req.user.id;
    userBadgeSelections.set(userId, selectedBadges);

    console.log(
      `[BADGE-SELECTION] Usuário ${userId} salvou seleção:`,
      selectedBadges,
    );

    res.json({
      message: "Seleção de emblemas salva com sucesso",
      selectedBadges: selectedBadges,
    });
  } catch (error) {
    console.error("[BADGE-SELECTION] Erro ao salvar seleção:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};

// Rota para buscar seleção de emblemas do usuário
export const handleGetBadgeSelection: RequestHandler = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Autenticação necessária" });
  }

  const userId = req.user.id;
  const selectedBadges = userBadgeSelections.get(userId) || [];

  res.json({ selectedBadges });
};

// Rota para buscar seleção de emblemas de qualquer usuário (para hover cards)
export const handleGetUserBadgeSelection: RequestHandler = (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ message: "ID do usuário é obrigatório" });
  }

  const selectedBadges = userBadgeSelections.get(userId) || [];
  res.json({ selectedBadges });
};

// Função para obter seleção de emblemas de um usuário (para outros módulos)
export function getUserBadgeSelection(userId: string): string[] {
  return userBadgeSelections.get(userId) || [];
}
