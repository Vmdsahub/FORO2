import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Brain,
  Image,
  Video,
  Shield,
  Music,
  Code,
  Heart,
  MessageCircle,
  Users,
  TrendingUp,
} from "lucide-react";
import { Topic } from "@shared/forum";
import CreateTopicModal from "@/components/CreateTopicModal";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ForumCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const forumCategories: ForumCategory[] = [
  {
    id: "ia-hub",
    name: "IA HUB",
    description:
      "Discussões sobre inteligência artificial, machine learning e automação",
    icon: <Brain className="w-6 h-6" />,
    color: "bg-blue-500",
  },
  {
    id: "imagem",
    name: "IMAGEM",
    description: "Geração de imagens, edição e ferramentas visuais com IA",
    icon: <Image className="w-6 h-6" />,
    color: "bg-green-500",
  },
  {
    id: "video",
    name: "VÍDEO",
    description: "Criação e edição de vídeos com inteligência artificial",
    icon: <Video className="w-6 h-6" />,
    color: "bg-purple-500",
  },
  {
    id: "seguranca",
    name: "SEGURANÇA",
    description: "Cybersecurity, privacidade e proteção de dados",
    icon: <Shield className="w-6 h-6" />,
    color: "bg-red-500",
  },
  {
    id: "musica-audio",
    name: "MÚSICA/ÁUDIO",
    description: "Produção musical e processamento de áudio com IA",
    icon: <Music className="w-6 h-6" />,
    color: "bg-pink-500",
  },
  {
    id: "vibe-coding",
    name: "VIBE CODING",
    description: "Ferramentas de desenvolvimento, IDEs e produtividade",
    icon: <Code className="w-6 h-6" />,
    color: "bg-indigo-500",
  },
];

export default function Forum() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [iconModalOpen, setIconModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [customIcons, setCustomIcons] = useState<Record<string, string>>({});

  const fetchTopics = async (category?: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.append("category", category);

      console.log("Fetching topics for category:", category);
      const response = await fetch(`/api/topics?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        console.log("Topics fetched:", data);
        setTopics(data.topics);
      } else {
        console.error("Failed to fetch topics:", response.status);
        toast.error("Erro ao carregar tópicos");
      }
    } catch (error) {
      console.error("Error fetching topics:", error);
      toast.error("Erro ao carregar tópicos");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTopicCreated = (newTopic: Topic) => {
    console.log("Topic created callback:", newTopic);
    setTopics((prev) => [newTopic, ...prev]);
    // Recarregar tópicos para garantir que está atualizado
    if (selectedCategory) {
      fetchTopics(selectedCategory);
    }
  };

  const toggleLike = async (topicId: string) => {
    if (!user) {
      toast.error("Faça login para curtir tópicos");
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
        setTopics((prev) =>
          prev.map((topic) =>
            topic.id === topicId
              ? { ...topic, likes: data.likes, isLiked: data.isLiked }
              : topic,
          ),
        );
        // Trigger user stats refresh for hover cards and theme context
        window.dispatchEvent(new CustomEvent("userLikeUpdate"));
        window.dispatchEvent(new CustomEvent("refreshUserLikes"));
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      toast.error("Erro ao curtir tópico");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  useEffect(() => {
    if (selectedCategory) {
      fetchTopics(selectedCategory);
    }
  }, [selectedCategory]);

  // Carregar ícones salvos ao montar componente
  useEffect(() => {
    loadSavedIcons();
  }, []);

  const loadSavedIcons = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort(
          new DOMException("Category icons request timeout", "TimeoutError"),
        );
      }, 5000);

      const response = await fetch("/api/category-icons", {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setCustomIcons(data.icons || {});
      } else {
        console.warn("Failed to load category icons:", response.status);
        setCustomIcons({});
      }
    } catch (error: any) {
      if (error.name === "AbortError" || error.name === "TimeoutError") {
        console.warn("Category icons request timed out");
      } else {
        console.warn(
          "Icons service unavailable, using defaults:",
          error.message,
        );
      }
      setCustomIcons({});
    }
  };

  // Função para lidar com upload de ícone
  const handleIconUpload = async (file: File, categoryId: string) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort(
          new DOMException("Upload request timeout", "TimeoutError"),
        );
      }, 30000); // 30s timeout for upload

      // Primeiro, fazer upload da imagem
      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: formData,
        signal: controller.signal,
      });

      if (uploadResponse.ok) {
        const uploadResult = await uploadResponse.json();

        // Depois, salvar o ícone na API
        const saveResponse = await fetch("/api/category-icons", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
          body: JSON.stringify({
            categoryId,
            iconUrl: uploadResult.url,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (saveResponse.ok) {
          setCustomIcons((prev) => ({
            ...prev,
            [categoryId]: uploadResult.url,
          }));
          setIconModalOpen(false);
          setEditingCategoryId(null);
        } else {
          console.warn("Failed to save category icon");
        }
      } else {
        clearTimeout(timeoutId);
        console.warn("Failed to upload image");
      }
    } catch (error: any) {
      if (error.name === "AbortError" || error.name === "TimeoutError") {
        console.warn("Upload request timed out");
      } else {
        console.warn("Error uploading icon:", error.message);
      }
    }
  };

  // Função para quando admin clica no ícone
  const handleIconClick = (categoryId: string, event: React.MouseEvent) => {
    if (user?.name === "Vitoca" && isAdmin) {
      event.stopPropagation();
      setEditingCategoryId(categoryId);
      setIconModalOpen(true);
    }
  };

  if (selectedCategory) {
    const category = forumCategories.find((c) => c.id === selectedCategory);
    if (!category) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => setSelectedCategory(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              ← Voltar
            </Button>
            <div className={`p-2 rounded-lg text-white ${category.color}`}>
              {category.icon}
            </div>
            <div>
              <h3 className="text-2xl font-semibold">{category.name}</h3>
              <p className="text-muted-foreground">{category.description}</p>
            </div>
          </div>

          <CreateTopicModal
            currentCategory={category}
            onTopicCreated={handleTopicCreated}
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {topics.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhum tópico encontrado nesta categoria.</p>
                <p className="text-sm mt-2">
                  Seja o primeiro a criar um tópico!
                </p>
              </div>
            ) : (
              topics.map((topic) => (
                <Card
                  key={topic.id}
                  className="hover:shadow-md transition-all duration-200 cursor-pointer"
                  onClick={() => navigate(`/topic/${topic.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg hover:text-blue-600">
                            {topic.title}
                          </CardTitle>
                          {topic.isPinned && (
                            <Badge variant="secondary" className="text-xs">
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
                        <CardDescription className="mb-3">
                          {topic.description}
                        </CardDescription>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Por {topic.author}</span>
                          <span>{formatDate(topic.createdAt)}</span>
                          <span>• {topic.views} visualizações</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLike(topic.id);
                          }}
                          className="flex items-center gap-2 text-muted-foreground heart-button"
                        >
                          <span
                            className={`transition-all ${
                              topic.isLiked ? "heart-red" : "heart-gray"
                            }`}
                          >
                            ❤️
                          </span>
                          {topic.likes}
                        </Button>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MessageCircle className="w-4 h-4" />
                          {topic.replies}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Último post: {topic.lastPost.author} em{" "}
                        {topic.lastPost.date} às {topic.lastPost.time}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-semibold mb-2">Fórum da Comunidade</h3>
        <p className="text-muted-foreground">
          Participe das discuss��es mais relevantes da comunidade tech
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {forumCategories.map((category) => (
          <Card
            key={category.id}
            className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
            onClick={() => setSelectedCategory(category.id)}
          >
            <CardHeader>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-12 h-12 flex items-center justify-center ${
                    customIcons[category.id]
                      ? "cursor-pointer"
                      : `p-3 rounded-lg text-white ${category.color}`
                  } ${user?.name === "Vitoca" && isAdmin ? "hover:opacity-75 transition-opacity" : ""}`}
                  onClick={(e) => handleIconClick(category.id, e)}
                  title={
                    user?.name === "Vitoca" && isAdmin
                      ? "Clique para alterar o ícone"
                      : undefined
                  }
                >
                  {customIcons[category.id] ? (
                    <img
                      src={customIcons[category.id]}
                      alt={category.name}
                      className="w-12 h-12 object-contain"
                    />
                  ) : (
                    category.icon
                  )}
                </div>
                <CardTitle className="text-xl">{category.name}</CardTitle>
              </div>
              <CardDescription className="text-sm leading-relaxed">
                {category.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Tópicos disponíveis
                </div>
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Discussões ativas
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal para upload de ícone */}
      <Dialog open={iconModalOpen} onOpenChange={setIconModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Ícone da Categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Selecione uma nova imagem para o ícone da categoria.
            </p>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && editingCategoryId) {
                  handleIconUpload(file, editingCategoryId);
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIconModalOpen(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
