import { RequestHandler } from "express";
import { z } from "zod";

// Interface simples para comentários
interface CommentData {
  id: string;
  content: string;
  author: string;
  authorId: string;
  authorAvatar: string;
  topicId: string;
  parentId: string | null;
  createdAt: string;
  likes: number;
  isLiked: boolean;
}

// Storage simples
const commentsStore = new Map<string, CommentData>();
const topicComments = new Map<string, string[]>(); // topicId -> commentIds[]
const commentLikes = new Map<string, Set<string>>(); // commentId -> userIds

// Schema de validação
const createCommentSchema = z.object({
  content: z.string().min(1).max(1000),
  parentId: z.string().nullable().optional(),
});

// Funções helper
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function getUserInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function getCommentLikes(commentId: string): number {
  return commentLikes.get(commentId)?.size || 0;
}

function isCommentLikedBy(commentId: string, userId: string): boolean {
  return commentLikes.get(commentId)?.has(userId) || false;
}

// NOVA FUNÇÃO PARA CONSTRUIR ÁRVORE HIERÁRQUICA - MUITO SIMPLES
function buildCommentTree(topicId: string, userId?: string): CommentData[] {
  const commentIds = topicComments.get(topicId) || [];

  if (commentIds.length === 0) return [];

  // Buscar todos os comentários
  const allComments: CommentData[] = [];
  commentIds.forEach((id) => {
    const comment = commentsStore.get(id);
    if (comment) {
      allComments.push({
        ...comment,
        likes: getCommentLikes(id),
        isLiked: userId ? isCommentLikedBy(id, userId) : false,
      });
    }
  });

  // Separar comentários raiz (sem parent) dos replies
  const rootComments = allComments.filter((c) => !c.parentId);
  const replyComments = allComments.filter((c) => c.parentId);

  // Ordenar por data de criação
  const sortByDate = (a: CommentData, b: CommentData) => {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  };

  rootComments.sort(sortByDate);
  replyComments.sort(sortByDate);

  // Construir estrutura hierárquica
  const result: any[] = [];

  // Adicionar comentários raiz
  rootComments.forEach((comment) => {
    const commentWithReplies = {
      ...comment,
      replies: [] as any[],
      repliesCount: 0,
    };

    // Encontrar e adicionar replies para este comentário
    const directReplies = replyComments.filter(
      (r) => r.parentId === comment.id,
    );

    directReplies.forEach((reply) => {
      const replyWithSubReplies = {
        ...reply,
        replies: [] as any[],
        repliesCount: 0,
      };

      // Encontrar sub-replies (replies dos replies)
      const subReplies = replyComments.filter((sr) => sr.parentId === reply.id);
      replyWithSubReplies.replies = subReplies.map((sr) => ({
        ...sr,
        replies: [],
        repliesCount: 0,
      }));
      replyWithSubReplies.repliesCount = subReplies.length;

      commentWithReplies.replies.push(replyWithSubReplies);
    });

    commentWithReplies.repliesCount = directReplies.length;
    result.push(commentWithReplies);
  });

  return result;
}

// API Handlers
export const handleGetComments: RequestHandler = (req, res) => {
  try {
    const { topicId } = req.params;
    const userId = req.user?.id;

    console.log(
      `[DEBUG] Buscando comentários para tópico: ${topicId}, usuário: ${userId}`,
    );

    const comments = buildCommentTree(topicId, userId);

    console.log(
      `[DEBUG] Encontrados ${comments.length} comentários para tópico ${topicId}`,
    );

    res.setHeader("Content-Type", "application/json");
    res.json({ comments });
  } catch (error) {
    console.error("[ERROR] Erro ao buscar comentários:", error);
    res.status(500).json({ error: "Erro interno do servidor", comments: [] });
  }
};

export const handleCreateComment: RequestHandler = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Login necessário" });
  }

  const { topicId } = req.params;

  try {
    const data = createCommentSchema.parse(req.body);

    // Verificar se parent existe quando é uma resposta
    if (data.parentId) {
      const parentExists = commentsStore.has(data.parentId);
      if (!parentExists) {
        return res
          .status(400)
          .json({ message: "Comentário pai não encontrado" });
      }
    }

    const commentId = generateId();
    const newComment: CommentData = {
      id: commentId,
      content: data.content,
      author: req.user.name,
      authorId: req.user.id,
      authorAvatar: getUserInitials(req.user.name),
      topicId,
      parentId: data.parentId || null,
      createdAt: new Date().toISOString(),
      likes: 0,
      isLiked: false,
    };

    // Salvar comentário
    commentsStore.set(commentId, newComment);

    // Adicionar à lista do tópico
    if (!topicComments.has(topicId)) {
      topicComments.set(topicId, []);
    }
    topicComments.get(topicId)!.push(commentId);

    console.log(
      `[DEBUG] Comentário criado: ${commentId}, parent: ${data.parentId}, autor: ${req.user.name}`,
    );

    res.status(201).json(newComment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Dados inválidos" });
    }
    console.error("Erro ao criar comentário:", error);
    res.status(500).json({ message: "Erro interno" });
  }
};

export const handleLikeComment: RequestHandler = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Login necessário" });
  }

  const { commentId } = req.params;
  const userId = req.user.id;

  if (!commentsStore.has(commentId)) {
    return res.status(404).json({ message: "Comentário não encontrado" });
  }

  if (!commentLikes.has(commentId)) {
    commentLikes.set(commentId, new Set());
  }

  const likes = commentLikes.get(commentId)!;
  const wasLiked = likes.has(userId);

  if (wasLiked) {
    likes.delete(userId);
  } else {
    likes.add(userId);
  }

  res.json({
    likes: likes.size,
    isLiked: !wasLiked,
  });
};

export const handleDeleteComment: RequestHandler = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Login necessário" });
  }

  const { commentId } = req.params;
  const comment = commentsStore.get(commentId);

  if (!comment) {
    return res.status(404).json({ message: "Comentário não encontrado" });
  }

  // Verificar permissões
  const isOwner = comment.authorId === req.user.id;
  const isAdmin = req.user.role === "admin";

  if (!isOwner && !isAdmin) {
    return res.status(403).json({ message: "Sem permissão" });
  }

  // Deletar comentário e replies
  function deleteCommentAndReplies(id: string) {
    // Encontrar e deletar todos os replies primeiro
    const allComments = Array.from(commentsStore.values());
    const replies = allComments.filter((c) => c.parentId === id);

    replies.forEach((reply) => {
      deleteCommentAndReplies(reply.id);
    });

    // Deletar o comentário atual
    commentsStore.delete(id);
    commentLikes.delete(id);

    // Remover da lista do tópico
    const topicId = comment.topicId;
    const commentIds = topicComments.get(topicId) || [];
    const updatedIds = commentIds.filter((cId) => cId !== id);
    topicComments.set(topicId, updatedIds);
  }

  deleteCommentAndReplies(commentId);

  res.json({ message: "Comentário deletado" });
};

// Função para inicializar dados demo
export function initializeCommentsDemo() {
  // Limpar dados existentes
  commentsStore.clear();
  topicComments.clear();
  commentLikes.clear();

  // Comentários demo para tópico "1"
  const demoComments = [
    {
      id: "demo1",
      content: "Excelente comparativo! Muito útil.",
      author: "Maria",
      authorId: "user1",
      authorAvatar: "MA",
      topicId: "1",
      parentId: null,
      createdAt: new Date(Date.now() - 3600000).toISOString(), // 1h atrás
    },
    {
      id: "demo2",
      content: "Concordo! Especialmente sobre o Midjourney.",
      author: "João",
      authorId: "user2",
      authorAvatar: "JO",
      topicId: "1",
      parentId: "demo1",
      createdAt: new Date(Date.now() - 3000000).toISOString(), // 50min atrás
    },
    {
      id: "demo3",
      content: "Obrigado pelo feedback!",
      author: "Pedro",
      authorId: "user3",
      authorAvatar: "PE",
      topicId: "1",
      parentId: "demo2",
      createdAt: new Date(Date.now() - 2400000).toISOString(), // 40min atrás
    },
  ];

  // Salvar comentários demo
  demoComments.forEach((comment) => {
    commentsStore.set(comment.id, comment as CommentData);

    if (!topicComments.has(comment.topicId)) {
      topicComments.set(comment.topicId, []);
    }
    topicComments.get(comment.topicId)!.push(comment.id);
  });

  console.log("[INFO] Sistema de comentários inicializado com dados demo");
}
