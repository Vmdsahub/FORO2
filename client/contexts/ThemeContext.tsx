import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export interface Theme {
  id: string;
  name: string;
  description: string;
  price: number;
  preview: string;
  cssClass: string;
  icon: string;
}

interface UserTheme {
  themeId: string;
  purchasedAt: string;
}

interface ThemeContextType {
  availableThemes: Theme[];
  userThemes: UserTheme[];
  currentTheme: string;
  userLikes: number;
  purchaseTheme: (themeId: string) => Promise<boolean>;
  applyTheme: (themeId: string) => void;
  fetchUserThemes: () => void;
  fetchUserLikes: () => void;
  refreshLikes: () => void; // Nova função para refresh global
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const AVAILABLE_THEMES: Theme[] = [
  {
    id: "dark",
    name: "Tema Noturno",
    description: "",
    price: 1,
    preview: "/api/images/theme-dark-preview.jpg",
    cssClass: "theme-dark",
    icon: "🌙",
  },
  {
    id: "glassmorphism-liquid",
    name: "Glassmorphism Liquid",
    description:
      "Tema avançado com efeitos de vidro líquido, refração e distorção",
    price: 1,
    preview: "/api/images/theme-glass-preview.jpg",
    cssClass: "theme-glassmorphism-liquid",
    icon: "💎",
  },
  // Futuros temas podem ser adicionados aqui
];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = useAuth();

  // Filtrar temas baseado no status de admin
  const getAvailableThemes = (): Theme[] => {
    if (isAdmin) {
      return AVAILABLE_THEMES; // Admin vê todos os temas
    }
    // Usuários normais não veem o glassmorphism-liquid
    return AVAILABLE_THEMES.filter(
      (theme) => theme.id !== "glassmorphism-liquid",
    );
  };

  const [availableThemes, setAvailableThemes] =
    useState<Theme[]>(getAvailableThemes());
  const [userThemes, setUserThemes] = useState<UserTheme[]>([]);
  const [currentTheme, setCurrentTheme] = useState<string>("default");
  const [userLikes, setUserLikes] = useState<number>(0);

  // Garantir que nunca haja tema aplicado inicialmente
  useEffect(() => {
    document.body.classList.remove("theme-dark", "theme-glassmorphism-liquid");
  }, []);

  // Atualizar temas disponíveis quando status admin mudar
  useEffect(() => {
    setAvailableThemes(getAvailableThemes());
  }, [isAdmin]);

  // Carregar dados do usuário quando logado
  useEffect(() => {
    if (user) {
      fetchUserThemes();
      fetchUserLikes();

      // Carregar tema salvo apenas se existir e for válido
      const savedTheme = localStorage.getItem("selected_theme");
      if (savedTheme && savedTheme !== "default") {
        // Verificar se o tema ainda está disponível para o usuário
        const availableThemeIds = getAvailableThemes().map((t) => t.id);
        if (availableThemeIds.includes(savedTheme)) {
          setCurrentTheme(savedTheme);
          if (savedTheme === "dark") {
            document.body.classList.add("theme-dark");
          } else if (savedTheme === "glassmorphism-liquid") {
            document.body.classList.add("theme-glassmorphism-liquid");
          }
        } else {
          // Tema não disponível para este usuário, voltar ao padrão
          setCurrentTheme("default");
          document.body.classList.remove(
            "theme-dark",
            "theme-glassmorphism-liquid",
          );
          localStorage.removeItem("selected_theme");
        }
      }
    } else {
      // Usuário deslogado: limpar tudo
      setCurrentTheme("default");
      document.body.classList.remove(
        "theme-dark",
        "theme-glassmorphism-liquid",
      );
      localStorage.removeItem("selected_theme");
    }
  }, [user, isAdmin]);


  const fetchUserThemes = async () => {
    if (!user) return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort(new DOMException("Request timeout", "TimeoutError"));
      }, 5000);

      const response = await fetch("/api/user/themes", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setUserThemes(data.themes || []);
      } else {
        console.warn("User themes service unavailable");
        setUserThemes([]); // Set empty array as fallback
      }
    } catch (error: any) {
      if (error.name === "AbortError" || error.name === "TimeoutError") {
        console.warn("User themes request timed out");
      } else {
        console.warn("User themes service unavailable:", error.message);
      }
      setUserThemes([]); // Set empty array as fallback
    }
  };

  const fetchUserLikes = async () => {
    if (!user) return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort(new DOMException("Request timeout", "TimeoutError"));
      }, 5000);

      const response = await fetch("/api/user/likes", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setUserLikes(data.totalLikes || 0);
      } else {
        console.warn("User likes service unavailable");
        setUserLikes(0); // Set 0 as fallback
      }
    } catch (error: any) {
      if (error.name === "AbortError" || error.name === "TimeoutError") {
        console.warn("User likes request timed out");
      } else {
        console.warn("User likes service unavailable:", error.message);
      }
      setUserLikes(0); // Set 0 as fallback
    }
  };

  const purchaseTheme = async (themeId: string): Promise<boolean> => {
    if (!user) return false;

    const theme = availableThemes.find((t) => t.id === themeId);
    if (!theme) return false;

    if (userLikes < theme.price) {
      return false; // Likes insuficientes
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort(
          new DOMException("Purchase request timeout", "TimeoutError"),
        );
      }, 10000);

      const response = await fetch("/api/user/themes/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify({ themeId }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setUserLikes(data.remainingLikes);
        setUserThemes((prev) => [
          ...prev,
          { themeId, purchasedAt: new Date().toISOString() },
        ]);
        return true;
      }
    } catch (error: any) {
      if (error.name === "AbortError" || error.name === "TimeoutError") {
        console.error("Purchase request timeout:", error.message);
      } else {
        console.error("Error purchasing theme:", error.message);
      }
    }

    return false;
  };

  const applyTheme = (themeId: string) => {
    if (!user) return;

    setCurrentTheme(themeId);

    // Remover qualquer classe de tema
    document.body.classList.remove("theme-dark", "theme-glassmorphism-liquid");

    if (themeId === "default") {
      // Tema padrão: remover do localStorage
      localStorage.removeItem("selected_theme");
    } else {
      // Tema específico: salvar e aplicar
      localStorage.setItem("selected_theme", themeId);
      if (themeId === "dark") {
        document.body.classList.add("theme-dark");
      } else if (themeId === "glassmorphism-liquid") {
        document.body.classList.add("theme-glassmorphism-liquid");
      }
    }
  };

  const refreshLikes = () => {
    fetchUserLikes();
  };

  // Event listeners for like updates - placed after function declarations
  useEffect(() => {
    const handleRefresh = () => {
      fetchUserLikes();
    };

    const handleLikeUpdate = () => {
      fetchUserLikes();
    };

    window.addEventListener("refreshUserLikes", handleRefresh);
    window.addEventListener("userLikeUpdate", handleLikeUpdate);
    return () => {
      window.removeEventListener("refreshUserLikes", handleRefresh);
      window.removeEventListener("userLikeUpdate", handleLikeUpdate);
    };
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        availableThemes,
        userThemes,
        currentTheme,
        userLikes,
        purchaseTheme,
        applyTheme,
        fetchUserThemes,
        fetchUserLikes,
        refreshLikes,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
