/**
 * Utilitários para cálculos e recomendações de investimentos
 */

/**
 * Calcula o horizonte de investimento recomendado com base na idade e objetivo
 * @param age Idade do cliente
 * @param objective Objetivo do investimento
 * @returns Horizonte recomendado em anos
 */
export function calculateRecommendedHorizon(age: number, objective: string): number {
  if (objective === "retirement") {
    // Para aposentadoria, quanto mais jovem, maior o horizonte
    if (age < 30) return 15;
    if (age < 40) return 12;
    if (age < 50) return 10;
    if (age < 60) return 5;
    return 3;
  } else if (objective === "reserve") {
    // Reserva de emergência tem horizonte curto
    return 2;
  } else if (objective === "education") {
    // Educação - horizonte depende da idade (assumindo para os filhos)
    if (age < 35) return 10;
    if (age < 45) return 7;
    return 5;
  } else if (objective === "property") {
    // Compra de imóvel - médio prazo
    return 5;
  } else if (objective === "wealth") {
    // Crescimento de patrimônio - longo prazo
    return 10;
  } else if (objective === "income") {
    // Geração de renda - médio a longo prazo
    return 8;
  }
  
  // Default para médio prazo
  return 5;
}

/**
 * Calcula o perfil de risco recomendado com base na idade, objetivo e horizonte
 * @param age Idade do cliente
 * @param objective Objetivo do investimento
 * @param horizon Horizonte de investimento em anos
 * @returns Perfil de risco recomendado ("conservador", "moderado" ou "agressivo")
 */
export function calculateRecommendedRiskProfile(
  age: number, 
  objective: string, 
  horizon: number
): string {
  // Sistema de pontos para determinar o perfil de risco
  let points = 0;
  
  // Pontos por idade - quanto mais jovem, maior tolerância a risco
  if (age < 30) points += 3;
  else if (age < 40) points += 2;
  else if (age < 50) points += 1;
  else if (age < 60) points += 0;
  else points -= 1; // Acima de 60, reduz pontos
  
  // Pontos por objetivo
  switch (objective) {
    case "retirement":
      points += (age < 45) ? 1 : -1; // Jovens podem ser mais agressivos para aposentadoria
      break;
    case "reserve":
      points -= 2; // Reserva de emergência deve ser conservadora
      break;
    case "education":
      points += 0; // Neutro
      break;
    case "property":
      points -= 1; // Compra de imóvel tende a ser mais conservadora
      break;
    case "wealth":
      points += 2; // Crescimento de patrimônio permite mais risco
      break;
    case "income":
      points += 0; // Neutro para geração de renda
      break;
    default:
      points += 0;
  }
  
  // Pontos por horizonte
  if (horizon <= 2) points -= 2; // Curto prazo - conservador
  else if (horizon <= 5) points += 0; // Médio prazo - neutro
  else points += 2; // Longo prazo - mais agressivo
  
  // Determinar perfil com base nos pontos
  if (points < -1) return "conservador";
  if (points <= 2) return "moderado";
  return "agressivo";
}

/**
 * Calcula a estratégia recomendada com base no perfil de risco e objetivo
 * @param riskProfile Perfil de risco
 * @param objective Objetivo do investimento
 * @returns Estratégia recomendada
 */
export function calculateRecommendedStrategy(
  riskProfile: string,
  objective: string
): string {
  if (objective === "income") {
    return "traditional"; // Estratégia tradicional para geração de renda
  }
  
  if (objective === "retirement") {
    if (riskProfile === "conservador") return "permanent";
    if (riskProfile === "moderado") return "allweather";
    return "traditional";
  }
  
  if (objective === "reserve") {
    return "minimumvariance"; // Menor volatilidade para reservas
  }
  
  if (objective === "wealth") {
    if (riskProfile === "agressivo") return "momentum";
    if (riskProfile === "moderado") return "markowitz";
    return "allweather";
  }
  
  // Default por perfil de risco
  if (riskProfile === "conservador") return "traditional";
  if (riskProfile === "moderado") return "allweather";
  return "markowitz";
}

/**
 * Calcula o valor mínimo recomendado para um objetivo específico
 * @param objective Objetivo do investimento
 * @param age Idade do cliente
 * @returns Valor mínimo recomendado em reais
 */
export const calculateMinimumInvestment = (
  objective: string,
  age: number,
): number => {
  switch (objective) {
    case "retirement":
      // Para aposentadoria, valor mínimo aumenta com a idade
      return Math.max(10000, (age - 20) * 5000);
    case "reserve":
      // Reserva de emergência: geralmente 6 meses de despesas (estimativa)
      return 10000;
    case "education":
      // Educação: valor mínimo para começar a poupar para educação
      return 15000;
    case "property":
      // Compra de imóvel: entrada mínima
      return 50000;
    case "wealth":
      // Crescimento de patrimônio: valor mínimo para diversificação adequada
      return 20000;
    case "income":
      // Geração de renda: valor mínimo para gerar renda significativa
      return 100000;
    case "travel":
      // Viagens: valor mínimo para uma viagem
      return 5000;
    default:
      return 10000;
  }
};

/**
 * Calcula a alocação de ativos recomendada com base no perfil de risco, idade e objetivo
 * @param riskProfile Perfil de risco
 * @param age Idade do cliente
 * @param objective Objetivo do investimento
 * @returns Objeto com a alocação recomendada em percentuais
 */
export const calculateRecommendedAllocation = (
  riskProfile: string,
  age: number,
  objective: string,
): { [key: string]: number } => {
  // Alocações base por perfil de risco
  const baseAllocations: Record<string, Record<string, number>> = {
    conservador: {
      acoes: 25,
      rendaFixa: 55,
      alternativos: 10,
      caixa: 10,
    },
    moderado: {
      acoes: 40,
      rendaFixa: 40,
      alternativos: 15,
      caixa: 5,
    },
    agressivo: {
      acoes: 50,
      rendaFixa: 20,
      alternativos: 15,
      criptomoedas: 15,
      caixa: 0,
    },
  };

  // Obter alocação base para o perfil de risco
  const baseAllocation =
    baseAllocations[riskProfile] || baseAllocations.moderado;

  // Clonar para não modificar o original
  const allocation: Record<string, number> = { ...baseAllocation };

  // Ajustes por idade
  if (age < 30) {
    // Jovens: mais ações e criptomoedas, menos renda fixa
    allocation.acoes = Math.min(allocation.acoes + 5, 60);
    allocation.criptomoedas = allocation.criptomoedas ? Math.min(allocation.criptomoedas + 5, 20) : 5;
    allocation.rendaFixa = Math.max(allocation.rendaFixa - 10, 10);
  } else if (age > 55) {
    // Mais velhos: menos ações e criptomoedas, mais renda fixa
    allocation.acoes = Math.max(allocation.acoes - 10, 10);
    if (allocation.criptomoedas) {
      allocation.criptomoedas = Math.max(allocation.criptomoedas - 5, 0);
    }
    allocation.rendaFixa = Math.min(allocation.rendaFixa + 10, 70);
    allocation.caixa = Math.min(allocation.caixa + 5, 20);
  }

  // Ajustes por objetivo
  switch (objective) {
    case "retirement":
      if (age > 50) {
        // Aposentadoria próxima: mais conservador
        allocation.acoes = Math.max(allocation.acoes - 10, 10);
        if (allocation.criptomoedas) {
          allocation.criptomoedas = Math.max(allocation.criptomoedas - 5, 0);
        }
        allocation.rendaFixa = Math.min(allocation.rendaFixa + 15, 70);
      }
      break;
    case "reserve":
      // Reserva de emergência: muito conservador
      allocation.acoes = Math.max(allocation.acoes - 15, 0);
      if (allocation.criptomoedas) {
        allocation.criptomoedas = Math.max(allocation.criptomoedas - 5, 0);
      }
      allocation.caixa = Math.min(allocation.caixa + 20, 50);
      break;
    case "wealth":
      // Crescimento de patrimônio: mais agressivo
      allocation.acoes = Math.min(allocation.acoes + 10, 70);
      allocation.criptomoedas = allocation.criptomoedas ? Math.min(allocation.criptomoedas + 5, 25) : 5;
      allocation.caixa = Math.max(allocation.caixa - 5, 0);
      break;
    case "income":
      // Geração de renda: foco em ativos geradores de renda
      allocation.alternativos = Math.min(allocation.alternativos + 10, 30);
      allocation.acoes = Math.max(allocation.acoes - 5, 10);
      if (allocation.criptomoedas) {
        allocation.criptomoedas = Math.max(allocation.criptomoedas - 5, 0);
      }
      break;
  }

  // Normalizar para garantir que some 100%
  const total = Object.values(allocation).reduce(
    (sum: number, value: number) => sum + value,
    0,
  );
  if (total !== 100) {
    const factor = 100 / total;
    Object.keys(allocation).forEach((key) => {
      allocation[key] = Math.round(allocation[key] * factor);
    });
  }

  return allocation;
};

/**
 * Calcula o valor total da alocação
 */
export function calculateTotalAllocation(assets: Array<{ allocation: number }>): number {
  return assets.reduce((sum, asset) => sum + asset.allocation, 0);
}

/**
 * Calcula o retorno esperado da carteira
 */
export function calculateExpectedReturn(
  assets: Array<{ allocation: number; expected_return?: number }>
): number {
  return assets.reduce((sum: number, asset) => {
    return sum + ((asset.expected_return || 0) * (asset.allocation / 100));
  }, 0);
}

/**
 * Calcula o risco da carteira
 */
export function calculateRisk(
  assets: Array<{ allocation: number; risk?: number }>
): number {
  return assets.reduce((sum: number, asset) => {
    return sum + ((asset.risk || 0) * (asset.allocation / 100));
  }, 0);
}

/**
 * Formata valores em porcentagem
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}

/**
 * Obtém o nome da classe de ativo
 */
export function getAssetClassName(asset: { name: string }): string {
  return asset.name;
}

/**
 * Obtém a cor da classe de ativo
 */
export function getAssetClassColor(asset: { color: string }): string {
  return asset.color;
}

/**
 * Obtém a descrição da classe de ativo
 */
export function getAssetClassDescription(asset: { description?: string }): string {
  return asset.description || "Sem descrição disponível";
}

/**
 * Obtém o risco da classe de ativo
 */
export function getAssetClassRisk(asset: { risk?: number }): number {
  return asset.risk || 0;
}

/**
 * Obtém a alocação da classe de ativo
 */
export function getAssetClassAllocation(asset: { allocation: number }): number {
  return asset.allocation;
}

/**
 * Obtém o retorno esperado da classe de ativo
 */
export function getAssetClassExpectedReturn(asset: { expected_return?: number }): number {
  return asset.expected_return || 0;
}
