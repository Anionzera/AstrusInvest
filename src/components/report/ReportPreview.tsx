import React, { useState, useEffect, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import {
  Download,
  Printer,
  Share2,
  BarChart2,
  PieChart as PieChartIcon,
  Table2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "../ui/badge";
import ScrollToTop from "../ui/scroll-to-top";
import { PieChartComponent } from "../charts/PieChart";
import { getMacroeconomicData, MacroeconomicData } from "../../lib/macroeconomicService";

interface ReportPreviewProps {
  title?: string;
  description?: string;
  clientName?: string;
  date?: string;
  riskProfile?: string;
  investmentHorizon?: string;
  allocationStrategy?: string;
  marketScenario?: string;
  assetAllocation?: {
    name: string;
    percentage: number;
    color: string;
    category?: string;
    description?: string;
  }[];
  includeExecutiveSummary?: boolean;
  includeMarketAnalysis?: boolean;
  includeAssetAllocation?: boolean;
  includePerformanceProjections?: boolean;
  onDownload?: () => void;
  onPrint?: () => void;
  onShare?: () => void;
}

const COLORS = [
  "#0088FE", // Azul - Ações
  "#00C49F", // Verde - Renda Fixa
  "#FFBB28", // Amarelo - Alternativos
  "#FF8042", // Laranja - Caixa
  "#8884d8", // Roxo - Criptomoedas
  "#82ca9d", // Verde claro - Commodities
  "#ff6b6b", // Vermelho - Imóveis
  "#6a5acd", // Azul escuro - Internacional
];

// Função para obter a descrição da estratégia
const getStrategyDescription = (strategy: string = ""): string => {
  const descriptions: Record<string, string> = {
    "Portfólio Permanente":
      "O Portfólio Permanente é uma estratégia de investimento que busca manter o valor do capital em diferentes cenários econômicos. Tradicionalmente, divide os investimentos igualmente entre quatro classes de ativos: ações, títulos de longo prazo, ouro e caixa, cada um representando 25% da carteira. Em versões modernas, pode incluir uma pequena alocação em criptomoedas como parte dos ativos alternativos.",
    "Portfólio All Weather":
      "O Portfólio All Weather é uma estratégia desenvolvida para ter bom desempenho em qualquer ambiente econômico. Ele equilibra exposições a crescimento, inflação, deflação e recessão, distribuindo os investimentos entre ações, títulos de longo e médio prazo, commodities, caixa e, em adaptações contemporâneas, criptomoedas como hedge adicional contra inflação e diversificação.",
    "Tradicional 60/40":
      "A estratégia Tradicional 60/40 aloca 60% dos investimentos em ações e 40% em títulos de renda fixa. É uma abordagem clássica que busca equilibrar crescimento e estabilidade. Versões modernas podem incluir uma pequena alocação (5-10%) em ativos alternativos, incluindo criptomoedas, para melhorar a diversificação e potencialmente aumentar retornos ajustados ao risco.",
    "Otimização de Markowitz":
      "Baseada na Teoria Moderna do Portfólio, a Otimização de Markowitz busca maximizar o retorno esperado para um determinado nível de risco. Utiliza correlações entre ativos para criar uma carteira eficiente. A inclusão de criptomoedas neste modelo pode melhorar a fronteira eficiente devido à sua baixa correlação histórica com ativos tradicionais.",
    "Paridade de Risco":
      "A estratégia de Paridade de Risco aloca os investimentos de forma que cada classe de ativos contribua igualmente para o risco total do portfólio. Isso geralmente resulta em maior diversificação e menor concentração em ativos mais voláteis. Criptomoedas podem ser incluídas com uma alocação ajustada pelo risco, tipicamente resultando em uma pequena porcentagem do portfólio total.",
    "Black-Litterman":
      "O modelo Black-Litterman combina as visões do investidor sobre o mercado com o equilíbrio de mercado para criar alocações personalizadas. É uma abordagem sofisticada que permite incorporar expectativas específicas sobre classes de ativos, incluindo visões sobre o potencial de valorização ou desvalorização de criptomoedas no portfólio.",
    "Pesos Iguais":
      "A estratégia de Pesos Iguais distribui o capital uniformemente entre todas as classes de ativos disponíveis. É uma abordagem simples que evita a concentração excessiva. Ao incluir criptomoedas como uma classe de ativo independente, cada classe (incluindo criptomoedas) receberia a mesma alocação percentual no portfólio.",
    "Momentum e Rotação":
      "Esta estratégia investe em ativos que demonstraram forte desempenho recente (momentum) e realiza rotações periódicas entre classes de ativos com base em seu desempenho relativo. O mercado de criptomoedas, conhecido por seus ciclos de alta volatilidade, pode ser monitorado para ajustes táticos na alocação quando apresentar forte momentum positivo.",
    "Variância Mínima":
      "A estratégia de Variância Mínima busca criar um portfólio com a menor volatilidade possível, independentemente do retorno esperado. Foca em ativos de baixa volatilidade e correlações negativas. Devido à alta volatilidade das criptomoedas, sua alocação nesta estratégia seria tipicamente limitada, mas ainda pode contribuir para a diversificação.",
    "Alocação Personalizada":
      "Esta estratégia foi personalizada especificamente para seu perfil de risco, horizonte de investimento e objetivos financeiros. Combina elementos de diversas abordagens para criar uma alocação sob medida, incluindo uma exposição a criptomoedas calibrada de acordo com sua tolerância ao risco e conhecimento sobre ativos digitais.",
  };

  // Verificar se a estratégia existe no mapa, caso contrário retornar mensagem padrão
  return descriptions[strategy] || "Descrição da estratégia não disponível.";
};

// Helper para identificar a categoria com base no nome do ativo
const identifyCategory = (assetName: string, assetCategory?: string): string => {
  if (assetCategory && assetCategory !== "Outros") return assetCategory;

  const categoryMap: Record<string, string> = {
    "Ações": "Ações",
    "Variável": "Ações",
    "Tesouro": "Renda Fixa",
    "CDB": "Renda Fixa",
    "LCI": "Renda Fixa",
    "LCA": "Renda Fixa",
    "Fixa": "Renda Fixa",
    "Imobiliários": "Fundos Imobiliários",
    "FII": "Fundos Imobiliários",
    "Multi": "Fundos Multimercado",
    "Multimercado": "Fundos Multimercado",
    "Bitcoin": "Criptomoedas",
    "Ethereum": "Criptomoedas",
    "Cripto": "Criptomoedas",
    "Internacional": "Internacional",
    "Exterior": "Internacional",
    "Global": "Internacional",
    "Ouro": "Commodities",
    "Commodities": "Commodities"
  };

  // Verificar correspondências no nome do ativo
  for (const [key, category] of Object.entries(categoryMap)) {
    if (assetName.toLowerCase().includes(key.toLowerCase())) {
      return category;
    }
  }

  return "Outros";
};

// Helper para obter cor com base na categoria
const getCategoryColor = (category: string): string => {
  const categoryColors: Record<string, string> = {
    "Ações": "#0088FE",            // Azul
    "Renda Fixa": "#00C49F",       // Verde água
    "Fundos Imobiliários": "#FF8042", // Laranja
    "Fundos Multimercado": "#FFBB28", // Amarelo
    "Criptomoedas": "#8884d8",     // Roxo
    "Internacional": "#82ca9d",    // Verde
    "Commodities": "#D264B6",      // Rosa
    "Outros": "#6a5acd"            // Violeta
  };

  return categoryColors[category] || "#6a5acd"; // Padrão violeta se não encontrar
};

// Definição de interface para Asset
interface Asset {
  name: string;
  percentage: number;
  color: string;
  category?: string;
  description?: string;
}

// Interface para CategoryAsset
interface CategoryAsset {
  name: string;
  percentage: number;
  color: string;
  assets: Asset[];
}

// Função para agrupar ativos por categoria
const groupAssetsByCategory = (assets: Asset[]): CategoryAsset[] => {
  const categories: Record<string, CategoryAsset> = {};
  
  assets.forEach((asset: Asset) => {
    // Identificar a categoria real com base no nome e na categoria fornecida
    const category: string = identifyCategory(asset.name, asset.category);
    
    if (!categories[category]) {
      categories[category] = {
        name: category,
        percentage: 0,
        color: asset.color || getCategoryColor(category),
        assets: [],
      };
    }
    
    categories[category].percentage += asset.percentage;
    categories[category].assets.push({
      ...asset,
      category // Garantir que o ativo tenha a categoria identificada
    });
  });

  return Object.values(categories);
};

// Hook personalizado para obter dados macroeconômicos
const useMacroData = () => {
  const [data, setData] = useState<MacroeconomicData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Buscar dados macroeconômicos atualizados
        console.log("Buscando dados macroeconômicos atualizados...");
        
        // Usar o serviço para obter dados macroeconômicos
        const macroData = await getMacroeconomicData();
        
        if (!macroData) {
          throw new Error('Dados macroeconômicos não disponíveis');
        }
        
        console.log("Dados macroeconômicos obtidos:", macroData);
        
        // Atualizar a previsão da próxima reunião do Copom para 15%
        if (macroData.indicadores?.selic) {
          macroData.indicadores.selic.previsaoProximaReuniao = 15.0;
          
          // Ajustar também o indicativo de tendência para 'alta'
          if (macroData.tendencias) {
            macroData.tendencias.jurosIndicativo = 'alta';
          }
        }
        
        // Atualizar os dados de inflação (IPCA)
        if (macroData.indicadores?.ipca) {
          macroData.indicadores.ipca.acumulado12Meses = 5.06;
          macroData.indicadores.ipca.mensal = 1.31;
          macroData.indicadores.ipca.previsaoAnual = 4.8;
          
          // Ajustar indicativo de tendência
          if (macroData.tendencias) {
            macroData.tendencias.inflacaoIndicativo = 'alta';
          }
        }
        
        // Atualizar os dados de crescimento (PIB)
        if (macroData.indicadores?.pib) {
          macroData.indicadores.pib.previsaoAnual = 3.4;
          macroData.indicadores.pib.ultimoTrimestre = 0.2;
          
          // Ajustar indicativo de tendência
          if (macroData.tendencias) {
            macroData.tendencias.curtoIndicativo = 'expansao';
          }
        }
        
        // Armazenar no sessionStorage para uso posterior no PDF
        sessionStorage.setItem('macroeconomicData', JSON.stringify(macroData));
        
        // Usar os dados atualizados
        setData(macroData);
        setLoading(false);
      } catch (err) {
        console.error('Erro ao buscar dados macroeconômicos:', err);
        setError('Falha ao obter dados econômicos. Usando valores estáticos.');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
};

// Função para determinar automaticamente o cenário de mercado
const determineMarketScenario = (macroData: MacroeconomicData | null): string => {
  if (!macroData) return "baseline"; // Cenário base como fallback
  
  const { indicadores, tendencias } = macroData;
  
  // Alta inflação com crescimento baixo = estagflação
  if (indicadores.ipca.acumulado12Meses > 7 && indicadores.pib.previsaoAnual < 1.5) {
    return "stagflation";
  }
  
  // Alta inflação com juros altos = cenário de alta inflação
  if (indicadores.ipca.acumulado12Meses > 6) {
    return "high-inflation";
  }
  
  // Juros muito altos com pressão cambial = crise cambial
  if (indicadores.selic.atual > 13 && indicadores.cambio.variacao > 10) {
    return "currency-crisis";
  }
  
  // Forte crescimento econômico com juros controlados = mercado em alta
  if (indicadores.pib.previsaoAnual > 3 && tendencias.curtoIndicativo === 'expansao') {
    return "bull-market";
  }
  
  // Crescimento negativo ou muito baixo = mercado em baixa
  if (indicadores.pib.previsaoAnual < 0.8 || tendencias.curtoIndicativo === 'contracao') {
    return "bear-market";
  }
  
  // Juros muito baixos = cenário de juros baixos
  if (indicadores.selic.atual < 7) {
    return "low-interest";
  }
  
  // Recuperação pós-crise
  if (tendencias.curtoIndicativo === 'expansao' && indicadores.pib.ultimoTrimestre > 0.8) {
    return "recovery";
  }
  
  // Default: cenário base
  return "baseline";
};

// Função para obter descrição dinâmica do cenário de mercado
const getMarketScenarioDescription = (scenario: string, macroData: MacroeconomicData | null): string => {
  if (!macroData) {
    // Fallback para as descrições estáticas
    // ... existing scenario descriptions ...
    return "";
  }
  
  const { indicadores } = macroData;
  const selic = indicadores.selic.atual.toFixed(2);
  const ipca = indicadores.ipca.acumulado12Meses.toFixed(2);
  const pib = indicadores.pib.previsaoAnual.toFixed(1);
  
  // Criar descrições dinâmicas baseadas nos dados reais
  switch (scenario) {
    case "baseline":
      return `No cenário base atual, observamos um crescimento econômico de ${pib}% com inflação em ${ipca}%. O Banco Central mantém a taxa Selic em ${selic}%, buscando equilibrar o controle da inflação e o estímulo à atividade econômica. Este cenário favorece uma estratégia de alocação equilibrada entre diferentes classes de ativos, com ênfase em empresas de qualidade com bom histórico de dividendos e títulos de renda fixa com duration moderada. Recomenda-se diversificação internacional e exposição controlada a ativos de risco.`;
    
    case "bull-market":
      return `No atual cenário de mercado em alta, projetamos crescimento econômico de ${pib}% com inflação de ${ipca}%. A taxa Selic em ${selic}% proporciona um ambiente ainda favorável, impulsionando os mercados de ações. Este ambiente favorece maior exposição a ativos de risco, como ações de empresas cíclicas, small caps com potencial de crescimento e setores de consumo discricionário. A diversificação internacional também se mostra estratégica para capturar oportunidades globais.`;
    
    case "bear-market":
      return `No cenário atual de mercado em baixa, enfrentamos uma desaceleração econômica com crescimento de apenas ${pib}% e inflação em ${ipca}%. Com a taxa Selic em ${selic}%, observamos uma postura mais conservadora do Banco Central. Recomenda-se maior alocação em empresas defensivas (utilities, bens de consumo básico), títulos públicos, ativos de proteção como ouro, empresas com baixo endividamento e ativos de qualidade a preços descontados. A preservação de capital torna-se prioridade neste cenário.`;
    
    case "high-inflation":
      return `No cenário atual de alta inflação, enfrentamos pressões inflacionárias persistentes de ${ipca}% com crescimento econômico limitado de ${pib}%. O Banco Central mantém uma política monetária restritiva com taxa Selic em ${selic}%, buscando conter a inflação. Recomenda-se alocação em títulos indexados à inflação, empresas com poder de precificação, commodities, imóveis como proteção e setores de energia e recursos naturais.`;
    
    case "stagflation":
      return `No cenário atual de estagflação, enfrentamos a combinação desafiadora de baixo crescimento econômico de ${pib}% e inflação elevada de ${ipca}%. O Banco Central enfrenta o dilema entre combater a inflação e estimular a economia, mantendo juros em ${selic}%. Recomenda-se alocação em títulos indexados à inflação, commodities, empresas com forte poder de precificação, setores defensivos, ouro e outros ativos reais com fluxo de caixa indexado.`;
    
    default:
      // Para outros cenários, manter as descrições estáticas
      return "";
  }
};

const ReportPreview: React.FC<ReportPreviewProps> = ({
  title = "Relatório de Investimentos",
  description = "Análise detalhada e recomendações de investimento",
  clientName = "Cliente",
  date = new Date().toLocaleDateString(),
  riskProfile = "Moderado",
  investmentHorizon = "5 anos (Médio Prazo)",
  allocationStrategy = "Alocação Personalizada",
  marketScenario = "baseline",
  assetAllocation = [
    {
      name: "Ações Brasileiras (Large Cap)",
      percentage: 25,
      color: "#0088FE",
      category: "Ações",
      description:
        "Empresas brasileiras de grande capitalização, como as que compõem o Ibovespa",
    },
    {
      name: "Tesouro Direto",
      percentage: 20,
      color: "#00C49F",
      category: "Renda Fixa",
      description:
        "Títulos públicos federais com diferentes indexadores e prazos",
    },
    {
      name: "CDBs",
      percentage: 20,
      color: "#FFBB28",
      category: "Renda Fixa",
      description:
        "Certificados de Depósito Bancário, títulos emitidos por bancos",
    },
    {
      name: "Fundos Imobiliários",
      percentage: 15,
      color: "#FF8042",
      category: "Híbrido",
      description:
        "Fundos que investem em imóveis comerciais, residenciais ou títulos do setor",
    },
    {
      name: "Bitcoin",
      percentage: 10,
      color: "#8884d8",
      category: "Outros",
      description: "Ativo selecionado para alocação",
    },
    {
      name: "Ethereum",
      percentage: 10,
      color: "#82ca9d",
      category: "Outros",
      description: "Ativo selecionado para alocação",
    },
  ],
  includeExecutiveSummary = true,
  includeMarketAnalysis = true,
  includeAssetAllocation = true,
  includePerformanceProjections = false,
  onDownload = () => {},
  onPrint = () => {},
  onShare = () => {},
}) => {
  const [viewType, setViewType] = React.useState("pie");
  const categorizedAssets = groupAssetsByCategory(assetAllocation);
  const { data: macroData, loading: macroLoading, error: macroError } = useMacroData();

  // Determinar cenário de mercado baseado nos dados macroeconômicos
  const detectedScenario = useMemo(() => 
    determineMarketScenario(macroData), [macroData]);
  
  // Usar o cenário detectado ou o fornecido via props
  const actualScenario = macroData ? detectedScenario : marketScenario;
  
  // Obter descrição do cenário
  const scenarioDescription = getMarketScenarioDescription(actualScenario, macroData);

  // Atualizar o fluxo de dados para consumo no PDF
  useEffect(() => {
    if (macroData && detectedScenario && detectedScenario !== marketScenario) {
      console.log("Cenário de mercado detectado automaticamente:", detectedScenario);
      // Armazenar no sessionStorage para uso posterior
      sessionStorage.setItem('detectedMarketScenario', detectedScenario);
    }
  }, [detectedScenario, marketScenario, macroData]);

  // Dados para o gráfico de barras por categoria
  const categoryData = categorizedAssets.map((category: CategoryAsset) => ({
    name: category.name,
    value: category.percentage,
    color: category.color,
  }));

  // Rolar para o topo quando o componente for montado
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Formatar números para exibição 
  const formatNumber = (value: number, suffix: string = "%") => {
    return `${value.toFixed(2).replace('.', ',')}${suffix}`;
  };

  return (
    <div className="w-full h-full overflow-auto p-4 bg-white dark:bg-gray-800">
      <ScrollToTop showBelow={300} />
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-blue-800 dark:text-blue-300 mb-2">
            {title}
          </h1>
          <p className="text-gray-600 dark:text-gray-300">{description}</p>
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            <p>Cliente: {clientName}</p>
            <p>Data: {date}</p>
          </div>
        </div>

        {includeExecutiveSummary && (
          <Card className="mb-8 border-blue-100 dark:border-blue-900">
            <CardHeader>
              <CardTitle className="text-xl text-blue-700 dark:text-blue-300">
                Resumo Executivo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-lg border border-blue-100 dark:border-blue-800/30 mb-6">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  Este relatório apresenta uma análise detalhada e recomendações
                  de investimento personalizadas para{" "}
                  <span className="font-semibold text-blue-800 dark:text-blue-300">
                    {clientName}
                  </span>
                  , considerando seu perfil de risco e horizonte de
                  investimento. A estratégia recomendada foi elaborada para
                  otimizar o equilíbrio entre retorno potencial e exposição ao
                  risco, alinhada aos objetivos financeiros do cliente.
                </p>
              </div>

              <h3 className="text-lg font-medium text-blue-700 dark:text-blue-300 mb-3">
                Principais Características
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-blue-100 dark:border-blue-900/30 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mr-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-blue-600 dark:text-blue-400"
                      >
                        <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"></path>
                      </svg>
                    </div>
                    <h3 className="font-medium text-blue-700 dark:text-blue-300">
                      Perfil de Risco
                    </h3>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 font-semibold text-lg">
                    {riskProfile}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {riskProfile === "Conservador"
                      ? "Prioriza preservação de capital e estabilidade"
                      : riskProfile === "Moderado"
                        ? "Equilibra crescimento e proteção patrimonial"
                        : "Foco em crescimento com maior tolerância à volatilidade"}
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-blue-100 dark:border-blue-900/30 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mr-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-blue-600 dark:text-blue-400"
                      >
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                    </div>
                    <h3 className="font-medium text-blue-700 dark:text-blue-300">
                      Horizonte de Investimento
                    </h3>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 font-semibold text-lg">
                    {investmentHorizon}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {investmentHorizon.includes("Curto")
                      ? "Foco em liquidez e preservação de capital"
                      : investmentHorizon.includes("Médio")
                        ? "Equilíbrio entre crescimento e estabilidade"
                        : "Prioridade para crescimento e valorização a longo prazo"}
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-blue-100 dark:border-blue-900/30 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mr-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-blue-600 dark:text-blue-400"
                      >
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                      </svg>
                    </div>
                    <h3 className="font-medium text-blue-700 dark:text-blue-300">
                      Estratégia
                    </h3>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 font-semibold text-lg">
                    {allocationStrategy}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Estratégia personalizada para otimizar resultados
                  </p>
                </div>
              </div>

              <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800/30">
                <h3 className="font-medium text-blue-700 dark:text-blue-300 mb-2">
                  Recomendação Personalizada
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Esta alocação foi cuidadosamente elaborada considerando o
                  perfil de risco {riskProfile.toLowerCase()}, com horizonte de
                  investimento de {investmentHorizon.toLowerCase()}. A
                  estratégia {allocationStrategy.toLowerCase()}
                  foi selecionada para proporcionar o melhor equilíbrio entre
                  potencial de retorno e proteção patrimonial, alinhada aos
                  objetivos financeiros específicos do cliente.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {includeMarketAnalysis && (
          <Card className="mb-8 border-indigo-100 dark:border-indigo-900">
            <CardHeader>
              <CardTitle className="text-xl text-indigo-700 dark:text-indigo-300">
                Análise de Mercado
              </CardTitle>
              <CardDescription>
                Cenário:{" "}
                {actualScenario === "baseline"
                  ? "Base"
                  : actualScenario === "bull-market"
                    ? "Mercado em Alta"
                    : actualScenario === "bear-market"
                      ? "Mercado em Baixa"
                      : actualScenario === "high-inflation"
                        ? "Alta Inflação"
                        : actualScenario === "low-interest"
                          ? "Juros Baixos"
                          : actualScenario === "global-crisis"
                            ? "Crise Global"
                            : actualScenario === "recovery"
                              ? "Recuperação Econômica"
                              : actualScenario === "tech-boom"
                                ? "Boom Tecnológico"
                                : actualScenario === "commodity-super-cycle"
                                  ? "Superciclo de Commodities"
                                  : actualScenario === "stagflation"
                                    ? "Estagflação"
                                    : "Crise Cambial"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center mr-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-indigo-600 dark:text-indigo-400"
                  >
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-indigo-700 dark:text-indigo-300 text-lg">
                    Cenário:{" "}
                    {actualScenario === "baseline"
                      ? "Base"
                      : actualScenario === "bull-market"
                        ? "Mercado em Alta"
                        : actualScenario === "bear-market"
                          ? "Mercado em Baixa"
                          : actualScenario === "high-inflation"
                            ? "Alta Inflação"
                            : actualScenario === "low-interest"
                              ? "Juros Baixos"
                              : actualScenario === "global-crisis"
                                ? "Crise Global"
                                : actualScenario === "recovery"
                                  ? "Recuperação Econômica"
                                  : actualScenario === "tech-boom"
                                    ? "Boom Tecnológico"
                                    : actualScenario === "commodity-super-cycle"
                                      ? "Superciclo de Commodities"
                                      : actualScenario === "stagflation"
                                        ? "Estagflação"
                                        : "Crise Cambial"}
                  </h3>
                  <p className="text-sm text-indigo-600/70 dark:text-indigo-400/70">
                    Análise atualizada em {macroData?.ultimaAtualizacao ? new Date(macroData.ultimaAtualizacao).toLocaleDateString() : new Date().toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 border border-indigo-100 dark:border-indigo-900/30 rounded-lg p-5 shadow-sm mb-6">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {scenarioDescription}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-5 rounded-lg border border-indigo-100 dark:border-indigo-800/30">
                  <h3 className="font-medium text-indigo-700 dark:text-indigo-300 mb-3">
                    Perspectivas Macroeconômicas
                  </h3>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-indigo-500 dark:text-indigo-400 mt-1 mr-2 flex-shrink-0"
                      >
                        <polyline points="9 11 12 14 22 4"></polyline>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                      </svg>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {actualScenario === "baseline"
                          ? "Crescimento econômico moderado de 2,5% e sustentável"
                          : actualScenario === "bull-market"
                            ? "Forte crescimento econômico de 4,5%"
                            : actualScenario === "bear-market"
                              ? "Desaceleração econômica significativa com crescimento de apenas 0,5%"
                              : actualScenario === "high-inflation"
                                ? "Crescimento limitado de 1,5% com pressões inflacionárias"
                                : actualScenario === "low-interest"
                                  ? "Crescimento saudável de 3,0% com juros baixos"
                                  : actualScenario === "global-crisis"
                                    ? "Contração econômica severa com crescimento negativo de -2,0%"
                                    : actualScenario === "recovery"
                                      ? "Fase de recuperação com crescimento de 3,5%"
                                      : actualScenario === "tech-boom"
                                        ? "Crescimento de 3,0% impulsionado pelo setor tecnológico"
                                        : actualScenario ===
                                            "commodity-super-cycle"
                                          ? "Crescimento de 2,8% com alta de commodities"
                                          : actualScenario === "stagflation"
                                            ? "Estagnação econômica com crescimento de apenas 0,5%"
                                            : "Crescimento limitado de 1,0% com instabilidade cambial"}
                      </span>
                    </li>
                    <li className="flex items-start">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-indigo-500 dark:text-indigo-400 mt-1 mr-2 flex-shrink-0"
                      >
                        <polyline points="9 11 12 14 22 4"></polyline>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                      </svg>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {actualScenario === "baseline"
                          ? "Inflação controlada em 4,0% próxima ao teto da meta"
                          : actualScenario === "bull-market"
                            ? "Inflação moderada de 5,0% com pressões de demanda"
                            : actualScenario === "bear-market"
                              ? "Inflação baixa de 3,0% com demanda enfraquecida"
                              : actualScenario === "high-inflation"
                                ? "Inflação elevada de 8,5% persistentemente acima da meta"
                                : actualScenario === "low-interest"
                                  ? "Inflação controlada em 3,5% dentro da meta"
                                  : actualScenario === "global-crisis"
                                    ? "Inflação baixa de 2,0% com riscos deflacionários"
                                    : actualScenario === "recovery"
                                      ? "Inflação moderada de 4,5% em trajetória de normalização"
                                      : actualScenario === "tech-boom"
                                        ? "Inflação controlada em 3,0% com ganhos de produtividade"
                                        : actualScenario ===
                                            "commodity-super-cycle"
                                          ? "Pressões inflacionárias de 6,0% impulsionadas por commodities"
                                          : actualScenario === "stagflation"
                                            ? "Inflação elevada de 9,0% com estagnação econômica"
                                            : "Inflação de 7,5% pressionada pela desvalorização cambial"}
                      </span>
                    </li>
                    <li className="flex items-start">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-indigo-500 dark:text-indigo-400 mt-1 mr-2 flex-shrink-0"
                      >
                        <polyline points="9 11 12 14 22 4"></polyline>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                      </svg>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {actualScenario === "baseline"
                          ? "Política monetária neutra com juros em 9,0%"
                          : actualScenario === "bull-market"
                            ? "Política monetária acomodatícia com juros em 7,5%"
                            : actualScenario === "bear-market"
                              ? "Política monetária restritiva com juros em 11,0%"
                              : actualScenario === "high-inflation"
                                ? "Política fortemente restritiva com juros em 13,5%"
                                : actualScenario === "low-interest"
                                  ? "Estímulos monetários com juros baixos em 5,0%"
                                  : actualScenario === "global-crisis"
                                    ? "Política de estímulo com juros em 8,0% e eficácia limitada"
                                    : actualScenario === "recovery"
                                      ? "Manutenção de estímulos com juros em 7,0%"
                                      : actualScenario === "tech-boom"
                                        ? "Política acomodatícia com juros em 6,5%"
                                        : actualScenario ===
                                            "commodity-super-cycle"
                                          ? "Política restritiva com juros em 10,0%"
                                          : actualScenario === "stagflation"
                                            ? "Dilema de política monetária com juros em 12,0%"
                                            : "Defesa da moeda com juros elevados em 14,0%"}
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-5 rounded-lg border border-indigo-100 dark:border-indigo-800/30">
                  <h3 className="font-medium text-indigo-700 dark:text-indigo-300 mb-3">
                    Implicações para Investimentos
                  </h3>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-indigo-500 dark:text-indigo-400 mt-1 mr-2 flex-shrink-0"
                      >
                        <polyline points="9 11 12 14 22 4"></polyline>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                      </svg>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {actualScenario === "baseline"
                          ? "Ações: Retornos positivos de 12% para large caps, foco em qualidade"
                          : actualScenario === "bull-market"
                            ? "Ações: Forte valorização com 18% para large caps e 25% para small caps"
                            : actualScenario === "bear-market"
                              ? "Ações: Retornos limitados de 5% para large caps, preferência por defensivos"
                              : actualScenario === "high-inflation"
                                ? "Ações: Retornos reais pressionados, 10% para large caps com foco em pricing power"
                                : actualScenario === "low-interest"
                                  ? "Ações: Ambiente favorável com 16% para large caps e 20% para small caps"
                                  : actualScenario === "global-crisis"
                                    ? "Ações: Retornos negativos de -5% para large caps e -10% para small caps"
                                    : actualScenario === "recovery"
                                      ? "Ações: Forte recuperação com 20% para large caps e 28% para small caps"
                                      : actualScenario === "tech-boom"
                                        ? "Ações: Destaque para tecnologia com 18% para ações internacionais"
                                        : actualScenario ===
                                            "commodity-super-cycle"
                                          ? "Ações: Valorização de 16% para large caps com foco em commodities"
                                          : actualScenario === "stagflation"
                                            ? "Ações: Retornos reais negativos com apenas 4% nominais para large caps"
                                            : "Ações: Exportadoras em destaque com 20% para ações internacionais"}
                      </span>
                    </li>
                    <li className="flex items-start">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-indigo-500 dark:text-indigo-400 mt-1 mr-2 flex-shrink-0"
                      >
                        <polyline points="9 11 12 14 22 4"></polyline>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                      </svg>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {actualScenario === "baseline"
                          ? "Renda Fixa: Retornos estáveis de 9,5% para títulos públicos, duration moderada"
                          : actualScenario === "bull-market"
                            ? "Renda Fixa: Retornos de 8,0% para títulos públicos, preferência por maior risco"
                            : actualScenario === "bear-market"
                              ? "Renda Fixa: Atrativa com 11,5% para títulos públicos, foco em qualidade"
                              : actualScenario === "high-inflation"
                                ? "Renda Fixa: Retornos nominais de 14% para títulos públicos indexados à inflação"
                                : actualScenario === "low-interest"
                                  ? "Renda Fixa: Retornos limitados de 6,0% para títulos públicos"
                                  : actualScenario === "global-crisis"
                                    ? "Renda Fixa: Refúgio com 10% para títulos governamentais de qualidade"
                                    : actualScenario === "recovery"
                                      ? "Renda Fixa: Retornos de 8,0% para títulos públicos em cenário de normalização"
                                      : actualScenario === "tech-boom"
                                        ? "Renda Fixa: Retornos moderados de 7,0% para títulos públicos"
                                        : actualScenario ===
                                            "commodity-super-cycle"
                                          ? "Renda Fixa: Retornos de 11,0% para títulos públicos com pressão inflacionária"
                                          : actualScenario === "stagflation"
                                            ? "Renda Fixa: Retornos nominais de 13,0% com foco em proteção real"
                                            : "Renda Fixa: Retornos de 15,0% para títulos públicos com prêmio de risco elevado"}
                      </span>
                    </li>
                    <li className="flex items-start">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-indigo-500 dark:text-indigo-400 mt-1 mr-2 flex-shrink-0"
                      >
                        <polyline points="9 11 12 14 22 4"></polyline>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                      </svg>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {actualScenario === "baseline"
                          ? "Alternativos: Fundos imobiliários com 11% e ouro com 7% para diversificação"
                          : actualScenario === "bull-market"
                            ? "Alternativos: Fundos imobiliários com 16% e criptomoedas com 35% de potencial"
                            : actualScenario === "bear-market"
                              ? "Alternativos: Ouro com 12% como proteção e fundos multimercado com 8%"
                              : actualScenario === "high-inflation"
                                ? "Alternativos: Ouro com 15% e fundos imobiliários com 12% como proteção real"
                                : actualScenario === "low-interest"
                                  ? "Alternativos: Fundos imobiliários com 14% e criptomoedas com 25% de potencial"
                                  : actualScenario === "global-crisis"
                                    ? "Alternativos: Ouro com 18% e fundos cambiais com 15% como proteção"
                                    : actualScenario === "recovery"
                                      ? "Alternativos: Fundos imobiliários com 15% e criptomoedas com 30% na retomada"
                                      : actualScenario === "tech-boom"
                                        ? "Alternativos: Criptomoedas com 40% liderando inovação tecnológica"
                                        : actualScenario ===
                                            "commodity-super-cycle"
                                          ? "Alternativos: Ouro com 18% e fundos imobiliários com 13% como proteção real"
                                          : actualScenario === "stagflation"
                                            ? "Alternativos: Ouro com 16% e ativos reais como proteção contra estagflação"
                                            : "Alternativos: Ouro com 25% e fundos cambiais com 28% na crise cambial"}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="font-medium text-indigo-700 dark:text-indigo-300 mb-4">
                  Principais Indicadores Econômicos
                </h3>
                {macroLoading ? (
                  <div className="flex justify-center items-center p-10">
                    <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                    <span className="ml-2 text-indigo-600 dark:text-indigo-400">Carregando dados econômicos...</span>
                  </div>
                ) : macroError ? (
                  <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-200 dark:border-red-800/30 text-center">
                    <p className="text-red-600 dark:text-red-400">{macroError}</p>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">Exibindo dados de cenário estático</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-indigo-100 dark:border-indigo-900/30 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-indigo-700 dark:text-indigo-300 text-sm">
                          Taxa Selic
                        </h4>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            macroData?.tendencias?.jurosIndicativo === 'alta' 
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" 
                              : macroData?.tendencias?.jurosIndicativo === 'baixa' 
                                ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" 
                                : "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                          }`}
                        >
                          {macroData?.tendencias?.jurosIndicativo === 'alta' 
                            ? "Em alta" 
                            : macroData?.tendencias?.jurosIndicativo === 'baixa' 
                              ? "Em queda" 
                              : "Estável"}
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 text-2xl font-bold">
                        {macroData 
                          ? formatNumber(macroData.indicadores.selic.atual, "%") 
                          : actualScenario === "baseline"
                            ? "9,00%"
                            : actualScenario === "bull-market"
                              ? "7,50%"
                              : actualScenario === "bear-market"
                                ? "11,00%"
                                : actualScenario === "high-inflation"
                                  ? "13,50%"
                                  : actualScenario === "low-interest"
                                    ? "5,00%"
                                    : actualScenario === "global-crisis"
                                      ? "8,00%"
                                      : actualScenario === "recovery"
                                        ? "7,00%"
                                        : actualScenario === "tech-boom"
                                          ? "6,50%"
                                          : actualScenario === "commodity-super-cycle"
                                            ? "10,00%"
                                            : actualScenario === "stagflation"
                                              ? "12,00%"
                                              : "14,00%"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {macroData
                          ? `Próxima reunião: ${formatNumber(macroData.indicadores.selic.previsaoProximaReuniao, "%")} (Expectativa de alta)`
                          : actualScenario === "baseline"
                            ? "Política monetária neutra"
                            : actualScenario === "bull-market"
                              ? "Política monetária acomodatícia"
                              : actualScenario === "bear-market"
                                ? "Política restritiva moderada"
                                : actualScenario === "high-inflation"
                                  ? "Política fortemente restritiva"
                                  : actualScenario === "low-interest"
                                    ? "Estímulos monetários significativos"
                                    : actualScenario === "global-crisis"
                                      ? "Estímulos com eficácia limitada"
                                      : actualScenario === "recovery"
                                        ? "Manutenção de estímulos na recuperação"
                                        : actualScenario === "tech-boom"
                                          ? "Política acomodatícia para inovação"
                                          : actualScenario === "commodity-super-cycle"
                                            ? "Combate às pressões inflacionárias"
                                            : actualScenario === "stagflation"
                                              ? "Dilema entre inflação e crescimento"
                                              : "Defesa da moeda local"}
                      </p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-indigo-100 dark:border-indigo-900/30 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-indigo-700 dark:text-indigo-300 text-sm">
                          Inflação (IPCA)
                        </h4>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            macroData?.tendencias?.inflacaoIndicativo === 'alta' 
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" 
                              : macroData?.tendencias?.inflacaoIndicativo === 'baixa' 
                                ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" 
                                : "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                          }`}
                        >
                          {macroData?.tendencias?.inflacaoIndicativo === 'alta' 
                            ? "Em alta" 
                            : macroData?.tendencias?.inflacaoIndicativo === 'baixa' 
                              ? "Em queda" 
                              : "Estável"}
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 text-2xl font-bold">
                        {macroData 
                          ? formatNumber(macroData.indicadores.ipca.acumulado12Meses, "%") 
                          : actualScenario === "baseline"
                            ? "4,0%"
                            : actualScenario === "bull-market"
                              ? "5,0%"
                              : actualScenario === "bear-market"
                                ? "3,0%"
                                : actualScenario === "high-inflation"
                                  ? "8,5%"
                                  : actualScenario === "low-interest"
                                    ? "3,5%"
                                    : actualScenario === "global-crisis"
                                      ? "2,0%"
                                      : actualScenario === "recovery"
                                        ? "4,5%"
                                        : actualScenario === "tech-boom"
                                          ? "3,0%"
                                          : actualScenario === "commodity-super-cycle"
                                            ? "6,0%"
                                            : actualScenario === "stagflation"
                                              ? "9,0%"
                                              : "7,5%"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {macroData
                          ? `Mensal: ${formatNumber(macroData.indicadores.ipca.mensal, "%")} | Previsão anual: ${formatNumber(macroData.indicadores.ipca.previsaoAnual, "%")}`
                          : actualScenario === "baseline"
                            ? "Próxima ao teto da meta"
                            : actualScenario === "bull-market"
                              ? "Acima da meta por pressões de demanda"
                              : actualScenario === "bear-market"
                                ? "Dentro da meta com demanda fraca"
                                : actualScenario === "high-inflation"
                                  ? "Significativamente acima da meta"
                                  : actualScenario === "low-interest"
                                    ? "Dentro da meta central"
                                    : actualScenario === "global-crisis"
                                      ? "Abaixo da meta com riscos deflacionários"
                                      : actualScenario === "recovery"
                                        ? "Próxima ao teto da meta em normalização"
                                        : actualScenario === "tech-boom"
                                          ? "Dentro da meta com ganhos de produtividade"
                                          : actualScenario === "commodity-super-cycle"
                                            ? "Acima da meta por pressão de commodities"
                                            : actualScenario === "stagflation"
                                              ? "Muito acima da meta com estagnação"
                                              : "Acima da meta por pressão cambial"}
                      </p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-indigo-100 dark:border-indigo-900/30 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-indigo-700 dark:text-indigo-300 text-sm">
                          Crescimento PIB
                        </h4>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            macroData?.tendencias?.curtoIndicativo === 'expansao' 
                              ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" 
                              : macroData?.tendencias?.curtoIndicativo === 'contracao' 
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" 
                                : "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                          }`}
                        >
                          {macroData?.tendencias?.curtoIndicativo === 'expansao' 
                            ? "Em expansão" 
                            : macroData?.tendencias?.curtoIndicativo === 'contracao' 
                              ? "Em contração" 
                              : "Estável"}
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 text-2xl font-bold">
                        {macroData 
                          ? formatNumber(macroData.indicadores.pib.previsaoAnual, "%") 
                          : actualScenario === "baseline"
                            ? "2,5%"
                            : actualScenario === "bull-market"
                              ? "4,5%"
                              : actualScenario === "bear-market"
                                ? "0,5%"
                                : actualScenario === "high-inflation"
                                  ? "1,5%"
                                  : actualScenario === "low-interest"
                                    ? "3,0%"
                                    : actualScenario === "global-crisis"
                                      ? "-2,0%"
                                      : actualScenario === "recovery"
                                        ? "3,5%"
                                        : actualScenario === "tech-boom"
                                          ? "3,0%"
                                          : actualScenario === "commodity-super-cycle"
                                            ? "2,8%"
                                            : actualScenario === "stagflation"
                                              ? "0,5%"
                                              : "1,0%"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {macroData
                          ? `Último trimestre: ${formatNumber(macroData.indicadores.pib.ultimoTrimestre, "%")}`
                          : actualScenario === "baseline"
                            ? "Crescimento sustentável moderado"
                            : actualScenario === "bull-market"
                              ? "Crescimento forte acima do potencial"
                              : actualScenario === "bear-market"
                                ? "Crescimento fraco abaixo do potencial"
                                : actualScenario === "high-inflation"
                                  ? "Crescimento limitado por pressões inflacionárias"
                                  : actualScenario === "low-interest"
                                    ? "Crescimento saudável com estímulos"
                                    : actualScenario === "global-crisis"
                                      ? "Recessão com contração econômica"
                                      : actualScenario === "recovery"
                                        ? "Recuperação após período de crise"
                                        : actualScenario === "tech-boom"
                                          ? "Crescimento impulsionado por tecnologia"
                                          : actualScenario === "commodity-super-cycle"
                                            ? "Crescimento apoiado em commodities"
                                            : actualScenario === "stagflation"
                                              ? "Estagnação com pressões inflacionárias"
                                              : "Crescimento limitado por crise cambial"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {includeAssetAllocation && (
          <Card className="mb-8 border-green-100 dark:border-green-900">
            <CardHeader>
              <CardTitle className="text-xl text-green-700 dark:text-green-300">
                Alocação de Ativos
              </CardTitle>
              <CardDescription>
                Estratégia: {allocationStrategy}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <p className="text-gray-700 dark:text-gray-300">
                  {getStrategyDescription(allocationStrategy)}
                </p>
              </div>

              {/* Tabs para diferentes visualizações */}
              <div className="mb-6">
                <Tabs
                  defaultValue={viewType}
                  onValueChange={setViewType}
                  className="w-full"
                >
                  <TabsList className="grid sm:grid-cols-2 md:grid-cols-4 grid-cols-1 gap-1 w-full max-w-md mx-auto">
                    <TabsTrigger
                      value="pie"
                      className="flex items-center justify-center py-2 text-sm"
                    >
                      <PieChartIcon className="h-4 w-4 mr-1.5" />
                      <span className="whitespace-nowrap">Gráfico de Pizza</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="bar"
                      className="flex items-center justify-center py-2 text-sm"
                    >
                      <BarChart2 className="h-4 w-4 mr-1.5" />
                      <span className="whitespace-nowrap">Gráfico de Barras</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="table"
                      className="flex items-center justify-center py-2 text-sm"
                    >
                      <Table2 className="h-4 w-4 mr-1.5" />
                      <span className="whitespace-nowrap">Tabela</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="selected"
                      className="flex items-center justify-center py-2 text-sm"
                    >
                      <span className="whitespace-nowrap">Ativos</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Ativos Selecionados para Alocação */}
              {viewType === "selected" && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-green-700 dark:text-green-300 mb-3">
                    Ativos Selecionados para Alocação
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {assetAllocation.map((asset, index) => {
                      const identifiedCategory = identifyCategory(asset.name, asset.category);
                      const categoryColor = getCategoryColor(identifiedCategory);
                      const bgColor = asset.color || categoryColor;
                      const bgColorLight = `${bgColor}15`;
                      
                      return (
                        <Badge
                          key={index}
                          variant="outline"
                          className="px-3 py-1.5 font-medium"
                          style={{
                            borderColor: bgColor,
                            backgroundColor: bgColorLight,
                            color: bgColor
                          }}
                        >
                          <div className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded-full mr-1.5 flex-shrink-0" 
                              style={{ backgroundColor: bgColor }}
                            />
                            {asset.name}
                          </div>
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-8">
                {/* Gráfico de Pizza */}
                {viewType === "pie" && (
                  <div className="col-span-1">
                    <h3 className="font-medium text-green-700 dark:text-green-300 mb-3 text-center">
                      Distribuição de Ativos
                    </h3>
                    <div className="h-80 mx-auto max-w-xl">
                      <PieChartComponent 
                        data={assetAllocation.map(asset => ({
                          name: asset.name,
                          value: asset.percentage,
                          color: asset.color
                        }))}
                      />
                    </div>
                  </div>
                )}

                {/* Gráfico de Barras */}
                {viewType === "bar" && (
                  <div className="col-span-1">
                    <h3 className="font-medium text-green-700 dark:text-green-300 mb-3 text-center">
                      Ativos por Categoria
                    </h3>
                    <div className="h-80 mx-auto max-w-xl">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={categoryData.map(entry => ({
                            ...entry,
                            fill: getCategoryColor(entry.name) // Adicionamos a cor diretamente nos dados
                          }))}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            horizontal={true}
                            vertical={false}
                          />
                          <XAxis
                            type="number"
                            domain={[0, 100]}
                            tickFormatter={(value) => `${value}%`}
                          />
                          <YAxis type="category" dataKey="name" width={80} />
                          <Tooltip 
                            formatter={(value) => `${value}%`} 
                            labelFormatter={(name) => `Categoria: ${name}`}
                          />
                          <Bar
                            dataKey="value"
                            name="Percentual"
                            radius={[0, 4, 4, 0]}
                            barSize={30}
                          >
                            {categoryData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={getCategoryColor(entry.name)} 
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Tabela */}
                {viewType === "table" && (
                  <div className="col-span-2">
                    <h3 className="font-medium text-green-700 dark:text-green-300 mb-3 text-center">
                      Detalhamento da Alocação
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                            >
                              Ativo
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                            >
                              Categoria
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                            >
                              Alocação
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
                          {assetAllocation.map((asset, index) => {
                            // Identificar a categoria real
                            const identifiedCategory = identifyCategory(asset.name, asset.category);
                            const categoryColor = getCategoryColor(identifiedCategory);
                            
                            return (
                              <tr key={index}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div
                                      className="w-4 h-4 rounded-full mr-2.5 border-2 flex-shrink-0"
                                      style={{
                                        backgroundColor: asset.color || categoryColor,
                                        borderColor: `${asset.color || categoryColor}99`,
                                      }}
                                    ></div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                      {asset.name}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span 
                                    className="px-2.5 py-1 rounded-full text-xs font-medium" 
                                    style={{ 
                                      backgroundColor: `${asset.color || categoryColor}20`,
                                      color: asset.color || categoryColor
                                    }}
                                  >
                                    {identifiedCategory}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-gray-100">
                                  {asset.percentage}%
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Detalhes dos Ativos */}
                {viewType === "selected" && (
                  <div className="col-span-2">
                    <h3 className="font-medium text-green-700 dark:text-green-300 mb-3 text-center">
                      Detalhes dos Ativos Selecionados
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {assetAllocation.map((asset, index) => {
                        // Identificar a categoria real
                        const identifiedCategory = identifyCategory(asset.name, asset.category);
                        const categoryColor = getCategoryColor(identifiedCategory);
                        const bgColor = asset.color || categoryColor;
                        const bgColorLight = `${bgColor}15`;
                        
                        return (
                          <div
                            key={index}
                            className="p-4 rounded-lg border shadow-sm hover:shadow-md transition-all"
                            style={{
                              borderColor: bgColor,
                              backgroundColor: bgColorLight,
                            }}
                          >
                            <div className="flex items-center mb-3">
                              <div
                                className="w-5 h-5 rounded-full flex-shrink-0 mr-2.5 border-2"
                                style={{
                                  backgroundColor: bgColor,
                                  borderColor: `${bgColor}99`,
                                }}
                              ></div>
                              <h4 className="font-medium text-gray-800 dark:text-gray-200 truncate">
                                {asset.name}
                              </h4>
                            </div>
                            <div className="flex justify-between items-center mb-2">
                              <span 
                                className="text-xs font-medium px-2 py-0.5 rounded-full" 
                                style={{ 
                                  backgroundColor: `${bgColor}30`,
                                  color: bgColor 
                                }}
                              >
                                {identifiedCategory}
                              </span>
                              <span
                                className="text-lg font-bold px-2 py-0.5 rounded-md bg-white dark:bg-gray-800"
                                style={{ color: bgColor }}
                              >
                                {asset.percentage}%
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 border-t border-gray-100 dark:border-gray-700 pt-2 mt-2">
                              {asset.description || "Ativo selecionado para alocação"}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {(viewType === "pie" || viewType === "bar") && (
                  <div className="col-span-1 mt-8">
                    <h3 className="font-medium text-green-700 dark:text-green-300 mb-3">
                      Detalhamento da Alocação
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {assetAllocation.map((asset, index) => {
                        // Identificar a categoria real
                        const identifiedCategory = identifyCategory(asset.name, asset.category);
                        // Definir a cor com base na categoria identificada
                        const categoryColor = getCategoryColor(identifiedCategory);
                        
                        // Definir uma cor de fundo mais suave baseada na cor principal
                        const bgColor = asset.color || categoryColor;
                        const bgColorLight = `${bgColor}15`; // Adiciona transparência à cor
                        
                        return (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3.5 rounded-lg border shadow-sm transition-all hover:shadow-md"
                            style={{
                              borderColor: bgColor,
                              backgroundColor: bgColorLight,
                            }}
                          >
                            <div className="flex items-center">
                              <div
                                className="w-5 h-5 rounded-full mr-3 flex-shrink-0 border-2"
                                style={{
                                  backgroundColor: bgColor,
                                  borderColor: `${bgColor}99`,
                                }}
                              ></div>
                              <span className="text-gray-700 dark:text-gray-200 font-medium">
                                {asset.name}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">
                                {identifiedCategory}
                              </span>
                              <span className="font-bold text-gray-800 dark:text-gray-100 px-2.5 py-1 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600">
                                {asset.percentage}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap gap-4 justify-between mt-8">
          <Button
            variant="outline"
            onClick={onPrint}
            className="flex items-center"
          >
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          <Button
            variant="outline"
            onClick={onShare}
            className="flex items-center"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Compartilhar
          </Button>
          <Button
            onClick={onDownload}
            className="flex items-center bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReportPreview;
