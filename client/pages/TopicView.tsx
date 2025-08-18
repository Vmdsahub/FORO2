import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import SimpleCommentSystem from "@/components/SimpleCommentSystem";
import UserPointsBadge from "@/components/UserPointsBadge";
import UserHoverCard from "@/components/UserHoverCard";
import ReportModal from "@/components/ReportModal";

interface Topic {
  id: string;
  title: string;
  description: string;
  author: string;
  authorId: string;
  authorAvatar: string;
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
  content: string;
}

export default function TopicView() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savedTopicIds, setSavedTopicIds] = useState<string[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    fetchTopic();
  }, [topicId]);

  // Load saved topics
  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`savedTopics_${user.email}`);
      if (saved) {
        try {
          setSavedTopicIds(JSON.parse(saved));
        } catch (error) {
          console.error("Error loading saved topics:", error);
        }
      }
    }
  }, [user]);

  const fetchTopic = async () => {
    if (!topicId) {
      toast.error("ID do tópico não encontrado");
      navigate("/");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/topics/${topicId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTopic(data);
      } else {
        toast.error("Tópico não encontrado");
        navigate("/");
      }
    } catch (error) {
      console.error("Error fetching topic:", error);
      toast.error("Erro ao carregar tópico");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLikeTopic = async () => {
    if (!user) {
      toast.error("Faça login para curtir");
      return;
    }

    try {
      const response = await fetch(`/api/topics/${topicId}/like`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTopic((prev) =>
          prev ? { ...prev, likes: data.likes, isLiked: data.isLiked } : null,
        );
        // Trigger user stats refresh for hover cards and theme context
        window.dispatchEvent(new CustomEvent("userLikeUpdate"));
        window.dispatchEvent(new CustomEvent("refreshUserLikes"));
      }
    } catch (error) {
      console.error("Error liking topic:", error);
      toast.error("Erro ao curtir tópico");
    }
  };

  const handleDeleteTopic = async () => {
    if (!isAdmin || !topic) return;

    if (!confirm(`Tem certeza que deseja excluir o tópico "${topic.title}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/topics/${topicId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });

      if (response.ok) {
        toast.success("Tópico excluído com sucesso!");
        navigate("/"); // Volta para a página principal
      } else {
        toast.error("Erro ao excluir tópico");
      }
    } catch (error) {
      console.error("Error deleting topic:", error);
      toast.error("Erro ao excluir tópico");
    }
  };

  const handleSaveTopic = () => {
    if (!user || !topic) {
      toast.error("Faça login para salvar tópicos");
      return;
    }

    const storageKey = `savedTopics_${user.email}`;
    const saved = localStorage.getItem(storageKey);
    let savedIds: string[] = [];

    if (saved) {
      try {
        savedIds = JSON.parse(saved);
      } catch (error) {
        console.error("Error parsing saved topics:", error);
      }
    }

    if (savedIds.includes(topic.id)) {
      // Remove from saved
      const updatedIds = savedIds.filter((id) => id !== topic.id);
      localStorage.setItem(storageKey, JSON.stringify(updatedIds));
      setSavedTopicIds(updatedIds);
      toast.success("Tópico removido dos salvos");
    } else {
      // Add to saved
      const updatedIds = [...savedIds, topic.id];
      localStorage.setItem(storageKey, JSON.stringify(updatedIds));
      setSavedTopicIds(updatedIds);
      toast.success(`"${topic.title}" salvo com sucesso!`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando tópico...</p>
        </div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-black mb-4">
            Tópico não encontrado
          </h2>
          <Button onClick={() => navigate("/")} variant="outline">
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container max-w-4xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path
                d="M8 0L6.6 1.4 12.2 7H0v2h12.2L6.6 14.6 8 16l8-8-8-8z"
                transform="rotate(180 8 8)"
              />
            </svg>
            Voltar ao fórum
          </button>
        </div>

        {/* Topic Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              {topic.isPinned && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Fixado
                </span>
              )}
              {topic.isHot && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  🔥 Quente
                </span>
              )}
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {topic.category}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-black mb-4">
              {topic.title}
            </h1>
          </div>

          {/* Topic Content */}
          <div className="border-t border-gray-100 pt-4 mb-4">
            <MarkdownRenderer content={topic.content} />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            {/* Autor à esquerda */}
            <div className="flex items-center gap-2">
              <UserHoverCard
                userId={topic.authorId}
                userName={topic.author}
                userAvatar={topic.authorAvatar}
                isTopicAuthor={true}
                size="sm"
              >
                <div className="flex items-center gap-2 cursor-pointer">
                  <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-sm font-semibold hover:bg-gray-800 transition-colors overflow-hidden">
                    {topic.authorAvatar.startsWith("http") ? (
                      <img
                        src={topic.authorAvatar}
                        alt={topic.author}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      topic.authorAvatar
                    )}
                  </div>
                  <span className="text-sm text-gray-500">
                    por{" "}
                    <span className="font-medium text-black hover:text-gray-700 transition-colors">
                      {topic.author}
                    </span>
                  </span>
                </div>
              </UserHoverCard>
            </div>

            {/* Ações à direita */}
            <div className="flex items-center gap-3">
              {user && (
                <button
                  onClick={handleSaveTopic}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                    savedTopicIds.includes(topic.id)
                      ? "bg-yellow-50 text-yellow-600 hover:bg-yellow-100"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  }`}
                  title={
                    savedTopicIds.includes(topic.id)
                      ? "Remover dos salvos"
                      : "Salvar tópico"
                  }
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill={
                      savedTopicIds.includes(topic.id) ? "currentColor" : "none"
                    }
                    stroke="currentColor"
                  >
                    <path
                      d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"
                      strokeWidth="2"
                    />
                  </svg>
                  {savedTopicIds.includes(topic.id) ? "Salvo" : "Salvar"}
                </button>
              )}

              {/* Botão de denúncia */}
              {user && user.id !== topic.authorId && (
                <button
                  onClick={() => setShowReportModal(true)}
                  className="flex items-center gap-1 px-2 py-2 rounded-md bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                  title="Denunciar tópico"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                  !
                </button>
              )}

              <button
                onClick={() => {
                  handleLikeTopic();
                  // Add like animation
                  if (!topic.isLiked) {
                    const button = document.getElementById(
                      `topic-heart-${topic.id}`,
                    );
                    if (button) {
                      button.classList.add("liked");
                      setTimeout(() => button.classList.remove("liked"), 600);
                    }
                  }
                }}
                id={`topic-heart-${topic.id}`}
                className={`heart-button flex items-center gap-2 px-3 py-2 transition-all text-gray-600 hover:text-gray-800`}
              >
                <span
                  className={`transition-all ${
                    topic.isLiked ? "heart-red" : "heart-gray"
                  }`}
                >
                  ❤️
                </span>
                {topic.likes}
              </button>
              {isAdmin && (
                <button
                  onClick={handleDeleteTopic}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-red-600 hover:bg-red-50 transition-colors"
                  title="Excluir t��pico (Admin)"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                  </svg>
                  Excluir Tópico
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Novo Sistema de Comentários */}
        <SimpleCommentSystem
          topicId={topic.id}
          topicAuthorId={topic.authorId}
        />
      </div>

      {/* Modal de Denúncia */}
      {topic && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          contentType="topic"
          contentId={topic.id}
          contentAuthor={topic.author}
        />
      )}
    </div>
  );
}
