import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AllocationStrategy, RiskProfile } from '@/lib/investmentUtils';
import StrategySelector from '../StrategySelector';

interface StrategyStepProps {
  riskProfile: RiskProfile;
  initialStrategy?: AllocationStrategy;
  onUpdateStrategy: (data: { strategy: AllocationStrategy }) => void;
  age?: number;
  investmentHorizon?: string;
}

const StrategyStep: React.FC<StrategyStepProps> = ({
  riskProfile,
  initialStrategy,
  onUpdateStrategy,
  age,
  investmentHorizon
}) => {
  // Manipulador de mudança de estratégia
  const handleStrategyChange = (strategy: AllocationStrategy) => {
    onUpdateStrategy({ strategy });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Estratégia de Investimento</CardTitle>
          <CardDescription>
            Selecione a estratégia que melhor se adapta aos objetivos do cliente, considerando seu perfil de risco, 
            horizonte de investimento e necessidades específicas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StrategySelector 
            riskProfile={riskProfile}
            onChange={handleStrategyChange}
            value={initialStrategy}
            age={age}
            investmentHorizon={investmentHorizon}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default StrategyStep; 