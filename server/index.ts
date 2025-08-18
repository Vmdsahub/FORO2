import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { handleDemo } from "./routes/demo";
import {
  handleLogin,
  handleRegister,
  handleMe,
  handleLogout,
  authenticateToken,
  optionalAuthenticateToken,
  checkUsername,
  checkEmail,
  checkPhone,
} from "./routes/auth";
import {
  handleGetTopics,
  handleGetTopic,
  handleCreateTopic,
  handleCreateComment,
  handleLikeTopic,
  handleLikeComment,
  handleDeleteTopic,
  handleDeleteComment,
  handleGetUserTopics,
  handleGetCategoryStats,
} from "./routes/forum";
import { uploadMiddleware, handleUpload } from "./routes/upload";
import {
  handleGetUserStats,
  handleGetAllBadges,
  handleGetUserProfile,
} from "./routes/user-stats-final";
import {
  handleSaveBadgeSelection,
  handleGetBadgeSelection,
  handleGetUserBadgeSelection,
} from "./routes/user-badge-selection";
import {
  getComments,
  createComment,
  likeComment,
  deleteComment,
  initializeDemo,
} from "./routes/simple-comments";
import {
  handleCreateArticle,
  handleGetArticles,
  handleDeleteArticle,
} from "./routes/newsletter";
import {
  getCategoryIcons,
  updateCategoryIcon,
  removeCategoryIcon,
} from "./routes/category-icons";
import { getUserThemes, getUserLikes, purchaseTheme } from "./routes/themes";
import {
  secureUploadMiddleware,
  handleSecureUpload,
  handleSecureFileServe,
  handleUploadStats,
  handleFileVerification,
  handleQuarantineManagement,
} from "./routes/secure-upload";
import {
  handleSecurityStats,
  handleSecurityLogs,
  handleSecurityAlerts,
  handleSecurityHealth,
  handleSecurityReport,
} from "./routes/security-logs";

export function createServer() {
  const app = express();

  // Inicializar dados demo do sistema de comentários
  initializeDemo();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Serve uploaded files
  app.use(
    "/uploads",
    express.static(path.join(process.cwd(), "public", "uploads")),
  );

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Authentication routes
  app.post("/api/auth/login", handleLogin);
  app.post("/api/auth/register", handleRegister);
  app.get("/api/auth/me", authenticateToken, handleMe);
  app.post("/api/auth/logout", authenticateToken, handleLogout);

  // Validation routes for real-time checking
  app.get("/api/auth/check-username/:username", checkUsername);
  app.get("/api/auth/check-email/:email", checkEmail);
  app.get("/api/auth/check-phone/:phone", checkPhone);

  // Forum routes
  app.get("/api/topics", optionalAuthenticateToken, handleGetTopics);
  app.get("/api/topics/user", authenticateToken, handleGetUserTopics);
  app.get("/api/categories/stats", handleGetCategoryStats);
  app.get("/api/topics/:topicId", optionalAuthenticateToken, handleGetTopic);
  app.post("/api/topics", authenticateToken, handleCreateTopic);
  // ROTAS ANTIGAS DE COMENTÁRIOS - TEMPORARIAMENTE DESABILITADAS
  // app.post(
  //   "/api/topics/:topicId/comments",
  //   authenticateToken,
  //   handleCreateComment,
  // );
  app.post("/api/topics/:topicId/like", authenticateToken, handleLikeTopic);
  // app.post(
  //   "/api/comments/:commentId/like",
  //   authenticateToken,
  //   handleLikeComment,
  // );

  // Admin routes
  app.delete("/api/topics/:topicId", authenticateToken, handleDeleteTopic);
  // app.delete(
  //   "/api/comments/:commentId",
  //   authenticateToken,
  //   handleDeleteComment,
  // );

  // Upload route
  app.post("/api/upload", authenticateToken, uploadMiddleware, handleUpload);

  // User stats routes
  app.get("/api/user/stats", authenticateToken, handleGetUserStats);
  app.get("/api/badges", handleGetAllBadges);
  app.get("/api/user/profile/:userId", handleGetUserProfile);

  // Badge selection routes
  app.post(
    "/api/user/badge-selection",
    authenticateToken,
    handleSaveBadgeSelection,
  );
  app.get(
    "/api/user/badge-selection",
    authenticateToken,
    handleGetBadgeSelection,
  );
  app.get("/api/user/badge-selection/:userId", handleGetUserBadgeSelection);

  // Novo sistema de comentários - ANTES das rotas antigas para evitar conflito
  app.get("/api/comments/:topicId", optionalAuthenticateToken, getComments);
  app.post("/api/comments/:topicId", authenticateToken, createComment);
  app.post("/api/comments/:commentId/like", authenticateToken, likeComment);
  app.delete("/api/comments/:commentId", authenticateToken, deleteComment);

  // Newsletter routes
  app.get("/api/newsletter/articles", handleGetArticles);
  app.post("/api/newsletter/articles", authenticateToken, handleCreateArticle);
  app.delete(
    "/api/newsletter/articles/:articleId",
    authenticateToken,
    handleDeleteArticle,
  );

  // Category icons routes
  app.get("/api/category-icons", getCategoryIcons);
  app.post("/api/category-icons", authenticateToken, updateCategoryIcon);
  app.delete(
    "/api/category-icons/:categoryId",
    authenticateToken,
    removeCategoryIcon,
  );

  // Theme routes
  app.get("/api/user/themes", authenticateToken, getUserThemes);
  app.get("/api/user/likes", authenticateToken, getUserLikes);
  app.post("/api/user/themes/purchase", authenticateToken, purchaseTheme);

  // Secure upload routes (replaces Uploadcare)
  app.post(
    "/api/secure-upload",
    secureUploadMiddleware.single("file"),
    handleSecureUpload,
  );
  app.get("/api/secure-files/:filename", handleSecureFileServe);
  app.get("/api/upload-stats", handleUploadStats);
  app.get("/api/verify-file/:hash", handleFileVerification);
  app.post("/api/quarantine-management", handleQuarantineManagement);

  // Security logs and monitoring routes
  app.get("/api/security/stats", handleSecurityStats);
  app.get("/api/security/logs", handleSecurityLogs);
  app.get("/api/security/alerts", handleSecurityAlerts);
  app.get("/api/security/health", handleSecurityHealth);
  app.get("/api/security/report", handleSecurityReport);

  return app;
}
