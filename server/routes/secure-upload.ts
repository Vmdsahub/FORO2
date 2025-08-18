import { RequestHandler } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  AdvancedFileValidator,
  SECURITY_CONFIG,
} from "../security/fileValidator";
import {
  securityLogger,
  SecurityLogLevel,
  SecurityEventType,
} from "../security/logger";
import { v4 as uuidv4 } from "uuid";

// Initialize the file validator
const fileValidator = new AdvancedFileValidator(SECURITY_CONFIG);

// Configure multer for temporary uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.join(process.cwd(), "temp-uploads");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename for temp storage
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

export const secureUploadMiddleware = multer({
  storage,
  limits: {
    fileSize: SECURITY_CONFIG.maxFileSize,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    // Basic pre-upload validation
    const ext = path.extname(file.originalname).toLowerCase();

    if (!SECURITY_CONFIG.allowedExtensions.includes(ext)) {
      return cb(new Error(`File extension ${ext} not allowed`));
    }

    if (
      !file.mimetype ||
      !SECURITY_CONFIG.allowedMimeTypes.includes(file.mimetype)
    ) {
      return cb(new Error(`MIME type ${file.mimetype} not allowed`));
    }

    cb(null, true);
  },
});

// Secure file upload endpoint
export const handleSecureUpload: RequestHandler = async (req, res) => {
  const userId = (req as any).user?.id || "anonymous";
  const userAgent = req.headers["user-agent"] || "unknown";
  const clientIp = req.ip || req.connection.remoteAddress || "unknown";

  try {
    if (!req.file) {
      securityLogger.logSuspiciousActivity(
        "Upload attempt without file",
        { endpoint: "/api/secure-upload" },
        userId,
        clientIp,
      );

      return res.status(400).json({
        success: false,
        error: "No file provided",
      });
    }

    // Log file upload attempt
    securityLogger.logFileUpload(
      userId,
      req.file.originalname,
      req.file.size,
      clientIp,
      userAgent,
    );

    console.log(
      `[SECURE UPLOAD] Processing file: ${req.file.originalname}, size: ${req.file.size}`,
    );

    // Validate the uploaded file
    const validationResult = await fileValidator.validateFile(
      req.file.path,
      req.file.originalname,
    );

    // Clean up temp file
    const cleanupTempFile = () => {
      if (fs.existsSync(req.file!.path)) {
        fs.unlinkSync(req.file!.path);
      }
    };

    // Log validation result
    securityLogger.logFileValidation(
      req.file.originalname,
      validationResult.hash,
      validationResult.isValid,
      validationResult.reasons,
    );

    if (!validationResult.isValid) {
      cleanupTempFile();

      // Log quarantine if applicable
      if (validationResult.quarantined) {
        securityLogger.logFileQuarantine(
          req.file.originalname,
          validationResult.hash,
          validationResult.reasons,
          userId,
        );
      }

      // Check for potential malware indicators
      const malwareIndicators = validationResult.reasons.filter(
        (reason) =>
          reason.toLowerCase().includes("executable") ||
          reason.toLowerCase().includes("script") ||
          reason.toLowerCase().includes("macro") ||
          reason.toLowerCase().includes("malicious"),
      );

      if (malwareIndicators.length > 0) {
        securityLogger.logMalwareDetected(
          req.file.originalname,
          validationResult.hash,
          malwareIndicators.join(", "),
          userId,
        );
      }

      console.log(
        `[SECURITY] File rejected: ${req.file.originalname}, reasons: ${validationResult.reasons.join(", ")}`,
      );

      return res.status(400).json({
        success: false,
        error: "File failed security validation",
        reasons: validationResult.reasons,
        quarantined: validationResult.quarantined,
      });
    }

    // Move file to safe directory
    const safeFileName = `${uuidv4()}-${validationResult.sanitizedName}`;
    const safePath = path.join(SECURITY_CONFIG.safeDir, safeFileName);

    // Ensure safe directory exists
    if (!fs.existsSync(SECURITY_CONFIG.safeDir)) {
      fs.mkdirSync(SECURITY_CONFIG.safeDir, { recursive: true });
    }

    fs.renameSync(req.file.path, safePath);

    // Generate secure URL
    const fileUrl = `/api/secure-files/${safeFileName}`;

    // Log successful upload
    console.log(
      `[SECURE UPLOAD] File saved: ${safeFileName}, hash: ${validationResult.hash}`,
    );

    securityLogger.log(
      SecurityLogLevel.INFO,
      SecurityEventType.FILE_UPLOAD,
      `File successfully uploaded and validated: ${req.file.originalname}`,
      {
        userId,
        fileName: req.file.originalname,
        fileHash: validationResult.hash,
        fileSize: validationResult.size,
        mimeType: validationResult.detectedMimeType || req.file.mimetype,
        ip: clientIp,
        action: "APPROVED",
      },
      2,
    );

    // Save file metadata
    const metadata = {
      originalName: req.file.originalname,
      safeFileName,
      hash: validationResult.hash,
      size: validationResult.size,
      mimeType: validationResult.detectedMimeType || req.file.mimetype,
      uploadTime: new Date().toISOString(),
      uploadedBy: userId,
      uploadIp: clientIp,
      userAgent,
      validationResult,
    };

    const metadataPath = path.join(
      SECURITY_CONFIG.safeDir,
      `${safeFileName}.metadata.json`,
    );
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    res.json({
      success: true,
      file: {
        id: safeFileName,
        url: fileUrl,
        originalName: req.file.originalname,
        size: validationResult.size,
        mimeType: validationResult.detectedMimeType || req.file.mimetype,
        hash: validationResult.hash,
        isImage: isImageFile(req.file.originalname),
        uploadTime: metadata.uploadTime,
      },
    });
  } catch (error) {
    console.error("[SECURE UPLOAD] Error:", error);

    // Clean up temp file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      error: "Upload processing failed",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Secure file serving endpoint
export const handleSecureFileServe: RequestHandler = (req, res) => {
  const clientIp = req.ip || req.connection.remoteAddress || "unknown";
  const userAgent = req.headers["user-agent"] || "unknown";

  try {
    const { filename } = req.params;

    // Validate filename to prevent directory traversal
    if (
      !filename ||
      filename.includes("..") ||
      filename.includes("/") ||
      filename.includes("\\")
    ) {
      securityLogger.logSuspiciousActivity(
        "Directory traversal attempt in file access",
        {
          filename,
          endpoint: "/api/secure-files",
          attemptedPath: filename,
        },
        undefined,
        clientIp,
      );

      return res.status(400).json({ error: "Invalid filename" });
    }

    const filePath = path.join(SECURITY_CONFIG.safeDir, filename);
    const metadataPath = path.join(
      SECURITY_CONFIG.safeDir,
      `${filename}.metadata.json`,
    );

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      securityLogger.logAccessAttempt(
        `secure-file:${filename}`,
        false,
        undefined,
        clientIp,
        userAgent,
      );

      return res.status(404).json({ error: "File not found" });
    }

    // Load metadata if available
    let metadata = null;
    if (fs.existsSync(metadataPath)) {
      try {
        metadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
      } catch (error) {
        console.warn("[SECURE SERVE] Could not load metadata for:", filename);
      }
    }

    // Set appropriate headers
    if (metadata) {
      res.setHeader("Content-Type", metadata.mimeType);
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${metadata.originalName}"`,
      );
    }

    // Set security headers
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Content-Security-Policy", "default-src 'none'");

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    console.log(`[SECURE SERVE] File served: ${filename}`);

    securityLogger.logAccessAttempt(
      `secure-file:${filename}`,
      true,
      undefined,
      clientIp,
      userAgent,
    );
  } catch (error) {
    console.error("[SECURE SERVE] Error:", error);
    res.status(500).json({ error: "File serving failed" });
  }
};

// Get upload statistics
export const handleUploadStats: RequestHandler = (req, res) => {
  try {
    const quarantineStats = fileValidator.getQuarantineStats();

    // Count safe files
    const safeFiles = fs.existsSync(SECURITY_CONFIG.safeDir)
      ? fs
          .readdirSync(SECURITY_CONFIG.safeDir)
          .filter((f) => !f.endsWith(".metadata.json")).length
      : 0;

    res.json({
      success: true,
      stats: {
        safeFiles,
        quarantined: quarantineStats,
        configuration: {
          maxFileSize: SECURITY_CONFIG.maxFileSize,
          allowedExtensions: SECURITY_CONFIG.allowedExtensions,
          allowedMimeTypes: SECURITY_CONFIG.allowedMimeTypes,
        },
      },
    });
  } catch (error) {
    console.error("[UPLOAD STATS] Error:", error);
    res.status(500).json({ error: "Could not get upload statistics" });
  }
};

// File verification endpoint
export const handleFileVerification: RequestHandler = async (req, res) => {
  try {
    const { hash } = req.params;

    if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) {
      return res.status(400).json({ error: "Invalid hash format" });
    }

    // Search for file with this hash
    const safeDir = SECURITY_CONFIG.safeDir;
    if (!fs.existsSync(safeDir)) {
      return res.status(404).json({ error: "File not found" });
    }

    const metadataFiles = fs
      .readdirSync(safeDir)
      .filter((f) => f.endsWith(".metadata.json"));

    for (const metadataFile of metadataFiles) {
      const metadataPath = path.join(safeDir, metadataFile);
      try {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));

        if (metadata.hash === hash) {
          res.json({
            success: true,
            verified: true,
            file: {
              originalName: metadata.originalName,
              size: metadata.size,
              mimeType: metadata.mimeType,
              uploadTime: metadata.uploadTime,
              hash: metadata.hash,
              status: "safe",
            },
          });
          return;
        }
      } catch (error) {
        console.warn("[VERIFY] Could not parse metadata:", metadataFile);
      }
    }

    // Check quarantine
    const quarantineDir = SECURITY_CONFIG.quarantineDir;
    if (fs.existsSync(quarantineDir)) {
      const quarantineMetadataPath = path.join(
        quarantineDir,
        `${hash}.metadata.json`,
      );
      if (fs.existsSync(quarantineMetadataPath)) {
        const metadata = JSON.parse(
          fs.readFileSync(quarantineMetadataPath, "utf-8"),
        );

        res.json({
          success: true,
          verified: true,
          file: {
            hash: metadata.hash,
            status: "quarantined",
            reasons: metadata.reasons,
            quarantineTime: metadata.quarantineTime,
          },
        });
        return;
      }
    }

    res.status(404).json({
      success: false,
      verified: false,
      error: "File not found in system",
    });
  } catch (error) {
    console.error("[VERIFY] Error:", error);
    res.status(500).json({ error: "Verification failed" });
  }
};

// Admin endpoint to manage quarantined files
export const handleQuarantineManagement: RequestHandler = (req, res) => {
  try {
    // This would typically require admin authentication
    const { action, hash } = req.body;

    if (action === "list") {
      const quarantineDir = SECURITY_CONFIG.quarantineDir;
      if (!fs.existsSync(quarantineDir)) {
        return res.json({ success: true, quarantined: [] });
      }

      const quarantinedFiles = fs
        .readdirSync(quarantineDir)
        .filter((f) => f.endsWith(".metadata.json"))
        .map((f) => {
          const metadataPath = path.join(quarantineDir, f);
          try {
            return JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      res.json({ success: true, quarantined: quarantinedFiles });
    } else {
      res.status(400).json({ error: "Invalid action" });
    }
  } catch (error) {
    console.error("[QUARANTINE MGMT] Error:", error);
    res.status(500).json({ error: "Quarantine management failed" });
  }
};

// Helper function
function isImageFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"].includes(ext);
}

// UUID dependency (add to package.json if not present)
// npm install uuid @types/uuid
