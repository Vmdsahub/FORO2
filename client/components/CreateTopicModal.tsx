import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Topic } from "@shared/forum";
import EnhancedRichTextEditor from "@/components/EnhancedRichTextEditor";
import { cleanContentForSaving } from "@/utils/contentCleaner";

interface ForumCategory {
  id: string;
  name: string;
  description: string;
}

interface CreateTopicModalProps {
  currentCategory: ForumCategory;
  onTopicCreated?: (newTopic: Topic) => void;
  onStatsRefresh?: () => void;
}

export default function CreateTopicModal({
  currentCategory,
  onTopicCreated,
  onStatsRefresh,
}: CreateTopicModalProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    content: "",
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);

      // Criar preview da imagem
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadAvatar = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: formData,
      });

      if (response.ok) {
        try {
          const result = await response.json();
          return result.url;
        } catch (parseError) {
          console.error("Error parsing upload response:", parseError);
          toast.error("Erro ao processar resposta do upload");
          return null;
        }
      } else {
        let errorMessage = "Erro ao fazer upload da imagem";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // If JSON parsing fails, use text response
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
        console.error("Erro no upload:", response.status, response.statusText);
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Erro ao fazer upload do avatar:", error);
      toast.error("Erro ao fazer upload da imagem");
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Faça login para criar tópicos");
      return;
    }

    // Validar conteúdo removendo HTML
    const contentText = formData.content.replace(/<[^>]*>/g, "").trim();

    if (!formData.title.trim() || !contentText) {
      toast.error("Preencha todos os campos");
      return;
    }

    setIsSubmitting(true);
    try {
      let avatarUrl = null;

      console.log("[DEBUG] Iniciando criação de tópico...");
      console.log("[DEBUG] avatarFile:", avatarFile);

      // Upload do avatar se foi selecionado
      if (avatarFile) {
        console.log("[DEBUG] Fazendo upload do avatar...");
        avatarUrl = await uploadAvatar(avatarFile);
        console.log("[DEBUG] Avatar uploadado:", avatarUrl);
      }

      const topicData = {
        ...formData,
        content: cleanContentForSaving(formData.content), // Clean edit-mode attributes
        description: formData.title, // Use title as description for backend compatibility
        category: currentCategory.id,
        ...(avatarUrl && { avatarUrl }),
      };

      console.log("[DEBUG] Dados do tópico:", topicData);

      const response = await fetch("/api/topics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify(topicData),
      });

      console.log("Response status:", response.status);

      if (response.ok) {
        try {
          const newTopic = await response.json();
          console.log("Tópico criado:", newTopic);
          toast.success("Tópico criado com sucesso!");
          setFormData({ title: "", description: "", content: "" });
          setAvatarFile(null);
          setAvatarPreview(null);
          setIsOpen(false);
          onTopicCreated?.(newTopic);
          onStatsRefresh?.(); // Refresh category statistics
        } catch (parseError) {
          console.error("Error parsing success response:", parseError);
          toast.error("Erro ao processar resposta do servidor");
        }
      } else {
        let displayMessage = "Erro ao criar tópico";
        try {
          const errorData = await response.json();
          console.error("Erro ao criar tópico:", errorData);

          if (errorData?.message) {
            displayMessage = errorData.message;
          } else if (errorData?.error) {
            displayMessage = errorData.error;
          } else if (errorData?.errors && Array.isArray(errorData.errors)) {
            displayMessage = errorData.errors.join(", ");
          }
        } catch (parseError) {
          console.error("Error parsing error response:", parseError);
          try {
            const errorText = await response.text();
            displayMessage =
              errorText ||
              `Erro HTTP ${response.status}: ${response.statusText}`;
          } catch {
            displayMessage = `Erro HTTP ${response.status}: ${response.statusText}`;
          }
        }

        toast.error(displayMessage);
      }
    } catch (error) {
      console.error("Error creating topic:", error);
      console.error("Error type:", typeof error);
      console.error("Error constructor:", error?.constructor?.name);

      let errorMessage = "Erro ao criar tópico";

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      } else if (error && typeof error === "object") {
        // Better handling of error objects
        if ("message" in error) {
          errorMessage = String(error.message);
        } else if ("error" in error) {
          errorMessage = String(error.error);
        } else {
          // Convert error object to readable string
          try {
            errorMessage = JSON.stringify(error);
          } catch {
            errorMessage = "Erro desconhecido";
          }
        }
      }

      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (!user) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-black text-white hover:bg-black/90 font-medium">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="mr-2"
          >
            <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM8 3a1 1 0 0 0-1 1v3H4a1 1 0 0 0 0 2h3v3a1 1 0 0 0 2 0V9h3a1 1 0 1 0 0-2H9V4a1 1 0 0 0-1-1z" />
          </svg>
          Criar Tópico
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto bg-white border border-gray-200 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-gray-900 text-xl font-semibold">
            Criar Novo Tópico em {currentCategory.name}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-200">
              <strong className="text-gray-900">Categoria:</strong>{" "}
              {currentCategory.name} - {currentCategory.description}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title" className="text-gray-900 font-medium">
              Título
            </Label>
            <Input
              id="title"
              placeholder="Digite o título do tópico"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              className="border-gray-300 focus:border-gray-500 focus:ring-gray-500 bg-white"
              required
              maxLength={100}
            />
            <p className="text-xs text-gray-500">
              {formData.title.length}/100 caracteres
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatar" className="text-gray-900 font-medium">
              Avatar do Tópico (Opcional)
            </Label>
            <div className="flex items-center gap-4">
              {avatarPreview ? (
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-300">
                  <img
                    src={avatarPreview}
                    alt="Preview do avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-200 border-2 border-gray-300 flex items-center justify-center">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="text-gray-400"
                  >
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
              )}
              <div className="flex-1">
                <Input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="border-gray-300 focus:border-gray-500 focus:ring-gray-500 bg-white"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Selecione uma imagem para o avatar do tópico. Será exibida em
                  formato circular.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-900 font-medium">Conteúdo</Label>
            <EnhancedRichTextEditor
              value={formData.content}
              onChange={(value) => handleInputChange("content", value)}
              placeholder="Descreva seu tópico em detalhes... Use as ferramentas acima para formatar o texto, adicionar código, escolher cores e fazer upload de arquivos."
            />
            <p className="text-xs text-gray-500">
              {formData.content.length} caracteres
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-gray-900 text-white hover:bg-gray-800 font-medium"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Criando..." : "Criar Tópico"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
