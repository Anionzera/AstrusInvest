import { useState, useEffect, useMemo, useCallback } from 'react';
import { AssetClass, defaultAllocations, calculateExpectedReturnFromAssets, calculateRiskFromAssets } from '../types/assets';
import { calculateReturns } from '../utils/returns';

interface UseAssetAllocationProps {
  initialAssets?: AssetClass[];
  riskProfile?: string;
  investmentAmount: number;
  onChange?: (assets: AssetClass[]) => void;
}

interface UseAssetAllocationResult {
  assets: AssetClass[];
  totalAllocation: number;
  adjustmentError: string | null;
  expectedReturn: number;
  risk: number;
  returnProjections: Array<{ year: number; value: number }>;
  riskReturnData: Array<{ name: string; risk: number; return: number; current?: boolean }>;
  handleAllocationChange: (index: number, newValue: number) => void;
  resetToRecommended: () => void;
  isValidAllocation: boolean;
}

/**
 * Hook personalizado para gerenciar alocação de ativos
 */
export const useAssetAllocation = ({
  initialAssets,
  riskProfile = 'moderado',
  investmentAmount,
  onChange,
}: UseAssetAllocationProps): UseAssetAllocationResult => {
  // Estado inicial, usando perfil padrão se não houver ativos iniciais
  const [assets, setAssets] = useState<AssetClass[]>(
    initialAssets && initialAssets.length > 0
      ? initialAssets
      : defaultAllocations[riskProfile] || defaultAllocations.moderado
  );

  // Estado derivado
  const [totalAllocation, setTotalAllocation] = useState(100);
  const [adjustmentError, setAdjustmentError] = useState<string | null>(null);

  // Atualizar assets quando as props mudarem
  useEffect(() => {
    if (initialAssets && initialAssets.length > 0) {
      setAssets(initialAssets);
    } else if (riskProfile && defaultAllocations[riskProfile]) {
      setAssets(defaultAllocations[riskProfile]);
    }
  }, [initialAssets, riskProfile]);

  // Calcular alocação total e verificar erros
  useEffect(() => {
    const total = assets.reduce((sum, asset) => sum + asset.allocation, 0);
    setTotalAllocation(total);
    
    if (total !== 100) {
      setAdjustmentError(`A alocação total deve ser 100%. Atual: ${total}%`);
    } else {
      setAdjustmentError(null);
    }
  }, [assets]);

  // Memoizar cálculos caros
  const expectedReturn = useMemo(() => calculateExpectedReturnFromAssets(assets), [assets]);
  const risk = useMemo(() => calculateRiskFromAssets(assets), [assets]);
  
  // Memoizar projeções de retorno
  const returnProjections = useMemo(() => calculateReturns(investmentAmount, expectedReturn, 10), 
    [investmentAmount, expectedReturn]);

  // Memoizar dados de risco/retorno para gráficos
  const riskReturnData = useMemo(() => [
    { name: "Conservador", risk: 5, return: 8 },
    { name: "Moderado", risk: 10, return: 10 },
    { name: "Agressivo", risk: 18, return: 13 },
    { name: "Sua carteira", risk, return: expectedReturn, current: true }
  ], [risk, expectedReturn]);

  // Handler para mudanças de alocação com balanceamento automático
  const handleAllocationChange = useCallback((index: number, newValue: number) => {
    if (newValue < 0) newValue = 0;
    if (newValue > 100) newValue = 100;
    
    setAssets(prevAssets => {
      const newAssets = [...prevAssets];
      newAssets[index].allocation = newValue;
      
      // Calcular a soma total das alocações
      const totalAllocation = newAssets.reduce((sum, asset) => sum + asset.allocation, 0);
      
      // Se a soma ultrapassar 100%, ajustar proporcionalmente as demais alocações
      if (totalAllocation > 100) {
        // Calcular a soma das outras alocações
        const otherAllocations = totalAllocation - newValue;
        
        if (otherAllocations > 0) {
          // Ajustar proporcionalmente as outras alocações
          for (let i = 0; i < newAssets.length; i++) {
            if (i !== index) {
              const proportion = newAssets[i].allocation / otherAllocations;
              const remainingAllocation = 100 - newValue;
              newAssets[i].allocation = Math.round(proportion * remainingAllocation * 10) / 10;
            }
          }
        }
        
        // Garantir que a soma seja exatamente 100% após o arredondamento
        const adjustedTotalAllocation = newAssets.reduce((sum, asset) => sum + asset.allocation, 0);
        
        if (adjustedTotalAllocation !== 100) {
          // Encontrar o maior valor para ajustar a diferença
          const largestIdx = newAssets
            .map((asset, idx) => idx !== index ? { idx, value: asset.allocation } : { idx: -1, value: 0 })
            .filter(item => item.idx !== -1)
            .sort((a, b) => b.value - a.value)[0]?.idx;
          
          if (largestIdx !== undefined && largestIdx >= 0) {
            newAssets[largestIdx].allocation += (100 - adjustedTotalAllocation);
          }
        }
      }
      
      // Chamar callback de mudança
      if (onChange) {
        onChange(newAssets);
      }
      
      return newAssets;
    });
  }, [onChange]);

  // Reset para alocação recomendada
  const resetToRecommended = useCallback(() => {
    if (riskProfile && defaultAllocations[riskProfile]) {
      setAssets(defaultAllocations[riskProfile]);
      if (onChange) {
        onChange(defaultAllocations[riskProfile]);
      }
    }
  }, [riskProfile, onChange]);

  // Validar alocação total
  const isValidAllocation = useMemo(() => {
    const total = assets.reduce((sum, asset) => sum + asset.allocation, 0);
    return Math.abs(total - 100) < 0.01; // Margem de erro para arredondamentos
  }, [assets]);

  return {
    assets,
    totalAllocation,
    adjustmentError,
    expectedReturn,
    risk,
    returnProjections,
    riskReturnData,
    handleAllocationChange,
    resetToRecommended,
    isValidAllocation,
  };
}; 