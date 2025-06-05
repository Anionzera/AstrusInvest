import React, { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../ui/card";
import { Button } from "../ui/button";
import { Slider } from "../ui/slider";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { ArrowLeft, ArrowRight, Calendar, Clock, Info } from "lucide-react";
import { motion } from "framer-motion";

// Interface para as propriedades do componente
export interface InvestmentHorizonStepProps {
  onNext: () => void;
  onPrevious: () => void;
  initialHorizon: {
    years: number;
    type: string;
  };
  onUpdateHorizon: (horizon: { years: number; type: string }) => void;
}

const InvestmentHorizonStep: React.FC<InvestmentHorizonStepProps> = ({
  onNext,
  onPrevious,
  initialHorizon,
  onUpdateHorizon
}) => {
  // Estados para os campos do formulário
  const [selectedYears, setSelectedYears] = useState(initialHorizon.years);
  const [selectedType, setSelectedType] = useState(initialHorizon.type);

  // Atualiza os estados quando as props mudam
  useEffect(() => {
    setSelectedYears(initialHorizon.years);
    setSelectedType(initialHorizon.type);
  }, [initialHorizon]);

  // Função para lidar com a mudança do slider
  const handleYearsChange = (value: number[]) => {
    const years = value[0];
    setSelectedYears(years);
    onUpdateHorizon({ years, type: selectedType });
  };

  // Função para lidar com a mudança do tipo de horizonte
  const handleTypeChange = (value: string) => {
    setSelectedType(value);
    onUpdateHorizon({ years: selectedYears, type: value });
  };

  // Função para avançar para o próximo passo
  const handleNext = () => {
    onNext();
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            Horizonte de Investimento
          </CardTitle>
          <CardDescription>
            Defina por quanto tempo o capital ficará investido para atingir os objetivos financeiros
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 text-blue-500" />
              <div>
                <h4 className="font-medium text-blue-800">Dica importante</h4>
                <p className="text-sm text-blue-700 mt-1">
                  O horizonte de investimento é um fator crucial para determinar a estratégia de alocação adequada. 
                  Investimentos de longo prazo podem suportar maior volatilidade em troca de potenciais retornos maiores.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-end mb-2">
                <div>
                  <h3 className="text-lg font-medium">
                    Tempo de Investimento
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Por quantos anos o capital permanecerá investido?
                  </p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-blue-600">{selectedYears}</span>
                  <span className="text-gray-500">anos</span>
                </div>
              </div>
              
              <div className="pt-4">
                <Slider
                  id="years"
                  min={1}
                  max={30}
                  step={1}
                  value={[selectedYears]}
                  onValueChange={handleYearsChange}
                  className="w-full"
                />
                
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>1 ano</span>
                  <span>15 anos</span>
                  <span>30 anos</span>
                </div>
              </div>
            </div>
            
            <div className="pt-6">
              <Label className="text-lg font-medium">Tipo de Horizonte</Label>
              <p className="text-sm text-muted-foreground mb-4">
                Selecione o horizonte que melhor se alinha com seus objetivos
              </p>
              
              <RadioGroup value={selectedType} onValueChange={handleTypeChange} className="gap-4">
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="curto-prazo" id="curto-prazo" />
                  <div className="grid gap-1.5">
                    <Label htmlFor="curto-prazo" className="font-medium">Curto Prazo (1-2 anos)</Label>
                    <p className="text-sm text-muted-foreground">
                      Ideal para metas financeiras próximas, como compra de bens, emergências ou despesas planejadas.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="medio-prazo" id="medio-prazo" />
                  <div className="grid gap-1.5">
                    <Label htmlFor="medio-prazo" className="font-medium">Médio Prazo (3-5 anos)</Label>
                    <p className="text-sm text-muted-foreground">
                      Adequado para objetivos como entrada de imóvel, casamento, formação acadêmica ou expansão de negócios.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="longo-prazo" id="longo-prazo" />
                  <div className="grid gap-1.5">
                    <Label htmlFor="longo-prazo" className="font-medium">Longo Prazo (6+ anos)</Label>
                    <p className="text-sm text-muted-foreground">
                      Perfeito para aposentadoria, independência financeira ou formação de patrimônio significativo.
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onPrevious} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <Button onClick={handleNext} className="flex items-center gap-2">
            Avançar
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default InvestmentHorizonStep;
