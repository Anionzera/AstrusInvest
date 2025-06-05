/**
 * Formata um valor numérico como moeda brasileira (BRL)
 * 
 * @param value - O valor a ser formatado
 * @param options - Opções adicionais de formatação
 * @returns O valor formatado como string
 */
export function formatCurrency(
  value: number,
  options: {
    decimals?: number;
    showSymbol?: boolean;
    abbreviate?: boolean;
  } = {}
): string {
  const {
    decimals = 2,
    showSymbol = true,
    abbreviate = false,
  } = options;

  let formattedValue = value;
  let suffix = '';

  // Abreviar valores grandes, se solicitado
  if (abbreviate) {
    if (value >= 1e9) {
      formattedValue = value / 1e9;
      suffix = ' bi';
    } else if (value >= 1e6) {
      formattedValue = value / 1e6;
      suffix = ' mi';
    } else if (value >= 1e3) {
      formattedValue = value / 1e3;
      suffix = ' mil';
    }
  }

  // Formatar o número usando o formatador de moeda brasileiro
  const formatter = new Intl.NumberFormat('pt-BR', {
    style: showSymbol ? 'currency' : 'decimal',
    currency: 'BRL',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return formatter.format(formattedValue) + suffix;
}

/**
 * Formata um valor numérico como percentual
 * 
 * @param value - O valor a ser formatado
 * @param decimals - O número de casas decimais
 * @returns O valor formatado como string
 */
export function formatPercent(value: number, decimals: number = 2): string {
  const formatter = new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return formatter.format(value / 100);
}

/**
 * Formata um valor numérico como número inteiro ou decimal
 * 
 * @param value - O valor a ser formatado
 * @param decimals - O número de casas decimais
 * @returns O valor formatado como string
 */
export function formatNumber(value: number, decimals: number = 0): string {
  const formatter = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return formatter.format(value);
}

/**
 * Formata uma data no padrão brasileiro
 * 
 * @param date - A data a ser formatada
 * @param options - Opções de formatação
 * @returns A data formatada como string
 */
export function formatDate(
  date: Date | string | number,
  options: {
    showTime?: boolean;
    format?: 'short' | 'medium' | 'long';
  } = {}
): string {
  const { showTime = false, format = 'short' } = options;
  
  const dateInstance = date instanceof Date ? date : new Date(date);
  
  // Opções de formatação para Intl.DateTimeFormat
  const dateOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: format === 'short' ? '2-digit' : format === 'medium' ? 'short' : 'long',
    day: '2-digit',
  };
  
  if (showTime) {
    dateOptions.hour = '2-digit';
    dateOptions.minute = '2-digit';
  }
  
  const formatter = new Intl.DateTimeFormat('pt-BR', dateOptions);
  return formatter.format(dateInstance);
}

/**
 * Calcula a idade a partir de uma data de nascimento
 * 
 * @param birthDate - A data de nascimento
 * @returns A idade em anos
 */
export function calculateAge(birthDate: Date | string): number {
  const birth = birthDate instanceof Date ? birthDate : new Date(birthDate);
  const today = new Date();
  
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  // Ajusta a idade se ainda não fez aniversário este ano
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
} 