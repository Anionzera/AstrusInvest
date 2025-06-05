import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Skeleton } from "../ui/skeleton";

interface InvestmentHorizonSelectorProps {
  selectedHorizon: string;
  onHorizonChange: (horizon: string) => void;
}

const horizonOptions = [
  {
    id: "short-term",
    name: "Curto Prazo",
    description: "Até 2 anos",
    details:
      "Ideal para objetivos financeiros de curto prazo como reserva de emergência ou compras planejadas.",
  },
  {
    id: "medium-term",
    name: "Médio Prazo",
    description: "2 a 5 anos",
    details:
      "Adequado para objetivos intermediários como entrada de imóvel ou estudos.",
  },
  {
    id: "long-term",
    name: "Longo Prazo",
    description: "Mais de 5 anos",
    details:
      "Ideal para aposentadoria, independência financeira ou objetivos de longo prazo.",
  },
  {
    id: "mixed",
    name: "Misto",
    description: "Múltiplos objetivos",
    details:
      "Combinação de horizontes para diferentes objetivos financeiros simultâneos.",
  },
];

const InvestmentHorizonSelector: React.FC<InvestmentHorizonSelectorProps> = ({
  selectedHorizon = "long-term",
  onHorizonChange,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const handleHorizonChange = (value: string) => {
    setIsLoading(true);
    try {
      onHorizonChange(value);
    } finally {
      // Simular um pequeno atraso para mostrar o estado de carregamento
      setTimeout(() => setIsLoading(false), 300);
    }
  };
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Horizonte de Investimento</CardTitle>
      </CardHeader>
      <CardContent>
        <Label className="text-base font-medium mb-3 block">
          Selecione o Horizonte Temporal
        </Label>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3 rounded-md border border-gray-200">
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <RadioGroup
            value={selectedHorizon}
            onValueChange={handleHorizonChange}
            className="space-y-2"
          >
            {horizonOptions.map((horizon) => (
              <div
                key={horizon.id}
                className={`flex items-start space-x-2 p-3 rounded-md border ${selectedHorizon === horizon.id ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}
              >
                <RadioGroupItem
                  value={horizon.id}
                  id={horizon.id}
                  className="mt-1"
                />
                <div className="space-y-1">
                  <label
                    htmlFor={horizon.id}
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    {horizon.name}{" "}
                    <span className="text-gray-500 font-normal">
                      ({horizon.description})
                    </span>
                  </label>
                  <p className="text-xs text-gray-500">{horizon.details}</p>
                </div>
              </div>
            ))}
          </RadioGroup>
        )}
      </CardContent>
    </Card>
  );
};

export default InvestmentHorizonSelector;
