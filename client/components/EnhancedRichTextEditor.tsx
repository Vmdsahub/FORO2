import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ImageModal from "@/components/ImageModal";
import { SketchPicker } from "react-color";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import SecureUploadWidget, {
  UploadedFileInfo,
  isImageFile,
  isVideoFile,
  isAudioFile,
  isGifFile,
} from "@/components/SecureUploadWidget";

interface EnhancedRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isEditMode?: boolean; // New prop to control edit mode
}

export default function EnhancedRichTextEditor({
  value,
  onChange,
  placeholder,
  isEditMode = true, // Default to edit mode (creation/editing)
}: EnhancedRichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [modalImage, setModalImage] = useState<{
    src: string;
    alt: string;
    isVideo: boolean;
  } | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [currentColor, setCurrentColor] = useState("#000000");

  // Initialize secure upload system
  const [secureUploadStats, setSecureUploadStats] = useState<{
    safeFiles: number;
    quarantined: { total: number; recent: number };
  } | null>(null);

  useEffect(() => {
    // Load upload statistics
    fetch("/api/upload-stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSecureUploadStats(data.stats);
        }
      })
      .catch((err) => console.warn("Could not load upload stats:", err));
  }, []);

  // Sync editor content with value
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  // Configure global functions - conditional based on edit mode
  useEffect(() => {
    (window as any).openImageModal = (
      src: string,
      alt: string,
      isVideo: boolean,
    ) => {
      // Only allow media expansion when NOT in edit mode (i.e., when content is already posted)
      if (!isEditMode) {
        setModalImage({ src, alt, isVideo });
      }
    };

    (window as any).downloadFile = (url: string, filename: string) => {
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    return () => {
      delete (window as any).openImageModal;
      delete (window as any).downloadFile;
    };
  }, [isEditMode]);

  // Manage placeholder manually
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const updatePlaceholder = () => {
      const isEmpty =
        editor.innerHTML.trim() === "" || editor.innerHTML === "<br>";
      if (isEmpty && placeholder) {
        editor.setAttribute("data-empty", "true");
      } else {
        editor.removeAttribute("data-empty");
      }
    };

    updatePlaceholder();
    editor.addEventListener("input", updatePlaceholder);
    editor.addEventListener("focus", updatePlaceholder);
    editor.addEventListener("blur", updatePlaceholder);

    return () => {
      editor.removeEventListener("input", updatePlaceholder);
      editor.removeEventListener("focus", updatePlaceholder);
      editor.removeEventListener("blur", updatePlaceholder);
    };
  }, [placeholder]);

  const handleInput = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      onChange(content);
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  // Enhanced function to ensure proper cursor positioning for empty editor
  const insertHtmlAndRestoreCursor = (html: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = window.getSelection();

    // Special handling for empty editor
    const editorContent = editor.innerHTML.trim();
    const isEmpty = editorContent === "" || editorContent === "<br>";

    if (isEmpty) {
      // For empty editor, insert at the beginning and add editable space after
      editor.innerHTML = `<div><br></div>${html}<div><br></div>`;

      // Set cursor to the first line
      const range = document.createRange();
      const firstDiv = editor.querySelector("div");
      if (firstDiv) {
        range.setStart(firstDiv, 0);
        range.collapse(true);

        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    } else {
      // For non-empty editor, use standard insertion
      if (!selection || selection.rangeCount === 0) {
        // If no selection, place cursor at end
        editor.focus();
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }

      // Insert the HTML
      execCommand("insertHTML", html);

      // Ensure there's always editable space after media insertion
      setTimeout(() => {
        const currentSelection = window.getSelection();
        if (currentSelection && currentSelection.rangeCount > 0) {
          const range = currentSelection.getRangeAt(0);

          // Insert a line break for text editing after media
          const lineBreak = document.createElement("div");
          lineBreak.innerHTML = "<br>";
          range.insertNode(lineBreak);

          // Move cursor to the new line
          range.setStartAfter(lineBreak);
          range.collapse(true);

          currentSelection.removeAllRanges();
          currentSelection.addRange(range);

          // Trigger change event
          handleInput();
        }

        // Focus the editor
        editor.focus();
      }, 50); // Increased timeout for better stability
    }
  };

  const handleBold = () => execCommand("bold");
  const handleItalic = () => execCommand("italic");
  const handleUnderline = () => execCommand("underline");
  const handleHeading = () => execCommand("formatBlock", "H3");

  const handleLink = () => {
    const url = prompt("Digite a URL:");
    if (url) {
      execCommand("createLink", url);
    }
  };

  const handleColorChange = (color: any) => {
    setCurrentColor(color.hex);
    execCommand("foreColor", color.hex);
    setShowColorPicker(false);
  };

  const handleSecureUploadSuccess = (fileInfo: UploadedFileInfo) => {
    // Automatic media insertion based on file type
    if (
      isImageFile(fileInfo.originalName) ||
      isGifFile(fileInfo.originalName)
    ) {
      insertImageHtml(fileInfo.url, fileInfo.originalName);
    } else if (isVideoFile(fileInfo.originalName)) {
      insertVideoHtml(fileInfo.url, fileInfo.originalName);
    } else if (isAudioFile(fileInfo.originalName)) {
      insertAudioHtml(fileInfo.url, fileInfo.originalName, fileInfo.size);
    } else {
      insertFileLink(fileInfo.url, fileInfo.originalName, fileInfo.size);
    }

    toast.success(
      `🔒 Arquivo verificado e carregado: ${fileInfo.originalName}`,
    );

    // Update stats
    if (secureUploadStats) {
      setSecureUploadStats({
        ...secureUploadStats,
        safeFiles: secureUploadStats.safeFiles + 1,
      });
    }
  };

  const handleSecureUploadError = (error: string) => {
    console.error("Secure upload error:", error);
    toast.error("❌ Falha na verificação de segurança. Tente outro arquivo.");
  };

  const insertImageHtml = (src: string, alt: string) => {
    // Image HTML for editor - NO click functionality, smaller size, basic styling
    // Reduced size to 65% of original (260px instead of 400px) - NO click in editor
    const img = `<div contenteditable="false" style="margin: 16px 0; text-align: center; user-select: none; clear: both;"><img src="${src}" alt="${alt}" style="max-width: 260px !important; width: 260px; height: auto; border-radius: 12px; border: 1px solid #e5e7eb; box-shadow: 0 2px 8px rgba(0,0,0,0.1); display: block; margin: 0 auto;" /></div><div><br></div>`;
    insertHtmlAndRestoreCursor(img);
  };

  const insertVideoHtml = (src: string, name: string) => {
    // Enhanced video HTML with conditional click behavior and better sizing
    const clickHandler = isEditMode
      ? 'style="cursor: default;"' // No click in edit mode
      : `onclick="window.openImageModal('${src}', '${name}', true)" style="cursor: pointer;"`;

    // Reduced size to 65% (325px instead of 500px)
    const video = `<div contenteditable="false" style="margin: 16px 0; text-align: center; user-select: none; clear: both;"><video controls ${clickHandler} style="max-width: 325px; height: auto; border-radius: 8px; border: 1px solid #e5e7eb; box-shadow: 0 2px 8px rgba(0,0,0,0.1); display: block; margin: 0 auto;"><source src="${src}" type="video/mp4"><source src="${src}" type="video/webm"><source src="${src}" type="video/mov">Seu navegador não suporta vídeo HTML5.</video></div>`;
    insertHtmlAndRestoreCursor(video);
  };

  const insertAudioHtml = (src: string, name: string, size?: number) => {
    const sizeText = size ? ` (${formatFileSize(size)})` : "";
    // Reduced width to 65% (260px instead of 400px)
    const audio = `<div contenteditable="false" style="margin: 16px 0; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; background: white; max-width: 260px; margin-left: auto; margin-right: auto; box-shadow: 0 1px 3px rgba(0,0,0,0.1); user-select: none; clear: both;"><audio controls style="width: 100%; height: 32px; margin-bottom: 8px;"><source src="${src}" type="audio/mpeg"><source src="${src}" type="audio/wav"><source src="${src}" type="audio/ogg">Seu navegador não suporta áudio HTML5.</audio><div style="display: flex; justify-content: space-between; align-items: center;"><span style="font-size: 13px; color: #374151; font-weight: 500;">${name}${sizeText}</span><button onclick="window.downloadFile('${src}', '${name}')" style="background: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 11px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'" title="Download do áudio">Download</button></div></div>`;
    insertHtmlAndRestoreCursor(audio);
  };

  const insertFileLink = (url: string, name: string, size?: number) => {
    const sizeText = size ? ` (${formatFileSize(size)})` : "";
    const fileLink = `<div contenteditable="false" style="margin: 16px 0; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); user-select: none; transition: all 0.2s; clear: both;" onmouseover="this.style.backgroundColor='#f9fafb'" onmouseout="this.style.backgroundColor='white'"><div style="display: flex; align-items: center; justify-content: space-between;"><div style="display: flex; align-items: center; gap: 8px;"><span style="font-size: 14px; color: #6b7280;">📎</span><span style="font-size: 14px; color: #374151; font-weight: 500;">${name}${sizeText}</span></div><button onclick="window.downloadFile('${url}', '${name}')" style="background: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 11px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'" title="Download do arquivo">Download</button></div></div>`;
    insertHtmlAndRestoreCursor(fileLink);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-gray-500 focus-within:border-gray-500 bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 border-b border-gray-200 bg-gray-50 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleBold}
          className="h-8 px-2 hover:bg-gray-100"
          title="Negrito (Ctrl+B)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
          </svg>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleItalic}
          className="h-8 px-2 hover:bg-gray-100"
          title="Itálico (Ctrl+I)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z" />
          </svg>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUnderline}
          className="h-8 px-2 hover:bg-gray-100"
          title="Sublinhado"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z" />
          </svg>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleHeading}
          className="h-8 px-2 hover:bg-gray-100"
          title="Título"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 4v3h5.5v12h3V7H19V4z" />
          </svg>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleLink}
          className="h-8 px-2 hover:bg-gray-100"
          title="Link"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 6v2H5v5h5v2l3-4.5L10 6zM19 15l-3-4.5L19 6v2h5v5h-5v2z" />
          </svg>
        </Button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Color Picker */}
        <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2 hover:bg-gray-100"
              title="Cor do texto"
            >
              <div className="flex items-center gap-1">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 3c-1.1 0-2 .9-2 2v6l-4 4h12l-4-4V5c0-1.1-.9-2-2-2z" />
                </svg>
                <div
                  className="w-3 h-3 rounded border border-gray-300"
                  style={{ backgroundColor: currentColor }}
                />
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" side="bottom" align="start">
            <SketchPicker
              color={currentColor}
              onChange={handleColorChange}
              width="200px"
            />
          </PopoverContent>
        </Popover>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Secure Upload Widget - único botão de upload */}
        <SecureUploadWidget
          onSuccess={handleSecureUploadSuccess}
          onError={handleSecureUploadError}
          buttonText="🔒 Upload"
          className="h-8"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
            </svg>
          }
        />
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="w-full p-4 min-h-[200px] focus:outline-none bg-white rich-editor"
        style={{
          lineHeight: "1.7",
          fontSize: "15px",
          wordWrap: "break-word",
          overflowWrap: "break-word",
          whiteSpace: "pre-wrap",
        }}
        suppressContentEditableWarning={true}
        data-placeholder={placeholder}
      />

      {/* Enhanced CSS for better layout and text handling */}
      <style>{`
        .rich-editor[data-empty="true"]:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
          position: absolute;
          font-style: italic;
        }
        
        .rich-editor {
          position: relative;
          overflow-wrap: break-word;
          word-wrap: break-word;
          word-break: break-word;
          hyphens: auto;
        }
        
        /* Better text flow and line breaks */
        .rich-editor * {
          max-width: 100%;
          box-sizing: border-box;
        }
        
        .rich-editor p {
          margin: 0.5em 0;
          line-height: 1.7;
        }
        
        .rich-editor div {
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        
        /* Enhanced styling for media elements in edit mode */
        .rich-editor div[contenteditable="false"] {
          position: relative;
          clear: both;
          margin: 16px 0;
          word-wrap: normal;
          overflow-wrap: normal;
        }
        
        /* Ensure proper spacing and cursor placement */
        .rich-editor div[contenteditable="false"] + div {
          min-height: 1.2em;
          margin-top: 8px;
        }
        
        /* Better handling of line breaks */
        .rich-editor br {
          display: block;
          margin: 4px 0;
          content: "";
        }
        
        /* Prevent content overflow and force smaller image size in editor */
        .rich-editor img {
          max-width: 260px !important;
          width: 260px !important;
          height: auto !important;
        }

        .rich-editor video,
        .rich-editor audio {
          max-width: 100% !important;
          height: auto !important;
        }
        
        /* Improve text selection and cursor visibility */
        .rich-editor:focus {
          caret-color: #374151;
        }
        
        /* Better handling of empty lines */
        .rich-editor div:empty:before {
          content: "\\200b"; /* Zero-width space */
          display: inline-block;
        }
        
        /* Ensure proper text wrapping */
        .rich-editor {
          white-space: pre-wrap;
          word-break: break-word;
          overflow-wrap: break-word;
        }
        
        /* Better margin handling */
        .rich-editor > *:first-child {
          margin-top: 0;
        }
        
        .rich-editor > *:last-child {
          margin-bottom: 0;
        }
      `}</style>

      {/* Help text */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="space-y-1">
          <p className="text-xs text-gray-500">
            <strong>🚀 Recursos:</strong>{" "}
            <span className="text-purple-600">Formatação rica</span>,
            <span className="text-purple-600"> seletor de cores</span>,
            <span className="text-green-600">
              {" "}
              upload ultra-seguro com validação ClamAV-style
            </span>
            . Upload de mídia é automaticamente inserido no conteúdo.
            {isEditMode ? (
              <span className="text-orange-600">
                {" "}
                Expansão de mídia disponível após publicar.
              </span>
            ) : (
              <span className="text-blue-600">
                {" "}
                Clique na mídia para expandir.
              </span>
            )}
          </p>
          {secureUploadStats && (
            <p className="text-xs text-green-600">
              🔒 Sistema de segurança: {secureUploadStats.safeFiles} arquivos
              verificados
              {secureUploadStats.quarantined.total > 0 && (
                <span className="text-orange-600">
                  {" "}
                  | {secureUploadStats.quarantined.total} em quarentena
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Modal de imagem/vídeo - only shown when not in edit mode */}
      {!isEditMode && (
        <ImageModal
          isOpen={!!modalImage}
          onClose={() => setModalImage(null)}
          src={modalImage?.src || ""}
          alt={modalImage?.alt || ""}
          isVideo={modalImage?.isVideo || false}
        />
      )}
    </div>
  );
}
