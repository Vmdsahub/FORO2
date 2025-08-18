import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentType: "topic" | "comment";
  contentId: string;
  contentAuthor: string;
}

const reportOptions = [
  { id: "spam", label: "Spam ou conteúdo repetitivo" },
  { id: "harassment", label: "Assédio ou bullying" },
  { id: "hate_speech", label: "Discurso de ódio" },
  { id: "inappropriate", label: "Conteúdo inapropriado" },
  { id: "fake_news", label: "Informações falsas" },
  { id: "copyright", label: "Violação de direitos autorais" },
  { id: "other", label: "Outro motivo" },
];

export default function ReportModal({
  isOpen,
  onClose,
  contentType,
  contentId,
  contentAuthor,
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason.trim()) {
      toast.error("Selecione um motivo para a denúncia");
      return;
    }

    if (!description.trim()) {
      toast.error("Descreva o motivo da denúncia");
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast.success("Denúncia enviada com sucesso! Nossa equipe irá analisar.");
      setSelectedReason("");
      setDescription("");
      onClose();
    } catch (error) {
      toast.error("Erro ao enviar denúncia. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReason("");
    setDescription("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto bg-white border border-gray-200 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-gray-900 text-xl font-semibold">
            Denunciar {contentType === "topic" ? "Tópico" : "Comentário"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            <strong>Denunciando conteúdo de:</strong> {contentAuthor}
          </div>

          <div className="space-y-3">
            <Label className="text-gray-900 font-medium">
              Motivo da denúncia *
            </Label>
            <div className="space-y-2">
              {reportOptions.map((option) => (
                <label
                  key={option.id}
                  className="flex items-center space-x-3 cursor-pointer"
                >
                  <input
                    type="radio"
                    value={option.id}
                    checked={selectedReason === option.id}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="text-gray-900 focus:ring-gray-500"
                  />
                  <span className="text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-gray-900 font-medium">
              Descrição *
            </Label>
            <Textarea
              id="description"
              placeholder="Descreva detalhadamente o motivo da sua denúncia..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="border-gray-300 focus:border-gray-500 focus:ring-gray-500 bg-white"
              required
              maxLength={500}
            />
            <p className="text-xs text-gray-500">
              {description.length}/500 caracteres
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Enviando..." : "Enviar Denúncia"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
