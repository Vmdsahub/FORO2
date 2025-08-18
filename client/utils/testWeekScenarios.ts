/**
 * Testes para validar cenários específicos do sistema de semanas
 */
import {
  getWeekForDate,
  getAllWeeks,
  formatDateBR,
  formatDateFullBR,
} from "./weekSystem";

export function runWeekTests() {
  console.log("🧪 INICIANDO TESTES DO SISTEMA DE SEMANAS");
  console.log("==========================================");

  // Teste 1: 17 de março de 2028
  const date1 = new Date(2028, 2, 17); // Março é mês 2 (0-indexed)
  const week1 = getWeekForDate(date1);

  console.log("📅 TESTE 1: 17 de março de 2028");
  console.log(`   Data de teste: ${date1.toLocaleDateString("pt-BR")}`);
  console.log(`   Resultado: Semana ${week1.week} de ${week1.year}`);
  console.log(
    `   Dia da semana: ${date1.toLocaleDateString("pt-BR", { weekday: "long" })}`,
  );
  console.log("");

  // Teste 2: 17 de junho de 2026
  const date2 = new Date(2026, 5, 17); // Junho é mês 5 (0-indexed)
  const week2 = getWeekForDate(date2);

  console.log("📅 TESTE 2: 17 de junho de 2026");
  console.log(`   Data de teste: ${date2.toLocaleDateString("pt-BR")}`);
  console.log(`   Resultado: Semana ${week2.week} de ${week2.year}`);
  console.log(
    `   Dia da semana: ${date2.toLocaleDateString("pt-BR", { weekday: "long" })}`,
  );
  console.log("");

  // Verificar se essas semanas existem no sistema
  const allWeeks = getAllWeeks();

  const week1Exists = allWeeks.find(
    (w) => w.week === week1.week && w.year === week1.year,
  );
  const week2Exists = allWeeks.find(
    (w) => w.week === week2.week && w.year === week2.year,
  );

  console.log("🔍 VERIFICAÇÃO DE EXISTÊNCIA NO SISTEMA");
  console.log(
    `   Semana ${week1.week} de ${week1.year} existe: ${week1Exists ? "✅ SIM" : "❌ NÃO"}`,
  );
  if (week1Exists) {
    console.log(
      `   Período: ${week1Exists.startDate} - ${week1Exists.endDate}`,
    );
  }

  console.log(
    `   Semana ${week2.week} de ${week2.year} existe: ${week2Exists ? "✅ SIM" : "❌ NÃO"}`,
  );
  if (week2Exists) {
    console.log(
      `   Período: ${week2Exists.startDate} - ${week2Exists.endDate}`,
    );
  }
  console.log("");

  // Testes adicionais para validar o sistema
  console.log("🎯 TESTES ADICIONAIS DE VALIDAÇÃO");

  // Teste da semana atual
  const now = new Date();
  const currentWeek = getWeekForDate(now);
  const currentWeekExists = allWeeks.find(
    (w) => w.week === currentWeek.week && w.year === currentWeek.year,
  );

  console.log(`   Data atual: ${now.toLocaleDateString("pt-BR")}`);
  console.log(`   Semana atual: ${currentWeek.week} de ${currentWeek.year}`);
  console.log(
    `   Semana atual existe no sistema: ${currentWeekExists ? "✅ SIM" : "❌ NÃO"}`,
  );

  if (currentWeekExists) {
    console.log(
      `   Período atual: ${currentWeekExists.startDate} - ${currentWeekExists.endDate}`,
    );
  }

  // Estatísticas do sistema
  console.log("");
  console.log("📊 ESTATÍSTICAS DO SISTEMA");
  console.log(`   Total de semanas geradas: ${allWeeks.length}`);

  const weeksByYear = allWeeks.reduce(
    (acc, week) => {
      acc[week.year] = (acc[week.year] || 0) + 1;
      return acc;
    },
    {} as Record<number, number>,
  );

  Object.entries(weeksByYear).forEach(([year, count]) => {
    console.log(`   ${year}: ${count} semanas`);
  });

  console.log("");
  console.log("✅ TESTES CONCLUÍDOS");
  console.log("==========================================");

  return {
    test1: { date: date1, week: week1, exists: !!week1Exists },
    test2: { date: date2, week: week2, exists: !!week2Exists },
    currentWeek: { date: now, week: currentWeek, exists: !!currentWeekExists },
    systemStats: { totalWeeks: allWeeks.length, weeksByYear },
  };
}

// Função para executar testes em modo desenvolvimento
export function runTestsIfDevelopment() {
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    // Executar após um pequeno delay para evitar conflitos com inicialização
    setTimeout(() => {
      runWeekTests();
    }, 1000);
  }
}
