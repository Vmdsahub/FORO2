import React, { useState, useEffect } from "react";
import ImageModal from "@/components/ImageModal";

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const [modalImage, setModalImage] = useState<{
    src: string;
    alt: string;
    isVideo: boolean;
  } | null>(null);

  // Configurar função global para abrir modal
  useEffect(() => {
    (window as any).openImageModal = (
      src: string,
      alt: string,
      isVideo: boolean,
    ) => {
      setModalImage({ src, alt, isVideo });
    };

    // Also setup global video listener function
    (window as any).setupVideoListeners = () => {
      const videoElements = document.querySelectorAll('.video-preview');

      videoElements.forEach((element) => {
        if (element.hasAttribute('data-listener-added')) {
          return;
        }

        let videoSrc = '';
        const dataSrc = element.getAttribute('data-video-src');
        if (dataSrc) {
          videoSrc = dataSrc;
        } else {
          const videoChild = element.querySelector('video');
          if (videoChild && videoChild.src) {
            videoSrc = videoChild.src;
          }
        }

        if (videoSrc) {
          const clickHandler = (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🎬 Clicando no vídeo:', videoSrc);
            setModalImage({ src: videoSrc, alt: 'Vídeo', isVideo: true });
          };

          element.addEventListener('click', clickHandler);
          element.setAttribute('data-listener-added', 'true');
          console.log('🎯 Event listener adicionado para vídeo:', videoSrc);
        }
      });
    };

    return () => {
      delete (window as any).openImageModal;
      delete (window as any).setupVideoListeners;
    };
  }, []);

  // Configurar event listeners para vídeos após o render
  useEffect(() => {
    const timer = setTimeout(() => {
      if ((window as any).setupVideoListeners) {
        (window as any).setupVideoListeners();
      }
    }, 200);

    // Also setup a global interval to catch any new videos
    const interval = setInterval(() => {
      if ((window as any).setupVideoListeners) {
        (window as any).setupVideoListeners();
      }
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [content]);

  const isHtmlContent = (text: string): boolean => {
    // Verificar se é HTML válido do editor
    const htmlTags = [
      "<div",
      "<img",
      "<video",
      "<audio",
      "<pre",
      "<code",
      "<strong",
      "<em",
      "<span",
      "<p>",
      "<br>",
      "<a",
      "<h1",
      "<h2",
      "<h3",
      "style=",
      "onclick=",
      "class=",
    ];

    return htmlTags.some((tag) => text.includes(tag));
  };

  const renderContent = () => {
    // Se o conteúdo é HTML do editor, processar para adicionar funcionalidades de posts/comentários
    if (isHtmlContent(content)) {
      let processedHtml = content;

      // Add click functionality and better styling to images from editor
      processedHtml = processedHtml.replace(
        /<img\s+([^>]*?)src="([^"]*)"([^>]*?)>/g,
        (match, beforeSrc, src, afterSrc) => {
          // Extract alt attribute if present
          const altMatch = match.match(/alt="([^"]*)"/);
          const alt = altMatch ? altMatch[1] : "";

          // Replace with clickable image with rounded borders - matching editor size
          return `<img src="${src}" alt="${alt}" style="max-width: 120px; width: 120px; height: auto; border-radius: 8px; border: 1px solid #e5e7eb; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin: 0 4px 4px 0; display: inline-block; vertical-align: top;" onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 8px 24px rgba(0,0,0,0.2)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'" onclick="window.openImageModal('${src}', '${alt}', false)" loading="lazy" />`;
        },
      );

      // Convert video previews to clickable thumbnails
      processedHtml = processedHtml.replace(
        /<div class="video-preview"[^>]*>(.*?)<\/div>/g,
        (match) => {
          // Extract video source from the video element
          const srcMatch = match.match(/src="([^"]*)"/);
          const src = srcMatch ? srcMatch[1] : "";

          // Generate unique ID for this video element
          const videoId = `video_${Math.random().toString(36).substr(2, 9)}`;

          // Create video preview thumbnail with working click handler
          return `<div
            class="video-preview"
            id="${videoId}"
            style="position: relative; max-width: 240px; width: 240px; height: 180px; border-radius: 8px; border: 1px solid #e5e7eb; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin: 0 4px 4px 0; display: inline-block; vertical-align: top; background: #000; cursor: pointer; overflow: hidden; transition: all 0.2s ease;"
            onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 8px 24px rgba(0,0,0,0.2)'"
            onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'"
            data-video-src="${src}">
            <video style="width: 100%; height: 100%; object-fit: cover; pointer-events: none;" muted preload="metadata">
              <source src="${src}" type="video/mp4">
            </video>
            <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; pointer-events: none;">
              <svg width="48" height="48" viewBox="0 0 24 24" style="filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4));">
                <path d="M8 5v14l11-7z" fill="rgba(255,255,255,0.9)"/>
              </svg>
            </div>
          </div>`;
        },
      );

      return processedHtml;
    }

    // Se contém elementos de mídia, força como HTML
    if (
      content.includes("🖼️") ||
      content.includes("🎬") ||
      content.includes("🎵") ||
      content.includes("📎")
    ) {
      return content;
    }

    // Caso contrário, converte markdown básico para HTML
    let processedContent = content;

    // Convert **bold** to <strong>
    processedContent = processedContent.replace(
      /\*\*(.*?)\*\*/g,
      "<strong>$1</strong>",
    );

    // Convert *italic* to <em>
    processedContent = processedContent.replace(/\*(.*?)\*/g, "<em>$1</em>");

    // Convert image markdown ![alt](url) to img tags - 65% smaller size with rounded borders
    processedContent = processedContent.replace(
      /!\[(.*?)\]\((.*?)\)/g,
      '<div style="margin: 16px 0; text-align: center;"><img src="$2" alt="$1" style="max-width: 260px; width: 260px; height: auto; border-radius: 16px; border: 2px solid #e5e7eb; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" onmouseover="this.style.transform=\'scale(1.02)\'; this.style.boxShadow=\'0 8px 24px rgba(0,0,0,0.2)\'" onmouseout="this.style.transform=\'scale(1)\'; this.style.boxShadow=\'0 4px 12px rgba(0,0,0,0.15)\'" onclick="window.openImageModal(\'$2\', \'$1\', false)" loading="lazy" /><p style="font-size: 14px; color: #6b7280; margin-top: 8px; text-align: center;">$1</p></div>',
    );

    // Convert video links [Video: name](url) to video tags
    processedContent = processedContent.replace(
      /\[Vídeo: (.*?)\]\((.*?)\)/g,
      '<div style="margin: 16px 0; text-align: center;"><div style="position: relative; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; display: inline-block; max-width: 300px;"><video controls style="width: 100%; height: auto; cursor: pointer;" onclick="window.openImageModal(\'$2\', \'$1\', true)" preload="metadata"><source src="$2" type="video/mp4"><source src="$2" type="video/webm"><source src="$2" type="video/mov">Seu navegador não suporta vídeo HTML5.</video></div><p style="font-size: 14px; color: #6b7280; margin-top: 8px; display: flex; align-items: center; gap: 4px; justify-content: center;"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="color: #2563eb;"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>$1</p></div>',
    );

    // Convert code blocks ```code``` to styled blocks
    processedContent = processedContent.replace(
      /```([\s\S]*?)```/g,
      '<div style="margin: 16px 0; padding: 16px; background-color: #f3f4f6; border-radius: 8px; border: 1px solid #e5e7eb;"><code style="font-size: 14px; font-family: monospace; color: #374151; white-space: pre-wrap;">$1</code></div>',
    );

    // Convert inline code `code` to styled spans
    processedContent = processedContent.replace(
      /`([^`]+)`/g,
      '<code style="padding: 2px 6px; background-color: #f3f4f6; color: #374151; border-radius: 4px; font-size: 14px; font-family: monospace;">$1</code>',
    );

    // Convert line breaks to <br>
    processedContent = processedContent.replace(/\n/g, "<br>");

    return processedContent;
  };

  return (
    <>
      <div
        className="prose max-w-none text-gray-700 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: renderContent() }}
        style={{
          wordBreak: "break-word",
          overflowWrap: "break-word",
        }}
      />

      {/* Modal de imagem/vídeo */}
      <ImageModal
        isOpen={!!modalImage}
        onClose={() => setModalImage(null)}
        src={modalImage?.src || ""}
        alt={modalImage?.alt || ""}
        isVideo={modalImage?.isVideo || false}
      />
    </>
  );
}
