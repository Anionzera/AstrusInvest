/**
 * Representa uma classe de ativos no sistema
 */
export interface AssetClass {
  name: string;
  allocation: number;
  color: string;
  expected_return?: number;
  risk?: number;
  description?: string;
}

/**
 * Alocações padrão baseadas no perfil de risco
 */
export const defaultAllocations: Record<string, AssetClass[]> = {
  conservador: [
    { name: "Renda Fixa", allocation: 70, color: "#4299e1", expected_return: 9.5, risk: 2, description: "Títulos públicos, CDBs, LCIs, LCAs e fundos de renda fixa" },
    { name: "Multimercado", allocation: 15, color: "#9f7aea", expected_return: 11, risk: 6, description: "Fundos que investem em várias classes de ativos" },
    { name: "Renda Variável", allocation: 10, color: "#f56565", expected_return: 13, risk: 20, description: "Ações, ETFs e fundos de ações" },
    { name: "Internacional", allocation: 5, color: "#68d391", expected_return: 12, risk: 15, description: "BDRs, fundos internacionais e ETFs internacionais" },
  ],
  moderado: [
    { name: "Renda Fixa", allocation: 50, color: "#4299e1", expected_return: 9.5, risk: 2, description: "Títulos públicos, CDBs, LCIs, LCAs e fundos de renda fixa" },
    { name: "Multimercado", allocation: 20, color: "#9f7aea", expected_return: 11, risk: 7, description: "Fundos que investem em várias classes de ativos" },
    { name: "Renda Variável", allocation: 20, color: "#f56565", expected_return: 14, risk: 20, description: "Ações, ETFs e fundos de ações" },
    { name: "Internacional", allocation: 10, color: "#68d391", expected_return: 13, risk: 15, description: "BDRs, fundos internacionais e ETFs internacionais" },
  ],
  agressivo: [
    { name: "Renda Fixa", allocation: 25, color: "#4299e1", expected_return: 9.5, risk: 2, description: "Títulos públicos, CDBs, LCIs, LCAs e fundos de renda fixa" },
    { name: "Multimercado", allocation: 20, color: "#9f7aea", expected_return: 11, risk: 9, description: "Fundos que investem em várias classes de ativos" },
    { name: "Renda Variável", allocation: 40, color: "#f56565", expected_return: 16, risk: 22, description: "Ações, ETFs e fundos de ações" },
    { name: "Internacional", allocation: 15, color: "#68d391", expected_return: 14, risk: 18, description: "BDRs, fundos internacionais e ETFs internacionais" },
  ]
};

/**
 * Calcula o retorno esperado para um conjunto de ativos
 */
export const calculateExpectedReturnFromAssets = (assets: AssetClass[]): number => {
  return assets.reduce((sum, asset) => {
    return sum + (asset.expected_return || 0) * (asset.allocation / 100);
  }, 0);
};

/**
 * Calcula o risco para um conjunto de ativos
 */
export const calculateRiskFromAssets = (assets: AssetClass[]): number => {
  return assets.reduce((sum, asset) => {
    return sum + (asset.risk || 0) * (asset.allocation / 100);
  }, 0);
}; 