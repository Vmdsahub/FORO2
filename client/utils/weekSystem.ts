/**
 * Sistema de Semanas 2025-2030 - IA HUB Newsletter
 *
 * Sistema corrigido onde as semanas começam no DOMINGO e terminam no SÁBADO
 * conforme solicitado. Inclui navegação simplificada e cálculo correto da semana atual.
 */

export interface NewsletterTopic {
  id: number | string;
  title: string;
  content: string;
  readTime: string;
}

export interface WeeklyNewsletter {
  week: number;
  year: number;
  startDate: string;
  endDate: string;
  topics: NewsletterTopic[];
  realStartDate: Date;
  realEndDate: Date;
}

/**
 * Calcula o número da semana baseado em semanas que começam no DOMINGO
 * Semana 1 = primeira semana com pelo menos 4 dias no ano
 */
export function getWeekNumber(date: Date): { week: number; year: number } {
  const year = date.getFullYear();

  // 1º de janeiro do ano
  const jan1 = new Date(year, 0, 1);
  const jan1Day = jan1.getDay(); // 0 = domingo, 1 = segunda, etc.

  // Encontrar o primeiro domingo do ano
  let firstSunday = new Date(jan1);
  if (jan1Day === 0) {
    // 1º de janeiro é domingo - primeira semana começa no próprio dia
    firstSunday = jan1;
  } else {
    // Ir para o próximo domingo
    firstSunday.setDate(jan1.getDate() + (7 - jan1Day));
  }

  // Se o primeiro domingo está depois do dia 4, a primeira semana começa no domingo anterior (do ano anterior)
  if (firstSunday.getDate() > 4) {
    firstSunday.setDate(firstSunday.getDate() - 7);
  }

  // Calcular diferença em milissegundos
  const diffTime = date.getTime() - firstSunday.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Se a data é antes da primeira semana do ano
  if (diffDays < 0) {
    // Pertence ao ano anterior - calcular recursivamente sem chamar getLastWeekOfYear
    const prevYear = year - 1;
    const dec31PrevYear = new Date(prevYear, 11, 31);
    return getWeekNumber(dec31PrevYear);
  }

  const weekNumber = Math.floor(diffDays / 7) + 1;

  // Verificar se a semana passa de 52/53 sem usar função recursiva
  const dec31 = new Date(year, 11, 31);
  const dec31Day = dec31.getDay();

  // Um ano tem 53 semanas se 1º de janeiro ou 31 de dezembro cai no domingo
  // ou se é ano bissexto e 1º de janeiro cai no sábado
  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const has53Weeks =
    jan1Day === 0 || dec31Day === 0 || (isLeapYear && jan1Day === 6);
  const maxWeeks = has53Weeks ? 53 : 52;

  // Se passou das semanas do ano atual
  if (weekNumber > maxWeeks) {
    return { week: 1, year: year + 1 };
  }

  return { week: weekNumber, year: year };
}

/**
 * Obtém a data de início da semana (domingo) para uma semana específica
 */
export function getWeekStartDate(year: number, week: number): Date {
  // 1º de janeiro do ano
  const jan1 = new Date(year, 0, 1);
  const jan1Day = jan1.getDay(); // 0 = domingo, 1 = segunda, etc.

  // Encontrar o primeiro domingo do ano
  let firstSunday = new Date(jan1);
  if (jan1Day === 0) {
    // 1º de janeiro é domingo
    firstSunday = jan1;
  } else {
    // Ir para o próximo domingo
    firstSunday.setDate(jan1.getDate() + (7 - jan1Day));
  }

  // Se o primeiro domingo está depois do dia 4, a primeira semana começa no domingo anterior
  if (firstSunday.getDate() > 4) {
    firstSunday.setDate(firstSunday.getDate() - 7);
  }

  // Calcular a data da semana desejada
  const weekStart = new Date(firstSunday);
  weekStart.setDate(firstSunday.getDate() + (week - 1) * 7);

  return weekStart;
}

/**
 * Obtém a data de fim da semana (sábado) para uma semana específica
 */
export function getWeekEndDate(year: number, week: number): Date {
  const startDate = getWeekStartDate(year, week);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6); // Domingo + 6 dias = Sábado
  return endDate;
}

/**
 * Formata uma data para exibição no formato brasileiro
 */
export function formatDateBR(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

/**
 * Formata uma data para exibição completa no formato brasileiro
 */
export function formatDateFullBR(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Retorna o número da última semana do ano (sem recursão)
 */
function getLastWeekOfYear(year: number): number {
  // 1º de janeiro do ano
  const jan1 = new Date(year, 0, 1);
  const jan1Day = jan1.getDay();

  // 31 de dezembro do ano
  const dec31 = new Date(year, 11, 31);
  const dec31Day = dec31.getDay();

  // Um ano tem 53 semanas se 1º de janeiro ou 31 de dezembro cai no domingo
  // ou se é ano bissexto e 1º de janeiro cai no sábado
  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const has53Weeks =
    jan1Day === 0 || dec31Day === 0 || (isLeapYear && jan1Day === 6);

  return has53Weeks ? 53 : 52;
}

/**
 * Gera todas as semanas para os anos 2025-2030
 */
export function generateAllWeeks(): WeeklyNewsletter[] {
  const weeks: WeeklyNewsletter[] = [];
  const years = [2025, 2026, 2027, 2028, 2029, 2030];

  for (const year of years) {
    const maxWeeks = getLastWeekOfYear(year);

    for (let week = 1; week <= maxWeeks; week++) {
      const startDate = getWeekStartDate(year, week);
      const endDate = getWeekEndDate(year, week);

      // Verificar se a semana realmente pertence ao ano atual
      const weekCheck = getWeekNumber(startDate);
      if (weekCheck.year !== year || weekCheck.week !== week) continue;

      weeks.push({
        week,
        year,
        startDate: formatDateBR(startDate),
        endDate: formatDateFullBR(endDate),
        topics: [], // Inicialmente vazia, será preenchida com conteúdo real
        realStartDate: startDate,
        realEndDate: endDate,
      });
    }
  }

  // Ordenar por ano e semana (mais recente primeiro)
  return weeks.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.week - a.week;
  });
}

/**
 * Encontra a semana atual baseada na data real
 */
export function getCurrentWeekIndex(weeks: WeeklyNewsletter[]): number {
  const now = new Date();
  const currentWeekInfo = getWeekNumber(now);

  console.log("🗓️ Procurando semana atual:", {
    today: now.toLocaleDateString("pt-BR"),
    dayOfWeek: [
      "Domingo",
      "Segunda",
      "Terça",
      "Quarta",
      "Quinta",
      "Sexta",
      "Sábado",
    ][now.getDay()],
    currentWeekInfo,
    totalWeeks: weeks.length,
    firstWeek: weeks[0] ? `${weeks[0].week}/${weeks[0].year}` : "nenhuma",
    lastWeek: weeks[weeks.length - 1]
      ? `${weeks[weeks.length - 1].week}/${weeks[weeks.length - 1].year}`
      : "nenhuma",
  });

  // Encontrar a semana correspondente na lista
  const weekIndex = weeks.findIndex(
    (w) => w.week === currentWeekInfo.week && w.year === currentWeekInfo.year,
  );

  console.log("📍 Resultado da busca:", {
    weekIndex,
    found: weekIndex !== -1,
    foundWeek:
      weekIndex !== -1
        ? `${weeks[weekIndex].week}/${weeks[weekIndex].year}`
        : "não encontrada",
  });

  // Se encontrou a semana atual, retorna o índice
  if (weekIndex !== -1) {
    return weekIndex;
  }

  // Se não encontrou, retorna a primeira semana disponível
  console.warn(
    "⚠️ Semana atual não encontrada, usando primeira semana disponível",
  );
  return 0;
}

/**
 * Verifica se é domingo (quando a semana deve avançar automaticamente)
 */
export function isSunday(): boolean {
  return new Date().getDay() === 0;
}

/**
 * Verifica se uma data específica resultaria em uma semana específica
 * Usado para testes e validações
 */
export function getWeekForDate(date: Date): { week: number; year: number } {
  return getWeekNumber(date);
}

/**
 * Função para testar cenários específicos
 */
export function testScenarios() {
  const scenarios = [
    {
      date: new Date(2025, 0, 5),
      description: "5 de janeiro de 2025 (Domingo)",
    }, // Primeiro domingo de 2025
    {
      date: new Date(2025, 0, 11),
      description: "11 de janeiro de 2025 (Sábado)",
    }, // Primeiro sábado
    {
      date: new Date(2025, 7, 17),
      description: "17 de agosto de 2025 (Domingo)",
    }, // Domingo no meio do ano
    {
      date: new Date(2024, 8, 28),
      description: "28 de setembro de 2024 (Sábado)",
    }, // Teste específico
    {
      date: new Date(2025, 8, 28),
      description: "28 de setembro de 2025 (Domingo)",
    }, // Teste específico
    { date: new Date(), description: "Hoje" }, // Data atual
  ];

  console.log("=== TESTE DE CENÁRIOS ===");
  console.log("Sistema de semanas: Domingo a Sábado");

  for (const scenario of scenarios) {
    const weekInfo = getWeekForDate(scenario.date);
    const startDate = getWeekStartDate(weekInfo.year, weekInfo.week);
    const endDate = getWeekEndDate(weekInfo.year, weekInfo.week);

    console.log(`${scenario.description}:`);
    console.log(`  Semana: ${weekInfo.week} de ${weekInfo.year}`);
    console.log(
      `  Período: ${formatDateBR(startDate)} - ${formatDateFullBR(endDate)}`,
    );
    console.log(
      `  Data de teste: ${scenario.date.toLocaleDateString("pt-BR")}`,
    );
    console.log(
      `  Dia da semana: ${["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][scenario.date.getDay()]}`,
    );
    console.log(
      `  Data está no período? ${scenario.date >= startDate && scenario.date <= endDate ? "SIM" : "NÃO"}`,
    );
    console.log("");
  }
}

/**
 * Sistema de cache para evitar recálculos desnecessários
 */
let _cachedWeeks: WeeklyNewsletter[] | null = null;

export function getAllWeeks(): WeeklyNewsletter[] {
  if (!_cachedWeeks) {
    _cachedWeeks = generateAllWeeks();

    const now = new Date();
    const currentWeekInfo = getWeekNumber(now);

    console.log(
      `Sistema de semanas inicializado: ${_cachedWeeks.length} semanas geradas (2025-2030)`,
    );
    console.log(
      `📅 Hoje é: ${now.toLocaleDateString("pt-BR")} (${["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"][now.getDay()]})`,
    );
    console.log(
      `🎯 Semana atual deveria ser: ${currentWeekInfo.week}/${currentWeekInfo.year}`,
    );

    // Executar testes em desenvolvimento
    if (
      typeof window !== "undefined" &&
      process.env.NODE_ENV === "development"
    ) {
      testScenarios();

      // Teste específico para 28/09
      console.log("\n=== RESPOSTA PARA A PERGUNTA ESPECÍFICA ===");
      testSpecificDate("28/09/2024");
      testSpecificDate("28/09/2025");
    }
  }
  return _cachedWeeks;
}

/**
 * Limpa o cache (útil para testes)
 */
export function clearWeeksCache(): void {
  _cachedWeeks = null;
}

/**
 * Função específica para testar 28 de setembro
 */
export function testSpecificDate(dateString: string) {
  // Assumindo formato DD/MM/YYYY ou DD/MM (assumindo 2024/2025)
  const [day, month, year] = dateString.split("/").map(Number);
  const testYear = year || new Date().getFullYear();

  // Note: mês em JavaScript é 0-indexed (setembro = 8)
  const testDate = new Date(testYear, month - 1, day);

  const weekInfo = getWeekForDate(testDate);
  const startDate = getWeekStartDate(weekInfo.year, weekInfo.week);
  const endDate = getWeekEndDate(weekInfo.year, weekInfo.week);

  console.log("=== TESTE ESPECÍFICO ===");
  console.log(
    `Data testada: ${testDate.toLocaleDateString("pt-BR")} (${["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"][testDate.getDay()]})`,
  );
  console.log(`Semana calculada: ${weekInfo.week} de ${weekInfo.year}`);
  console.log(
    `Período da semana: ${formatDateBR(startDate)} - ${formatDateFullBR(endDate)}`,
  );
  console.log(
    `Esta seria a semana exibida em VERDE na página inicial se fosse ${dateString}`,
  );

  return {
    date: testDate,
    week: weekInfo.week,
    year: weekInfo.year,
    period: `${formatDateBR(startDate)} - ${formatDateFullBR(endDate)}`,
    dayOfWeek: [
      "Domingo",
      "Segunda",
      "Terça",
      "Quarta",
      "Quinta",
      "Sexta",
      "Sábado",
    ][testDate.getDay()],
  };
}
