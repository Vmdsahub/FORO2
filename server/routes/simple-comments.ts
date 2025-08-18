import { RequestHandler } from "express";
import { z } from "zod";

// Interface simples para comentários
interface SimpleComment {
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
  quotedCommentId?: string | null;
  quotedComment?: {
    id: string;
    content: string;
    author: string;
    authorId: string;
  };
  replies?: SimpleComment[];
  repliesCount?: number;
}

// Storage simples em memória
const comments = new Map<string, SimpleComment>();
const topicComments = new Map<string, string[]>(); // topicId -> commentIds
const commentLikes = new Map<string, Set<string>>(); // commentId -> userIds

// Schema de validação
const createCommentSchema = z.object({
  content: z.string().min(1).max(10000), // Aumentado para suportar HTML rico
  parentId: z.string().nullable().optional(),
  quotedCommentId: z.string().nullable().optional(),
});

// Helpers
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

function getUserAvatar(user: any): string {
  // Se o usuário tem avatar, usa a URL completa, senão usa as iniciais
  return user.avatar || getUserInitials(user.name);
}

// Função RECURSIVA para construir árvore de comentários com profundidade ilimitada
function buildCommentTree(topicId: string, userId?: string): SimpleComment[] {
  const commentIds = topicComments.get(topicId) || [];

  if (commentIds.length === 0) return [];

  // Buscar todos os comentários
  const allComments: SimpleComment[] = [];
  commentIds.forEach((id) => {
    const comment = comments.get(id);
    if (comment) {
      const likes = commentLikes.get(id)?.size || 0;
      const isLiked = userId
        ? commentLikes.get(id)?.has(userId) || false
        : false;

      allComments.push({
        ...comment,
        likes,
        isLiked,
      });
    }
  });

  // Função para contar todas as respostas (incluindo respostas de respostas)
  function countAllReplies(commentId: string): number {
    const directReplies = allComments.filter((c) => c.parentId === commentId);
    let totalCount = directReplies.length;

    // Contar recursivamente as respostas das respostas
    directReplies.forEach((reply) => {
      totalCount += countAllReplies(reply.id);
    });

    return totalCount;
  }

  // Função recursiva para construir hierarquia ilimitada
  function buildHierarchy(parentId: string | null): SimpleComment[] {
    const children = allComments
      .filter((c) => c.parentId === parentId)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

    return children.map((comment) => {
      const replies = buildHierarchy(comment.id);
      return {
        ...comment,
        replies,
        repliesCount: countAllReplies(comment.id),
      };
    });
  }

  // Retornar apenas comentários raiz (parentId === null)
  return buildHierarchy(null);
}

// Handlers da API
export const getComments: RequestHandler = (req, res) => {
  try {
    const { topicId } = req.params;
    const userId = req.user?.id;

    console.log(`[COMMENTS] Buscando comentários para tópico: ${topicId}`);
    console.log(`[COMMENTS] User ID identificado: ${userId || "não logado"}`);

    const commentTree = buildCommentTree(topicId, userId);

    console.log(
      `[COMMENTS] Encontrados ${commentTree.length} comentários raiz`,
    );

    res.json({ comments: commentTree });
  } catch (error) {
    console.error("[COMMENTS] Erro ao buscar comentários:", error);
    res.status(500).json({ comments: [], error: "Erro interno" });
  }
};

export const createComment: RequestHandler = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Login necessário" });
  }

  try {
    const { topicId } = req.params;
    const data = createCommentSchema.parse(req.body);

    // Verificar se parent existe
    if (data.parentId && !comments.has(data.parentId)) {
      return res.status(400).json({ message: "Comentário pai não encontrado" });
    }

    // Verificar se comentário quotado existe
    let quotedComment = null;
    if (data.quotedCommentId) {
      const quoted = comments.get(data.quotedCommentId);
      if (!quoted) {
        return res
          .status(400)
          .json({ message: "Comentário quotado não encontrado" });
      }
      quotedComment = {
        id: quoted.id,
        content: quoted.content,
        author: quoted.author,
        authorId: quoted.authorId,
      };
    }

    const commentId = generateId();
    const newComment: SimpleComment = {
      id: commentId,
      content: data.content,
      author: req.user.name,
      authorId: req.user.id,
      authorAvatar: getUserAvatar(req.user),
      topicId,
      parentId: data.parentId || null,
      createdAt: new Date().toISOString(),
      likes: 0,
      isLiked: false,
      quotedCommentId: data.quotedCommentId || null,
      quotedComment: quotedComment,
    };

    // Salvar comentário
    comments.set(commentId, newComment);

    // Adicionar à lista do tópico
    if (!topicComments.has(topicId)) {
      topicComments.set(topicId, []);
    }
    topicComments.get(topicId)!.push(commentId);

    // Atualizar lastPost do tópico no sistema de fórum
    try {
      const forumModule = require("./forum");
      if (forumModule.updateTopicLastPost) {
        const now = new Date();
        const time = now.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "America/Sao_Paulo",
        });
        const date = now.toLocaleDateString("pt-BR", {
          timeZone: "America/Sao_Paulo",
        });
        forumModule.updateTopicLastPost(topicId, {
          author: req.user.name,
          date,
          time,
        });
      }
    } catch (error) {
      console.log(
        "[COMMENTS] Aviso: Não foi possível atualizar lastPost do tópico",
        error.message,
      );
    }

    console.log(
      `[COMMENTS] Comentário criado: ${commentId} por ${req.user.name} (parent: ${data.parentId || "null"})`,
    );

    // Notificar usuário quotado (se houver)
    if (quotedComment && quotedComment.authorId !== req.user.id) {
      console.log(
        `[NOTIFICATIONS] Usuário ${quotedComment.author} foi quotado por ${req.user.name}`,
      );
      // TODO: Implementar notificação em tempo real quando sistema de websocket for adicionado
    }

    res.status(201).json(newComment);
  } catch (error) {
    console.error("[COMMENTS] Erro ao criar comentário:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: "Dados inválidos" });
    } else {
      res.status(500).json({ message: "Erro interno" });
    }
  }
};

export const likeComment: RequestHandler = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Login necessário" });
  }

  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    if (!comments.has(commentId)) {
      return res.status(404).json({ message: "Comentário não encontrado" });
    }

    if (!commentLikes.has(commentId)) {
      commentLikes.set(commentId, new Set());
    }

    const likes = commentLikes.get(commentId)!;
    const wasLiked = likes.has(userId);

    // Sincronizar com sistema de stats
    const comment = comments.get(commentId)!;
    const { onLikeToggled, checkForNewBadge } = require("./user-stats-final");

    // IMPORTANTE: Calcular likes anteriores ANTES de modificar o Set
    const previousLikes = getCommentLikesForUser(comment.authorId);

    if (wasLiked) {
      likes.delete(userId);
    } else {
      likes.add(userId);
    }

    // Sincronizar primeiro ANTES de verificar emblemas
    onLikeToggled(commentId, comment.authorId, !wasLiked);

    // Verificar se o usuário ganhou um novo emblema
    let newBadge = null;
    if (!wasLiked) {
      // Só verifica quando adiciona like - APÓS a sincronização
      const currentLikes = getCommentLikesForUser(comment.authorId);
      console.log(
        `[BADGES DEBUG] Usuário ${comment.authorId}: ${previousLikes} -> ${currentLikes} likes`,
      );
      console.log(`[BADGES DEBUG] Calling checkForNewBadge with:`, {
        previousLikes,
        currentLikes,
      });
      newBadge = checkForNewBadge(previousLikes, currentLikes);
      console.log(`[BADGES DEBUG] checkForNewBadge returned:`, newBadge);
      if (newBadge) {
        console.log(
          `[BADGES DEBUG] ✅ Novo emblema conquistado: ${newBadge.name}`,
        );
      } else {
        console.log(`[BADGES DEBUG] ❌ Nenhum novo emblema conquistado`);
      }
    } else {
      console.log(`[BADGES DEBUG] Like removido, não verifica emblemas`);
    }

    const responseData = {
      likes: likes.size,
      isLiked: !wasLiked,
      newBadge: newBadge, // Incluir info do novo emblema se houver
    };

    console.log(`[BADGES DEBUG] Sending response:`, responseData);
    res.json(responseData);
  } catch (error) {
    console.error("[COMMENTS] Erro ao curtir comentário:", error);
    res.status(500).json({ message: "Erro interno" });
  }
};

// Função para obter estatísticas de comentários de um tópico
export function getTopicCommentStats(topicId: string): {
  commentsCount: number;
  totalLikes: number;
} {
  const commentIds = topicComments.get(topicId) || [];

  let totalLikes = 0;
  commentIds.forEach((commentId) => {
    const likesCount = commentLikes.get(commentId)?.size || 0;
    totalLikes += likesCount;
  });

  return {
    commentsCount: commentIds.length,
    totalLikes,
  };
}

// Função para obter a data do comentário mais recente de um tópico
export function getTopicMostRecentCommentDate(topicId: string): Date | null {
  const commentIds = topicComments.get(topicId) || [];

  if (commentIds.length === 0) {
    return null;
  }

  let mostRecentDate: Date | null = null;

  commentIds.forEach((commentId) => {
    const comment = comments.get(commentId);
    if (comment) {
      const commentDate = new Date(comment.createdAt);
      if (!mostRecentDate || commentDate > mostRecentDate) {
        mostRecentDate = commentDate;
      }
    }
  });

  return mostRecentDate;
}

// Função para calcular total de likes recebidos por um usuário nos comentários
export function getCommentLikesForUser(userId: string): number {
  let totalLikes = 0;

  // Percorrer todos os comentários do usuário
  for (const [commentId, comment] of comments.entries()) {
    if (comment.authorId === userId) {
      const likes = commentLikes.get(commentId)?.size || 0;
      totalLikes += likes;
    }
  }

  return totalLikes;
}

// Função para sincronizar likes (chamada quando likes mudam)
export function syncCommentLikes() {
  const { onLikeToggled } = require("./user-stats-final");

  // Notificar mudanças para todos os autores de comentários
  for (const [commentId, comment] of comments.entries()) {
    const likes = commentLikes.get(commentId)?.size || 0;
    onLikeToggled(commentId, comment.authorId, likes > 0);
  }
}

export const deleteComment: RequestHandler = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Login necessário" });
  }

  try {
    const { commentId } = req.params;
    const comment = comments.get(commentId);

    if (!comment) {
      return res.status(404).json({ message: "Coment��rio não encontrado" });
    }

    // Verificar permissões
    const isOwner = comment.authorId === req.user.id;
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Sem permissão" });
    }

    // Deletar comentário e suas respostas recursivamente
    function deleteRecursive(id: string) {
      const allComments = Array.from(comments.values());
      const replies = allComments.filter((c) => c.parentId === id);

      replies.forEach((reply) => deleteRecursive(reply.id));

      comments.delete(id);
      commentLikes.delete(id);

      // Remover da lista do tópico
      const topicId = comment.topicId;
      const commentIds = topicComments.get(topicId) || [];
      const updatedIds = commentIds.filter((cId) => cId !== id);
      topicComments.set(topicId, updatedIds);
    }

    deleteRecursive(commentId);

    res.json({ message: "Comentário deletado" });
  } catch (error) {
    console.error("[COMMENTS] Erro ao deletar comentário:", error);
    res.status(500).json({ message: "Erro interno" });
  }
};

// Inicializar dados demo mais extensos para testar profundidade
export function initializeDemo() {
  // Limpar dados
  comments.clear();
  topicComments.clear();
  commentLikes.clear();

  // Dados demo para tópico "1" com múltiplos níveis
  const demoData = [
    {
      id: "demo1",
      content: "Ótimo comparativo! Muito útil para escolher.",
      author: "João",
      authorId: "demo_user_123",
      authorAvatar:
        "https://cdn.builder.io/api/v1/image/assets%2F4339d2c6c4aa4bf4b61f03263843eb86%2F477cc7711bf64b4d94e766b55d18ca30?format=webp&width=800",
      topicId: "1",
      parentId: null,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: "demo2",
      content: "Concordo! O Midjourney realmente se destaca em arte.",
      author: "Carlos",
      authorId: "user_carlos",
      authorAvatar:
        "https://cdn.builder.io/api/v1/image/assets%2F4339d2c6c4aa4bf4b61f03263843eb86%2F6dcd5f5eb7214b0f8018d668c517123d?format=webp&width=800",
      topicId: "1",
      parentId: "demo1",
      createdAt: new Date(Date.now() - 6600000).toISOString(),
    },
    {
      id: "demo3",
      content: "Obrigado pelos comentários! Ajuda muito o feedback.",
      author: "Admin",
      authorId: "admin_vitoca_456",
      authorAvatar:
        "https://cdn.builder.io/api/v1/image/assets%2F4339d2c6c4aa4bf4b61f03263843eb86%2F554fd210b6d1444b8def1042ce46dfda?format=webp&width=800",
      topicId: "1",
      parentId: "demo2",
      createdAt: new Date(Date.now() - 6000000).toISOString(),
    },
    {
      id: "demo4",
      content: "Posso adicionar uma resposta aqui no nível 4?",
      author: "João",
      authorId: "demo_user_123",
      authorAvatar:
        "https://cdn.builder.io/api/v1/image/assets%2F4339d2c6c4aa4bf4b61f03263843eb86%2F477cc7711bf64b4d94e766b55d18ca30?format=webp&width=800",
      topicId: "1",
      parentId: "demo3",
      createdAt: new Date(Date.now() - 5400000).toISOString(),
    },
    {
      id: "demo5",
      content: "E eu no nível 5! Testando profundidade.",
      author: "Eduardo",
      authorId: "user_eduardo",
      authorAvatar:
        "https://cdn.builder.io/api/v1/image/assets%2F4339d2c6c4aa4bf4b61f03263843eb86%2F8b93635144674ca9ad3fa486245b728d?format=webp&width=800",
      topicId: "1",
      parentId: "demo4",
      createdAt: new Date(Date.now() - 4800000).toISOString(),
    },
  ];

  // Salvar dados demo
  demoData.forEach((item) => {
    const comment: SimpleComment = {
      ...item,
      likes: 0,
      isLiked: false,
    };

    comments.set(item.id, comment);

    if (!topicComments.has(item.topicId)) {
      topicComments.set(item.topicId, []);
    }
    topicComments.get(item.topicId)!.push(item.id);
  });

  // Adicionar likes demo para testar sistema de pontos
  // demo_user_123 (João) recebe 6 likes total (vai ganhar o badge!)
  commentLikes.set(
    "demo1",
    new Set([
      "admin_vitoca_456",
      "user_maria_789",
      "user_pedro_101",
      "user_ana_202",
    ]),
  ); // 4 likes para comentário do João (demo1)
  commentLikes.set("demo4", new Set(["user_carlos", "user_pedro_101"])); // +2 likes para segundo comentário do João (demo4) = 6 total

  // admin_vitoca_456 (Admin) recebe 4 likes total no comentário demo3
  commentLikes.set(
    "demo3",
    new Set([
      "demo_user_123",
      "user_maria_789",
      "user_pedro_101",
      "user_ana_202",
    ]),
  ); // 4 likes para comentário do Admin (demo3)

  // user_eduardo recebe 2 likes no comentário demo5
  commentLikes.set("demo5", new Set(["demo_user_123", "admin_vitoca_456"])); // 2 likes para Eduardo

  console.log(
    "[COMMENTS] Sistema inicializado com dados demo de múltiplos níveis e likes para pontos reais",
  );

  // Debug: mostrar contagem de likes por usuário
  console.log(
    `[COMMENTS] João (demo_user_123) tem ${getCommentLikesForUser("demo_user_123")} likes`,
  );
  console.log(
    `[COMMENTS] Admin (admin_vitoca_456) tem ${getCommentLikesForUser("admin_vitoca_456")} likes`,
  );
}
