export interface Comment {
  id: string;
  content: string;
  author: string;
  authorId: string;
  authorAvatar: string;
  date: string;
  time: string;
  likes: number;
  isLiked: boolean;
  topicId: string;
  parentId?: string; // Para respostas a comentários
  replies?: Comment[]; // Respostas aninhadas
  repliesCount?: number; // Contador de respostas
}

export interface Topic {
  id: string;
  title: string;
  description: string;
  content: string;
  author: string;
  authorId: string;
  authorAvatar: string;
  topicAvatarUrl?: string;
  replies: number;
  views: number;
  likes: number;
  isLiked: boolean;
  lastPost: {
    author: string;
    date: string;
    time: string;
  };
  isPinned?: boolean;
  isHot?: boolean;
  category: string;
  createdAt: string;
  updatedAt: string;
  comments: Comment[];
}

export interface CreateTopicRequest {
  title: string;
  description: string;
  content: string;
  category: string;
  avatarUrl?: string;
}

export interface CreateCommentRequest {
  content: string;
  parentId?: string; // Para responder a um comentário específico
}

export interface LikeResponse {
  likes: number;
  isLiked: boolean;
}

export interface TopicListResponse {
  topics: Omit<Topic, "comments" | "content">[];
  total: number;
  page: number;
  limit: number;
}
