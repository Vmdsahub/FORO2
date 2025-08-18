import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface SecureUploadWidgetProps {
  onSuccess: (fileInfo: UploadedFileInfo) => void;
  onError?: (error: string) => void;
  accept?: string;
  maxSize?: number;
  className?: string;
  buttonText?: string;
  icon?: React.ReactNode;
}

interface UploadedFileInfo {
  id: string;
  url: string;
  originalName: string;
  size: number;
  mimeType: string;
  hash: string;
  isImage: boolean;
  uploadTime: string;
}

interface SecurityWarning {
  show: boolean;
  reasons: string[];
  quarantined: boolean;
}

export default function SecureUploadWidget({
  onSuccess,
  onError,
  accept = ".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.zip,.rar,.mp4,.mp3,.txt,.csv",
  maxSize = 1024 * 1024 * 1024, // 1GB - Match server configuration
  className = "",
  buttonText = "Upload Seguro",
  icon,
}: SecureUploadWidgetProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [securityWarning, setSecurityWarning] = useState<SecurityWarning>({
    show: false,
    reasons: [],
    quarantined: false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset file input
    event.target.value = "";

    // Basic client-side validation
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      const fileSizeMB = Math.round(file.size / (1024 * 1024));
      const errorMessage = `Arquivo muito grande (${fileSizeMB}MB). Máximo ${maxSizeMB}MB permitido.`;
      toast.error(errorMessage);
      onError?.(errorMessage);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      };

      // Handle upload completion
      const uploadPromise = new Promise<UploadedFileInfo>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              if (response.success) {
                resolve(response.file);
              } else {
                reject(new Error(response.error || "Upload failed"));
              }
            } catch (error) {
              console.error("Failed to parse success response:", error);
              reject(new Error("Invalid response format"));
            }
          } else {
            try {
              const errorResponse = JSON.parse(xhr.responseText);

              // Handle security validation failures
              if (errorResponse.reasons && errorResponse.reasons.length > 0) {
                setSecurityWarning({
                  show: true,
                  reasons: errorResponse.reasons,
                  quarantined: errorResponse.quarantined || false,
                });
                reject(new Error("Security validation failed"));
              } else {
                reject(
                  new Error(
                    errorResponse.error ||
                      `Upload failed with status ${xhr.status}`,
                  ),
                );
              }
            } catch (parseError) {
              console.error("Failed to parse error response:", parseError);
              // Use response text as fallback
              const errorMessage =
                xhr.responseText || `Upload failed with status ${xhr.status}`;
              reject(new Error(errorMessage));
            }
          }
        };

        xhr.onerror = () => {
          reject(new Error("Network error during upload"));
        };

        xhr.ontimeout = () => {
          reject(new Error("Upload timeout"));
        };
      });

      // Configure request
      xhr.open("POST", "/api/secure-upload");
      xhr.timeout = 10 * 60 * 1000; // 10 minutes timeout for large files

      // Add auth header if available
      const authToken = localStorage.getItem("auth_token");
      if (authToken) {
        xhr.setRequestHeader("Authorization", `Bearer ${authToken}`);
      }

      // Start upload
      xhr.send(formData);

      // Wait for completion
      const fileInfo = await uploadPromise;

      // Success
      toast.success(
        `✅ Arquivo carregado com segurança: ${fileInfo.originalName}`,
      );
      onSuccess(fileInfo);
    } catch (error) {
      console.error("Secure upload error:", error);

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (!securityWarning.show) {
        toast.error(`❌ Erro no upload: ${errorMessage}`);
        onError?.(errorMessage);
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const closeSecurityWarning = () => {
    setSecurityWarning({ show: false, reasons: [], quarantined: false });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleButtonClick}
        disabled={isUploading}
        className={`h-8 px-2 hover:bg-blue-50 border-blue-200 text-blue-700 ${className}`}
        title="Upload seguro com validação avançada de segurança"
      >
        {isUploading ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
            <span className="text-xs">{uploadProgress}%</span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            {icon || (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
              </svg>
            )}
            <span className="text-xs font-medium">{buttonText}</span>
          </div>
        )}
      </Button>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Upload progress indicator */}
      {isUploading && uploadProgress > 0 && (
        <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          ></div>
        </div>
      )}

      {/* Security Warning Dialog */}
      <AlertDialog
        open={securityWarning.show}
        onOpenChange={closeSecurityWarning}
      >
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              {securityWarning.quarantined ? (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                </svg>
              )}
              {securityWarning.quarantined
                ? "Arquivo em Quarentena"
                : "Aviso de Segurança"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-gray-700">
                  {securityWarning.quarantined
                    ? "O arquivo foi colocado em quarentena devido a problemas de segurança detectados:"
                    : "Foram detectados os seguintes problemas de segurança no arquivo:"}
                </p>

                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <ul className="list-disc list-inside space-y-1 text-sm text-red-800">
                    {securityWarning.reasons.map((reason, index) => (
                      <li key={index}>{reason}</li>
                    ))}
                  </ul>
                </div>

                {securityWarning.quarantined && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      <strong>🔒 Ação de Segurança:</strong> O arquivo foi
                      isolado automaticamente e não será disponibilizado para
                      download. Os administradores foram notificados.
                    </p>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Dica:</strong> Certifique-se de que o arquivo é
                    de uma fonte confiável e não contém conteúdo malicioso antes
                    de fazer upload.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={closeSecurityWarning}>
              Entendi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Export helper functions
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export const isImageFile = (filename: string): boolean => {
  const ext = filename.toLowerCase().split(".").pop();
  return ["jpg", "jpeg", "png", "webp", "bmp"].includes(ext || "");
};

export const isGifFile = (filename: string): boolean => {
  const ext = filename.toLowerCase().split(".").pop();
  return ext === "gif";
};

export const isVideoFile = (filename: string): boolean => {
  const ext = filename.toLowerCase().split(".").pop();
  return ["mp4", "webm", "avi", "mov", "wmv", "flv", "mkv", "m4v"].includes(
    ext || "",
  );
};

export const isAudioFile = (filename: string): boolean => {
  const ext = filename.toLowerCase().split(".").pop();
  return ["mp3", "wav", "ogg", "aac", "flac", "m4a", "wma"].includes(ext || "");
};

export type { UploadedFileInfo };
