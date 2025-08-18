import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  src: string;
  alt: string;
  isVideo?: boolean;
}

export default function ImageModal({
  isOpen,
  onClose,
  src,
  alt,
  isVideo = false,
}: ImageModalProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="relative max-w-[90vw] max-h-[90vh] bg-white rounded-lg overflow-hidden">
        {/* Botões do topo */}
        <div className="absolute top-2 right-2 z-10 flex gap-2">
          {isVideo && (
            <Button
              onClick={() => {
                const link = document.createElement('a');
                link.href = src;
                link.download = alt || 'video';
                link.click();
              }}
              variant="ghost"
              size="sm"
              className="bg-blue-600 bg-opacity-80 text-white hover:bg-opacity-90"
              title="Download do vídeo"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="bg-black bg-opacity-50 text-white hover:bg-opacity-70"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Conteúdo */}
        {isVideo ? (
          <div className="relative">
            <video
              controls
              className="max-w-full max-h-[80vh] object-contain"
              style={{ display: "block", minWidth: "400px", minHeight: "300px" }}
              poster=""
            >
              <source src={src} type="video/mp4" />
              <source src={src} type="video/webm" />
              <source src={src} type="video/mov" />
              <source src={src} type="video/avi" />
              Seu navegador não suporta vídeo HTML5.
            </video>
          </div>
        ) : (
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-[85vh] object-contain"
            style={{ display: "block" }}
          />
        )}

        {/* Legenda */}
        {alt && (
          <div className="p-4 bg-gray-50 border-t">
            <p className="text-sm text-gray-700 text-center">
              {isVideo ? "🎬" : "🖼️"} {alt}
              {isVideo && (
                <span className="ml-2 text-xs text-blue-600">
                  • Clique no botão de download para salvar
                </span>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
