import { useEffect } from "react";

interface MediaClickHandlerProps {
  onImageClick?: (src: string, alt: string) => void;
  onVideoClick?: (src: string, name: string) => void;
}

export default function MediaClickHandler({
  onImageClick,
  onVideoClick,
}: MediaClickHandlerProps) {
  useEffect(() => {
    // Function to setup click handlers for dynamically added media
    const setupMediaClickHandlers = () => {
      // Find all images in image-container that don't have click handlers
      const images = document.querySelectorAll(
        ".image-container img:not([data-click-handled])",
      );
      images.forEach((img) => {
        const imageEl = img as HTMLImageElement;

        // Skip if already has click handler, is in edit mode, or inside rich editor
        if (
          imageEl.getAttribute("data-click-handled") === "true" ||
          imageEl.getAttribute("data-edit-mode") === "true" ||
          imageEl.closest(".rich-editor")
        ) {
          return;
        }

        imageEl.setAttribute("data-click-handled", "true");
        imageEl.style.cursor = "pointer";

        imageEl.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const src = imageEl.src;
          const alt = imageEl.alt || "Imagem";
          console.log("🖼️ Global image click:", src);

          if (onImageClick) {
            onImageClick(src, alt);
          } else if ((window as any).openImageModal) {
            (window as any).openImageModal(src, alt, false);
          }
        });
      });

      // Find all videos in video-preview that don't have click handlers
      const videos = document.querySelectorAll(
        ".video-preview:not([data-click-handled]), .image-container .video-preview:not([data-click-handled])",
      );
      videos.forEach((video) => {
        const videoEl = video as HTMLElement;

        // Skip if already has click handler, is in edit mode, or inside rich editor
        if (
          videoEl.getAttribute("data-click-handled") === "true" ||
          videoEl.getAttribute("data-edit-mode") === "true" ||
          videoEl.closest(".rich-editor")
        ) {
          return;
        }

        videoEl.setAttribute("data-click-handled", "true");
        videoEl.style.cursor = "pointer";

        videoEl.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();

          // Try to find the video source
          const videoElement = videoEl.querySelector(
            "video",
          ) as HTMLVideoElement;
          const src =
            videoElement?.src ||
            videoElement?.querySelector("source")?.src ||
            "";
          const name = videoEl.getAttribute("data-name") || "Vídeo";

          console.log("🎬 Global video click:", src);

          if (onVideoClick) {
            onVideoClick(src, name);
          } else if ((window as any).openImageModal) {
            (window as any).openImageModal(src, name, true);
          }
        });
      });
    };

    // Initial setup
    setupMediaClickHandlers();

    // Observer for dynamically added content
    const observer = new MutationObserver((mutations) => {
      let shouldSetup = false;
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              // Check if new images or videos were added
              if (
                element.querySelector?.(
                  ".image-container img, .video-preview",
                ) ||
                element.classList?.contains("image-container") ||
                element.classList?.contains("video-preview")
              ) {
                shouldSetup = true;
              }
            }
          });
        }
      });

      if (shouldSetup) {
        setTimeout(setupMediaClickHandlers, 100);
      }
    });

    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [onImageClick, onVideoClick]);

  return null; // This component doesn't render anything
}
