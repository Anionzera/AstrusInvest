/**
 * Interface que define a estrutura de uma projeção de retorno anual
 */
interface ReturnProjection {
  year: number;
  value: number;
}

/**
 * Calcula projeções de retorno para um investimento ao longo de vários anos
 * 
 * @param initialAmount - O valor inicial do investimento
 * @param annualReturn - A taxa de retorno anual estimada (em porcentagem)
 * @param years - O número de anos para projetar
 * @returns Um array de projeções anuais de retorno
 */
export function calculateReturns(
  initialAmount: number,
  annualReturn: number,
  years: number
): ReturnProjection[] {
  // Converte a taxa de retorno de porcentagem para decimal
  const returnRate = annualReturn / 100;
  
  // Array para armazenar as projeções anuais
  const projections: ReturnProjection[] = [];
  
  // Valor atual começa como o montante inicial
  let currentValue = initialAmount;
  
  // Calcula o valor para cada ano
  for (let year = 1; year <= years; year++) {
    // Aplica a taxa de retorno ao valor atual
    currentValue = currentValue * (1 + returnRate);
    
    // Adiciona a projeção para o ano atual
    projections.push({
      year,
      value: currentValue,
    });
  }
  
  return projections;
}

/**
 * Calcula o valor futuro de um investimento com aportes mensais
 * 
 * @param initialAmount - Montante inicial investido
 * @param monthlyContribution - Valor do aporte mensal
 * @param annualReturn - Taxa de retorno anual estimada (em porcentagem)
 * @param years - Número de anos do investimento
 * @returns O valor futuro estimado do investimento
 */
export function calculateFutureValueWithContributions(
  initialAmount: number,
  monthlyContribution: number,
  annualReturn: number,
  years: number
): number {
  // Converte a taxa anual para mensal
  const monthlyRate = Math.pow(1 + annualReturn / 100, 1 / 12) - 1;
  const totalMonths = years * 12;
  
  // Valor futuro do montante inicial
  const initialAmountFutureValue = initialAmount * Math.pow(1 + monthlyRate, totalMonths);
  
  // Valor futuro dos aportes mensais (usando fórmula de juros compostos com aportes periódicos)
  let contributionsFutureValue = 0;
  if (monthlyRate > 0) {
    contributionsFutureValue = monthlyContribution * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate);
  } else {
    contributionsFutureValue = monthlyContribution * totalMonths;
  }
  
  return initialAmountFutureValue + contributionsFutureValue;
}

/**
 * Calcula o tempo necessário para atingir um objetivo financeiro
 * 
 * @param initialAmount - Montante inicial investido
 * @param monthlyContribution - Valor do aporte mensal
 * @param annualReturn - Taxa de retorno anual estimada (em porcentagem)
 * @param targetAmount - Valor financeiro a ser atingido
 * @returns O número estimado de anos para atingir o objetivo
 */
export function calculateTimeToReachGoal(
  initialAmount: number,
  monthlyContribution: number,
  annualReturn: number,
  targetAmount: number
): number {
  if (initialAmount >= targetAmount) {
    return 0;
  }
  
  if (annualReturn <= 0 && monthlyContribution <= 0) {
    return Infinity;
  }
  
  // Converte a taxa anual para mensal
  const monthlyRate = Math.pow(1 + annualReturn / 100, 1 / 12) - 1;
  
  let months = 0;
  let currentValue = initialAmount;
  
  // Simula o crescimento mês a mês até atingir o valor alvo
  while (currentValue < targetAmount && months < 1200) { // Limite de 100 anos
    currentValue = currentValue * (1 + monthlyRate) + monthlyContribution;
    months++;
  }
  
  return months / 12; // Converte meses para anos
}

/**
 * Calcula o valor do aporte mensal necessário para atingir um objetivo financeiro
 * 
 * @param initialAmount - Montante inicial investido
 * @param annualReturn - Taxa de retorno anual estimada (em porcentagem)
 * @param years - Número de anos para atingir o objetivo
 * @param targetAmount - Valor financeiro a ser atingido
 * @returns O valor do aporte mensal necessário
 */
export function calculateRequiredContribution(
  initialAmount: number,
  annualReturn: number,
  years: number,
  targetAmount: number
): number {
  if (initialAmount >= targetAmount) {
    return 0;
  }
  
  // Converte a taxa anual para mensal
  const monthlyRate = Math.pow(1 + annualReturn / 100, 1 / 12) - 1;
  const totalMonths = years * 12;
  
  // Valor futuro do montante inicial
  const initialAmountFutureValue = initialAmount * Math.pow(1 + monthlyRate, totalMonths);
  
  // Valor que precisa ser acumulado através de aportes mensais
  const amountToBeAccumulated = targetAmount - initialAmountFutureValue;
  
  if (amountToBeAccumulated <= 0) {
    return 0;
  }
  
  // Cálculo do aporte mensal necessário
  if (monthlyRate > 0) {
    return amountToBeAccumulated / ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate);
  } else {
    return amountToBeAccumulated / totalMonths;
  }
} 