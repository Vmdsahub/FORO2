import { useState, useEffect } from "react";

interface CategoryStats {
  totalTopics: number;
  totalPosts: number;
  lastPost?: {
    title: string;
    author: string;
    date: string;
    time: string;
  };
}

interface CategoryStatsResponse {
  categories: {
    [key: string]: CategoryStats;
  };
}

export function useCategoryStats() {
  const [categoryStats, setCategoryStats] =
    useState<CategoryStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategoryStats = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const response = await fetch("/api/categories/stats", {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setCategoryStats(data);
      } else {
        console.warn("Category stats service unavailable, using defaults");
        setCategoryStats({ categories: {} }); // Use empty stats as fallback
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.warn("Category stats service unavailable, using defaults");
      }
      setCategoryStats({ categories: {} }); // Use empty stats as fallback
      setError(null); // Don't show error to user for optional feature
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Add small delay to prevent simultaneous requests on initial load
    const timer = setTimeout(() => {
      fetchCategoryStats();
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  const refreshStats = () => {
    fetchCategoryStats();
  };

  return {
    categoryStats: categoryStats?.categories || {},
    isLoading,
    error,
    refreshStats,
  };
}
