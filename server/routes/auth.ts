import { RequestHandler } from "express";
import { z } from "zod";
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  ErrorResponse,
  User,
} from "@shared/auth";

// Simple password hashing (use bcrypt in production)
function hashPassword(password: string): string {
  // This is not secure - use bcrypt or similar in production
  return Buffer.from(password).toString("base64");
}

// Avatar padrão - fotos de perfil aleatórias
const DEFAULT_AVATARS = [
  "https://cdn.builder.io/api/v1/image/assets%2F4339d2c6c4aa4bf4b61f03263843eb86%2F477cc7711bf64b4d94e766b55d18ca30?format=webp&width=800",
  "https://cdn.builder.io/api/v1/image/assets%2F4339d2c6c4aa4bf4b61f03263843eb86%2F3a88d03f86164e47b982a4e1e72380a2?format=webp&width=800",
  "https://cdn.builder.io/api/v1/image/assets%2F4339d2c6c4aa4bf4b61f03263843eb86%2F6dcd5f5eb7214b0f8018d668c517123d?format=webp&width=800",
  "https://cdn.builder.io/api/v1/image/assets%2F4339d2c6c4aa4bf4b61f03263843eb86%2F1b6ba24486b4431bab6f7012645c0a61?format=webp&width=800",
  "https://cdn.builder.io/api/v1/image/assets%2F4339d2c6c4aa4bf4b61f03263843eb86%2F40c3e177f2e64d8ca305e2adfcc1a693?format=webp&width=800",
  "https://cdn.builder.io/api/v1/image/assets%2F4339d2c6c4aa4bf4b61f03263843eb86%2F554fd210b6d1444b8def1042ce46dfda?format=webp&width=800",
  "https://cdn.builder.io/api/v1/image/assets%2F4339d2c6c4aa4bf4b61f03263843eb86%2F12ef023c28914c699497d5e169a631c3?format=webp&width=800",
  "https://cdn.builder.io/api/v1/image/assets%2F4339d2c6c4aa4bf4b61f03263843eb86%2F8b93635144674ca9ad3fa486245b728d?format=webp&width=800",
];

// Função para selecionar avatar aleatório
function getRandomAvatar(): string {
  const randomIndex = Math.floor(Math.random() * DEFAULT_AVATARS.length);
  return DEFAULT_AVATARS[randomIndex];
}

// Simple in-memory storage for demo purposes
// In production, use a proper database
const users: Map<
  string,
  {
    id: string;
    name: string;
    email: string;
    password: string;
    role?: "admin" | "user";
    emailConfirmed?: boolean;
    phone?: string;
    birthDate?: string;
    acceptNewsletter?: boolean;
    avatar?: string;
  }
> = new Map();
const tokens: Map<string, string> = new Map(); // token -> userId

// Add a demo user for testing
const demoUserId = "demo_user_123";
users.set(demoUserId, {
  id: demoUserId,
  name: "João Silva",
  email: "demo@exemplo.com",
  password: hashPassword("123456"), // password: 123456
  role: "user",
  emailConfirmed: true, // Demo user has confirmed email
  avatar: DEFAULT_AVATARS[0], // Primeiro avatar para o usuário demo
});

// Add admin user Vitoca
const adminUserId = "admin_vitoca_456";
users.set(adminUserId, {
  id: adminUserId,
  name: "Vitoca",
  email: "vitoca@admin.com",
  password: hashPassword("admin123"), // password: admin123
  role: "admin",
  emailConfirmed: true, // Admin has confirmed email
  avatar: DEFAULT_AVATARS[4], // Quinto avatar para o admin
});

// Validation schemas
const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  captcha: z.string().min(1, "Captcha é obrigatório"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z
    .string()
    .min(8, "Senha deve ter pelo menos 8 caracteres")
    .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula"),
  phone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
  birthDate: z.string().min(1, "Data de nascimento é obrigatória"),
  acceptTerms: z
    .boolean()
    .refine((val) => val === true, "Você deve aceitar os termos de condições"),
  acceptNewsletter: z.boolean().optional(),
  captcha: z.string().min(1, "Captcha é obrigatório"),
});

// Simple token generation
function generateToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function verifyPassword(password: string, hash: string): boolean {
  return Buffer.from(password).toString("base64") === hash;
}

// Middleware to verify authentication
export const authenticateToken: RequestHandler = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Token de acesso requerido" });
  }

  const userId = tokens.get(token);
  if (!userId) {
    return res.status(403).json({ message: "Token inválido" });
  }

  const user = users.get(userId);
  if (!user) {
    return res.status(403).json({ message: "Usuário não encontrado" });
  }

  req.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || "user",
    avatar: user.avatar,
  };

  next();
};

// Optional authentication middleware - allows access with or without token
export const optionalAuthenticateToken: RequestHandler = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    // No token provided - continue without user
    req.user = undefined;
    return next();
  }

  const userId = tokens.get(token);
  if (!userId) {
    // Invalid token - continue without user
    req.user = undefined;
    return next();
  }

  const user = users.get(userId);
  if (!user) {
    // User not found - continue without user
    req.user = undefined;
    return next();
  }

  // Valid token and user - attach user to request
  req.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || "user",
    avatar: user.avatar,
  };
  next();
};

export const handleLogin: RequestHandler = (req, res) => {
  try {
    console.log("[LOGIN] Request received:", { email: req.body.email });
    const { email, password, captcha } = loginSchema.parse(req.body);

    // For demo purposes, we don't validate captcha server-side
    // In production, you would validate the captcha here

    // Find user by email
    const user = Array.from(users.values()).find((u) => u.email === email);
    console.log("[LOGIN] User found:", !!user);

    if (!user) {
      console.log("[LOGIN] User not found, sending error message");
      return res.status(401).json({
        message: "Ops, parece que essa conta não existe!",
      } as ErrorResponse);
    }

    if (!verifyPassword(password, user.password)) {
      return res.status(401).json({
        message: "Email ou senha incorretos",
      } as ErrorResponse);
    }

    // Check if email is confirmed (only for new users, demo users are automatically confirmed)
    if (user.emailConfirmed === false) {
      return res.status(403).json({
        message:
          "Confirme seu email antes de fazer login. Verifique sua caixa de entrada.",
      } as ErrorResponse);
    }

    // Generate token
    const token = generateToken();
    tokens.set(token, user.id);

    const response: AuthResponse = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || "user",
        avatar: user.avatar,
      },
      token,
    };

    res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Dados inválidos",
        errors: error.errors.map((e) => e.message),
      } as ErrorResponse);
    }

    console.error("Login error:", error);
    res.status(500).json({
      message: "Erro interno do servidor",
    } as ErrorResponse);
  }
};

export const handleRegister: RequestHandler = (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      birthDate,
      acceptTerms,
      acceptNewsletter,
      captcha,
    } = registerSchema.parse(req.body);

    // For demo purposes, we don't validate captcha server-side
    // In production, you would validate the captcha here

    // Check if email already exists
    const existingEmailUser = Array.from(users.values()).find(
      (u) => u.email === email,
    );
    if (existingEmailUser) {
      return res.status(409).json({
        message: "Essa conta j�� existe, faça login",
      } as ErrorResponse);
    }

    // Check if username already exists
    const existingNameUser = Array.from(users.values()).find(
      (u) => u.name === name,
    );
    if (existingNameUser) {
      return res.status(409).json({
        message: "Nome de usuário já está em uso",
      } as ErrorResponse);
    }

    // Check if phone already exists
    const cleanPhone = phone.replace(/\D/g, "");
    const existingPhoneUser = Array.from(users.values()).find(
      (u) => u.phone && u.phone.replace(/\D/g, "") === cleanPhone,
    );
    if (existingPhoneUser) {
      return res.status(409).json({
        message: "Telefone já está em uso",
      } as ErrorResponse);
    }

    // Create new user
    const userId =
      "user_" + Date.now() + "_" + Math.random().toString(36).substring(2);
    const newUser = {
      id: userId,
      name,
      email,
      phone,
      birthDate,
      password: hashPassword(password),
      role: "user" as const,
      emailConfirmed: true, // For demo purposes, auto-confirm email
      acceptNewsletter: acceptNewsletter || false,
      avatar: getRandomAvatar(), // Atribui avatar aleatório
    };

    users.set(userId, newUser);

    // Generate token
    const token = generateToken();
    tokens.set(token, userId);

    const response: AuthResponse = {
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        avatar: newUser.avatar,
      },
      token,
    };

    res.status(201).json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0]?.message || "Dados inválidos";
      return res.status(400).json({
        message: firstError,
        errors: error.errors.map((e) => e.message),
      } as ErrorResponse);
    }

    console.error("Register error:", error);
    res.status(500).json({
      message: "Erro interno do servidor",
    } as ErrorResponse);
  }
};

export const handleMe: RequestHandler = (req, res) => {
  // This will only be called if authenticateToken middleware passes
  res.json(req.user);
};

export const handleLogout: RequestHandler = (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token) {
    tokens.delete(token);
  }

  res.json({ message: "Logout realizado com sucesso" });
};

// Check if username exists
export const checkUsername: RequestHandler = (req, res) => {
  const { username } = req.params;

  if (!username || username.length < 2) {
    return res.json({
      available: false,
      message: "Nome de usuário deve ter pelo menos 2 caracteres",
    });
  }

  const existingUser = Array.from(users.values()).find(
    (u) => u.name.toLowerCase() === username.toLowerCase(),
  );

  res.json({
    available: !existingUser,
    message: existingUser
      ? "Nome de usuário já está em uso"
      : "Nome de usuário disponível",
  });
};

// Check if email exists
export const checkEmail: RequestHandler = (req, res) => {
  const { email } = req.params;

  if (!email || !email.includes("@")) {
    return res.json({ available: false, message: "Email inválido" });
  }

  const existingUser = Array.from(users.values()).find(
    (u) => u.email.toLowerCase() === email.toLowerCase(),
  );

  res.json({
    available: !existingUser,
    message: existingUser ? "Email já está em uso" : "Email disponível",
  });
};

// Check if phone exists
export const checkPhone: RequestHandler = (req, res) => {
  const { phone } = req.params;

  // Remove formatting to check just numbers
  const cleanPhone = phone.replace(/\D/g, "");

  if (!cleanPhone || cleanPhone.length < 10) {
    return res.json({
      available: false,
      message: "Telefone deve ter pelo menos 10 dígitos",
    });
  }

  const existingUser = Array.from(users.values()).find(
    (u) => u.phone && u.phone.replace(/\D/g, "") === cleanPhone,
  );

  res.json({
    available: !existingUser,
    message: existingUser ? "Telefone já está em uso" : "Telefone disponível",
  });
};

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
