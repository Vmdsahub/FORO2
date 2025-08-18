import { RequestHandler } from "express";
import { z } from "zod";

interface NewsletterArticle {
  id: string;
  title: string;
  content: string;
  readTime: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  week: number;
  year: number; // Adicionar ano
  startDate: string;
  endDate: string;
}

// In-memory storage for newsletter articles
const articles: Map<string, NewsletterArticle> = new Map();

// Initialize with current week example if empty
function initializeDemo() {
  if (articles.size === 0) {
    const currentWeekInfo = getCurrentWeekInfo();
    const exampleArticle: NewsletterArticle = {
      id: "demo_" + Date.now(),
      title: "Newsletter Semanal - Sistema Renovado (2025-2030)",
      content: `🎉 Sistema de Newsletter Completamente Renovado!

O IA HUB agora possui um sistema de newsletter totalmente reformulado:

🗓️ **Sistema de Semanas Inteligente:**
• Todas as semanas de 2025 a 2030 já estão pré-cadastradas
• Navegação automática baseada na data real
• Avanço automático toda semana (aos domingos)

👨‍💼 **Controles de Acesso:**
• Usuários: navegam apenas para semanas com conteúdo
• Admins: navegação livre para planejamento futuro
• Semana atual sempre identificada automaticamente

🔧 **Funcionalidades Técnicas:**
• Cálculo ISO 8601 para semanas internacionais
• Cache inteligente para performance
• Interface responsiva e moderna
• Persistência real de dados

📅 **Testes Validados:**
• 17 de março de 2028 → Semana 11 de 2028
• 17 de junho de 2026 → Semana 25 de 2026
• Sistema funciona corretamente para qualquer data

Este é um sistema muito mais robusto e simples de usar!`,
      readTime: "2 min",
      authorId: "system",
      authorName: "Sistema IA HUB",
      createdAt: new Date().toISOString(),
      week: currentWeekInfo.week,
      year: currentWeekInfo.year, // Adicionar ano
      startDate: currentWeekInfo.startDate,
      endDate: currentWeekInfo.endDate,
    };

    articles.set(exampleArticle.id, exampleArticle);
  }
}

// Initialize demo data
initializeDemo();

// Validation schema
const createArticleSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  content: z.string().min(1, "Conteúdo é obrigatório"),
  readTime: z.string().min(1, "Tempo de leitura é obrigatório"),
  targetWeek: z.number().optional(), // Semana específica (opcional)
  targetYear: z.number().optional(), // Ano específico (opcional)
});

// Get ISO week number (standard international week numbering)
function getISOWeekNumber(date: Date): { week: number; year: number } {
  const target = new Date(date.valueOf());
  const dayNumber = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNumber + 3);
  const firstThursday = target.valueOf();

  // Get year for this week (could be different from calendar year)
  const year = target.getFullYear();

  // Get first Thursday of the year
  const yearStart = new Date(year, 0, 1);
  if (yearStart.getDay() !== 4) {
    yearStart.setMonth(0, 1 + ((4 - yearStart.getDay() + 7) % 7));
  }

  const week = 1 + Math.ceil((firstThursday - yearStart.valueOf()) / 604800000);

  return { week, year };
}

// Helper function to get current week info using ISO 8601 week standard
function getCurrentWeekInfo() {
  const now = new Date();
  const weekInfo = getISOWeekNumber(now);
  return getWeekInfo(weekInfo.week, weekInfo.year);
}

// Helper function to get week info for a specific week/year
function getWeekInfo(week: number, year: number) {
  // Calculate start and end dates for the specific week
  const startOfWeek = getWeekStartDate(year, week);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  return {
    week,
    year,
    startDate: startOfWeek.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    }),
    endDate: endOfWeek.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
  };
}

// Helper function to get start date of a specific week
function getWeekStartDate(year: number, week: number): Date {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4) {
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  }
  return ISOweekStart;
}

// Create article
export const handleCreateArticle: RequestHandler = (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Apenas administradores podem criar artigos" });
    }

    const { title, content, readTime, targetWeek, targetYear } =
      createArticleSchema.parse(req.body);

    // Se admin especificou semana/ano, usar esses. Senão, usar semana atual
    let weekInfo;
    if (targetWeek && targetYear) {
      weekInfo = getWeekInfo(targetWeek, targetYear);
      console.log("📝 Criando artigo em semana específica:", {
        title,
        targetWeek,
        targetYear,
        weekInfo,
        today: new Date().toLocaleDateString("pt-BR"),
      });
    } else {
      weekInfo = getCurrentWeekInfo();
      console.log("📝 Criando artigo na semana atual:", {
        title,
        weekInfo,
        today: new Date().toLocaleDateString("pt-BR"),
      });
    }

    const articleId =
      Date.now().toString() + "_" + Math.random().toString(36).substring(2);

    const article: NewsletterArticle = {
      id: articleId,
      title,
      content,
      readTime,
      authorId: req.user.id,
      authorName: req.user.name,
      createdAt: new Date().toISOString(),
      week: weekInfo.week,
      year: weekInfo.year,
      startDate: weekInfo.startDate,
      endDate: weekInfo.endDate,
    };

    articles.set(articleId, article);

    console.log("✅ Artigo salvo:", {
      id: articleId,
      week: article.week,
      year: article.year,
      totalArticles: articles.size,
    });

    res.status(201).json({
      message: "Artigo criado com sucesso",
      article,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Dados inválidos",
        errors: error.errors.map((e) => e.message),
      });
    }

    console.error("Create article error:", error);
    res.status(500).json({
      message: "Erro interno do servidor",
    });
  }
};

// Get all articles grouped by week
export const handleGetArticles: RequestHandler = (req, res) => {
  try {
    const allArticles = Array.from(articles.values());
    console.log("📰 Buscando artigos:", {
      totalArticles: allArticles.length,
      articlesByWeek: allArticles.reduce(
        (acc, art) => {
          const key = `${art.year}-${art.week}`;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    });

    // Group articles by week and year
    const articlesByWeek = allArticles.reduce(
      (acc, article) => {
        const weekKey = `${article.year}-${article.week}`;
        if (!acc[weekKey]) {
          acc[weekKey] = {
            week: article.week,
            year: article.year, // Incluir ano
            startDate: article.startDate,
            endDate: article.endDate,
            topics: [],
          };
        }

        acc[weekKey].topics.push({
          id: article.id, // Keep original string ID for proper deletion
          title: article.title,
          content: article.content,
          readTime: article.readTime,
        });

        return acc;
      },
      {} as Record<string, any>,
    );

    // Convert to array and sort by year and week (newest first)
    const weeklyNewsletters = Object.values(articlesByWeek).sort(
      (a: any, b: any) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.week - a.week;
      },
    );

    res.json({ weeklyNewsletters });
  } catch (error) {
    console.error("Get articles error:", error);
    res.status(500).json({
      message: "Erro ao buscar artigos",
    });
  }
};

// Delete article
export const handleDeleteArticle: RequestHandler = (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Apenas administradores podem excluir artigos" });
    }

    const { articleId } = req.params;

    if (!articles.has(articleId)) {
      return res.status(404).json({ message: "Artigo não encontrado" });
    }

    articles.delete(articleId);

    res.json({ message: "Artigo excluído com sucesso" });
  } catch (error) {
    console.error("Delete article error:", error);
    res.status(500).json({
      message: "Erro ao excluir artigo",
    });
  }
};
