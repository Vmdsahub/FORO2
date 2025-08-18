import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Topic } from "@shared/forum";
import { toast } from "sonner";
import { useSimpleWeekNavigation } from "@/hooks/useSimpleWeekNavigation";
import { NewsletterTopic, WeeklyNewsletter } from "@/utils/weekSystem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import CreateTopicModal from "@/components/CreateTopicModal";

// Interfaces movidas para @/utils/weekSystem

interface ForumPost {
  id: string;
  title: string;
  description: string;
  author: string;
  authorAvatar: string;
  replies: number;
  views: number;
  lastPost: {
    author: string;
    date: string;
    time: string;
  };
  isPinned?: boolean;
  isHot?: boolean;
}

interface ForumCategory {
  id: string;
  name: string;
  description: string;
  posts: ForumPost[];
  totalTopics: number;
  totalPosts: number;
  lastPost?: {
    title: string;
    author: string;
    date: string;
    time: string;
    isComment?: boolean;
  };
}

interface IndexProps {
  activeSection: "newsletter" | "forum";
  setActiveSection: (section: "newsletter" | "forum") => void;
  expandedNewsletter: number | string | null;
  setExpandedNewsletter: (id: number | string | null) => void;
  selectedCategory: string | null;
  setSelectedCategory: (id: string | null) => void;
  currentWeek: number; // Mantido para compatibilidade, mas não usado
  setCurrentWeek: (week: number) => void; // Mantido para compatibilidade, mas não usado
  weeklyNewsletters: WeeklyNewsletter[]; // Mantido para compatibilidade, mas não usado
  toolsCategories: ForumCategory[];
  openSourceCategories: ForumCategory[];
  toggleNewsletterTopic: (id: number | string) => void;
  handleCategoryClick: (categoryId: string) => void;
  getSelectedCategoryData: () => ForumCategory | undefined;
  navigateWeek: (direction: "prev" | "next") => void; // Mantido para compatibilidade, mas não usado
  canNavigatePrev: () => boolean; // Mantido para compatibilidade, mas n��o usado
  canNavigateNext: () => boolean; // Mantido para compatibilidade, mas não usado
  currentNewsletter: WeeklyNewsletter; // Mantido para compatibilidade, mas não usado
  refreshCategoryStats?: () => void;
  onNewsletterRefresh?: () => void;
  newsletterData?: any; // Adicionar dados da newsletter da API
}

export default function Index(props: IndexProps) {
  const { user, isAdmin } = useAuth();
  const {
    activeSection,
    setActiveSection,
    expandedNewsletter,
    selectedCategory,
    toolsCategories,
    openSourceCategories,
    toggleNewsletterTopic,
    handleCategoryClick,
    getSelectedCategoryData,
    refreshCategoryStats,
    onNewsletterRefresh,
    newsletterData,
  } = props;

  // Use o novo sistema de semanas simplificado
  const {
    currentNewsletter,
    navigateWeek,
    canNavigatePrev,
    canNavigateNext,
    goToCurrentWeek,
    isCurrentWeek,
    debugInfo,
  } = useSimpleWeekNavigation({
    isAdmin,
    isVitoca: user?.name === "Vitoca", // Identificar se é o admin Vitoca
    articlesData: newsletterData, // Usar os dados da API
  });

  const [realTopics, setRealTopics] = useState<Topic[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);

  // Estados para modais admin
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [iconModalOpen, setIconModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [editingCategoryDescription, setEditingCategoryDescription] =
    useState("");
  const [customIcons, setCustomIcons] = useState<Record<string, string>>({});
  const [isNewsletterModalOpen, setIsNewsletterModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: "", description: "" });
  const [newNewsletter, setNewNewsletter] = useState({
    title: "",
    content: "",
    readTime: "",
  });

  // Buscar tópicos reais da API quando uma categoria é selecionada
  useEffect(() => {
    if (selectedCategory && activeSection === "forum") {
      fetchTopics(selectedCategory);
    }
  }, [selectedCategory, activeSection]);

  // Carregar ícones salvos ao montar componente
  useEffect(() => {
    // Add small delay to prevent simultaneous requests on initial load
    const timer = setTimeout(() => {
      loadSavedIcons();
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  const loadSavedIcons = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort(
          new DOMException("Category icons request timeout", "TimeoutError"),
        );
      }, 5000); // 5s timeout

      const response = await fetch("/api/category-icons", {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setCustomIcons(data.icons || {});
      } else {
        console.warn(
          "Failed to load category icons:",
          response.status,
          response.statusText,
        );
        setCustomIcons({}); // Set empty object as fallback
      }
    } catch (error: any) {
      // Fail silently - icons are optional feature
      if (error.name === "AbortError" || error.name === "TimeoutError") {
        console.warn("Category icons request timed out");
      } else {
        console.warn(
          "Icons service unavailable, using defaults:",
          error.message,
        );
      }
      setCustomIcons({}); // Set empty object as fallback
    }
  };

  const fetchTopics = async (category: string, retryCount = 0) => {
    setIsLoadingTopics(true);
    try {
      const params = new URLSearchParams();
      params.append("category", category);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(`/api/topics?${params}`, {
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setRealTopics(data.topics || []);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error fetching topics:", error);

      // Retry logic for network errors
      if (
        retryCount < 2 &&
        (error instanceof TypeError || error.name === "AbortError")
      ) {
        console.log(`Retrying fetch topics (attempt ${retryCount + 1}/3)...`);
        setTimeout(() => fetchTopics(category, retryCount + 1), 1000);
        return;
      }

      if (error.name === "AbortError") {
        toast.error("Timeout ao carregar tópicos. Tente novamente.");
      } else if (error instanceof TypeError) {
        toast.error("Erro de conexão. Verifique sua internet.");
      } else {
        toast.error("Erro ao carregar tópicos");
      }

      // Set empty array on error to prevent UI issues
      setRealTopics([]);
    } finally {
      setIsLoadingTopics(false);
    }
  };

  const handleTopicCreated = (newTopic: Topic) => {
    console.log("Novo tópico criado na Index:", newTopic);
    // Adicionar o novo tópico ao início da lista
    setRealTopics((prev) => {
      const updated = [newTopic, ...prev];
      console.log("Tópicos atualizados:", updated);
      return updated;
    });
  };

  const handleCreateCategory = () => {
    if (!newCategory.name.trim() || !newCategory.description.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }

    toast.success(
      `Categoria "${newCategory.name}" criada! (Demo - não persistente)`,
    );
    setNewCategory({ name: "", description: "" });
    setIsCategoryModalOpen(false);
  };

  const handleCreateNewsletter = async () => {
    if (!newNewsletter.title.trim() || !newNewsletter.content.trim()) {
      toast.error("Preencha título e conteúdo");
      return;
    }

    if (!newNewsletter.readTime.trim()) {
      toast.error("Preencha o tempo de leitura");
      return;
    }

    try {
      // Se admin e há uma semana selecionada, usar essa semana. Senão, criar na semana atual
      const requestBody: any = {
        title: newNewsletter.title,
        content: newNewsletter.content,
        readTime: newNewsletter.readTime,
      };

      // Se admin está visualizando uma semana específica, criar artigo nessa semana
      if (isAdmin && currentNewsletter) {
        requestBody.targetWeek = currentNewsletter.week;
        requestBody.targetYear = currentNewsletter.year;
        console.log("🎯 Admin criando artigo na semana:", {
          week: currentNewsletter.week,
          year: currentNewsletter.year,
          title: newNewsletter.title,
        });
      }

      const response = await fetch("/api/newsletter/articles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        toast.success("Artigo criado com sucesso!");
        setNewNewsletter({ title: "", content: "", readTime: "" });
        setIsNewsletterModalOpen(false);
        // Refresh newsletters
        if (onNewsletterRefresh) {
          onNewsletterRefresh();
        }
      } else {
        const error = await response.json();
        toast.error(error.message || "Erro ao criar artigo");
      }
    } catch (error) {
      console.error("Error creating newsletter:", error);
      toast.error("Erro ao criar artigo");
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
        setRealTopics((prev) => prev.filter((topic) => topic.id !== topicId));
        toast.success("Tópico excluído com sucesso!");
      } else {
        toast.error("Erro ao excluir tópico");
      }
    } catch (error) {
      console.error("Error deleting topic:", error);
      toast.error("Erro ao excluir tópico");
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
          toast.success("Ícone atualizado com sucesso!");
        } else {
          toast.error("Erro ao salvar ícone");
        }
      } else {
        clearTimeout(timeoutId);
        toast.error("Erro ao fazer upload da imagem");
      }
    } catch (error: any) {
      if (error.name === "AbortError" || error.name === "TimeoutError") {
        toast.error("Upload cancelado ou demorou muito para responder");
      } else {
        console.error("Erro ao fazer upload do ícone:", error.message);
        toast.error("Erro ao fazer upload do ícone");
      }
    }
  };

  // Função para quando admin clica no ícone
  const handleIconClick = (categoryId: string, event: React.MouseEvent) => {
    if (user?.name === "Vitoca") {
      event.stopPropagation();
      setEditingCategoryId(categoryId);

      // Encontrar a categoria e carregar sua descrição
      const allCategories = [...toolsCategories, ...openSourceCategories];
      const category = allCategories.find((cat) => cat.id === categoryId);
      setEditingCategoryDescription(category?.description || "");

      setIconModalOpen(true);
    }
  };

  return (
    <main className="container max-w-7xl mx-auto px-6 py-12 pt-20 hide-scrollbar app-container">
      {/* Hero Section */}
      <div className="text-center mb-4 animate-fade-in mt-8">
        <div className="flex justify-center mb-2">
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2F503e95fcc6af443aa8cd375cfa461af7%2F980512f033cd4818997e6218b806b298?format=webp&width=800"
            alt="IA HUB"
            className="h-24 md:h-32 w-auto"
          />
        </div>
      </div>

      {/* Toggle Buttons */}
      <div className="flex justify-center mb-12">
        <div className="bg-white rounded-lg p-1 shadow-sm border border-gray-200 relative z-10">
          <div className="flex relative">
            {/* Sliding Background Indicator */}
            <div
              className={`absolute top-0 bottom-0 rounded-md transition-all duration-500 ease-out shadow-lg z-20 solid-black-bg ${
                activeSection === "newsletter"
                  ? "left-0 w-[120px]"
                  : "left-[120px] w-[90px]"
              }`}
              style={{
                transform: "translateZ(0)",
                willChange: "transform, width",
                boxShadow:
                  "0 2px 8px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1)",
              }}
            />

            <button
              onClick={() => setActiveSection("newsletter")}
              className={`relative z-30 px-5 py-2 rounded-md transition-all duration-300 ease-out font-medium w-[120px] text-center ${
                activeSection === "newsletter"
                  ? "text-white transform scale-[1.02]"
                  : "text-gray-600 hover:text-black"
              }`}
            >
              Newsletter
            </button>
            <button
              onClick={() => setActiveSection("forum")}
              className={`relative z-30 px-5 py-2 rounded-md transition-all duration-300 ease-out font-medium w-[90px] text-center ${
                activeSection === "forum"
                  ? "text-white transform scale-[1.02]"
                  : "text-gray-600 hover:text-black"
              }`}
            >
              Fórum
            </button>
          </div>
        </div>
      </div>

      {/* Content with smooth transitions */}
      <div className="transition-all duration-700 ease-out">
        {activeSection === "newsletter" && (
          <div
            className="space-y-6 max-w-4xl mx-auto opacity-0 animate-fade-in transform translate-y-4"
            style={{
              animationDelay: "0.2s",
              animationFillMode: "forwards",
              animation: "fadeInUp 0.8s ease-out 0.2s forwards",
            }}
          >
            {/* Newsletter Header with Navigation */}
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-4 mb-4">
                <button
                  onClick={() => {
                    console.log("Clicked prev button!", {
                      isAdmin,
                      canNavigatePrev: canNavigatePrev(),
                    });
                    navigateWeek("prev");
                  }}
                  disabled={!canNavigatePrev()}
                  className={`p-2 rounded-full transition-all duration-200 ${
                    !canNavigatePrev()
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-gray-600 hover:text-black hover:bg-gray-100"
                  }`}
                  title={
                    user?.name === "Vitoca"
                      ? "Voltar para semanas anteriores (Admin)"
                      : "Voltar para semanas anteriores (só se houver notícias)"
                  }
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M12.7 5.3a1 1 0 0 0-1.4-1.4l-5 5a1 1 0 0 0 0 1.4l5 5a1 1 0 0 0 1.4-1.4L8.4 10l4.3-4.7z" />
                  </svg>
                </button>

                <div className="text-center">
                  <h2 className="text-3xl font-bold text-black">
                    Newsletter Semanal
                  </h2>
                  {currentNewsletter && (
                    <p className="text-lg text-gray-600 mt-2">
                      Semana{" "}
                      <span
                        className={
                          isCurrentWeek
                            ? "text-green-600 font-semibold"
                            : "text-gray-700 font-semibold"
                        }
                        title=""
                      >
                        {currentNewsletter.week}
                      </span>{" "}
                      de {currentNewsletter.year}
                      <br />
                      <span className="text-sm text-gray-500">
                        Atualizações todos os domingos
                      </span>
                    </p>
                  )}
                </div>

                <button
                  onClick={() => {
                    console.log("Clicked next button!", {
                      isAdmin,
                      canNavigateNext: canNavigateNext(),
                    });
                    navigateWeek("next");
                  }}
                  disabled={!canNavigateNext()}
                  className={`p-2 rounded-full transition-all duration-200 ${
                    !canNavigateNext()
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-gray-600 hover:text-black hover:bg-gray-100"
                  }`}
                  title={
                    user?.name === "Vitoca"
                      ? "Avançar para semanas mais recentes (Admin)"
                      : "Avançar de volta até a semana atual"
                  }
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M7.3 14.7a1 1 0 0 0 1.4 1.4l5-5a1 1 0 0 0 0-1.4l-5-5a1 1 0 0 0-1.4 1.4L11.6 10l-4.3 4.7z" />
                  </svg>
                </button>
              </div>
              <p className="text-md text-gray-500">
                Seleção de notícias sobre as principais tecnologias e
                ferramentas de Inteligência Artificial
              </p>
            </div>

            {currentNewsletter?.topics &&
            currentNewsletter.topics.length > 0 ? (
              currentNewsletter.topics.map((topic) => (
                <div
                  key={topic.id}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-300 ease-in-out hover:-translate-y-1"
                >
                  <div
                    className="p-6 cursor-pointer"
                    onClick={() => toggleNewsletterTopic(topic.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-black mb-3">
                          {topic.title}
                        </h3>
                        <div className="text-sm text-gray-500">
                          {topic.readTime} de leitura
                        </div>
                      </div>
                      <div
                        className={`transform transition-transform duration-300 ease-in-out ${expandedNewsletter === topic.id ? "rotate-180" : ""}`}
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="text-gray-400"
                        >
                          <path d="M5 7l5 5 5-5H5z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {expandedNewsletter === topic.id && (
                    <div className="border-t border-gray-100 bg-gray-50 animate-slide-up">
                      <div className="p-6">
                        <div className="prose max-w-none text-gray-700 leading-relaxed whitespace-pre-line mb-4">
                          {topic.content}
                        </div>
                        {isAdmin && (
                          <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
                            <div className="flex gap-2">
                              <button
                                onClick={async () => {
                                  if (
                                    confirm(
                                      `Tem certeza que deseja excluir o artigo "${topic.title}"?`,
                                    )
                                  ) {
                                    try {
                                      const response = await fetch(
                                        `/api/newsletter/articles/${topic.id}`,
                                        {
                                          method: "DELETE",
                                          headers: {
                                            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
                                          },
                                        },
                                      );

                                      if (response.ok) {
                                        toast.success(
                                          "Artigo excluído com sucesso!",
                                        );
                                        if (onNewsletterRefresh) {
                                          onNewsletterRefresh();
                                        }
                                      } else {
                                        const error = await response.json();
                                        toast.error(
                                          error.message ||
                                            "Erro ao excluir artigo",
                                        );
                                      }
                                    } catch (error) {
                                      console.error(
                                        "Error deleting article:",
                                        error,
                                      );
                                      toast.error("Erro ao excluir artigo");
                                    }
                                  }
                                }}
                                className="text-red-600 hover:text-red-800 px-3 py-1 rounded text-sm hover:bg-red-50 transition-colors"
                              >
                                🗑️ Excluir Artigo
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <p className="text-gray-500 text-lg mb-2">
                  Nenhum artigo publicado esta semana
                </p>
                <p className="text-gray-400 text-sm">
                  Os administradores podem adicionar novos artigos à newsletter
                  semanal.
                </p>
              </div>
            )}

            {isAdmin && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <Dialog
                  open={isNewsletterModalOpen}
                  onOpenChange={setIsNewsletterModalOpen}
                >
                  <DialogTrigger asChild>
                    <button className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-colors">
                      + Adicionar Novo Artigo da Newsletter
                    </button>
                  </DialogTrigger>
                  <DialogContent className="bg-white border border-gray-200 shadow-lg sm:max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-gray-900 text-xl font-semibold">
                        Criar Novo Artigo da Newsletter
                      </DialogTitle>
                      {isAdmin && currentNewsletter && (
                        <p className="text-sm text-blue-600 mt-2">
                          📅 Será criado na{" "}
                          <strong>
                            Semana {currentNewsletter.week} de{" "}
                            {currentNewsletter.year}
                          </strong>
                        </p>
                      )}
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="news-title"
                          className="text-gray-900 font-medium"
                        >
                          Título do Artigo
                        </Label>
                        <Input
                          id="news-title"
                          value={newNewsletter.title}
                          onChange={(e) =>
                            setNewNewsletter({
                              ...newNewsletter,
                              title: e.target.value,
                            })
                          }
                          placeholder="Ex: GPT-4 vs Claude: An��lise Comparativa"
                          className="border-gray-300 focus:border-gray-500 focus:ring-gray-500 bg-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="news-time"
                          className="text-gray-900 font-medium"
                        >
                          Tempo de Leitura
                        </Label>
                        <Input
                          id="news-time"
                          value={newNewsletter.readTime}
                          onChange={(e) =>
                            setNewNewsletter({
                              ...newNewsletter,
                              readTime: e.target.value,
                            })
                          }
                          placeholder="Ex: 8 min"
                          className="border-gray-300 focus:border-gray-500 focus:ring-gray-500 bg-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="news-content"
                          className="text-gray-900 font-medium"
                        >
                          Conteúdo do Artigo
                        </Label>
                        <Textarea
                          id="news-content"
                          value={newNewsletter.content}
                          onChange={(e) =>
                            setNewNewsletter({
                              ...newNewsletter,
                              content: e.target.value,
                            })
                          }
                          placeholder="Escreva o conteúdo completo do artigo..."
                          rows={8}
                          className="border-gray-300 focus:border-gray-500 focus:ring-gray-500 bg-white"
                        />
                      </div>
                      <div className="flex justify-end gap-3 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsNewsletterModalOpen(false)}
                          className="border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleCreateNewsletter}
                          className="bg-gray-900 text-white hover:bg-gray-800"
                        >
                          Criar Artigo
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        )}

        {activeSection === "forum" && !selectedCategory && (
          <div
            className="space-y-6 opacity-0 animate-fade-in transform translate-y-4 hide-scrollbar"
            style={{
              animationDelay: "0.2s",
              animationFillMode: "forwards",
              animation: "fadeInUp 0.8s ease-out 0.2s forwards",
            }}
          >
            {/* Forum Categories */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-black">
                  Ferramentas
                </h2>
                {isAdmin && (
                  <Dialog
                    open={isCategoryModalOpen}
                    onOpenChange={setIsCategoryModalOpen}
                  >
                    <DialogTrigger asChild>
                      <Button
                        className="bg-gray-900 text-white hover:bg-gray-800 text-sm"
                        size="sm"
                      >
                        + Nova Categoria
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white border border-gray-200 shadow-lg sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-gray-900 text-xl font-semibold">
                          Criar Nova Categoria
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label
                            htmlFor="cat-name"
                            className="text-gray-900 font-medium"
                          >
                            Nome da Categoria
                          </Label>
                          <Input
                            id="cat-name"
                            value={newCategory.name}
                            onChange={(e) =>
                              setNewCategory({
                                ...newCategory,
                                name: e.target.value,
                              })
                            }
                            placeholder="Ex: Inteligência Artificial"
                            className="border-gray-300 focus:border-gray-500 focus:ring-gray-500 bg-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="cat-desc"
                            className="text-gray-900 font-medium"
                          >
                            Descrição
                          </Label>
                          <Textarea
                            id="cat-desc"
                            value={newCategory.description}
                            onChange={(e) =>
                              setNewCategory({
                                ...newCategory,
                                description: e.target.value,
                              })
                            }
                            placeholder="Descreva o que será discutido nesta categoria"
                            rows={3}
                            className="border-gray-300 focus:border-gray-500 focus:ring-gray-500 bg-white"
                          />
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsCategoryModalOpen(false)}
                            className="border-gray-300 text-gray-700 hover:bg-gray-50"
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={handleCreateCategory}
                            className="bg-gray-900 text-white hover:bg-gray-800"
                          >
                            Criar Categoria
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              <div className="divide-y divide-gray-100 hide-scrollbar">
                {toolsCategories.map((category) => (
                  <div
                    key={category.id}
                    className="hover:bg-gray-50 transition-all duration-300 ease-in-out cursor-pointer hover:-translate-y-0.5"
                    onClick={() => handleCategoryClick(category.id)}
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-12 h-12 flex items-center justify-center ${
                                customIcons[category.id]
                                  ? "cursor-pointer hover:opacity-75 transition-opacity"
                                  : "rounded-full bg-black text-white font-semibold"
                              } ${user?.name === "Vitoca" ? "hover:ring-2 hover:ring-blue-500" : ""}`}
                              onClick={(e) => handleIconClick(category.id, e)}
                              title={
                                user?.name === "Vitoca"
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
                                <>
                                  {category.name.split(" ")[0][0]}
                                  {category.name.split(" ")[1]?.[0] || ""}
                                </>
                              )}
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-black mb-1">
                                {category.name}
                              </h3>
                              <p className="text-gray-600 text-sm">
                                {category.description}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right text-sm text-gray-500 min-w-[200px]">
                            <div className="mb-1">
                              <span className="font-medium text-black">
                                {category.totalTopics}
                              </span>{" "}
                              tópicos
                            </div>
                            {category.lastPost && (
                              <div className="text-xs">
                                <span className="font-medium">
                                  {category.lastPost.title}
                                </span>
                                <br />
                                {category.lastPost.isComment
                                  ? "Comentado"
                                  : "Postado"}{" "}
                                por{" "}
                                <span className="font-medium">
                                  {category.lastPost.author}
                                </span>{" "}
                                às {category.lastPost.time}
                              </div>
                            )}
                          </div>
                          {isAdmin && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (
                                  confirm(
                                    `Tem certeza que deseja excluir a categoria "${category.name}"?`,
                                  )
                                ) {
                                  toast.success(
                                    `Categoria "${category.name}" excluída! (Demo - não persistente)`,
                                  );
                                }
                              }}
                              className="text-red-600 hover:text-red-800 p-2 rounded hover:bg-red-50 transition-colors"
                              title="Excluir categoria (Admin)"
                            >
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Open-Source Section */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mt-6">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-black">
                  Open-Source
                </h2>
                {isAdmin && (
                  <Dialog
                    open={isCategoryModalOpen}
                    onOpenChange={setIsCategoryModalOpen}
                  >
                    <DialogTrigger asChild>
                      <Button
                        className="bg-gray-900 text-white hover:bg-gray-800 text-sm"
                        size="sm"
                      >
                        + Nova Categoria
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white border border-gray-200 shadow-lg sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-gray-900 text-xl font-semibold">
                          Criar Nova Categoria
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label
                            htmlFor="cat-name"
                            className="text-gray-900 font-medium"
                          >
                            Nome da Categoria
                          </Label>
                          <Input
                            id="cat-name"
                            value={newCategory.name}
                            onChange={(e) =>
                              setNewCategory({
                                ...newCategory,
                                name: e.target.value,
                              })
                            }
                            placeholder="Ex: Inteligência Artificial"
                            className="border-gray-300 focus:border-gray-500 focus:ring-gray-500 bg-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="cat-desc"
                            className="text-gray-900 font-medium"
                          >
                            Descrição
                          </Label>
                          <Textarea
                            id="cat-desc"
                            value={newCategory.description}
                            onChange={(e) =>
                              setNewCategory({
                                ...newCategory,
                                description: e.target.value,
                              })
                            }
                            placeholder="Descreva o que será discutido nesta categoria"
                            rows={3}
                            className="border-gray-300 focus:border-gray-500 focus:ring-gray-500 bg-white"
                          />
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsCategoryModalOpen(false)}
                            className="border-gray-300 text-gray-700 hover:bg-gray-50"
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={handleCreateCategory}
                            className="bg-gray-900 text-white hover:bg-gray-800"
                          >
                            Criar Categoria
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              <div className="divide-y divide-gray-100 hide-scrollbar">
                {openSourceCategories.map((category) => (
                  <div
                    key={`opensource-${category.id}`}
                    className="hover:bg-gray-50 transition-all duration-300 ease-in-out cursor-pointer hover:-translate-y-0.5"
                    onClick={() => handleCategoryClick(category.id)}
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-12 h-12 flex items-center justify-center ${
                                customIcons[category.id]
                                  ? "cursor-pointer hover:opacity-75 transition-opacity"
                                  : "rounded-full bg-green-600 text-white font-semibold"
                              } ${user?.name === "Vitoca" ? "hover:ring-2 hover:ring-blue-500" : ""}`}
                              onClick={(e) => handleIconClick(category.id, e)}
                              title={
                                user?.name === "Vitoca"
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
                                <>
                                  {category.name.split(" ")[0][0]}
                                  {category.name.split(" ")[1]?.[0] || ""}
                                </>
                              )}
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-black mb-1">
                                {category.name}
                              </h3>
                              <p className="text-gray-600 text-sm">
                                {category.description}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right text-sm text-gray-500 min-w-[200px]">
                            <div className="mb-1">
                              <span className="font-medium text-black">
                                {category.totalTopics}
                              </span>{" "}
                              tópicos
                            </div>
                            {category.lastPost && (
                              <div className="text-xs">
                                <span className="font-medium">
                                  {category.lastPost.title}
                                </span>
                                <br />
                                {category.lastPost.isComment
                                  ? "Comentado"
                                  : "Postado"}{" "}
                                por{" "}
                                <span className="font-medium">
                                  {category.lastPost.author}
                                </span>{" "}
                                às {category.lastPost.time}
                              </div>
                            )}
                          </div>
                          {isAdmin && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (
                                  confirm(
                                    `Tem certeza que deseja excluir a categoria "${category.name}"?`,
                                  )
                                ) {
                                  toast.success(
                                    `Categoria "${category.name}" excluída! (Demo - não persistente)`,
                                  );
                                }
                              }}
                              className="text-red-600 hover:text-red-800 p-2 rounded hover:bg-red-50 transition-colors"
                              title="Excluir categoria (Admin)"
                            >
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSection === "forum" && selectedCategory && (
          <div
            className="space-y-6 opacity-0 animate-fade-in transform translate-y-4 hide-scrollbar"
            style={{
              animationDelay: "0.2s",
              animationFillMode: "forwards",
              animation: "fadeInUp 0.8s ease-out 0.2s forwards",
            }}
          >
            {/* Back Button */}
            <button
              onClick={() => {
                props.setSelectedCategory(null);
                setRealTopics([]); // Limpar tópicos ao voltar
              }}
              className="flex items-center gap-2 text-gray-600 hover:text-black transition-all duration-300 ease-in-out hover:translate-x-1"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path
                  d="M8 0L6.6 1.4 12.2 7H0v2h12.2L6.6 14.6 8 16l8-8-8-8z"
                  transform="rotate(180 8 8)"
                />
              </svg>
              Voltar às categorias
            </button>

            {/* Category Header */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-black mb-2">
                    {getSelectedCategoryData()?.name}
                  </h2>
                  <p className="text-gray-600">
                    {getSelectedCategoryData()?.description}
                  </p>
                </div>
                {user && getSelectedCategoryData() && (
                  <CreateTopicModal
                    currentCategory={{
                      id: getSelectedCategoryData()!.id,
                      name: getSelectedCategoryData()!.name,
                      description: getSelectedCategoryData()!.description,
                    }}
                    onTopicCreated={handleTopicCreated}
                    onStatsRefresh={refreshCategoryStats}
                  />
                )}
              </div>
            </div>

            {/* Topics List */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-600">
                  <div className="col-span-6">Tópico</div>
                  <div className="col-span-2 text-center">Comentários</div>
                  <div className="col-span-2 text-center">Likes</div>
                  <div className="col-span-2 text-center">Última mensagem</div>
                </div>
              </div>

              <div className="divide-y divide-gray-100 hide-scrollbar">
                {isLoadingTopics ? (
                  <div className="p-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando tópicos...</p>
                  </div>
                ) : realTopics.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    <p>Nenhum tópico encontrado nesta categoria.</p>
                    <p className="text-sm mt-2">
                      Seja o primeiro a criar um tópico!
                    </p>
                  </div>
                ) : (
                  realTopics.map((topic) => (
                    <Link
                      key={topic.id}
                      to={`/topic/${topic.id}`}
                      className="block p-6 hover:bg-gray-50 transition-all duration-300 ease-in-out hover:-translate-y-0.5"
                    >
                      <div className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-6">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center text-sm font-semibold flex-shrink-0 overflow-hidden">
                              {topic.topicAvatarUrl &&
                              topic.topicAvatarUrl.trim() !== "" ? (
                                <img
                                  src={topic.topicAvatarUrl}
                                  alt={topic.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                topic.title
                                  .split(" ")
                                  .map((word) => word[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2)
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
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
                              </div>
                              <h3 className="font-semibold text-black hover:text-blue-600 cursor-pointer truncate transition-colors duration-200">
                                {topic.title}
                              </h3>
                              <div className="flex items-center justify-between mt-2">
                                <div className="text-xs text-gray-500">
                                  por{" "}
                                  <span className="font-medium">
                                    {topic.author}
                                  </span>
                                </div>
                                {isAdmin && (
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleDeleteTopic(topic.id, topic.title);
                                    }}
                                    className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                                    title="Excluir tópico (Admin)"
                                  >
                                    <svg
                                      width="14"
                                      height="14"
                                      viewBox="0 0 24 24"
                                      fill="currentColor"
                                    >
                                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="col-span-2 text-center">
                          <div className="font-semibold text-black">
                            {topic.replies}
                          </div>
                        </div>

                        <div className="col-span-2 text-center">
                          <div className="font-semibold text-black">
                            {topic.likes}
                          </div>
                        </div>

                        <div className="col-span-2 text-center text-sm">
                          <div className="text-gray-600">
                            por{" "}
                            <span className="font-medium text-black">
                              {topic.lastPost.author}
                            </span>
                          </div>
                          <div className="text-gray-500 text-xs">
                            {topic.lastPost.date} às {topic.lastPost.time}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>

            {/* Pagination */}
            <div className="flex justify-center">
              <div className="flex items-center gap-2">
                <button className="px-3 py-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 transition-all duration-200">
                  Anterior
                </button>
                <button className="px-3 py-2 rounded-md bg-black text-white">
                  1
                </button>
                <button className="px-3 py-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 transition-all duration-200">
                  2
                </button>
                <button className="px-3 py-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 transition-all duration-200">
                  3
                </button>
                <button className="px-3 py-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 transition-all duration-200">
                  Próximo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal para upload de ícone */}
      <Dialog open={iconModalOpen} onOpenChange={setIconModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label
                htmlFor="category-description"
                className="text-sm font-medium"
              >
                Descrição da Categoria
              </Label>
              <textarea
                id="category-description"
                value={editingCategoryDescription}
                onChange={(e) => setEditingCategoryDescription(e.target.value)}
                className="w-full mt-1 p-2 border border-gray-300 rounded-md resize-none"
                rows={3}
                placeholder="Digite a descrição da categoria..."
              />
            </div>
            <div>
              <Label htmlFor="category-icon" className="text-sm font-medium">
                Ícone da Categoria
              </Label>
              <p className="text-sm text-gray-600 mb-2">
                Selecione uma nova imagem para o ícone da categoria.
              </p>
              <Input
                id="category-icon"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && editingCategoryId) {
                    handleIconUpload(file, editingCategoryId);
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIconModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (editingCategoryId) {
                    // Salvar descrição (por enquanto apenas mostrar toast)
                    toast.success(
                      `Descrição da categoria atualizada! (Demo - não persistente)`,
                    );
                    setIconModalOpen(false);
                    setEditingCategoryId(null);
                    setEditingCategoryDescription("");
                  }
                }}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                Salvar Alterações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
