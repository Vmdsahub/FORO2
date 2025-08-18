import { useState, useEffect, useCallback, useMemo } from "react";
import {
  WeeklyNewsletter,
  getAllWeeks,
  getCurrentWeekIndex,
  clearWeeksCache,
} from "@/utils/weekSystem";

interface UseSimpleWeekNavigationProps {
  isAdmin?: boolean;
  isVitoca?: boolean; // Identifica se é o admin Vitoca especificamente
  articlesData?: any; // Dados de artigos vindos da API
}

export function useSimpleWeekNavigation({
  isAdmin = false,
  isVitoca = false,
  articlesData,
}: UseSimpleWeekNavigationProps) {
  // Obter todas as semanas disponíveis (2025-2030) - memoizado para evitar recálculo
  const allWeeks = useMemo(() => {
    // Limpar cache apenas uma vez se for desenvolvimento
    if (process.env.NODE_ENV === "development") {
      clearWeeksCache();
    }
    return getAllWeeks();
  }, []); // Sem dependências para garantir que seja calculado apenas uma vez

  // Estado para a semana atual sendo exibida
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);

  // Estado para semanas com conteúdo (merge com dados da API)
  const [weeksWithContent, setWeeksWithContent] = useState<WeeklyNewsletter[]>(
    [],
  );

  // Inicialização: determinar semana atual baseada na data real
  useEffect(() => {
    const realCurrentWeekIndex = getCurrentWeekIndex(allWeeks);
    setCurrentWeekIndex(realCurrentWeekIndex);

    console.log("✅ Sistema de navegação de semanas inicializado:", {
      totalWeeks: allWeeks.length,
      currentWeekIndex: realCurrentWeekIndex,
      currentWeek: allWeeks[realCurrentWeekIndex],
      isAdmin,
      date: new Date().toLocaleDateString("pt-BR"),
    });
  }, [allWeeks.length, isAdmin]); // Usando length em vez do array completo

  // Merge dos dados da API com as semanas geradas
  useEffect(() => {
    console.log("🔄 Fazendo merge de dados da newsletter:", {
      articlesData,
      hasWeeklyNewsletters: !!articlesData?.weeklyNewsletters,
      weeklyNewslettersCount: articlesData?.weeklyNewsletters?.length || 0,
      allWeeksCount: allWeeks.length,
    });

    const mergedWeeks = allWeeks.map((week) => {
      // Procurar se existe conteúdo para esta semana nos dados da API
      if (articlesData?.weeklyNewsletters) {
        const apiWeek = articlesData.weeklyNewsletters.find((apiWeek: any) => {
          const matches =
            apiWeek.week === week.week &&
            (apiWeek.year === week.year || !apiWeek.year);

          if (matches) {
            console.log("📅 Conteúdo encontrado para semana:", {
              systemWeek: `${week.week}/${week.year}`,
              apiWeek: `${apiWeek.week}/${apiWeek.year || "sem ano"}`,
              topicsCount: apiWeek.topics?.length || 0,
            });
          }

          return matches;
        });

        if (apiWeek) {
          return {
            ...week,
            topics: apiWeek.topics || [],
          };
        }
      }

      return week; // Retorna semana vazia se não há conteúdo
    });

    console.log("✅ Merge concluído:", {
      weeksWithContent: mergedWeeks.filter((w) => w.topics?.length > 0).length,
      totalWeeks: mergedWeeks.length,
    });

    setWeeksWithContent(mergedWeeks);
  }, [allWeeks.length, articlesData]); // Usando length em vez do array completo

  // Função de navegação com regras específicas
  const navigateWeek = useCallback(
    (direction: "prev" | "next") => {
      console.log("🧭 Navegando:", {
        direction,
        currentIndex: currentWeekIndex,
        isAdmin,
        isVitoca,
        totalWeeks: weeksWithContent.length,
      });

      if (direction === "prev") {
        // Ir para semanas mais antigas (índice maior)
        const nextIndex = currentWeekIndex + 1;

        if (nextIndex < weeksWithContent.length) {
          // Admin Vitoca pode navegar livremente
          if (isVitoca) {
            console.log("⬅️ Admin Vitoca navegando para semana anterior:", {
              from: `${weeksWithContent[currentWeekIndex]?.week}/${weeksWithContent[currentWeekIndex]?.year}`,
              to: `${weeksWithContent[nextIndex]?.week}/${weeksWithContent[nextIndex]?.year}`,
            });
            setCurrentWeekIndex(nextIndex);
          } else {
            // Usuário comum só pode voltar se a semana anterior tiver notícias
            const targetWeek = weeksWithContent[nextIndex];
            if (targetWeek?.topics?.length > 0) {
              console.log(
                "⬅️ Usuário navegando para semana anterior com conteúdo:",
                {
                  from: `${weeksWithContent[currentWeekIndex]?.week}/${weeksWithContent[currentWeekIndex]?.year}`,
                  to: `${targetWeek.week}/${targetWeek.year}`,
                  topicsCount: targetWeek.topics.length,
                },
              );
              setCurrentWeekIndex(nextIndex);
            } else {
              console.log(
                "⚠️ Usuário não pode navegar - semana anterior sem conteúdo",
              );
            }
          }
        } else {
          console.log("⚠️ Não é possível navegar mais para trás");
        }
      } else {
        // Ir para semanas mais recentes (índice menor)
        const nextIndex = currentWeekIndex - 1;

        if (nextIndex >= 0) {
          // Admin Vitoca pode navegar livremente
          if (isVitoca) {
            console.log("➡️ Admin Vitoca navegando para semana seguinte:", {
              from: `${weeksWithContent[currentWeekIndex]?.week}/${weeksWithContent[currentWeekIndex]?.year}`,
              to: `${weeksWithContent[nextIndex]?.week}/${weeksWithContent[nextIndex]?.year}`,
            });
            setCurrentWeekIndex(nextIndex);
          } else {
            // Usuário comum pode avançar até a semana atual (não além)
            const realCurrentWeekIndex = getCurrentWeekIndex(weeksWithContent);
            if (nextIndex >= realCurrentWeekIndex) {
              console.log(
                "➡️ Usuário navegando de volta para semana mais recente:",
                {
                  from: `${weeksWithContent[currentWeekIndex]?.week}/${weeksWithContent[currentWeekIndex]?.year}`,
                  to: `${weeksWithContent[nextIndex]?.week}/${weeksWithContent[nextIndex]?.year}`,
                  realCurrentWeekIndex,
                  nextIndex,
                },
              );
              setCurrentWeekIndex(nextIndex);
            } else {
              console.log("⚠️ Usuário não pode avançar além da semana atual");
            }
          }
        } else {
          console.log("⚠️ Não é possível navegar mais para frente");
        }
      }
    },
    [currentWeekIndex, weeksWithContent, isVitoca],
  );

  // Verificar se pode navegar para trás (semanas mais antigas)
  const canNavigatePrev = useCallback(() => {
    const nextIndex = currentWeekIndex + 1;

    // Admin Vitoca pode navegar livremente
    if (isVitoca) {
      return nextIndex < weeksWithContent.length;
    }

    // Usuário comum só pode voltar se a próxima semana (mais antiga) tiver conteúdo
    if (nextIndex < weeksWithContent.length) {
      const targetWeek = weeksWithContent[nextIndex];
      return targetWeek?.topics?.length > 0;
    }

    return false;
  }, [currentWeekIndex, weeksWithContent, isVitoca]);

  // Verificar se pode navegar para frente (semanas mais recentes)
  const canNavigateNext = useCallback(() => {
    const nextIndex = currentWeekIndex - 1;

    // Admin Vitoca pode navegar livremente
    if (isVitoca) {
      return nextIndex >= 0;
    }

    // Usuário comum pode avançar até a semana atual (não além)
    if (nextIndex >= 0) {
      const realCurrentWeekIndex = getCurrentWeekIndex(weeksWithContent);
      return nextIndex >= realCurrentWeekIndex;
    }

    return false;
  }, [currentWeekIndex, isVitoca, weeksWithContent]);

  // Obter dados da semana atual
  const currentNewsletter = weeksWithContent[currentWeekIndex] || null;

  // Função para navegar diretamente para a semana atual real
  const goToCurrentWeek = useCallback(() => {
    const realCurrentWeekIndex = getCurrentWeekIndex(allWeeks);
    console.log("🎯 Navegando para semana atual:", {
      from: currentWeekIndex,
      to: realCurrentWeekIndex,
    });
    setCurrentWeekIndex(realCurrentWeekIndex);
  }, [allWeeks, currentWeekIndex]);

  // Verificar se está na semana atual real - memoizado para evitar recálculo
  const realCurrentWeekIndex = useMemo(
    () => getCurrentWeekIndex(allWeeks),
    [allWeeks],
  );
  const isCurrentWeek = currentWeekIndex === realCurrentWeekIndex;

  return {
    // Dados principais
    currentNewsletter,
    currentWeekIndex,
    allWeeks: weeksWithContent,

    // Funções de navegação
    navigateWeek,
    canNavigatePrev,
    canNavigateNext,
    goToCurrentWeek,

    // Status
    isCurrentWeek,
    totalWeeks: weeksWithContent.length,

    // Para debug
    debugInfo: {
      currentWeekIndex,
      realCurrentWeekIndex,
      isAdmin,
      isVitoca,
      hasContent: currentNewsletter?.topics?.length > 0,
      currentWeekDisplay: currentNewsletter
        ? `${currentNewsletter.week}/${currentNewsletter.year}`
        : "nenhuma",
      canNavPrev: canNavigatePrev(),
      canNavNext: canNavigateNext(),
      navigationRules: isVitoca ? "Admin Vitoca - livre" : "Usuário - restrito",
    },
  };
}
