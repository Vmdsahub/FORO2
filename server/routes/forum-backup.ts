import { RequestHandler } from "express";
import { z } from "zod";
import {
  Topic,
  Comment,
  CreateTopicRequest,
  CreateCommentRequest,
  LikeResponse,
} from "@shared/forum";
// import { POINTS, calculateUserBadges, BADGES } from "@shared/badges"; // Temporariamente removido

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
  });
  // Usar "Hoje" para consistência com o sistema de ordenação
  return { date: "Hoje", time };
}

function getUserInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

// Funções para gerenciar pontos e badges
function getUserStats(userId: string) {
  if (!userStats.has(userId)) {
    userStats.set(userId, { points: 0, badges: [] });
  }
  return userStats.get(userId)!;
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

function getUserPoints(userId: string): number {
  return getUserStats(userId).points;
}

function getUserBadges(userId: string): string[] {
  return getUserStats(userId).badges;
}

// Helper para organizar comentários em estrutura hierárquica
function organizeComments(comments: Comment[]): Comment[] {
  const commentMap = new Map<string, Comment>();
  const rootComments: Comment[] = [];

  // Função para parsear data/hora e criar timestamp
  function parseDateTime(date: string, time: string): number {
    // Se a data for "Hoje", usar data atual
    if (date === "Hoje") {
      const today = new Date();
      const [hours, minutes] = time.split(":");
      today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      return today.getTime();
    }

    // Se a data for "Ontem", usar ontem
    if (date === "Ontem") {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const [hours, minutes] = time.split(":");
      yesterday.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      return yesterday.getTime();
    }

    // Para outras datas, tentar fazer parsing
    try {
      const dateTime = new Date(date + " " + time);
      if (!isNaN(dateTime.getTime())) {
        return dateTime.getTime();
      }
    } catch (e) {
      // Se falhar, usar timestamp atual
    }

    return Date.now();
  }

  // Primeiro, criar o mapa de comentários com inicialização correta
  comments.forEach((comment) => {
    commentMap.set(comment.id, {
      ...comment,
      replies: [],
      repliesCount: 0,
    });
  });

  // Separar comentários raiz dos replies
  const rootCommentsList: Comment[] = [];
  const repliesList: Comment[] = [];

  comments.forEach((comment) => {
    if (comment.parentId) {
      repliesList.push(comment);
    } else {
      rootCommentsList.push(comment);
    }
  });

  // Ordenar comentários raiz por data (mais antigos primeiro)
  rootCommentsList.sort((a, b) => {
    return parseDateTime(a.date, a.time) - parseDateTime(b.date, b.time);
  });

  // Ordenar replies por data (mais antigos primeiro)
  repliesList.sort((a, b) => {
    return parseDateTime(a.date, a.time) - parseDateTime(b.date, b.time);
  });

  // Adicionar comentários raiz ao resultado
  rootCommentsList.forEach((comment) => {
    const commentWithReplies = commentMap.get(comment.id)!;
    rootComments.push(commentWithReplies);
  });

  // Processar replies e anexar aos pais corretos
  repliesList.forEach((reply) => {
    const replyWithReplies = commentMap.get(reply.id)!;
    const parent = commentMap.get(reply.parentId!);

    if (parent) {
      if (!parent.replies) parent.replies = [];
      parent.replies.push(replyWithReplies);
      parent.repliesCount = (parent.repliesCount || 0) + 1;
    }
  });

  // Função recursiva para ordenar replies dentro de cada nível
  function sortRepliesRecursively(comment: Comment) {
    if (comment.replies && comment.replies.length > 0) {
      // Ordenar replies por data (mais antigos primeiro)
      comment.replies.sort((a, b) => {
        return parseDateTime(a.date, a.time) - parseDateTime(b.date, b.time);
      });

      // Aplicar recursivamente para sub-replies
      comment.replies.forEach((reply) => {
        sortRepliesRecursively(reply);
      });
    }
  }

  // Aplicar ordenação recursiva para todos os comentários raiz
  rootComments.forEach((comment) => {
    sortRepliesRecursively(comment);
  });

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
      authorAvatar: "VA",
      category: "imagem",
      replies: 56,
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
        "O Stable Diffusion XL trouxe várias melhorias significativas:\n\n1. **Resolução nativa 1024x1024**: Muito melhor que os 512x512 do modelo original\n2. **Modelo de refino**: Permite melhorar os detalhes das imagens geradas\n3. **Melhor compreensão de texto**: Prompts mais complexos funcionam melhor\n4. **Controle de aspectos**: Diferentes proporções funcionam melhor\n\nTestei bastante e os resultados são impressionantes. Alguém mais teve experiências similares?",
      author: "ImageGen",
      authorId: "user_image_gen",
      authorAvatar: "IG",
      category: "imagem",
      replies: 28,
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
      title: "ChatGPT 4o: Primeiras impressões",
      description: "Review completo da nova versão do ChatGPT",
      content: "O ChatGPT 4o trouxe várias melhorias interessantes...",
      author: "AIExplorer",
      authorId: "user_ai_explorer",
      authorAvatar: "AE",
      category: "ia-hub",
      replies: 34,
      views: 1256,
      likes: 67,
      isLiked: false,
      lastPost: { author: "TechReviewer", date: "Hoje", time: "14:20" },
      isHot: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      comments: [],
    },
    {
      id: "4",
      title: "Runway ML Gen-3: Geração de vídeo revolucionária",
      description: "Como o Runway está mudando a criação de vídeos",
      content: "A nova versão do Runway ML é impressionante...",
      author: "VideoCreator",
      authorId: "user_video_creator",
      authorAvatar: "VC",
      category: "video",
      replies: 22,
      views: 892,
      likes: 38,
      isLiked: false,
      lastPost: { author: "FilmMaker", date: "Ontem", time: "16:30" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      comments: [],
    },
    {
      id: "5",
      title: "GitHub Copilot vs Cursor: Comparativo de IDEs com IA",
      description: "Qual ferramenta de coding com IA é melhor?",
      content: "Testei ambas ferramentas por 2 semanas...",
      author: "DevMaster",
      authorId: "user_dev_master",
      authorAvatar: "DM",
      category: "vibe-coding",
      replies: 45,
      views: 2103,
      likes: 89,
      isLiked: false,
      lastPost: { author: "CodeNinja", date: "Hoje", time: "09:15" },
      isPinned: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      comments: [],
    },
    {
      id: "6",
      title: "Suno AI: Criando música com inteligência artificial",
      description: "Tutorial completo para gerar músicas profissionais",
      content: "O Suno AI é uma ferramenta incrível para criar música...",
      author: "MusicProducer",
      authorId: "user_music_producer",
      authorAvatar: "MP",
      category: "musica-audio",
      replies: 18,
      views: 756,
      likes: 32,
      isLiked: false,
      lastPost: { author: "AudioEngineer", date: "Hoje", time: "12:45" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      comments: [],
    },
  ];

  demoTopics.forEach((topic) => {
    topics.set(topic.id, topic as Topic);
  });

  // Add some demo comments with proper chronological order
  const demoComments = [
    {
      id: "c1",
      content:
        "Excelente comparativo! Eu uso mais o Midjourney para conceitos artísticos, mas o DALL-E 3 é realmente superior para prompts descritivos.",
      author: "CreativeAI",
      authorId: "user_creative_ai",
      authorAvatar: "CA",
      date: "Hoje",
      time: "09:30",
      likes: 8,
      isLiked: false,
      topicId: "1",
    },
    {
      id: "c2",
      content:
        "Concordo completamente! Testei os dois e o Midjourney tem uma vantagem clara em arte conceitual.",
      author: "DigitalArtist",
      authorId: "user_digital_artist",
      authorAvatar: "DA",
      date: "Hoje",
      time: "10:15",
      likes: 3,
      isLiked: false,
      topicId: "1",
    },
    {
      id: "c3",
      content:
        "Concordo! O SDXL é um salto gigante. A qualidade das imagens é impressionante, especialmente com o modelo de refino.",
      author: "AIArtist",
      authorId: "user_ai_artist",
      authorAvatar: "AA",
      date: "Hoje",
      time: "08:30",
      likes: 5,
      isLiked: false,
      topicId: "2",
    },
    {
      id: "c4",
      content:
        "Sim! E a diferença na resolução é notável. Finalmente podemos gerar imagens de alta qualidade sem precisar fazer upscale.",
      author: "TechEnthusiast",
      authorId: "user_tech_enthusiast",
      authorAvatar: "TE",
      date: "Hoje",
      time: "09:45",
      likes: 2,
      isLiked: false,
      topicId: "2",
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

// Initialize demo data
initializeDemoData();

// Route handlers
export const handleGetTopics: RequestHandler = (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const category = req.query.category as string;
  const search = req.query.search as string;
  const categories = req.query.categories as string; // comma-separated category IDs

  let filteredTopics = Array.from(topics.values());

  // Filter by search query (title contains the search term)
  if (search) {
    filteredTopics = filteredTopics.filter((topic) =>
      topic.title.toLowerCase().includes(search.toLowerCase()),
    );
  }

  // Filter by single category
  if (category) {
    filteredTopics = filteredTopics.filter(
      (topic) => topic.category === category,
    );
  }

  // Filter by multiple categories (advanced search)
  if (categories) {
    const categoryList = categories.split(",").filter(Boolean);
    if (categoryList.length > 0) {
      filteredTopics = filteredTopics.filter((topic) =>
        categoryList.includes(topic.category),
      );
    }
  }

  // Sort by search relevance or default sorting
  if (search) {
    // Sort by likes (descending) when searching
    filteredTopics.sort((a, b) => b.likes - a.likes);
  } else {
    // Sort by pinned first, then by creation date (newest first)
    filteredTopics.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedTopics = filteredTopics.slice(startIndex, endIndex);

  // Remove content and comments for list view
  const topicsForList = paginatedTopics.map(
    ({ content, comments, ...topic }) => topic,
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
  const { topicId } = req.params;
  const topic = topics.get(topicId);

  if (!topic) {
    return res.status(404).json({ message: "Tópico não encontrado" });
  }

  // Increment views
  topic.views += 1;

  // Check if user liked this topic
  const userId = req.user?.id;
  if (userId) {
    topic.isLiked = isLikedBy(topicId, userId);
    topic.likes = getLikeCount(topicId);

    // Update comments with like status
    topic.comments = topic.comments.map((comment) => ({
      ...comment,
      isLiked: isLikedBy(comment.id, userId),
      likes: getLikeCount(comment.id),
    }));
  }

  // Organizar comentários em estrutura hierárquica
  const organizedComments = organizeComments(topic.comments);
  topic.comments = organizedComments;

  res.json(topic);
};

export const handleCreateTopic: RequestHandler = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Autenticação necessária" });
  }

  try {
    const data = createTopicSchema.parse(req.body);
    const { date, time } = formatDate();

    const newTopic: Topic = {
      id: generateId(),
      title: data.title,
      description: data.description,
      content: data.content,
      author: req.user.name,
      authorId: req.user.id,
      authorAvatar: getUserInitials(req.user.name),
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

    // Adicionar pontos por criar post
    addPoints(req.user.id, POINTS.CREATE_POST);

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
      authorAvatar: getUserInitials(req.user.name),
      date,
      time,
      likes: 0,
      isLiked: false,
      topicId,
      parentId: data.parentId,
      replies: [],
      repliesCount: 0,
    };

    comments.set(newComment.id, newComment);
    topic.comments.push(newComment);
    topic.replies += 1;
    topic.lastPost = {
      author: req.user.name,
      date,
      time,
    };
    topic.updatedAt = new Date().toISOString();

    // Adicionar pontos por comentar
    addPoints(req.user.id, POINTS.CREATE_COMMENT);

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

  // Adicionar pontos ao autor do tópico a cada 5 likes
  if (
    likeResult.isLiked &&
    topic.authorId !== req.user.id &&
    likeResult.likes % 5 === 0
  ) {
    addPoints(topic.authorId, POINTS.RECEIVE_POST_LIKE);
  }

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
    addPoints(comment.authorId, POINTS.RECEIVE_COMMENT_LIKE);
  }

  res.json(likeResult);
};

export const handleDeleteTopic: RequestHandler = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Autenticação necessária" });
  }

  // Verificar se é admin
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

  // Remover tópico
  topics.delete(topicId);

  // Remover comentários associados
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

  // Função recursiva para contar e remover comentários e respostas
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

  // Atualizar contador de replies no tópico
  topic.replies = Math.max(0, topic.replies - deletedCount);
  topic.comments = topic.comments.filter((c) => {
    // Remover o comentário e todas suas respostas da lista do tópico
    return !isCommentOrReply(c.id, commentId);
  });

  res.json({ message: "Comentário excluído com sucesso" });
};

// Helper para verificar se um comentário é filho de outro (recursivamente)
function isCommentOrReply(commentId: string, targetId: string): boolean {
  if (commentId === targetId) return true;

  const comment = comments.get(commentId);
  if (!comment || !comment.parentId) return false;

  return isCommentOrReply(comment.parentId, targetId);
}

export const handleGetUserTopics: RequestHandler = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Autenticação necessária" });
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  // Filter topics by current user
  const userTopics = Array.from(topics.values()).filter(
    (topic) => topic.authorId === req.user!.id,
  );

  // Sort by creation date (newest first)
  userTopics.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedTopics = userTopics.slice(startIndex, endIndex);

  // Remove content and comments for list view to reduce payload
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
