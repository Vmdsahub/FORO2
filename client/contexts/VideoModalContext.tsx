import { createContext, useContext, useState, ReactNode } from "react";

interface VideoModalData {
  src: string;
  alt: string;
  isVideo: boolean;
}

interface VideoModalContextType {
  modalData: VideoModalData | null;
  openModal: (data: VideoModalData) => void;
  closeModal: () => void;
  isOpen: boolean;
}

const VideoModalContext = createContext<VideoModalContextType | null>(null);

export function VideoModalProvider({ children }: { children: ReactNode }) {
  const [modalData, setModalData] = useState<VideoModalData | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const openModal = (data: VideoModalData) => {
    // Prevent opening if already closing or opening
    if (isClosing || modalData) return;

    console.log("🎬 Opening video modal:", data.src);
    setModalData(data);
  };

  const closeModal = () => {
    if (isClosing) return;

    console.log("❌ Closing video modal");
    setIsClosing(true);
    setModalData(null);

    // Reset closing state after animation
    setTimeout(() => {
      setIsClosing(false);
    }, 300);
  };

  return (
    <VideoModalContext.Provider
      value={{
        modalData,
        openModal,
        closeModal,
        isOpen: !!modalData,
      }}
    >
      {children}
    </VideoModalContext.Provider>
  );
}

export function useVideoModal() {
  const context = useContext(VideoModalContext);
  if (!context) {
    throw new Error("useVideoModal must be used within VideoModalProvider");
  }
  return context;
}
