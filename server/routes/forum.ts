import { RequestHandler } from "express";
import { z } from "zod";
import {
  Topic,
  Comment,
  CreateTopicRequest,
  CreateCommentRequest,
  LikeResponse,
} from "@shared/forum";
import {
  getTopicCommentStats,
  getTopicMostRecentCommentDate,
} from "./simple-comments";
// Temporariamente removido para evitar problemas de importação

// Simple in-memory storage for demo purposes
const topics: Map<string, Topic> = new Map();
const comments: Map<string, Comment> = new Map();
const likes: Map<string, Set<string>> = new Map(); // entityId -> Set of userIds
const userStats: Map<string, { points: number; badges: string[] }> = new Map(); // userId -> stats

// Validation schemas
const createTopicSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(200),
  content: z.string().min(1).max(2000),
  category: z.string().min(1),
  avatarUrl: z.string().optional(),
});

const createCommentSchema = z.object({
  content: z.string().min(1).max(1000),
  parentId: z.string().optional(),
});

// Helper functions
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function formatDate(): { date: string; time: string } {
  const now = new Date();
  const time = now.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
  const date = now.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
  return { date, time };
}

function getUserInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function getUserAvatar(user: any): string {
  // Se o usuário tem avatar, usa a URL completa, senão usa as iniciais
  return user.avatar || getUserInitials(user.name);
}

// Funções para gerenciar pontos e badges
function getUserStats(userId: string) {
  if (!userStats.has(userId)) {
    userStats.set(userId, { points: 0, badges: [] });
  }
  return userStats.get(userId)!;
}

// Helper function to get most recent activity date (topic creation or last comment)
function getMostRecentActivity(topic: Topic): number {
  const topicDate = new Date(topic.createdAt).getTime();
  let mostRecentTime = topicDate;

  // Check lastPost from topic (this is updated when there are comments)
  if (topic.lastPost && topic.lastPost.date && topic.lastPost.time) {
    try {
      // Parse Brazilian date format: DD/MM/YYYY
      const [day, month, year] = topic.lastPost.date.split("/");
      const [hours, minutes] = topic.lastPost.time.split(":");

      const lastPostDate = new Date(
        parseInt(year),
        parseInt(month) - 1, // Month is 0-indexed
        parseInt(day),
        parseInt(hours),
        parseInt(minutes),
      );

      const lastPostTime = lastPostDate.getTime();
      if (!isNaN(lastPostTime)) {
        mostRecentTime = Math.max(mostRecentTime, lastPostTime);
      }
    } catch (error) {
      console.warn(
        `[SORT] Error parsing lastPost date for topic "${topic.title}":`,
        error,
      );
    }
  }

  // Also get the most recent comment date from the active comment system
  const mostRecentCommentDate = getTopicMostRecentCommentDate(topic.id);
  if (mostRecentCommentDate) {
    const commentTime = mostRecentCommentDate.getTime();
    mostRecentTime = Math.max(mostRecentTime, commentTime);
  }

  return mostRecentTime;
}

// Function to calculate user badges based on points
function calculateUserBadges(
  points: number,
): Array<{ id: string; name: string }> {
  const badges = [];

  if (points >= 1) badges.push({ id: "iniciante", name: "Iniciante" });
  if (points >= 10) badges.push({ id: "ativo", name: "Ativo" });
  if (points >= 50) badges.push({ id: "experiente", name: "Experiente" });
  if (points >= 100) badges.push({ id: "veterano", name: "Veterano" });
  if (points >= 250) badges.push({ id: "expert", name: "Expert" });
  if (points >= 500) badges.push({ id: "mestre", name: "Mestre" });

  return badges;
}

function addPoints(userId: string, points: number) {
  const stats = getUserStats(userId);
  stats.points += points;

  // Verificar novos badges
  const currentBadges = calculateUserBadges(stats.points);
  const newBadgeIds = currentBadges.map((b) => b.id);

  // Atualizar badges se mudaram
  if (
    JSON.stringify(stats.badges.sort()) !== JSON.stringify(newBadgeIds.sort())
  ) {
    stats.badges = newBadgeIds;
  }

  return stats;
}

// SISTEMA DE COMENTÁRIOS SIMPLES E ROBUSTO
function buildCommentTree(allComments: Comment[]): Comment[] {
  if (!allComments || allComments.length === 0) return [];

  // MÉTODO MAIS SIMPLES E DIRETO

  // 1. Criar um map para acesso rápido por ID
  const commentMap = new Map<string, Comment>();

  // 2. Inicializar todos os comentários com arrays vazios de replies
  allComments.forEach((comment) => {
    commentMap.set(comment.id, {
      ...comment,
      replies: [],
      repliesCount: 0,
    });
  });

  // 3. Array para comentários raiz (sem parentId)
  const rootComments: Comment[] = [];

  // 4. Processar cada comentário
  allComments.forEach((comment) => {
    const currentComment = commentMap.get(comment.id)!;

    if (!comment.parentId || comment.parentId === "") {
      // É comentário raiz
      rootComments.push(currentComment);
    } else {
      // É uma resposta - encontrar o pai
      const parent = commentMap.get(comment.parentId);
      if (parent && parent.replies) {
        parent.replies.push(currentComment);
        parent.repliesCount = parent.replies.length;
      } else {
        // Pai não encontrado - tratar como raiz
        rootComments.push(currentComment);
      }
    }
  });

  // 5. Ordenar por data/hora (função simples)
  function parseDateTime(date: string, time: string): number {
    try {
      if (date.includes("/")) {
        // Formato DD/MM/YYYY
        const [day, month, year] = date.split("/").map((num) => parseInt(num));
        const [hours, minutes] = time.split(":").map((num) => parseInt(num));
        return new Date(year, month - 1, day, hours, minutes).getTime();
      } else {
        // Formato ISO ou outro
        return new Date(`${date} ${time}`).getTime();
      }
    } catch {
      return Date.now();
    }
  }

  const sortComments = (a: Comment, b: Comment) => {
    return parseDateTime(a.date, a.time) - parseDateTime(b.date, b.time);
  };

  // 6. Ordenar comentários raiz
  rootComments.sort(sortComments);

  // 7. Ordenar replies recursivamente
  function sortRepliesInComment(comment: Comment) {
    if (comment.replies && comment.replies.length > 0) {
      comment.replies.sort(sortComments);
      comment.replies.forEach((reply) => sortRepliesInComment(reply));
    }
  }

  rootComments.forEach((comment) => sortRepliesInComment(comment));

  return rootComments;
}

function isLikedBy(entityId: string, userId: string): boolean {
  return likes.get(entityId)?.has(userId) || false;
}

function getLikeCount(entityId: string): number {
  return likes.get(entityId)?.size || 0;
}

function toggleLike(entityId: string, userId: string): LikeResponse {
  if (!likes.has(entityId)) {
    likes.set(entityId, new Set());
  }

  const entityLikes = likes.get(entityId)!;
  const wasLiked = entityLikes.has(userId);

  if (wasLiked) {
    entityLikes.delete(userId);
  } else {
    entityLikes.add(userId);
  }

  return {
    likes: entityLikes.size,
    isLiked: !wasLiked,
  };
}

// Helper para verificar se um comentário é filho de outro (recursivamente)
function isCommentOrReply(commentId: string, targetId: string): boolean {
  if (commentId === targetId) return true;

  const comment = comments.get(commentId);
  if (!comment || !comment.parentId) return false;

  return isCommentOrReply(comment.parentId, targetId);
}

// Create some demo topics
function initializeDemoData() {
  const demoTopics = [
    {
      id: "1",
      title: "Midjourney vs DALL-E 3: Comparativo de qualidade",
      description:
        "Teste side-by-side das principais ferramentas de geração de imagem",
      content:
        "Pessoal, fiz alguns testes comparativos entre o Midjourney v6 e o DALL-E 3 para entender qual produz melhores resultados.\n\nPrincipais diferenças que notei:\n\n**Midjourney v6:**\n- Melhor para arte conceitual e estilos artísticos\n- Interface no Discord pode ser confusa\n- Resultados mais consistentes em prompts complexos\n\n**DALL-E 3:**\n- Melhor integração com ChatGPT\n- Mais preciso para descrições textuais\n- Interface web mais intuitiva\n\nO que vocês acham? Qual preferem usar?",
      author: "VisualAI",
      authorId: "user_visual_ai",
      authorAvatar:
        "https://cdn.builder.io/api/v1/image/assets%2F4339d2c6c4aa4bf4b61f03263843eb86%2F3a88d03f86164e47b982a4e1e72380a2?format=webp&width=800",
      category: "imagem",
      replies: 4,
      views: 1823,
      likes: 42,
      isLiked: false,
      lastPost: { author: "CreativeAI", date: "Hoje", time: "11:45" },
      isHot: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      comments: [],
    },
    {
      id: "2",
      title: "Stable Diffusion XL: Novidades e melhorias",
      description: "Análise das novas funcionalidades do SDXL",
      content:
        "O Stable Diffusion XL trouxe várias melhorias significativas:\n\n1. **Resolução nativa 1024x1024**: Muito melhor que os 512x512 do modelo original\n2. **Modelo de refino**: Permite melhorar os detalhes das imagens geradas\n3. **Melhor compreensão de texto**: Prompts mais complexos funcionam melhor\n4. **Controle de aspectos**: Diferentes proporções funcionam melhor\n\nTestei bastante e os resultados são impressionantes. Algu��m mais teve experiências similares?",
      author: "ImageGen",
      authorId: "user_image_gen",
      authorAvatar:
        "https://cdn.builder.io/api/v1/image/assets%2F4339d2c6c4aa4bf4b61f03263843eb86%2F1b6ba24486b4431bab6f7012645c0a61?format=webp&width=800",
      category: "imagem",
      replies: 2,
      views: 945,
      likes: 23,
      isLiked: false,
      lastPost: { author: "AIArtist", date: "Hoje", time: "10:30" },
      isPinned: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      comments: [],
    },
    {
      id: "3",
      title: "Como resolver erro de VRAM insuficiente no Stable Diffusion?",
      description: "Dicas para otimizar o uso de memória da GPU",
      content:
        "Pessoal, estou tentando rodar o Stable Diffusion localmente mas sempre recebo erro de VRAM insuficiente. Minha GPU tem 8GB mas mesmo assim não consegui gerar imagens em alta resolução.\n\nJá tentei:\n- Reduzir o batch size\n- Usar o parâmetro --lowvram\n- Gerar em resolução menor\n\nAlguém tem mais dicas? É normal precisar de mais de 8GB para funcionar bem?",
      author: "TechNewbie",
      authorId: "user_tech_newbie",
      authorAvatar:
        "https://cdn.builder.io/api/v1/image/assets%2F4339d2c6c4aa4bf4b61f03263843eb86%2F40c3e177f2e64d8ca305e2adfcc1a693?format=webp&width=800",
      category: "duvidas-erros",
      replies: 7,
      views: 156,
      likes: 12,
      isLiked: false,
      lastPost: { author: "AIExpert", date: "Hoje", time: "15:22" },
      isHot: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      comments: [],
    },
  ];

  demoTopics.forEach((topic) => {
    topics.set(topic.id, topic as Topic);
  });

  // Add some demo comments with clear hierarchy
  const demoComments = [
    {
      id: "c1",
      content:
        "Excelente comparativo! Eu uso mais o Midjourney para conceitos artísticos.",
      author: "CreativeAI",
      authorId: "user_creative_ai",
      authorAvatar:
        "https://cdn.builder.io/api/v1/image/assets%2F4339d2c6c4aa4bf4b61f03263843eb86%2F12ef023c28914c699497d5e169a631c3?format=webp&width=800",
      date: "09/08/2025",
      time: "09:30",
      likes: 8,
      isLiked: false,
      topicId: "1",
    },
    {
      id: "c2",
      content:
        "Concordo completamente! O Midjourney tem uma vantagem clara em arte conceitual.",
      author: "DigitalArtist",
      authorId: "user_digital_artist",
      authorAvatar:
        "https://cdn.builder.io/api/v1/image/assets%2F4339d2c6c4aa4bf4b61f03263843eb86%2F8b93635144674ca9ad3fa486245b728d?format=webp&width=800",
      date: "09/08/2025",
      time: "10:15",
      likes: 3,
      isLiked: false,
      topicId: "1",
      parentId: "c1",
    },
    {
      id: "c3",
      content: "Mas o DALL-E 3 é melhor para textos em imagens, não acham?",
      author: "TextMaster",
      authorId: "user_text_master",
      authorAvatar:
        "https://cdn.builder.io/api/v1/image/assets%2F4339d2c6c4aa4bf4b61f03263843eb86%2F6dcd5f5eb7214b0f8018d668c517123d?format=webp&width=800",
      date: "09/08/2025",
      time: "11:00",
      likes: 5,
      isLiked: false,
      topicId: "1",
      parentId: "c1",
    },
    {
      id: "c4",
      content:
        "Concordo! O SDXL é um salto gigante. A qualidade das imagens é impressionante.",
      author: "AIArtist",
      authorId: "user_ai_artist",
      authorAvatar:
        "https://cdn.builder.io/api/v1/image/assets%2F4339d2c6c4aa4bf4b61f03263843eb86%2F477cc7711bf64b4d94e766b55d18ca30?format=webp&width=800",
      date: "09/08/2025",
      time: "08:30",
      likes: 5,
      isLiked: false,
      topicId: "2",
    },
    {
      id: "c5",
      content: "E a diferença na resolução �� not��vel!",
      author: "TechEnthusiast",
      authorId: "user_tech_enthusiast",
      authorAvatar:
        "https://cdn.builder.io/api/v1/image/assets%2F4339d2c6c4aa4bf4b61f03263843eb86%2F554fd210b6d1444b8def1042ce46dfda?format=webp&width=800",
      date: "09/08/2025",
      time: "09:45",
      likes: 2,
      isLiked: false,
      topicId: "2",
    },
    {
      id: "c6",
      content: "Verdade! E agora com o modelo de refino fica ainda melhor.",
      author: "DevPro",
      authorId: "user_dev_pro",
      authorAvatar:
        "https://cdn.builder.io/api/v1/image/assets%2F4339d2c6c4aa4bf4b61f03263843eb86%2F1b6ba24486b4431bab6f7012645c0a61?format=webp&width=800",
      date: "09/08/2025",
      time: "12:30",
      likes: 1,
      isLiked: false,
      topicId: "1",
      parentId: "c2",
    },
  ];

  demoComments.forEach((comment) => {
    comments.set(comment.id, comment as Comment);
    const topic = topics.get(comment.topicId);
    if (topic) {
      topic.comments.push(comment as Comment);
    }
  });
}

// Initialize demo data - disabled to use real data only
// initializeDemoData();

// Route handlers
export const handleGetTopics: RequestHandler = (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const category = req.query.category as string;
  const search = req.query.search as string;
  const categories = req.query.categories as string;

  let filteredTopics = Array.from(topics.values());

  if (search) {
    filteredTopics = filteredTopics.filter((topic) =>
      topic.title.toLowerCase().includes(search.toLowerCase()),
    );
  }

  if (category) {
    filteredTopics = filteredTopics.filter(
      (topic) => topic.category === category,
    );
  }

  if (categories) {
    const categoryList = categories.split(",").filter(Boolean);
    if (categoryList.length > 0) {
      filteredTopics = filteredTopics.filter((topic) =>
        categoryList.includes(topic.category),
      );
    }
  }

  if (search) {
    filteredTopics.sort((a, b) => b.likes - a.likes);
  } else {
    filteredTopics.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      // Sort by most recent activity (creation date or last comment)
      const aActivity = getMostRecentActivity(a);
      const bActivity = getMostRecentActivity(b);

      console.log(
        `[SORT] Comparing "${a.title}" (${new Date(aActivity).toLocaleString()}) vs "${b.title}" (${new Date(bActivity).toLocaleString()}) - Result: ${bActivity - aActivity}`,
      );

      return bActivity - aActivity;
    });
  }

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedTopics = filteredTopics.slice(startIndex, endIndex);

  const topicsForList = paginatedTopics.map(
    ({ content, comments: topicCommentsArray, ...topic }) => {
      // Get actual comment stats from the active comment system
      const commentStats = getTopicCommentStats(topic.id);

      // Calculate total likes (topic likes + comment likes)
      const topicLikes = getLikeCount(topic.id);
      const totalLikes = topicLikes + commentStats.totalLikes;

      // Check if user liked this topic
      const userId = req.user?.id;
      const isLiked = userId ? isLikedBy(topic.id, userId) : false;

      return {
        ...topic,
        replies: commentStats.commentsCount,
        likes: totalLikes,
        isLiked: isLiked,
      };
    },
  );

  res.json({
    topics: topicsForList,
    total: filteredTopics.length,
    page,
    limit,
    search: search || null,
    categories: categories || null,
  });
};

export const handleGetTopic: RequestHandler = (req, res) => {
  try {
    const { topicId } = req.params;
    const topic = topics.get(topicId);

    if (!topic) {
      return res.status(404).json({ message: "Tópico não encontrado" });
    }

    // Increment views
    topic.views += 1;

    // Check if user liked this topic
    const userId = req.user?.id;
    try {
      if (userId) {
        topic.isLiked = isLikedBy(topicId, userId);
        topic.likes = getLikeCount(topicId);

        // Update comments with like status
        topic.comments = topic.comments.map((comment) => ({
          ...comment,
          isLiked: isLikedBy(comment.id, userId),
          likes: getLikeCount(comment.id),
        }));
      } else {
        // Usuário não logado - apenas definir likes sem status de curtida
        topic.isLiked = false;
        topic.likes = getLikeCount(topicId);

        topic.comments = topic.comments.map((comment) => ({
          ...comment,
          isLiked: false,
          likes: getLikeCount(comment.id),
        }));
      }
    } catch (likeError) {
      console.error("[SERVER] Error processing likes:", likeError);
      // Fallback - deixar os valores originais
      topic.isLiked = false;
      topic.likes = topic.likes || 0;
    }

    // Build comment tree
    console.log(
      "DEBUG - Comentários antes da organização:",
      topic.comments.map((c) => ({
        id: c.id,
        author: c.author,
        parentId: c.parentId,
      })),
    );
    const organizedComments = buildCommentTree(topic.comments);
    console.log(
      "DEBUG - Comentários após organização:",
      JSON.stringify(
        organizedComments.map((c) => ({
          id: c.id,
          author: c.author,
          parentId: c.parentId,
          repliesCount: c.replies?.length || 0,
          replies:
            c.replies?.map((r) => ({
              id: r.id,
              author: r.author,
              parentId: r.parentId,
            })) || [],
        })),
        null,
        2,
      ),
    );
    topic.comments = organizedComments;

    res.json(topic);
  } catch (error) {
    console.error("[SERVER] Error in handleGetTopic:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};

export const handleCreateTopic: RequestHandler = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Autenticação necessária" });
  }

  try {
    console.log("[FORUM] Dados recebidos para criar tópico:", req.body);
    const data = createTopicSchema.parse(req.body);
    console.log("[FORUM] Dados validados:", data);
    const { date, time } = formatDate();

    const newTopic: Topic = {
      id: generateId(),
      title: data.title,
      description: data.description,
      content: data.content,
      author: req.user.name,
      authorId: req.user.id,
      authorAvatar: getUserAvatar(req.user),
      topicAvatarUrl: data.avatarUrl || undefined,
      category: data.category,
      replies: 0,
      views: 0,
      likes: 0,
      isLiked: false,
      lastPost: {
        author: req.user.name,
        date,
        time,
      },
      isPinned: false,
      isHot: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      comments: [],
    };

    topics.set(newTopic.id, newTopic);
    // addPoints(req.user.id, POINTS.CREATE_POST); // Temporariamente desabilitado
    res.status(201).json(newTopic);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Dados inválidos",
        errors: error.errors.map((e) => e.message),
      });
    }
    console.error("Create topic error:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};

export const handleCreateComment: RequestHandler = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Autenticação necessária" });
  }

  const { topicId } = req.params;
  const topic = topics.get(topicId);

  if (!topic) {
    return res.status(404).json({ message: "Tópico não encontrado" });
  }

  try {
    const data = createCommentSchema.parse(req.body);
    const { date, time } = formatDate();

    // Verificar se parentId existe (se for uma resposta)
    if (data.parentId) {
      const parentComment = comments.get(data.parentId);
      if (!parentComment || parentComment.topicId !== topicId) {
        return res
          .status(400)
          .json({ message: "Comentário pai não encontrado" });
      }
    }

    const newComment: Comment = {
      id: generateId(),
      content: data.content,
      author: req.user.name,
      authorId: req.user.id,
      authorAvatar: getUserAvatar(req.user),
      date,
      time,
      likes: 0,
      isLiked: false,
      topicId,
      parentId: data.parentId,
      replies: [],
      repliesCount: 0,
    };

    console.log("DEBUG - Criando comentário:", {
      id: newComment.id,
      author: newComment.author,
      parentId: newComment.parentId,
    });

    comments.set(newComment.id, newComment);
    topic.comments.push(newComment);

    // Update replies count to match actual comments count
    const topicCommentsCount = Array.from(comments.values()).filter(
      (c) => c.topicId === topicId,
    ).length;
    topic.replies = topicCommentsCount;

    topic.lastPost = {
      author: req.user.name,
      date,
      time,
    };
    topic.updatedAt = new Date().toISOString();

    // Adicionar pontos por comentar
    // addPoints(req.user.id, POINTS.CREATE_COMMENT); // Temporariamente desabilitado

    res.status(201).json(newComment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Dados inválidos",
        errors: error.errors.map((e) => e.message),
      });
    }

    console.error("Create comment error:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};

export const handleLikeTopic: RequestHandler = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Autenticação necessária" });
  }

  const { topicId } = req.params;
  const topic = topics.get(topicId);

  if (!topic) {
    return res.status(404).json({ message: "Tópico não encontrado" });
  }

  const likeResult = toggleLike(topicId, req.user.id);
  topic.likes = likeResult.likes;
  topic.isLiked = likeResult.isLiked;

  if (
    likeResult.isLiked &&
    topic.authorId !== req.user.id &&
    likeResult.likes % 5 === 0
  ) {
    // addPoints(topic.authorId, POINTS.RECEIVE_POST_LIKE); // Temporariamente desabilitado
  }

  // Sincronizar com sistema de stats
  const { onLikeToggled } = require("./user-stats-final");
  onLikeToggled(topicId, topic.authorId, likeResult.isLiked);

  res.json(likeResult);
};

export const handleLikeComment: RequestHandler = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Autenticação necessária" });
  }

  const { commentId } = req.params;
  const comment = comments.get(commentId);

  if (!comment) {
    return res.status(404).json({ message: "Comentário não encontrado" });
  }

  const likeResult = toggleLike(commentId, req.user.id);
  comment.likes = likeResult.likes;
  comment.isLiked = likeResult.isLiked;

  // Adicionar pontos ao autor do comentário quando recebe like
  if (likeResult.isLiked && comment.authorId !== req.user.id) {
    // addPoints(comment.authorId, POINTS.RECEIVE_COMMENT_LIKE); // Temporariamente desabilitado
  }

  // Sincronizar com sistema de stats
  const { onLikeToggled } = require("./user-stats-final");
  onLikeToggled(commentId, comment.authorId, likeResult.isLiked);

  res.json(likeResult);
};

// Função para calcular total de likes recebidos por um usuário nos tópicos
export function getTopicLikesForUser(userId: string): number {
  let totalLikes = 0;

  // Percorrer todos os tópicos do usuário
  for (const [topicId, topic] of topics.entries()) {
    if (topic.authorId === userId) {
      const likes = getLikeCount(topicId);
      totalLikes += likes;
    }
  }

  return totalLikes;
}

// Função para calcular total de likes recebidos por um usuário nos comentários do fórum
export function getForumCommentLikesForUser(userId: string): number {
  let totalLikes = 0;

  // Percorrer todos os comentários do usuário
  for (const [commentId, comment] of comments.entries()) {
    if (comment.authorId === userId) {
      const likes = getLikeCount(commentId);
      totalLikes += likes;
    }
  }

  return totalLikes;
}

export const handleDeleteTopic: RequestHandler = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Autenticação necessária" });
  }

  if (req.user.role !== "admin") {
    return res
      .status(403)
      .json({ message: "Apenas administradores podem excluir tópicos" });
  }

  const { topicId } = req.params;
  const topic = topics.get(topicId);

  if (!topic) {
    return res.status(404).json({ message: "Tópico não encontrado" });
  }

  topics.delete(topicId);

  Array.from(comments.entries()).forEach(([commentId, comment]) => {
    if (comment.topicId === topicId) {
      comments.delete(commentId);
    }
  });

  res.json({ message: "Tópico excluído com sucesso" });
};

export const handleDeleteComment: RequestHandler = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Autenticação necessária" });
  }

  const { commentId } = req.params;
  const comment = comments.get(commentId);

  if (!comment) {
    return res.status(404).json({ message: "Comentário não encontrado" });
  }

  const topic = topics.get(comment.topicId);
  if (!topic) {
    return res.status(404).json({ message: "Tópico não encontrado" });
  }

  // Verificar permissões: admin OU dono do post OU dono do comentário
  const isAdmin = req.user.role === "admin";
  const isTopicOwner = topic.authorId === req.user.id;
  const isCommentOwner = comment.authorId === req.user.id;

  if (!isAdmin && !isTopicOwner && !isCommentOwner) {
    return res.status(403).json({
      message:
        "Você só pode excluir seus próprios comentários ou comentários em seus posts",
    });
  }

  // Funç��o para deletar comentário e todas suas respostas
  function deleteCommentAndReplies(commentId: string): number {
    let deletedCount = 0;

    // Encontrar e remover todas as respostas primeiro
    const replies = Array.from(comments.values()).filter(
      (c) => c.parentId === commentId,
    );
    replies.forEach((reply) => {
      deletedCount += deleteCommentAndReplies(reply.id);
    });

    // Remover o comentário atual
    comments.delete(commentId);
    deletedCount += 1;

    return deletedCount;
  }

  const deletedCount = deleteCommentAndReplies(commentId);

  // Update replies count to match actual remaining comments
  const remainingComments = Array.from(comments.values()).filter(
    (c) => c.topicId === comment.topicId,
  );
  topic.replies = remainingComments.length;
  topic.comments = topic.comments.filter((c) => {
    return !isCommentOrReply(c.id, commentId);
  });

  res.json({ message: "Comentário excluído com sucesso" });
};

// Get category statistics
export const handleGetCategoryStats: RequestHandler = (req, res) => {
  try {
    const allTopics = Array.from(topics.values());
    const allComments = Array.from(comments.values());

    // Lista de todas as categorias
    const allCategoryIds = [
      // Ferramentas
      "llms",
      "imagem",
      "video",
      "musica-audio",
      "vibe-coding",
      "duvidas-erros",
      "projetos-comunidade",
      "outros",
      // Open-Source
      "opensource-llms",
      "opensource-imagem",
      "opensource-video",
      "opensource-musica-audio",
      "opensource-vibe-coding",
      "opensource-duvidas-erros",
      "opensource-projetos-comunidade",
      "opensource-outros",
    ];

    // Calculate stats for each category
    const categoryStats: any = {};

    allCategoryIds.forEach((categoryId) => {
      categoryStats[categoryId] = {
        totalTopics: allTopics.filter((t) => t.category === categoryId).length,
        totalPosts: allComments.filter((c) => {
          const topic = allTopics.find((t) => t.id === c.topicId);
          return topic?.category === categoryId;
        }).length,
        lastPost: null as any,
      };
    });

    // Find last post for each category
    Object.keys(categoryStats).forEach((categoryId) => {
      const categoryTopics = allTopics.filter((t) => t.category === categoryId);
      if (categoryTopics.length > 0) {
        // Get the topic with the most recent activity using same logic as topic list
        const topicsWithActivity = categoryTopics.map((topic) => {
          const activityTime = getMostRecentActivity(topic);
          console.log(
            `[STATS] Category ${categoryId} - Topic "${topic.title}" activity: ${new Date(activityTime).toLocaleString()}`,
          );
          return {
            topic,
            mostRecentTime: activityTime,
          };
        });

        // Sort by most recent activity and get the first one
        const mostRecentTopicData = topicsWithActivity.sort(
          (a, b) => b.mostRecentTime - a.mostRecentTime,
        )[0];

        console.log(
          `[STATS] Category ${categoryId} - Most recent topic: "${mostRecentTopicData.topic.title}" at ${new Date(mostRecentTopicData.mostRecentTime).toLocaleString()}`,
        );

        const lastTopic = mostRecentTopicData.topic;

        // Determine if this is from a comment or the original post
        const isFromComment =
          lastTopic.lastPost?.author &&
          lastTopic.lastPost.author !== lastTopic.author;

        // Use the lastPost data if available, otherwise fall back to current time
        categoryStats[categoryId].lastPost = {
          title: lastTopic.title,
          author: lastTopic.lastPost?.author || lastTopic.author,
          date:
            lastTopic.lastPost?.date ||
            new Date().toLocaleDateString("pt-BR", {
              timeZone: "America/Sao_Paulo",
            }),
          time:
            lastTopic.lastPost?.time ||
            new Date().toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "America/Sao_Paulo",
            }),
          isComment: isFromComment,
        };
      }
    });

    res.json({ categories: categoryStats });
  } catch (error) {
    console.error("Error getting category stats:", error);
    res.status(500).json({ error: "Error fetching category statistics" });
  }
};

// Função para atualizar lastPost de um tópico (usada pelo sistema de comentários)
export function updateTopicLastPost(
  topicId: string,
  lastPostData: { author: string; date: string; time: string },
) {
  const topic = topics.get(topicId);
  if (topic) {
    topic.lastPost = lastPostData;
    topic.updatedAt = new Date().toISOString();
    console.log(
      `[FORUM] LastPost atualizado para tópico ${topicId}: ${lastPostData.author} em ${lastPostData.date} às ${lastPostData.time}`,
    );
  }
}

export const handleGetUserTopics: RequestHandler = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Autenticação necessária" });
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const userTopics = Array.from(topics.values()).filter(
    (topic) => topic.authorId === req.user!.id,
  );

  userTopics.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedTopics = userTopics.slice(startIndex, endIndex);

  const topicsForList = paginatedTopics.map(
    ({ content, comments, ...topic }) => ({
      ...topic,
      lastActivity: `${topic.lastPost.date} às ${topic.lastPost.time}`,
    }),
  );

  res.json({
    topics: topicsForList,
    total: userTopics.length,
    page,
    limit,
  });
};
