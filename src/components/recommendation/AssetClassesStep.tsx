import React, { useState } from "react";
import { Checkbox } from "../ui/checkbox";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";

interface AssetClass {
  id: string;
  name: string;
  description: string;
  category: "Stocks" | "Bonds" | "Alternatives" | "Cash";
}

interface AssetClassesStepProps {
  onPrevious?: () => void;
  onNext?: (selectedAssets: string[]) => void;
  preselectedAssets?: string[];
}

const getCategoryName = (category: string): string => {
  switch (category) {
    case "Stocks":
      return "Ações Brasileiras";
    case "Bonds":
      return "Renda Fixa";
    case "Alternatives":
      return "Alternativos";
    case "International":
      return "Ativos Internacionais";
    case "Crypto":
      return "Criptomoedas";
    case "Cash":
      return "Caixa/Liquidez";
    default:
      return category;
  }
};

const AssetClassesStep: React.FC<AssetClassesStepProps> = ({
  onPrevious = () => {},
  onNext = () => {},
  preselectedAssets = [],
}) => {
  const [selectedAssets, setSelectedAssets] =
    useState<string[]>(preselectedAssets);

  // Sample asset classes data
  const assetClasses: AssetClass[] = [
    // Ações Brasileiras
    {
      id: "acoes-brasileiras-large-cap",
      name: "Ações Brasileiras - Large Cap",
      description:
        "Empresas brasileiras de grande capitalização (PETR4, VALE3, ITUB4)",
      category: "Stocks",
    },
    {
      id: "acoes-brasileiras-mid-cap",
      name: "Ações Brasileiras - Mid Cap",
      description:
        "Empresas brasileiras de média capitalização (MGLU3, RENT3, LWSA3)",
      category: "Stocks",
    },
    {
      id: "acoes-brasileiras-small-cap",
      name: "Ações Brasileiras - Small Cap",
      description:
        "Empresas brasileiras de pequena capitalização (PETZ3, CASH3, MLAS3)",
      category: "Stocks",
    },
    {
      id: "acoes-dividendos",
      name: "Ações de Dividendos",
      description:
        "Empresas com histórico de pagamento de dividendos (TAEE11, BBSE3, TRPL4)",
      category: "Stocks",
    },
    {
      id: "etfs-acoes-brasileiras",
      name: "ETFs de Ações Brasileiras",
      description: "ETFs que replicam índices da B3 (BOVA11, IVVB11, SMAL11)",
      category: "Stocks",
    },

    // Renda Fixa
    {
      id: "tesouro-direto",
      name: "Tesouro Direto",
      description:
        "Títulos públicos federais (Tesouro Selic, Tesouro IPCA+, Tesouro Prefixado)",
      category: "Bonds",
    },
    {
      id: "cdbs",
      name: "CDBs",
      description:
        "Certificados de Depósito Bancário emitidos por bancos brasileiros",
      category: "Bonds",
    },
    {
      id: "lci-lca",
      name: "LCI/LCA",
      description:
        "Letras de Crédito Imobiliário e do Agronegócio, isentas de IR",
      category: "Bonds",
    },
    {
      id: "debentures",
      name: "Debêntures",
      description: "Títulos de dívida corporativa de empresas brasileiras",
      category: "Bonds",
    },
    {
      id: "fundos-renda-fixa",
      name: "Fundos de Renda Fixa",
      description:
        "Fundos que investem em títulos de renda fixa públicos e privados",
      category: "Bonds",
    },

    // Alternativos
    {
      id: "fundos-imobiliarios",
      name: "Fundos Imobiliários",
      description: "FIIs listados na B3 (KNRI11, HGLG11, XPLG11)",
      category: "Alternatives",
    },
    {
      id: "ouro",
      name: "Ouro",
      description: "Investimento em ouro físico ou ETFs de ouro",
      category: "Alternatives",
    },
    {
      id: "fundos-multimercado",
      name: "Fundos Multimercado",
      description:
        "Fundos com estratégias diversificadas e maior flexibilidade",
      category: "Alternatives",
    },
    {
      id: "previdencia-privada",
      name: "Previdência Privada",
      description: "PGBL e VGBL com benefícios fiscais para aposentadoria",
      category: "Alternatives",
    },

    // Ativos Internacionais
    {
      id: "bdrs",
      name: "BDRs",
      description:
        "Brazilian Depositary Receipts de empresas estrangeiras (AAPL34, MSFT34)",
      category: "International",
    },
    {
      id: "etfs-internacionais",
      name: "ETFs Internacionais",
      description: "ETFs que replicam índices internacionais (IVVB11, SPXI11)",
      category: "International",
    },
    {
      id: "acoes-eua",
      name: "Ações Americanas",
      description:
        "Ações de empresas listadas nas bolsas dos EUA (via corretora internacional)",
      category: "International",
    },
    {
      id: "fundos-internacionais",
      name: "Fundos de Investimento Internacional",
      description: "Fundos brasileiros que investem no exterior",
      category: "International",
    },

    // Criptomoedas
    {
      id: "bitcoin",
      name: "Bitcoin",
      description: "A criptomoeda mais conhecida e de maior capitalização",
      category: "Crypto",
    },
    {
      id: "ethereum",
      name: "Ethereum",
      description:
        "Plataforma de contratos inteligentes e segunda maior criptomoeda",
      category: "Crypto",
    },
    {
      id: "etfs-cripto",
      name: "ETFs de Criptomoedas",
      description: "ETFs que investem em criptomoedas (HASH11, QBTC11)",
      category: "Crypto",
    },
    {
      id: "fundos-cripto",
      name: "Fundos de Criptoativos",
      description:
        "Fundos brasileiros que investem em criptomoedas e blockchain",
      category: "Crypto",
    },

    // Caixa/Liquidez
    {
      id: "poupanca",
      name: "Poupança",
      description: "Caderneta de poupança tradicional, com liquidez imediata",
      category: "Cash",
    },
    {
      id: "fundos-di",
      name: "Fundos DI",
      description: "Fundos que acompanham a taxa DI (CDI) com alta liquidez",
      category: "Cash",
    },
  ];

  const categories = [
    "Stocks",
    "Bonds",
    "Alternatives",
    "International",
    "Crypto",
    "Cash",
  ];

  const toggleAsset = (assetId: string) => {
    setSelectedAssets((prev) =>
      prev.includes(assetId)
        ? prev.filter((id) => id !== assetId)
        : [...prev, assetId],
    );
  };

  const handleNext = () => {
    onNext(selectedAssets);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-sm">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Selecionar Classes de Ativos
        </h1>
        <p className="text-gray-600 mt-2">
          Escolha as classes de ativos que deseja incluir em seu portfólio de
          investimentos.
        </p>
      </div>

      <div className="space-y-6">
        {categories.map((category) => (
          <Card
            key={category}
            className="bg-card hover:shadow-md transition-shadow duration-300"
          >
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <CardTitle className="text-blue-800">
                {getCategoryName(category)}
              </CardTitle>
              <CardDescription>
                Selecione os {getCategoryName(category).toLowerCase()} que
                deseja incluir em seu portfólio
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assetClasses
                  .filter((asset) => asset.category === category)
                  .map((asset) => (
                    <div
                      key={asset.id}
                      className={`flex items-start space-x-3 p-3 rounded-md border ${selectedAssets.includes(asset.id) ? "border-blue-200 bg-blue-50" : "border-gray-100"} hover:bg-blue-50 hover:border-blue-200 transition-all cursor-pointer`}
                      onClick={() => toggleAsset(asset.id)}
                    >
                      <Checkbox
                        id={asset.id}
                        checked={selectedAssets.includes(asset.id)}
                        onCheckedChange={() => toggleAsset(asset.id)}
                        className="mt-1"
                      />
                      <div>
                        <label
                          htmlFor={asset.id}
                          className="font-medium text-gray-900 cursor-pointer flex items-center"
                        >
                          {asset.name}
                          <Info className="h-4 w-4 ml-2 text-gray-400 hover:text-blue-500" />
                        </label>
                        <p className="text-sm text-gray-500 mt-1">
                          {asset.description}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between mt-8">
        <Button
          variant="outline"
          onClick={onPrevious}
          className="flex items-center"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Anterior
        </Button>
        <div className="flex items-center gap-2">
          {selectedAssets.length > 0 && (
            <span className="text-sm text-green-600 font-medium">
              {selectedAssets.length}{" "}
              {selectedAssets.length === 1
                ? "ativo selecionado"
                : "ativos selecionados"}
            </span>
          )}
          <Button
            onClick={handleNext}
            disabled={selectedAssets.length === 0}
            className="flex items-center bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            Próximo
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {selectedAssets.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mt-4 flex items-start">
          <Info className="h-5 w-5 text-amber-500 mt-0.5 mr-2 flex-shrink-0" />
          <p className="text-amber-800 text-sm">
            Por favor, selecione pelo menos uma classe de ativos para continuar.
            A diversificação entre diferentes classes é recomendada para um
            portfólio equilibrado.
          </p>
        </div>
      )}
    </div>
  );
};

export default AssetClassesStep;
