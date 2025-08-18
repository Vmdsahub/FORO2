import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Topic } from "@shared/forum";
import { toast } from "sonner";
import { Heart, MessageCircle, TrendingUp, Trash2 } from "lucide-react";

interface SearchResultsProps {
  query: string;
  categories: string[];
  onClose: () => void;
}

export default function SearchResults({
  query,
  categories,
  onClose,
}: SearchResultsProps) {
  const { user, isAdmin } = useAuth();
  const [results, setResults] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (query.trim()) {
      performSearch();
    }
  }, [query, categories]);

  const performSearch = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("search", query);
      if (categories.length > 0) {
        params.append("categories", categories.join(","));
      }

      const response = await fetch(`/api/topics?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setResults(data.topics);
        setTotal(data.total);
      } else {
        toast.error("Erro ao buscar tópicos");
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Erro ao buscar tópicos");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTopic = async (topicId: string, topicTitle: string) => {
    if (!isAdmin) return;

    if (!confirm(`Tem certeza que deseja excluir o tópico "${topicTitle}"?`)) {
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
        setResults((prev) => prev.filter((topic) => topic.id !== topicId));
        toast.success("Tópico excluído com sucesso!");
      } else {
        toast.error("Erro ao excluir tópico");
      }
    } catch (error) {
      console.error("Error deleting topic:", error);
      toast.error("Erro ao excluir tópico");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getCategoryName = (categoryId: string) => {
    const categoryMap: { [key: string]: string } = {
      "ia-hub": "IA HUB",
      imagem: "IMAGEM",
      video: "VÍDEO",
      seguranca: "SEGURANÇA",
      "musica-audio": "MÚSICA/ÁUDIO",
      "vibe-coding": "VIBE CODING",
    };
    return categoryMap[categoryId] || categoryId.toUpperCase();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-20">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden m-4">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Resultados da Busca
              </h2>
              <p className="text-gray-600 mt-1">
                {isLoading
                  ? "Buscando..."
                  : `${total} resultado(s) para "${query}"`}
                {categories.length > 0 && (
                  <span className="text-sm text-gray-500 ml-2">
                    em {categories.map(getCategoryName).join(", ")}
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="overflow-y-auto max-h-[60vh] p-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>Nenhum resultado encontrado.</p>
              <p className="text-sm mt-2">
                Tente termos diferentes ou ajuste os filtros.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((topic) => (
                <Card
                  key={topic.id}
                  className="hover:shadow-md transition-all duration-200"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Link
                            to={`/topic/${topic.id}`}
                            onClick={onClose}
                            className="hover:text-blue-600"
                          >
                            <CardTitle className="text-lg hover:text-blue-600">
                              {topic.title}
                            </CardTitle>
                          </Link>
                          <Badge variant="secondary">
                            {getCategoryName(topic.category)}
                          </Badge>
                          {topic.isPinned && (
                            <Badge variant="default" className="text-xs">
                              Fixado
                            </Badge>
                          )}
                          {topic.isHot && (
                            <Badge
                              variant="destructive"
                              className="text-xs flex items-center gap-1"
                            >
                              <TrendingUp className="w-3 h-3" />
                              Hot
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-600 mb-3">
                          {topic.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>Por {topic.author}</span>
                          <span>{formatDate(topic.createdAt)}</span>
                          <span>• {topic.views} visualizações</span>
                        </div>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() =>
                            handleDeleteTopic(topic.id, topic.title)
                          }
                          className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors ml-4"
                          title="Excluir tópico (Admin)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-gray-500">
                          <span
                            className={`transition-all ${
                              topic.isLiked ? "heart-red" : "heart-gray"
                            }`}
                          >
                            ❤️
                          </span>
                          <span className="font-medium">{topic.likes}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500">
                          <MessageCircle className="w-4 h-4" />
                          <span>{topic.replies}</span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        Último post: {topic.lastPost.author} em{" "}
                        {topic.lastPost.date} às {topic.lastPost.time}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
