import { useState, useEffect } from "react";
import ImageModal from "@/components/ImageModal";

interface SimpleMarkdownRendererProps {
  content: string;
}

export default function SimpleMarkdownRenderer({
  content,
}: SimpleMarkdownRendererProps) {
  const [modalImage, setModalImage] = useState<{
    src: string;
    alt: string;
    isVideo: boolean;
  } | null>(null);

  // Simple function to handle video clicks
  const handleVideoClick = (src: string, name: string) => {
    console.log("🎬 Video clicked:", src);
    setModalImage({ src, alt: name, isVideo: true });
  };

  // Simple function to handle image clicks
  const handleImageClick = (src: string, alt: string) => {
    console.log("🖼️ Image clicked:", src);
    setModalImage({ src, alt, isVideo: false });
  };

  // Process content and add click handlers
  const processContent = () => {
    let processedContent = content;

    // Replace image patterns with clickable images
    processedContent = processedContent.replace(
      /!\[(.*?)\]\((.*?)\)/g,
      (match, alt, src) => {
        const imageId = `img_${Math.random().toString(36).substr(2, 9)}`;
        // Store handler in a global registry
        setTimeout(() => {
          const element = document.getElementById(imageId);
          if (element) {
            element.onclick = (e) => {
              e.preventDefault();
              e.stopPropagation();
              handleImageClick(src, alt);
            };
          }
        }, 0);

        return `<img id="${imageId}" src="${src}" alt="${alt}" style="max-width: 120px; width: 120px; height: auto; border-radius: 8px; border: 1px solid #e5e7eb; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin: 0 8px 8px 0; display: inline-block; vertical-align: top; cursor: pointer;" />`;
      },
    );

    // Replace video patterns with clickable video previews
    processedContent = processedContent.replace(
      /\[Vídeo: (.*?)\]\((.*?)\)/g,
      (match, name, src) => {
        const videoId = `video_${Math.random().toString(36).substr(2, 9)}`;
        // Store handler in a global registry
        setTimeout(() => {
          const element = document.getElementById(videoId);
          if (element) {
            element.onclick = (e) => {
              e.preventDefault();
              e.stopPropagation();
              handleVideoClick(src, name);
            };
          }
        }, 0);

        return `
          <div id="${videoId}" style="position: relative; max-width: 240px; width: 240px; height: 180px; border-radius: 8px; border: 1px solid #e5e7eb; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin: 0 4px 4px 0; display: inline-block; vertical-align: top; background: #000; cursor: pointer; overflow: hidden;">
            <video style="width: 100%; height: 100%; object-fit: cover;" muted preload="metadata">
              <source src="${src}" type="video/mp4">
            </video>
            <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center;">
              <svg width="48" height="48" viewBox="0 0 24 24" style="filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4));">
                <path d="M8 5v14l11-7z" fill="rgba(255,255,255,0.9)"/>
              </svg>
            </div>
          </div>
        `;
      },
    );

    return processedContent;
  };

  const closeModal = () => {
    console.log("❌ Closing modal");
    setModalImage(null);
  };

  // Setup global function for compatibility
  useEffect(() => {
    if (!(window as any).openImageModal) {
      (window as any).openImageModal = (
        src: string,
        alt: string,
        isVideo: boolean,
      ) => {
        setModalImage({ src, alt, isVideo });
      };
    }
  }, []);

  return (
    <>
      <div
        className="prose max-w-none text-gray-700 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: processContent() }}
        style={{
          wordBreak: "break-word",
          overflowWrap: "break-word",
        }}
      />

      <ImageModal
        isOpen={!!modalImage}
        onClose={closeModal}
        src={modalImage?.src || ""}
        alt={modalImage?.alt || ""}
        isVideo={modalImage?.isVideo || false}
      />
    </>
  );
}
