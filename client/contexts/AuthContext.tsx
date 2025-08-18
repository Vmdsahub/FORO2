import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";
import { User, AuthResponse, ErrorResponse } from "@shared/auth";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string, captcha: string) => Promise<boolean>;
  register: (
    name: string,
    email: string,
    password: string,
    phone: string,
    birthDate: string,
    acceptTerms: boolean,
    acceptNewsletter: boolean,
    captcha: string,
  ) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    // Check if user is logged in on app start
    const token = localStorage.getItem("auth_token");
    if (token) {
      // Validate token and get user info
      fetchUserInfo(token);
    }
  }, []);

  const fetchUserInfo = async (token: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData: User = await response.json();
        setUser(userData);
      } else {
        // Token is invalid, remove it
        console.log("Token validation failed, status:", response.status);
        localStorage.removeItem("auth_token");
        setUser(null);
      }
    } catch (error) {
      console.error("Error fetching user info:", error);
      localStorage.removeItem("auth_token");
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (
    email: string,
    password: string,
    captcha: string,
  ): Promise<boolean> => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, captcha }),
      });

      if (response.ok) {
        const data: AuthResponse = await response.json();
        localStorage.setItem("auth_token", data.token);
        setUser(data.user);
        toast.success("Login realizado com sucesso!");
        return true;
      }

      // Handle error responses - check status and show appropriate message
      if (response.status === 401) {
        // For 401 status, we know the server is sending the specific message
        try {
          const errorData = await response.json();
          toast.error(errorData?.message || "Credenciais inválidas");
        } catch {
          // If JSON parsing fails for 401, show our custom message
          toast.error("Ops, parece que essa conta não existe!");
        }
      } else {
        toast.error("Erro ao fazer login");
      }

      return false;
    } catch (networkError: any) {
      console.error("Network error:", networkError);

      // If it's a network error and we're dealing with login attempt,
      // check if it's likely a 401 response that failed to parse
      if (
        networkError.message?.includes("JSON") ||
        networkError.message?.includes("stream")
      ) {
        toast.error("Ops, parece que essa conta não existe!");
      } else {
        toast.error("Erro de conexão. Tente novamente.");
      }

      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    phone: string,
    birthDate: string,
    acceptTerms: boolean,
    acceptNewsletter: boolean,
    captcha: string,
  ): Promise<boolean> => {
    console.log("[REGISTER] Starting registration...", { name, email });
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          phone,
          birthDate,
          acceptTerms,
          acceptNewsletter,
          captcha,
        }),
      });

      console.log("[REGISTER] Response received, status:", response.status);

      if (response.ok) {
        console.log("[REGISTER] Success response");
        const data = await response.json();
        localStorage.setItem("auth_token", data.token);
        setUser(data.user);
        toast.success("Conta criada com sucesso!");
        return true;
      } else {
        console.log("[REGISTER] Error response, status:", response.status);
        let errorMessage = "Erro ao criar conta";

        try {
          const errorData = await response.json();
          if (errorData?.message) {
            errorMessage = errorData.message;
          } else if (response.status === 409) {
            errorMessage = "Esta conta já existe";
          } else if (response.status === 400) {
            errorMessage = "Dados inválidos. Verifique os campos";
          } else {
            errorMessage = `Erro HTTP ${response.status}`;
          }
        } catch {
          if (response.status === 409) {
            errorMessage = "Esta conta já existe";
          } else if (response.status === 400) {
            errorMessage = "Dados inválidos. Verifique os campos";
          } else {
            errorMessage = `Erro HTTP ${response.status}`;
          }
        }

        console.log("[REGISTER] Final error message:", errorMessage);
        toast.error(errorMessage);
        return false;
      }
    } catch (networkError) {
      console.error("[REGISTER] Network or other error:", networkError);
      toast.error("Erro de conexão. Tente novamente.");
      return false;
    } finally {
      console.log("[REGISTER] Setting loading to false");
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      if (token) {
        // Call server logout endpoint to invalidate token
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error("Error during logout:", error);
      // Continue with logout even if server call fails
    } finally {
      // Always clear local state
      localStorage.removeItem("auth_token");
      localStorage.removeItem("selected_theme"); // Limpar tema selecionado
      setUser(null);
      toast.success("Logout realizado com sucesso!");
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAdmin, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
