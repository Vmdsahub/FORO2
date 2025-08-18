import { RequestHandler } from "express";
import { z } from "zod";

// Storage simples em memória para ícones das categorias
const categoryIcons = new Map<string, string>();

const updateIconSchema = z.object({
  categoryId: z.string(),
  iconUrl: z.string(),
});

// GET - Buscar todos os ícones personalizados
export const getCategoryIcons: RequestHandler = (_req, res) => {
  try {
    const icons = Object.fromEntries(categoryIcons.entries());
    res.json({ icons });
  } catch (error) {
    console.error("[CATEGORY-ICONS] Erro ao buscar ícones:", error);
    res.status(500).json({ message: "Erro interno" });
  }
};

// POST - Atualizar ícone de categoria (apenas admin)
export const updateCategoryIcon: RequestHandler = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Login necessário" });
  }

  if (req.user.name !== "Vitoca") {
    return res
      .status(403)
      .json({ message: "Apenas admin Vitoca pode alterar ícones" });
  }

  try {
    const data = updateIconSchema.parse(req.body);

    categoryIcons.set(data.categoryId, data.iconUrl);

    console.log(
      `[CATEGORY-ICONS] Ícone da categoria ${data.categoryId} atualizado por ${req.user.name}`,
    );

    res.json({
      message: "Ícone atualizado com sucesso",
      categoryId: data.categoryId,
      iconUrl: data.iconUrl,
    });
  } catch (error) {
    console.error("[CATEGORY-ICONS] Erro ao atualizar ícone:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Dados inválidos" });
    }
    res.status(500).json({ message: "Erro interno" });
  }
};

// DELETE - Remover ícone personalizado (volta para padrão)
export const removeCategoryIcon: RequestHandler = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Login necessário" });
  }

  if (req.user.name !== "Vitoca") {
    return res
      .status(403)
      .json({ message: "Apenas admin Vitoca pode alterar ícones" });
  }

  try {
    const { categoryId } = req.params;

    if (categoryIcons.has(categoryId)) {
      categoryIcons.delete(categoryId);
      console.log(
        `[CATEGORY-ICONS] Ícone da categoria ${categoryId} removido por ${req.user.name}`,
      );
    }

    res.json({
      message: "Ícone removido com sucesso",
      categoryId,
    });
  } catch (error) {
    console.error("[CATEGORY-ICONS] Erro ao remover ícone:", error);
    res.status(500).json({ message: "Erro interno" });
  }
};
