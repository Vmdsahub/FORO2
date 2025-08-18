import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Topic } from "@shared/forum";
import { toast } from "sonner";

export default function SavedTopics() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [savedTopics, setSavedTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }
  }, [user, navigate]);

  // Load saved topics from localStorage for now
  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`savedTopics_${user.email}`);
      if (saved) {
        try {
          const topicIds = JSON.parse(saved);
          // Create mock topics for demonstration
          // In a real implementation, you'd fetch the full topic data from the API
          const mockTopics = topicIds.map((id: string, index: number) => ({
            id,
            title: `Tópico Salvo ${index + 1}`,
            description: `Descrição do tópico salvo com ID ${id}`,
            author: "Usuário",
            authorAvatar: "U",
            category: "Geral",
            replies: Math.floor(Math.random() * 50),
            views: Math.floor(Math.random() * 1000),
            likes: Math.floor(Math.random() * 25),
            isLiked: false,
            createdAt: new Date().toISOString(),
            isPinned: false,
            isHot: false,
            lastPost: {
              author: "Alguém",
              date: "Hoje",
              time: "14:30",
            },
          }));
          setSavedTopics(mockTopics);
        } catch (error) {
          console.error("Error loading saved topics:", error);
        }
      }
    }
  }, [user]);

  const handleRemoveTopic = (topicId: string) => {
    if (!user) return;

    const saved = localStorage.getItem(`savedTopics_${user.email}`);
    if (saved) {
      try {
        const topicIds = JSON.parse(saved);
        const updatedIds = topicIds.filter((id: string) => id !== topicId);
        localStorage.setItem(
          `savedTopics_${user.email}`,
          JSON.stringify(updatedIds),
        );
        setSavedTopics((prev) => prev.filter((topic) => topic.id !== topicId));
        toast.success("Tópico removido dos salvos");
      } catch (error) {
        console.error("Error removing saved topic:", error);
        toast.error("Erro ao remover tópico");
      }
    }
  };

  if (!user) {
    return null;
  }

  return (
    <main className="container max-w-7xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2">Tópicos Salvos</h1>
          <p className="text-gray-600">
            Seus tópicos salvos para consulta futura
          </p>
        </div>
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
          Voltar ao Fórum
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando tópicos salvos...</p>
          </div>
        ) : savedTopics.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="text-gray-400"
              >
                <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum tópico salvo
            </h2>
            <p className="text-gray-600 mb-6">
              Quando você salvar t��picos no fórum, eles aparecerão aqui para
              consulta futura.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
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
              Explorar Fórum
            </Link>
          </div>
        ) : (
          <>
            {/* Header Row */}
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
              <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-600">
                <div className="col-span-6">Tópico</div>
                <div className="col-span-2 text-center">Categoria</div>
                <div className="col-span-2 text-center">Autor</div>
                <div className="col-span-2 text-center">Ações</div>
              </div>
            </div>

            {/* Topics List */}
            <div className="divide-y divide-gray-100">
              {savedTopics.map((topic) => (
                <div
                  key={topic.id}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-6">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center text-sm font-semibold flex-shrink-0 overflow-hidden">
                          {topic.title
                            .split(" ")
                            .map((word) => word[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/topic/${topic.id}`}
                            className="font-semibold text-black hover:text-blue-600 cursor-pointer transition-colors duration-200 block"
                          >
                            {topic.title}
                          </Link>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {topic.description}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
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
                        </div>
                      </div>
                    </div>

                    <div className="col-span-2 text-center">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {topic.category}
                      </span>
                    </div>

                    <div className="col-span-2 text-center text-sm">
                      <span className="font-medium text-black">
                        {topic.author}
                      </span>
                    </div>

                    <div className="col-span-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          to={`/topic/${topic.id}`}
                          className="text-blue-600 hover:text-blue-800 p-2 rounded hover:bg-blue-50 transition-colors"
                          title="Ver tópico"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                          </svg>
                        </Link>
                        <button
                          onClick={() => handleRemoveTopic(topic.id)}
                          className="text-red-600 hover:text-red-800 p-2 rounded hover:bg-red-50 transition-colors"
                          title="Remover dos salvos"
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
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Info Card */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 text-sm">
            💡
          </div>
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">
              Como salvar tópicos?
            </h3>
            <p className="text-blue-800 text-sm">
              Ao navegar pelos tópicos do fórum, clique no ícone de bookmark (
              <svg
                className="inline w-4 h-4 mx-1"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
              </svg>
              ) para salvá-los para consulta futura. Os tópicos salvos ficam
              sincronizados com sua conta.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
