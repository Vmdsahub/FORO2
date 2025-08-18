import { fileTypeFromBuffer } from "file-type";
import sanitize from "sanitize-filename";
import sharp from "sharp";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import {
  AdvancedSecurityAnalyzer,
  AdvancedAnalysisResult,
} from "./advancedAnalysis";

export interface FileValidationResult {
  isValid: boolean;
  reasons: string[];
  sanitizedName: string;
  detectedMimeType?: string;
  hash: string;
  size: number;
  quarantined: boolean;
}

export interface SecurityConfig {
  maxFileSize: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  quarantineDir: string;
  safeDir: string;
}

export class AdvancedFileValidator {
  private config: SecurityConfig;
  private suspiciousPatterns: RegExp[];
  private advancedAnalyzer: AdvancedSecurityAnalyzer;

  constructor(config: SecurityConfig) {
    this.config = config;
    this.advancedAnalyzer = new AdvancedSecurityAnalyzer();
    this.suspiciousPatterns = [
      // Script injection patterns
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /data:text\/html/gi,
      /vbscript:/gi,
      /on\w+\s*=/gi,

      // Executable signatures (magic bytes)
      /^MZ/, // Windows PE
      /^\x7fELF/, // Linux ELF
      /^PK\x03\x04.*\.exe$/, // ZIP with exe
      /^\xff\xd8\xff.*<script/gi, // JPEG with script

      // Malicious file patterns
      /autorun\.inf/gi,
      /desktop\.ini/gi,
      /thumbs\.db/gi,

      // Document macros
      /Microsoft Office Word.*Macro/gi,
      /VBA.*Project/gi,
    ];

    // Ensure directories exist
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.config.quarantineDir)) {
      fs.mkdirSync(this.config.quarantineDir, { recursive: true });
    }
    if (!fs.existsSync(this.config.safeDir)) {
      fs.mkdirSync(this.config.safeDir, { recursive: true });
    }
  }

  async validateFile(
    filePath: string,
    originalName: string,
  ): Promise<FileValidationResult> {
    const result: FileValidationResult = {
      isValid: true,
      reasons: [],
      sanitizedName: sanitize(originalName),
      hash: "",
      size: 0,
      quarantined: false,
    };

    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        result.isValid = false;
        result.reasons.push("File does not exist");
        return result;
      }

      // Get file stats
      const stats = fs.statSync(filePath);
      result.size = stats.size;

      // Check file size
      if (stats.size > this.config.maxFileSize) {
        result.isValid = false;
        result.reasons.push(
          `File too large: ${stats.size} bytes (max: ${this.config.maxFileSize})`,
        );
      }

      if (stats.size === 0) {
        result.isValid = false;
        result.reasons.push("File is empty");
        return result;
      }

      // Generate file hash
      result.hash = await this.generateFileHash(filePath);

      // Read file buffer for analysis
      const buffer = fs.readFileSync(filePath);

      // Detect actual file type
      const detectedType = await fileTypeFromBuffer(buffer);
      if (detectedType) {
        result.detectedMimeType = detectedType.mime;
      }

      // Validate file extension vs content
      const fileExt = path.extname(originalName).toLowerCase();
      if (!this.config.allowedExtensions.includes(fileExt)) {
        result.isValid = false;
        result.reasons.push(`File extension not allowed: ${fileExt}`);
      }

      // Validate MIME type (more permissive)
      if (
        detectedType &&
        !this.config.allowedMimeTypes.includes(detectedType.mime)
      ) {
        result.isValid = false;
        result.reasons.push(`MIME type not allowed: ${detectedType.mime}`);
      }

      // Check for MIME type spoofing (more permissive for images and archives)
      if (detectedType) {
        const expectedMimeForExt = this.getMimeTypeForExtension(fileExt);
        if (expectedMimeForExt && expectedMimeForExt !== detectedType.mime) {
          // Be more permissive with image files (common to have jpg extension with png content)
          const isImageMismatch =
            this.isImageFile(fileExt) && detectedType.mime.startsWith("image/");

          // Be more permissive with ZIP files (many different MIME types)
          const isZipMismatch =
            fileExt === ".zip" &&
            (detectedType.mime.includes("zip") ||
              detectedType.mime === "application/octet-stream");

          if (!isImageMismatch && !isZipMismatch) {
            result.isValid = false;
            result.reasons.push(
              `MIME type mismatch: expected ${expectedMimeForExt}, got ${detectedType.mime}`,
            );
          }
        }
      }

      // Advanced security analysis (ClamAV-style)
      const advancedAnalysis = await this.advancedAnalyzer.analyzeFile(
        filePath,
        originalName,
        detectedType?.mime || "unknown",
      );

      if (!advancedAnalysis.isClean) {
        result.isValid = false;
        result.reasons.push(...advancedAnalysis.threats);
        result.quarantined = true;

        console.log(`[ADVANCED ANALYSIS] File flagged: ${originalName}`);
        console.log(
          `[ADVANCED ANALYSIS] Analysis types: ${advancedAnalysis.analysisType.join(", ")}`,
        );
        console.log(
          `[ADVANCED ANALYSIS] Confidence: ${advancedAnalysis.confidence}%`,
        );
        console.log(
          `[ADVANCED ANALYSIS] Threats: ${advancedAnalysis.threats.join(", ")}`,
        );
      } else if (advancedAnalysis.confidence < 80) {
        console.log(
          `[ADVANCED ANALYSIS] File passed but with low confidence: ${advancedAnalysis.confidence}%`,
        );
        console.log(`[ADVANCED ANALYSIS] File: ${originalName}`);
      }

      // Basic file type validation (advanced analysis handles the rest)
      console.log(`[FILE VALIDATION] Basic checks passed for: ${originalName}`);
      console.log(
        `[FILE VALIDATION] Detected MIME: ${detectedType?.mime || "unknown"}, Size: ${result.size} bytes`,
      );

      // Move to quarantine if suspicious
      if (result.quarantined || !result.isValid) {
        await this.quarantineFile(filePath, result.hash, result.reasons);
      }
    } catch (error) {
      console.error("File validation error:", error);
      result.isValid = false;
      result.reasons.push(
        `Validation error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    return result;
  }

  private async generateFileHash(filePath: string): Promise<string> {
    const buffer = fs.readFileSync(filePath);
    return crypto.createHash("sha256").update(buffer).digest("hex");
  }

  // Legacy method - now handled by advanced analysis
  private async scanForMaliciousContent(
    buffer: Buffer,
    filename: string,
  ): Promise<string[]> {
    // Basic checks only - advanced analysis handles the rest
    const issues: string[] = [];

    // Only check for obvious executable masquerading
    if (
      /\.(exe|scr|bat|cmd|com|pif|vbs)$/i.test(filename) &&
      !filename.match(/\.(zip|rar|7z)$/i)
    ) {
      issues.push("Executable file not allowed");
    }

    console.log(`[LEGACY SCAN] Minimal scan completed for: ${filename}`);
    return issues;
  }

  // Legacy methods removed - now handled by advanced analysis

  private async quarantineFile(
    filePath: string,
    hash: string,
    reasons: string[],
  ): Promise<void> {
    try {
      const quarantinePath = path.join(
        this.config.quarantineDir,
        `${hash}.quarantine`,
      );
      const metadataPath = path.join(
        this.config.quarantineDir,
        `${hash}.metadata.json`,
      );

      // Move file to quarantine
      fs.renameSync(filePath, quarantinePath);

      // Write metadata
      const metadata = {
        originalPath: filePath,
        quarantineTime: new Date().toISOString(),
        hash,
        reasons,
        status: "quarantined",
      };

      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

      console.log(
        `[SECURITY] File quarantined: ${hash}, reasons: ${reasons.join(", ")}`,
      );
    } catch (error) {
      console.error("[SECURITY] Failed to quarantine file:", error);
    }
  }

  private isImageFile(extension: string): boolean {
    return [
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".webp",
      ".bmp",
      ".tiff",
      ".svg",
    ].includes(extension.toLowerCase());
  }

  private isArchiveFile(extension: string): boolean {
    return [".zip", ".rar", ".7z", ".tar", ".gz"].includes(
      extension.toLowerCase(),
    );
  }

  private isLegitimateMultipleExtension(filename: string): boolean {
    const parts = filename.split(".");

    // Allow common legitimate patterns
    const legitimatePatterns = [
      // Version numbers (e.g., project.v1.0.zip, app.2.1.exe)
      /\.\d+(\.\d+)*\./,
      // Common double extensions that are safe
      /\.(min|prod|dev|test|backup|temp|old|new)\./i,
      // Timestamps (e.g., backup.2024.01.15.zip)
      /\.\d{4}(\.\d{2}){2}\./,
      // Node.js patterns (e.g., config.local.js, webpack.prod.js)
      /\.(local|prod|dev|test|staging)\./i,
      // Common file patterns from development
      /\.(component|service|module|controller|model)\./i,
    ];

    // Check against legitimate patterns
    for (const pattern of legitimatePatterns) {
      if (pattern.test(filename)) {
        return true;
      }
    }

    // Special case: if the filename has many parts but ends with a safe extension
    // and doesn't contain dangerous patterns, it's probably legitimate
    const lastExtension = parts[parts.length - 1].toLowerCase();
    const safeExtensions = [
      ".zip",
      ".rar",
      ".7z",
      ".txt",
      ".json",
      ".js",
      ".css",
      ".html",
      ".md",
    ];

    if (safeExtensions.includes("." + lastExtension)) {
      // Check if any part contains dangerous extensions
      const dangerousExtensions = [
        "exe",
        "bat",
        "cmd",
        "scr",
        "pif",
        "com",
        "vbs",
        "jar",
      ];
      const hasDangerousExtension = parts.some((part) =>
        dangerousExtensions.includes(part.toLowerCase()),
      );

      if (!hasDangerousExtension) {
        return true; // Legitimate multi-part filename
      }
    }

    return false;
  }

  private isDevelopmentProject(filename: string, content: string): boolean {
    // Check filename patterns that suggest development projects
    const devProjectPatterns = [
      /\b(app|project|webapp|website|client|frontend|backend|api)\b/i,
      /\b(react|vue|angular|node|express|next|nuxt)\b/i,
      /\b(src|components|pages|routes|controllers|models)\b/i,
    ];

    // Check content patterns that suggest legitimate web development
    const devContentPatterns = [
      /package\.json/i,
      /node_modules/i,
      /src\/components/i,
      /import.*from/i,
      /export.*default/i,
      /\.jsx?|\.tsx?|\.vue|\.css|\.scss/i,
      /webpack|vite|rollup|babel/i,
    ];

    // Check filename
    for (const pattern of devProjectPatterns) {
      if (pattern.test(filename)) {
        return true;
      }
    }

    // Check content
    for (const pattern of devContentPatterns) {
      if (pattern.test(content)) {
        return true;
      }
    }

    return false;
  }

  private getMimeTypeForExtension(ext: string): string | null {
    const mimeTypes: { [key: string]: string } = {
      // Images
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".bmp": "image/bmp",
      ".tiff": "image/tiff",
      ".svg": "image/svg+xml",

      // Videos
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".mov": "video/quicktime",
      ".avi": "video/x-msvideo",
      ".wmv": "video/x-ms-wmv",

      // Audio
      ".mp3": "audio/mpeg",
      ".wav": "audio/wav",
      ".m4a": "audio/mp4",
      ".ogg": "audio/ogg",

      // Documents
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".pptx":
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ".xlsx":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".txt": "text/plain",
      ".csv": "text/csv",
      ".js": "text/javascript",
      ".css": "text/css",
      ".html": "text/html",
      ".htm": "text/html",
      ".json": "application/json",
      ".xml": "application/xml",
      ".md": "text/plain",

      // Archives (flexible MIME type checking for ZIP)
      ".zip": "application/zip", // Primary, but will accept variants
      ".rar": "application/x-rar-compressed",
      ".7z": "application/x-7z-compressed",
      ".tar": "application/x-tar",
      ".gz": "application/gzip",
    };

    return mimeTypes[ext.toLowerCase()] || null;
  }

  // Method to get quarantine stats
  getQuarantineStats(): { total: number; recent: number } {
    try {
      const files = fs
        .readdirSync(this.config.quarantineDir)
        .filter((f) => f.endsWith(".metadata.json"));

      const recent = files.filter((f) => {
        const metadataPath = path.join(this.config.quarantineDir, f);
        const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
        const quarantineTime = new Date(metadata.quarantineTime);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return quarantineTime > oneDayAgo;
      }).length;

      return { total: files.length, recent };
    } catch (error) {
      console.error("Error getting quarantine stats:", error);
      return { total: 0, recent: 0 };
    }
  }
}

// Security configuration - More permissive with advanced analysis
export const SECURITY_CONFIG: SecurityConfig = {
  maxFileSize: 1024 * 1024 * 1024, // 1GB (similar to Reddit)
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/bmp",
    "image/tiff",
    "image/svg+xml",
    "video/mp4",
    "video/webm",
    "video/quicktime", // .mov files
    "video/x-msvideo", // .avi files
    "video/x-ms-wmv", // .wmv files
    "audio/mpeg",
    "audio/wav",
    "audio/mp4", // .m4a files
    "audio/ogg",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "text/plain",
    "text/csv",
    "text/javascript",
    "text/css",
    "text/html",
    "application/json",
    "application/xml",
    "text/xml",
    // ZIP files - multiple MIME types
    "application/zip",
    "application/x-zip",
    "application/x-zip-compressed",
    "application/octet-stream", // Generic binary (used by some browsers for ZIP)
    // RAR and 7Z
    "application/x-rar-compressed",
    "application/vnd.rar", // Modern RAR MIME type
    "application/x-7z-compressed",
    // Development files
    "application/gzip",
    "application/x-tar",
  ],
  allowedExtensions: [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".bmp",
    ".tiff",
    ".svg",
    ".mp4",
    ".webm",
    ".mov",
    ".avi",
    ".wmv",
    ".m4a",
    ".mp3",
    ".wav",
    ".ogg",
    ".pdf",
    ".doc",
    ".docx",
    ".pptx",
    ".xlsx",
    ".txt",
    ".csv",
    ".js",
    ".css",
    ".html",
    ".htm",
    ".json",
    ".xml",
    ".md",
    ".zip",
    ".rar",
    ".7z",
    ".tar",
    ".gz",
  ],
  quarantineDir: path.join(process.cwd(), "quarantine"),
  safeDir: path.join(process.cwd(), "public", "secure-uploads"),
};
