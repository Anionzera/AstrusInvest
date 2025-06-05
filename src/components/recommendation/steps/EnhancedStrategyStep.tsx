import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  TrendingUp,
  BarChart as LucideBarChart,
  PieChart as LucidePieChart,
  AlertCircle,
  Shield,
  ChevronRight,
  Search,
  Grid3X3,
  List,
  Star,
  Filter,
  Zap,
  Lightbulb,
  BarChart2,
  TrendingDown,
  Sliders,
  ChevronDown,
  Clock,
  DollarSign,
  Percent,
  Info,
  Eye,
  X,
  Plus
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import StrategySelector from "../StrategySelector";
import { AllocationStrategy, RiskProfile } from "@/lib/investmentUtils";
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from "recharts";

// Interface que combina os dois tipos de dados de estratégia
interface EnhancedStrategyStepProps {
  initialData?: {
    name: string;
    focus?: string[];
    expectedReturn?: number;
    volatility?: number;
    description?: string;
    strategy?: AllocationStrategy;
  };
  clientRiskProfile: string;
  investmentHorizon: number | string;
  objective: string;
  age?: number;
  // Função de callback com formato compatível com o componente original
  onUpdateStrategy: (data: {
    name: string;
    focus: string[];
    expectedReturn: number;
    volatility: number;
    description: string;
    strategy: AllocationStrategy;
  }) => void;
  onNext: () => void;
  onBack: () => void;
}

// Mapeamento entre AllocationStrategy e dados de foco/propósito
const strategyMetadata: Record<AllocationStrategy, {
  focus: string[];
  expectedReturn: number;
  volatility: number;
  description: string;
  category?: 'classic' | 'advanced' | 'specialized' | 'conservative' | 'moderate' | 'aggressive' | 'alternative';
}> = {
  "Portfólio Permanente": {
    focus: ["Preservação de Capital", "Resistência a Crises"],
    expectedReturn: 9.5,
    volatility: 8,
    description: "Estratégia desenvolvida por Harry Browne com alocação igualitária entre ações, títulos, ouro e caixa para resistir a diferentes cenários econômicos.",
    category: 'classic'
  },
  "Portfólio All Weather": {
    focus: ["Diversificação", "Balanceamento de Risco"],
    expectedReturn: 10.5,
    volatility: 10,
    description: "Criada por Ray Dalio, busca performance equilibrada em qualquer ambiente econômico considerando cenários de crescimento, recessão, inflação e deflação.",
    category: 'classic'
  },
  "Tradicional 60/40": {
    focus: ["Simplicidade", "Crescimento Moderado"],
    expectedReturn: 10,
    volatility: 9,
    description: "Alocação clássica com 60% em ações e 40% em renda fixa, balanceando crescimento e estabilidade em um modelo simples e testado.",
    category: 'classic'
  },
  "Otimização de Markowitz": {
    focus: ["Eficiência", "Maximização de Retorno/Risco"],
    expectedReturn: 11.5,
    volatility: 12,
    description: "Baseada na Teoria Moderna do Portfólio, busca a relação ótima entre risco e retorno considerando correlações entre ativos.",
    category: 'advanced'
  },
  "Paridade de Risco": {
    focus: ["Controle de Risco", "Diversificação Eficiente"],
    expectedReturn: 10,
    volatility: 8,
    description: "Aloca recursos para que cada ativo contribua igualmente para o risco total do portfólio, equilibrando a contribuição de risco.",
    category: 'classic'
  },
  "Black-Litterman": {
    focus: ["Visões Personalizadas", "Flexibilidade"],
    expectedReturn: 11,
    volatility: 10,
    description: "Combina equilíbrio de mercado com visões específicas do investidor, permitindo personalização baseada em expectativas.",
    category: 'advanced'
  },
  "Pesos Iguais": {
    focus: ["Simplicidade", "Diversificação Naïve"],
    expectedReturn: 9.5,
    volatility: 9,
    description: "Divide o investimento igualmente entre as classes de ativos selecionadas, sem favorecer nenhuma delas.",
    category: 'classic'
  },
  "Momentum e Rotação": {
    focus: ["Captura de Tendências", "Adaptabilidade"],
    expectedReturn: 13,
    volatility: 14,
    description: "Investe nos ativos com melhor desempenho recente, realocando periodicamente para capturar tendências de mercado.",
    category: 'advanced'
  },
  "Variância Mínima": {
    focus: ["Estabilidade", "Minimização de Risco"],
    expectedReturn: 8.5,
    volatility: 6,
    description: "Busca minimizar a volatilidade total do portfólio, independentemente do retorno esperado, priorizando estabilidade.",
    category: 'classic'
  },
  "Alocação Personalizada": {
    focus: ["Personalização", "Flexibilidade Total"],
    expectedReturn: 10.5,
    volatility: 10,
    description: "Definida com base nos objetivos, restrições e preferências específicas do cliente, totalmente customizada.",
    category: 'advanced'
  },
  "Fator de Risco": {
    focus: ["Exposição a Fatores", "Base Acadêmica"],
    expectedReturn: 12,
    volatility: 11,
    description: "Aloca baseado em fatores de risco sistemáticos como valor, tamanho, momentum, qualidade e volatilidade.",
    category: 'advanced'
  },
  "Barbell": {
    focus: ["Proteção contra Extremos", "Controle de Cauda"],
    expectedReturn: 11.5,
    volatility: 13,
    description: "Combina ativos de risco muito baixo com ativos de risco muito alto, evitando exposições intermediárias.",
    category: 'classic'
  },
  "Endowment": {
    focus: ["Alternativos", "Horizonte Longo"],
    expectedReturn: 12.5,
    volatility: 12,
    description: "Inspirada nos fundos de universidades como Harvard e Yale, com alta alocação em alternativos e foco em longo prazo.",
    category: 'classic'
  },
  "Value Investing": {
    focus: ["Preservação de Capital", "Análise Fundamentalista"],
    expectedReturn: 11.0,
    volatility: 10,
    description: "Foco em empresas com valuation atrativo e bons fundamentos, buscando ativos subvalorizados pelo mercado.",
    category: 'classic'
  },
  "Growth Investing": {
    focus: ["Inovação", "Expansão"],
    expectedReturn: 13.5,
    volatility: 14,
    description: "Concentração em empresas com alto potencial de crescimento, priorizando expansão de receitas sobre valuations atuais.",
    category: 'advanced'
  },
  "Income Focus": {
    focus: ["Geração de Renda", "Fluxo de Caixa"],
    expectedReturn: 9.5,
    volatility: 7,
    description: "Estratégia voltada para geração de renda recorrente, com foco em ativos que distribuem rendimentos periódicos.",
    category: 'classic'
  },
  "Golden Butterfly": {
    focus: ["Resiliência", "Equilíbrio"],
    expectedReturn: 10.0,
    volatility: 8,
    description: "Variação do Portfólio Permanente, com alocação equilibrada entre 5 classes de ativos para resistir a diferentes cenários.",
    category: 'classic'
  },
  "Global Macro": {
    focus: ["Tendências Globais", "Adaptabilidade"],
    expectedReturn: 11.5,
    volatility: 11,
    description: "Alocação baseada em tendências macroeconômicas globais, ajustando exposições conforme mudanças no cenário.",
    category: 'advanced'
  },
  "Dual Momentum": {
    focus: ["Momentum", "Tendências"],
    expectedReturn: 12.0,
    volatility: 13,
    description: "Combina momentum absoluto e relativo para identificar tendências e alternar entre classes de ativos.",
    category: 'advanced'
  },
  "Smart Beta": {
    focus: ["Fatores", "Prêmios de Risco"],
    expectedReturn: 11.5,
    volatility: 11,
    description: "Utiliza fatores sistemáticos (valor, qualidade, baixa volatilidade) para construção de portfólios mais eficientes.",
    category: 'advanced'
  },
  "Core-Satellite": {
    focus: ["Núcleo Estável", "Satélites Oportunistas"],
    expectedReturn: 11.0,
    volatility: 10,
    description: "Combina um núcleo estável e diversificado (core) com investimentos satélites visando retornos diferenciados.",
    category: 'advanced'
  },
  "Preservação de Capital": {
    focus: ["Segurança", "Baixa Volatilidade"],
    expectedReturn: 8.0,
    volatility: 5,
    description: "Prioriza a proteção do patrimônio, com foco em ativos de alta qualidade e baixa volatilidade.",
    category: 'classic'
  },
  "Ultra Conservador": {
    focus: ["Segurança Máxima", "Preservação"],
    expectedReturn: 7.5,
    volatility: 3,
    description: "Estratégia extremamente conservadora com prioridade total na segurança do capital, combinando títulos públicos de alta qualidade e CDBs.",
    category: 'classic'
  },
  "Renda Fixa Escalonada": {
    focus: ["Previsibilidade", "Liquidez Programada"],
    expectedReturn: 8.0,
    volatility: 4,
    description: "Escalonamento de vencimentos em renda fixa para maximizar rendimentos e manter liquidez distribuída ao longo do tempo.",
    category: 'classic'
  },
  "Renda Mensal": {
    focus: ["Fluxo de Caixa Mensal", "Renda Passiva"],
    expectedReturn: 8.5,
    volatility: 6,
    description: "Foco exclusivo na geração de renda passiva mensal previsível, ideal para quem vive dos rendimentos.",
    category: 'classic'
  },
  "Proteção Inflacionária Plus": {
    focus: ["Proteção Inflacionária", "Poder de Compra"],
    expectedReturn: 9.0,
    volatility: 7,
    description: "Estratégia defensiva com ênfase em proteção contra inflação através de múltiplos mecanismos e classes de ativos.",
    category: 'classic'
  },
  "Crescimento Conservador": {
    focus: ["Crescimento Moderado", "Risco Controlado"],
    expectedReturn: 9.0,
    volatility: 6,
    description: "Equilibra crescimento moderado com baixa volatilidade, adequada para quem deseja superar a inflação com risco controlado.",
    category: 'classic'
  },
  "Diversificação Conservadora": {
    focus: ["Baixa Correlação", "Diversificação Real"],
    expectedReturn: 8.5,
    volatility: 5,
    description: "Maximiza diversificação entre classes de ativos mantendo perfil conservador, visando baixa correlação entre investimentos.",
    category: 'classic'
  },
  "Previdência Tranquila": {
    focus: ["Aposentadoria", "Longo Prazo"],
    expectedReturn: 9.0,
    volatility: 7,
    description: "Estratégia de longo prazo focada em aposentadoria com crescimento gradual e proteção crescente do capital com o tempo.",
    category: 'classic'
  },
  "Barbell Conservador": {
    focus: ["Segurança com Crescimento", "Barbell Ajustado"],
    expectedReturn: 8.5,
    volatility: 6,
    description: "Versão mais prudente da estratégia barbell, combinando alta segurança em maior proporção com exposição limitada a ativos de crescimento.",
    category: 'classic'
  },
  "Conservador Renda Fixa": {
    focus: ["Renda Fixa", "Segurança Total"],
    expectedReturn: 7.5,
    volatility: 2,
    description: "Modelo otimizado para quem prioriza segurança absoluta, com foco em títulos públicos e renda fixa de alta qualidade.",
    category: 'classic'
  },
  
  // Estratégias adicionais - Perfil Conservador
  "Títulos Corporativos High Grade": {
    focus: ["Renda Fixa Corporativa", "Qualidade de Crédito"],
    expectedReturn: 8.5,
    volatility: 3,
    description: "Portfólio focado em debêntures e CRIs/CRAs de empresas sólidas com rating elevado, buscando rendimento superior ao Tesouro Direto com risco controlado.",
    category: 'classic'
  },
  "Fundos de Crédito Privado": {
    focus: ["Renda Fixa", "Spread de Crédito"],
    expectedReturn: 9.0,
    volatility: 4,
    description: "Alocação em fundos especializados em crédito privado que investem em diversos emissores, diluindo o risco específico e aumentando a rentabilidade.",
    category: 'classic'
  },
  
  // Estratégias adicionais - Perfil Moderado
  "Dividend Growth": {
    focus: ["Dividendos Crescentes", "Renda Constante"],
    expectedReturn: 10.5,
    volatility: 9,
    description: "Foco em empresas com histórico de aumento consistente de dividendos, combinando crescimento moderado com geração de renda passiva sustentável.",
    category: 'classic'
  },
  "Defensive Equities": {
    focus: ["Ações Defensivas", "Baixa Volatilidade"],
    expectedReturn: 9.5,
    volatility: 8,
    description: "Concentração em ações de setores menos voláteis como consumo básico, saúde e utilities, que tendem a resistir melhor em períodos de crise.",
    category: 'classic'
  },
  "Fundos Multiestratégia": {
    focus: ["Gestão Ativa", "Diversificação de Abordagens"],
    expectedReturn: 10.0,
    volatility: 8,
    description: "Alocação em fundos multimercado que usam diferentes estratégias simultaneamente, aproveitando a expertise dos gestores em diversos mercados.",
    category: 'advanced'
  },
  
  // Estratégias adicionais - Perfil Agressivo
  "Private Equity & Venture Capital": {
    focus: ["Empresas Privadas", "Alto Crescimento"],
    expectedReturn: 15.0,
    volatility: 18,
    description: "Exposição a empresas não listadas em bolsa, desde startups até companhias maduras, com potencial de valorização substancial a longo prazo.",
    category: 'aggressive'
  },
  "Small Caps de Crescimento": {
    focus: ["Pequenas Empresas", "Expansão Acelerada"],
    expectedReturn: 14.0,
    volatility: 16,
    description: "Foco em empresas de menor capitalização com alto potencial de crescimento e que podem se tornar líderes em seus segmentos.",
    category: 'advanced'
  },
  "Setores Temáticos": {
    focus: ["Tendências Seculares", "Disrupção"],
    expectedReturn: 13.5,
    volatility: 15,
    description: "Investimentos concentrados em temas específicos como IA, biotecnologia, energia limpa e ESG, apostando em tendências de longo prazo.",
    category: 'advanced'
  },
  
  // Estratégias adicionais - Extras (Alternativas)
  "Renda Fixa High Yield": {
    focus: ["Retorno Elevado", "Prêmio de Risco"],
    expectedReturn: 11.0,
    volatility: 10,
    description: "Alocação em títulos de renda fixa de maior risco de crédito que oferecem rendimentos potencialmente mais elevados, como dívidas corporativas de baixo rating.",
    category: 'classic'
  },
  "Cripto + Blockchain Innovation": {
    focus: ["Ativos Digitais", "Disrupção Financeira"],
    expectedReturn: 20.0,
    volatility: 30,
    description: "Exposição a criptomoedas estabelecidas e empresas que desenvolvem tecnologias baseadas em blockchain, combinando potencial disruptivo com alta volatilidade.",
    category: 'advanced'
  },
  "Trading Algorítmico": {
    focus: ["Operações Sistemáticas", "Modelos Quantitativos"],
    expectedReturn: 12.0,
    volatility: 14,
    description: "Uso de algoritmos e modelos matemáticos para identificar oportunidades de mercado e executar operações de forma automatizada e disciplinada.",
    category: 'advanced'
  },
  "Arbitragem Estatística": {
    focus: ["Ineficiências de Mercado", "Correlações"],
    expectedReturn: 10.0,
    volatility: 8,
    description: "Estratégia que explora divergências temporárias de preços entre ativos correlacionados, buscando retornos não direcionais e independentes do mercado.",
    category: 'advanced'
  },
  "Tail Risk Hedging": {
    focus: ["Proteção contra Crises", "Eventos Extremos"],
    expectedReturn: 7.0,
    volatility: 12,
    description: "Estratégia defensiva que visa proteger o portfólio contra eventos extremos de mercado ('cisnes negros'), utilizando opções e ativos de segurança.",
    category: 'classic'
  }
};

const EnhancedStrategyStep: React.FC<EnhancedStrategyStepProps> = ({
  initialData,
  clientRiskProfile,
  investmentHorizon,
  objective,
  age,
  onUpdateStrategy,
  onNext,
  onBack,
}) => {
  // Normalizar o perfil de risco para o formato esperado
  const riskProfile = clientRiskProfile as RiskProfile;
  
  // Estados principais
  const [selectedStrategy, setSelectedStrategy] = useState<AllocationStrategy>(
    initialData?.strategy || 
    (riskProfile === "Conservador" ? "Portfólio Permanente" : 
     riskProfile === "Moderado" ? "Portfólio All Weather" : 
     riskProfile === "Arrojado" ? "Otimização de Markowitz" : 
     "Momentum e Rotação")
  );
  
  // Estado para a visualização atual
  const [activeView, setActiveView] = useState<"selector" | "details">("selector");
  
  // Estados para UI aprimorada
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedCategory, setSelectedCategory] = useState<string>("todas");
  const [selectedRiskCompatibility, setSelectedRiskCompatibility] = useState<string>("todas");
  const [comparisonStrategies, setComparisonStrategies] = useState<AllocationStrategy[]>([]);
  const [showTutorial, setShowTutorial] = useState(true);
  const [sortBy, setSortBy] = useState<"relevance" | "return" | "risk">("relevance");
  const [favoritedStrategies, setFavoritedStrategies] = useState<AllocationStrategy[]>([]);
  const [visibleStrategies, setVisibleStrategies] = useState<number>(12);
  const [hoveredStrategy, setHoveredStrategy] = useState<AllocationStrategy | null>(null);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState("overview");
  
  // Animação para cards
  const cardVariants = {
    hidden: { opacity: 1, y: 0 }, // Sem animação inicial
    visible: () => ({ opacity: 1, y: 0 }), // Sem animação ao aparecer
    exit: { opacity: 1, scale: 1 } // Sem animação ao sair
  };

  // Converter investmentHorizon para string se for número
  const horizonString = typeof investmentHorizon === 'number' 
    ? (investmentHorizon <= 2 ? "Curto Prazo" : 
       investmentHorizon <= 5 ? "Médio Prazo" : "Longo Prazo")
    : investmentHorizon;
  
  // Manipulador para atualização de estratégia
  const handleStrategyChange = (strategy: AllocationStrategy) => {
    setSelectedStrategy(strategy);
    
    // Obter metadados da estratégia
    const metadata = strategyMetadata[strategy];
    
    // Verificar se metadata existe antes de acessá-lo
    if (metadata) {
      // Atualizar dados para componente pai
      onUpdateStrategy({
        name: strategy,
        focus: metadata.focus,
        expectedReturn: metadata.expectedReturn,
        volatility: metadata.volatility,
        description: metadata.description,
        strategy: strategy // Incluir o próprio enum da estratégia
      });
    } else {
      console.error(`Metadata não encontrado para a estratégia: ${strategy}`);
    }
  };
  
  // Manipulador para favoritar estratégias
  const toggleFavorite = (strategy: AllocationStrategy) => {
    if (favoritedStrategies.includes(strategy)) {
      setFavoritedStrategies(favoritedStrategies.filter(s => s !== strategy));
    } else {
      setFavoritedStrategies([...favoritedStrategies, strategy]);
    }
  };
  
  // Adicionar ou remover estratégia da comparação
  const toggleComparison = (strategy: AllocationStrategy) => {
    if (comparisonStrategies.includes(strategy)) {
      setComparisonStrategies(comparisonStrategies.filter(s => s !== strategy));
    } else {
      if (comparisonStrategies.length < 3) {
        setComparisonStrategies([...comparisonStrategies, strategy]);
      }
    }
  };
  
  // Carregar mais estratégias ao rolar para baixo
  const loadMoreStrategies = () => {
    setVisibleStrategies(prev => prev + 8);
  };
  
  // Função para determinar compatibilidade da estratégia com o perfil
  const getStrategyCompatibility = (strategy: AllocationStrategy): 'ideal' | 'suitable' | 'caution' => {
    const metadata = strategyMetadata[strategy];
    
    // Lógica baseada no perfil e volatilidade
    if (riskProfile === "Conservador" && metadata.volatility > 10) {
      return 'caution';
    }
    
    if (riskProfile === "Moderado" && metadata.volatility > 12) {
      return 'caution';
    }
    
    if (riskProfile === "Arrojado" && metadata.volatility < 7) {
      return 'caution';
    }
    
    // Verificações específicas por estratégia
    if (riskProfile === "Conservador") {
      if (["Momentum e Rotação", "Barbell", "Fator de Risco", "Endowment"].includes(strategy)) {
        return 'caution';
      }
      if (["Portfólio Permanente", "Variância Mínima", "Tradicional 60/40"].includes(strategy)) {
        return 'ideal';
      }
    }
    
    if (riskProfile === "Moderado") {
      if (["Portfólio All Weather", "Tradicional 60/40", "Black-Litterman"].includes(strategy)) {
        return 'ideal';
      }
    }
    
    if (riskProfile === "Arrojado") {
      if (["Otimização de Markowitz", "Paridade de Risco", "Fator de Risco"].includes(strategy)) {
        return 'ideal';
      }
      if (["Variância Mínima", "Portfólio Permanente"].includes(strategy)) {
        return 'caution';
      }
    }
    
    if (riskProfile === "Agressivo") {
      if (["Momentum e Rotação", "Fator de Risco", "Endowment"].includes(strategy)) {
        return 'ideal';
      }
      if (["Variância Mínima", "Portfólio Permanente", "Tradicional 60/40"].includes(strategy)) {
        return 'caution';
      }
    }
    
    return 'suitable';
  };
  
  // Calcular classificação de estrelas para a estratégia
  const getStrategyRating = (strategy: AllocationStrategy): number => {
    const metadata = strategyMetadata[strategy];
    const compatibility = getStrategyCompatibility(strategy);
    
    // Base na compatibilidade
    let rating = compatibility === 'ideal' ? 4.5 : 
                compatibility === 'suitable' ? 3.5 : 2.5;
    
    // Ajuste por retorno esperado
    if (metadata.expectedReturn > 12) rating += 0.5;
    if (metadata.expectedReturn < 9) rating -= 0.5;
    
    // Garantir limite
    return Math.min(5, Math.max(1, rating));
  };
  
  // Preparar dados para o gráfico de radar
  const prepareRadarData = () => {
    const metadata = strategyMetadata[selectedStrategy];
    
    // Mapear valores para escala 0-100
    const mapToScale = (value: number, min: number, max: number) => 
      Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
    
    return [
      {
        subject: "Retorno",
        value: mapToScale(metadata.expectedReturn, 8, 14),
        fullMark: 100,
      },
      {
        subject: "Risco",
        value: 100 - mapToScale(metadata.volatility, 5, 16), // Inverter escala para risco (maior volatilidade = menor valor)
        fullMark: 100,
      },
      {
        subject: "Diversificação",
        value: selectedStrategy === "Pesos Iguais" || selectedStrategy === "Portfólio All Weather" ? 90 :
               selectedStrategy === "Portfólio Permanente" || selectedStrategy === "Tradicional 60/40" ? 60 : 75,
        fullMark: 100,
      },
      {
        subject: "Complexidade",
        value: 100 - (selectedStrategy === "Pesos Iguais" || selectedStrategy === "Tradicional 60/40" ? 90 :
                selectedStrategy === "Otimização de Markowitz" || selectedStrategy === "Black-Litterman" ? 30 : 60),
        fullMark: 100,
      },
      {
        subject: "Liquidez",
        value: selectedStrategy === "Endowment" ? 40 :
               selectedStrategy === "Barbell" || selectedStrategy === "Momentum e Rotação" ? 70 : 80,
        fullMark: 100,
      },
    ];
  };

  // Função para filtrar estratégias baseada em todos os filtros
  const getFilteredStrategies = useMemo(() => {
    let strategies = Object.entries(strategyMetadata)
      .filter(([key, value]) => {
        const strategyKey = key as AllocationStrategy;
        
        // Filtrar por termo de busca
        if (searchTerm && !key.toLowerCase().includes(searchTerm.toLowerCase()) && 
            !value.description.toLowerCase().includes(searchTerm.toLowerCase()) &&
            !value.focus.some(f => f.toLowerCase().includes(searchTerm.toLowerCase()))) {
          return false;
        }
        
        // Filtrar por categoria
        if (selectedCategory !== "todas") {
          if (value.category !== selectedCategory) return false;
        }
        
        // Filtrar por compatibilidade com perfil de risco
        if (selectedRiskCompatibility !== "todas") {
          const compatibility = getStrategyCompatibility(strategyKey);
          if (selectedRiskCompatibility === "ideal" && compatibility !== "ideal") return false;
          if (selectedRiskCompatibility === "suitable" && compatibility !== "suitable") return false;
          if (selectedRiskCompatibility === "caution" && compatibility !== "caution") return false;
        }
        
        return true;
      })
      .map(([key, value]) => ({
        key: key as AllocationStrategy,
        ...value
      }));
      
    // Aplicar ordenação
    strategies.sort((a, b) => {
      // Ordenação por relevância (compatibilidade e depois retorno)
      if (sortBy === "relevance") {
        const compatA = getStrategyCompatibility(a.key);
        const compatB = getStrategyCompatibility(b.key);
        
        const compatOrder = { 'ideal': 0, 'suitable': 1, 'caution': 2 };
        
        // Primeiro por compatibilidade
        if (compatOrder[compatA] !== compatOrder[compatB]) {
          return compatOrder[compatA] - compatOrder[compatB];
        }
        
        // Favoritos primeiro
        if (favoritedStrategies.includes(a.key) && !favoritedStrategies.includes(b.key)) return -1;
        if (!favoritedStrategies.includes(a.key) && favoritedStrategies.includes(b.key)) return 1;
        
        // Depois por retorno esperado (decrescente)
        return b.expectedReturn - a.expectedReturn;
      }
      
      // Ordenação por retorno esperado
      if (sortBy === "return") {
        return b.expectedReturn - a.expectedReturn;
      }
      
      // Ordenação por risco (volatilidade)
      if (sortBy === "risk") {
        return a.volatility - b.volatility;
      }
      
      return 0;
    });
    
    return strategies;
  }, [searchTerm, selectedCategory, selectedRiskCompatibility, sortBy, favoritedStrategies]);
  
  // Limitar para o número visível
  const limitedStrategies = useMemo(() => {
    return getFilteredStrategies.slice(0, visibleStrategies);
  }, [getFilteredStrategies, visibleStrategies]);

  // Agrupar estratégias por categoria de risco
  const getStrategiesByRiskCategory = () => {
    const grouped: Record<string, typeof getFilteredStrategies> = {
      ideal: [],
      suitable: [],
      caution: []
    };
    
    getFilteredStrategies.forEach(strategy => {
      const compatibility = getStrategyCompatibility(strategy.key);
      grouped[compatibility].push(strategy);
    });
    
    return grouped;
  };

  const strategiesByRisk = getStrategiesByRiskCategory();

  // Componente de renderização de estrelas
  const RatingStars = ({ rating }: { rating: number }) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return (
      <div className="flex items-center">
        {[...Array(fullStars)].map((_, i) => (
          <div key={`full-${i}`}>
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
          </div>
        ))}
        {hasHalfStar && (
          <div className="relative">
            <Star className="w-3.5 h-3.5 text-gray-300" />
            <Star className="absolute top-0 left-0 w-3.5 h-3.5 fill-yellow-400 text-yellow-400 overflow-hidden" style={{ clipPath: 'inset(0 50% 0 0)' }} />
          </div>
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <div key={`empty-${i}`}>
            <Star className="w-3.5 h-3.5 text-gray-300" />
          </div>
        ))}
        <span className="ml-1 text-xs text-gray-500">{rating.toFixed(1)}</span>
      </div>
    );
  };

  // Componente de card de estratégia para visualização aprimorada
  const StrategyCard = React.memo(({ 
    strategy, 
    compact = false,
    index = 0,
  }: { 
    strategy: AllocationStrategy, 
    compact?: boolean,
    index?: number
  }) => {
    const metadata = strategyMetadata[strategy];
    const compatibility = getStrategyCompatibility(strategy);
    const rating = getStrategyRating(strategy);
    const isFavorited = favoritedStrategies.includes(strategy);
    const isInComparison = comparisonStrategies.includes(strategy);
    
    // Determinar cores baseadas na compatibilidade
    const getCompatibilityColor = () => {
      switch (compatibility) {
        case 'ideal': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 border-green-200 dark:border-green-800';
        case 'suitable': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800';
        case 'caution': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
      }
    };
    
    // Cor de fundo sem gradientes
    const getCardBackground = () => {
      const category = metadata.category;
      if (category === 'aggressive') return 'bg-rose-50 dark:bg-rose-950 border-rose-100 dark:border-rose-950';
      if (category === 'conservative') return 'bg-blue-50 dark:bg-blue-950 border-blue-100 dark:border-blue-950';
      if (category === 'moderate') return 'bg-amber-50 dark:bg-amber-950 border-amber-100 dark:border-amber-950';
      if (category === 'alternative') return 'bg-purple-50 dark:bg-purple-950 border-purple-100 dark:border-purple-950';
      if (category === 'advanced') return 'bg-indigo-50 dark:bg-indigo-950 border-indigo-100 dark:border-indigo-950';
      if (category === 'classic') return 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-900';
      return 'bg-white dark:bg-gray-950';
    };
    
    // Ícone da estratégia
    const getStrategyIcon = () => {
      if (metadata.focus.includes("Risco")) return <TrendingDown className="h-5 w-5 text-primary" />;
      if (metadata.focus.includes("Tendências")) return <TrendingUp className="h-5 w-5 text-primary" />;
      if (metadata.focus.includes("Diversificação")) return <LucideBarChart className="h-5 w-5 text-primary" />;
      if (metadata.focus.includes("Renda")) return <DollarSign className="h-5 w-5 text-primary" />;
      if (metadata.focus.includes("Crescimento")) return <TrendingUp className="h-5 w-5 text-primary" />;
      return <LucideBarChart className="h-5 w-5 text-primary" />;
    };
    
    return (
      <div className="h-full">
        <Card 
          className={cn(
            getCardBackground(),
            "relative border h-full",
            selectedStrategy === strategy ? 'ring-2 ring-primary shadow-md bg-primary/5' : '',
            compact ? 'overflow-hidden' : ''
          )}
        >
          {/* Badge de compatibilidade */}
          <div className="absolute top-2 right-2 z-10 flex gap-1">
            <Badge className={cn("text-xs font-medium", getCompatibilityColor())}>
              {compatibility === 'ideal' ? 'Ideal' : 
              compatibility === 'suitable' ? 'Adequado' : 'Atenção'}
            </Badge>
          </div>
          
          {/* Botões de ação sempre visíveis */}
          <div className={cn(
            "absolute z-10",
            compact ? "top-2 left-2" : "top-3 left-3"
          )}>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn(
                  "h-7 w-7 rounded-full bg-background shadow-sm border border-gray-200 dark:border-gray-800", 
                  isFavorited ? "text-yellow-500 border-yellow-200" : "text-gray-400"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(strategy);
                }}
              >
                <Star className={cn("h-4 w-4", isFavorited ? "fill-yellow-500" : "")} />
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn(
                  "h-7 w-7 rounded-full bg-background shadow-sm border border-gray-200 dark:border-gray-800", 
                  isInComparison ? "text-blue-500 border-blue-200" : "text-gray-400",
                  comparisonStrategies.length >= 3 && !isInComparison ? "opacity-50 cursor-not-allowed" : ""
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  if (comparisonStrategies.length < 3 || isInComparison) {
                    toggleComparison(strategy);
                  }
                }}
                disabled={comparisonStrategies.length >= 3 && !isInComparison}
              >
                <BarChart2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <CardHeader className={compact ? "p-4 pb-2" : "pb-2"}>
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-full bg-primary/10 border border-primary/20">
                  {getStrategyIcon()}
                </div>
                <CardTitle className={compact ? "text-base line-clamp-1" : "text-xl"}>
                  {strategy}
                </CardTitle>
              </div>
            </div>
            
            <div className="mt-1">
              <RatingStars rating={rating} />
            </div>
            
            {!compact && (
              <CardDescription className="mt-2 line-clamp-2">
                {metadata.description}
              </CardDescription>
            )}
          </CardHeader>
          
          <CardContent className={compact ? "px-4 py-2" : "py-2"}>
            {compact ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1">
                  <div className="flex items-center gap-1 text-xs">
                    <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                    <span>Retorno: <strong className="text-green-700 dark:text-green-500">{metadata.expectedReturn.toFixed(1)}%</strong></span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <TrendingDown className="h-3.5 w-3.5 text-amber-600" />
                    <span>Volatilidade: <strong className="text-amber-700 dark:text-amber-500">{metadata.volatility.toFixed(1)}%</strong></span>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-1">
                  {metadata.focus.slice(0, 2).map((focus, i) => (
                    <Badge key={i} variant="outline" className="text-xs px-1.5 py-0 h-5 font-normal bg-background/50">
                      {focus}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium flex items-center mb-2">
                      <Zap className="h-4 w-4 mr-1 text-primary" />
                      Foco Principal
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {metadata.focus.map((focus, i) => (
                        <Badge key={i} variant="outline" className="px-2 py-0.5 font-normal bg-background/50">
                          {focus}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-green-50 dark:bg-green-950/30 p-2 rounded-lg border border-green-100 dark:border-green-900">
                      <p className="text-xs font-medium mb-1 text-green-800 dark:text-green-300 flex items-center">
                        <TrendingUp className="h-3.5 w-3.5 mr-1" />
                        Retorno Esperado
                      </p>
                      <p className="text-xl font-bold text-green-600 dark:text-green-400 flex items-baseline">
                        {metadata.expectedReturn.toFixed(1)}
                        <span className="text-xs ml-0.5">%</span>
                      </p>
                    </div>
                    
                    <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-100 dark:border-amber-900">
                      <p className="text-xs font-medium mb-1 text-amber-800 dark:text-amber-300 flex items-center">
                        <TrendingDown className="h-3.5 w-3.5 mr-1" />
                        Volatilidade
                      </p>
                      <p className="text-xl font-bold text-amber-600 dark:text-amber-400 flex items-baseline">
                        {metadata.volatility.toFixed(1)}
                        <span className="text-xs ml-0.5">%</span>
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-1 text-sm">
                  <p className="line-clamp-2">{metadata.description}</p>
                </div>
              </div>
            )}
          </CardContent>
          
          <CardFooter className={cn(
            "gap-2 z-10",
            compact ? "p-3 flex-col" : "pt-1 pb-4 flex items-center justify-between"
          )}>
            <Button 
              variant={selectedStrategy === strategy ? "default" : "outline"} 
              onClick={() => handleStrategyChange(strategy)}
              className={compact ? "w-full" : "px-4"}
              size={compact ? "sm" : "default"}
            >
              {selectedStrategy === strategy ? (
                <>
                  <Check className="mr-1 h-4 w-4" />
                  Selecionada
                </>
              ) : 'Selecionar'}
            </Button>
            
            {!compact && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStrategyChange(strategy);
                  setActiveView("details");
                }}
                className="px-2"
              >
                Ver Detalhes
                <Eye className="ml-1 h-4 w-4" />
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    );
  });

  // Efeito para executar ao montar o componente
  useEffect(() => {
    // Se não houver dados iniciais, configurar com a estratégia padrão selecionada
    if (!initialData || !initialData.name) {
      const metadata = strategyMetadata[selectedStrategy];
      
      onUpdateStrategy({
        name: selectedStrategy,
        focus: metadata.focus,
        expectedReturn: metadata.expectedReturn,
        volatility: metadata.volatility,
        description: metadata.description,
        strategy: selectedStrategy
      });
    }
  }, []);

  return (
    <div className="space-y-6">
      <Tabs 
        defaultValue="selector" 
        onValueChange={(v) => setActiveView(v as any)}
        className="w-full"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="selector" className="flex items-center gap-1.5">
              <Grid3X3 className="h-4 w-4" />
              <span>Selecionar Estratégia</span>
            </TabsTrigger>
            <TabsTrigger value="details" disabled={!selectedStrategy} className="flex items-center gap-1.5">
              <LucideBarChart className="h-4 w-4" />
              <span>Detalhes e Comparação</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Indicadores visuais */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Ideal</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span>Adequado</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <span>Requer Atenção</span>
            </div>
          </div>
        </div>
        
        <TabsContent value="selector" className="mt-0 space-y-6">
          {/* Componente de Tutorial/Introdução */}
          {showTutorial && (
            <div className="relative">
              <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900 shadow-md">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <AlertTitle className="text-blue-800 dark:text-blue-300 font-medium">
                      Encontre a estratégia ideal para seu perfil
                    </AlertTitle>
                    <AlertDescription className="text-blue-700 dark:text-blue-400 mt-1">
                      Explore as estratégias abaixo, filtre por categoria ou favoritas, e compare até 3 opções. 
                      As estratégias marcadas como <span className="font-medium text-green-600 dark:text-green-400">Ideais</span> são as mais adequadas para seu perfil de risco <span className="font-medium">{riskProfile}</span>.
                    </AlertDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    className="ml-auto -mt-1 text-blue-600"
                    onClick={() => setShowTutorial(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Alert>
            </div>
          )}
          
          {/* Barra de pesquisa sem animações */}
          <div className="bg-card border rounded-xl p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar estratégias por nome, foco ou característica..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 border-gray-200 dark:border-gray-800 bg-background"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground"
                    onClick={() => setSearchTerm("")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              
              <div className="flex items-center gap-2 self-end sm:self-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={viewMode === "grid" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setViewMode("grid")}
                        className="px-3 h-9"
                      >
                        <Grid3X3 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Visualização em grid</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={viewMode === "list" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setViewMode("list")}
                        className="px-3 h-9"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Visualização em lista</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-9 gap-1 group hover:border-primary/50"
                    >
                      <Filter className="h-4 w-4 group-hover:text-primary transition-colors" />
                      <span>Filtros</span>
                      <ChevronDown className="h-3.5 w-3.5 opacity-70 group-hover:text-primary transition-colors" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-4">
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm">Filtrar estratégias</h4>
                      
                      <div className="space-y-2">
                        <h5 className="text-xs font-medium text-muted-foreground">Compatibilidade</h5>
                        <div className="grid grid-cols-3 gap-1.5">
                          <Button 
                            variant={selectedRiskCompatibility === "todas" ? "default" : "outline"}
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => setSelectedRiskCompatibility("todas")}
                          >
                            Todas
                          </Button>
                          <Button 
                            variant={selectedRiskCompatibility === "ideal" ? "default" : "outline"}
                            size="sm"
                            className={`h-8 text-xs transition-colors ${selectedRiskCompatibility === "ideal" ? "" : "text-green-600 hover:border-green-300 hover:bg-green-50 dark:hover:bg-green-950/20"}`}
                            onClick={() => setSelectedRiskCompatibility("ideal")}
                          >
                            <div className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></div>
                            Ideais
                          </Button>
                          <Button 
                            variant={selectedRiskCompatibility === "suitable" ? "default" : "outline"}
                            size="sm"
                            className={`h-8 text-xs transition-colors ${selectedRiskCompatibility === "suitable" ? "" : "text-blue-600 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/20"}`}
                            onClick={() => setSelectedRiskCompatibility("suitable")}
                          >
                            <div className="w-2 h-2 rounded-full bg-blue-500 mr-1.5"></div>
                            Adequadas
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h5 className="text-xs font-medium text-muted-foreground">Categoria</h5>
                        <div className="grid grid-cols-2 gap-1.5">
                          <Button 
                            variant={selectedCategory === "todas" ? "default" : "outline"}
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => setSelectedCategory("todas")}
                          >
                            Todas
                          </Button>
                          <Button 
                            variant={selectedCategory === "classic" ? "default" : "outline"}
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => setSelectedCategory("classic")}
                          >
                            Clássicas
                          </Button>
                          <Button 
                            variant={selectedCategory === "advanced" ? "default" : "outline"}
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => setSelectedCategory("advanced")}
                          >
                            Avançadas
                          </Button>
                          <Button 
                            variant={selectedCategory === "favorites" ? "default" : "outline"}
                            size="sm"
                            className={`h-8 text-xs transition-colors ${selectedCategory === "favorites" ? "" : "text-yellow-600 hover:border-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-950/20"}`}
                            onClick={() => setSelectedCategory("favorites")}
                          >
                            <Star className={cn("h-3.5 w-3.5 mr-1.5", selectedCategory === "favorites" ? "" : "fill-yellow-500 text-yellow-500")} />
                            Favoritas
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h5 className="text-xs font-medium text-muted-foreground">Ordenar por</h5>
                        <div className="grid grid-cols-3 gap-1.5">
                          <Button 
                            variant={sortBy === "relevance" ? "default" : "outline"}
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => setSortBy("relevance")}
                          >
                            Relevância
                          </Button>
                          <Button 
                            variant={sortBy === "return" ? "default" : "outline"}
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => setSortBy("return")}
                          >
                            Retorno
                          </Button>
                          <Button 
                            variant={sortBy === "risk" ? "default" : "outline"}
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => setSortBy("risk")}
                          >
                            Menor Risco
                          </Button>
                        </div>
                      </div>
                      
                      <Button 
                        onClick={() => {
                          setSearchTerm("");
                          setSelectedCategory("todas");
                          setSelectedRiskCompatibility("todas"); 
                          setSortBy("relevance");
                        }}
                        variant="outline"
                        className="w-full mt-2"
                      >
                        Limpar todos os filtros
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            {/* Filtros rápidos */}
            <div className="flex flex-wrap items-center gap-1.5">
              <Button 
                variant={selectedCategory === "todas" ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setSelectedCategory("todas")}
              >
                Todas estratégias
              </Button>
              <Button 
                variant={selectedCategory === "classic" ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setSelectedCategory("classic")}
              >
                Clássicas
              </Button>
              <Button 
                variant={selectedCategory === "advanced" ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setSelectedCategory("advanced")}
              >
                Avançadas
              </Button>
              <Button 
                variant={selectedCategory === "favorites" ? "default" : "outline"}
                size="sm"
                className={`h-8 text-xs transition-colors flex items-center ${selectedCategory === "favorites" ? "" : "text-yellow-600 hover:border-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-950/20"}`}
                onClick={() => setSelectedCategory("favorites")}
              >
                <Star className={cn("h-3.5 w-3.5 mr-1.5", selectedCategory === "favorites" ? "" : "fill-yellow-500 text-yellow-500")} />
                Favoritas {favoritedStrategies.length > 0 && `(${favoritedStrategies.length})`}
              </Button>
              
              <Separator orientation="vertical" className="h-6 mx-1 opacity-50" />
              
              <Button 
                variant={selectedRiskCompatibility === "ideal" ? "default" : "outline"}
                size="sm"
                className={`h-8 text-xs transition-colors ${selectedRiskCompatibility === "ideal" ? "" : "text-green-600 hover:border-green-300 hover:bg-green-50 dark:hover:bg-green-950/20"}`}
                onClick={() => setSelectedRiskCompatibility("ideal")}
              >
                <div className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></div>
                Ideais {strategiesByRisk.ideal.length > 0 && `(${strategiesByRisk.ideal.length})`}
              </Button>
              <Button 
                variant={selectedRiskCompatibility === "suitable" ? "default" : "outline"}
                size="sm"
                className={`h-8 text-xs transition-colors ${selectedRiskCompatibility === "suitable" ? "" : "text-blue-600 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/20"}`}
                onClick={() => setSelectedRiskCompatibility("suitable")}
              >
                <div className="w-2 h-2 rounded-full bg-blue-500 mr-1.5"></div>
                Adequadas {strategiesByRisk.suitable.length > 0 && `(${strategiesByRisk.suitable.length})`}
              </Button>
              <Button 
                variant={selectedRiskCompatibility === "caution" ? "default" : "outline"}
                size="sm"
                className={`h-8 text-xs transition-colors ${selectedRiskCompatibility === "caution" ? "" : "text-yellow-600 hover:border-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-950/20"}`}
                onClick={() => setSelectedRiskCompatibility("caution")}
              >
                <div className="w-2 h-2 rounded-full bg-yellow-500 mr-1.5"></div>
                Requer Atenção {strategiesByRisk.caution.length > 0 && `(${strategiesByRisk.caution.length})`}
              </Button>
            </div>
          </div>

          {/* Número de resultados e comparação */}
          {comparisonStrategies.length > 0 && (
            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900">
                  {comparisonStrategies.length} {comparisonStrategies.length === 1 ? 'estratégia' : 'estratégias'}
                </Badge>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  selecionada{comparisonStrategies.length !== 1 ? 's' : ''} para comparação
                </span>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setComparisonStrategies([])}
                  className="border-red-200 text-red-600 dark:border-red-900 dark:text-red-500"
                >
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  Limpar
                </Button>
                <Button 
                  size="sm"
                  onClick={() => setActiveView("details")}
                  className="gap-1 bg-blue-600 text-white"
                >
                  <BarChart2 className="h-4 w-4" />
                  Comparar agora
                </Button>
              </div>
            </div>
          )}

          {/* Grid ou Lista de estratégias */}
          <div>
            {viewMode === 'grid' ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {limitedStrategies.map((strategy, index) => (
                    <StrategyCard 
                      key={strategy.key} 
                      strategy={strategy.key} 
                      compact={true} 
                      index={index}
                    />
                  ))}
                </div>
                
                {/* Botão carregar mais sem animações */}
                {limitedStrategies.length < getFilteredStrategies.length && (
                  <div className="flex justify-center pt-4">
                    <Button 
                      variant="outline"
                      onClick={loadMoreStrategies}
                      className="gap-1"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Carregar mais {Math.min(8, getFilteredStrategies.length - limitedStrategies.length)} estratégias</span>
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-8">
                {/* Agrupar por compatibilidade de risco */}
                {Object.entries(strategiesByRisk).map(([riskCategory, strategies]) => 
                  strategies.length > 0 && (
                    <div 
                      key={riskCategory} 
                      className="space-y-4"
                    >
                      <h3 className="text-lg font-medium flex items-center gap-2 pl-1">
                        {riskCategory === 'ideal' ? (
                          <>
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span className="text-green-700 dark:text-green-400">Estratégias Ideais para seu Perfil</span>
                          </>
                        ) : riskCategory === 'suitable' ? (
                          <>
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            <span className="text-blue-700 dark:text-blue-400">Estratégias Adequadas</span>
                          </>
                        ) : (
                          <>
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <span className="text-yellow-700 dark:text-yellow-400">Estratégias que Requerem Atenção</span>
                          </>
                        )}
                      </h3>
                      <div className="space-y-3">
                        {strategies.slice(0, 5).map((strategy, index) => (
                          <StrategyCard 
                            key={strategy.key} 
                            strategy={strategy.key} 
                            compact={false}
                            index={index}
                          />
                        ))}
                        
                        {strategies.length > 5 && (
                          <Button 
                            variant="outline" 
                            className="w-full mt-2"
                            onClick={() => setVisibleStrategies(prev => prev + 10)}
                          >
                            Ver mais {strategies.length - 5} estratégias
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                )}
                
                {/* Se não houver resultados */}
                {Object.values(strategiesByRisk).every(group => group.length === 0) && (
                  <div className="text-center py-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                      <Search className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">Nenhuma estratégia encontrada</h3>
                    <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                      Tente ajustar seus filtros ou termos de busca para encontrar estratégias de investimento.
                    </p>
                    <Button 
                      className="mt-4"
                      onClick={() => {
                        setSearchTerm("");
                        setSelectedCategory("todas");
                        setSelectedRiskCompatibility("todas");
                      }}
                    >
                      Limpar filtros
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="details" className="mt-0">
          {selectedStrategy && (
            <div className="space-y-6">
              <Tabs defaultValue={activeDetailTab} onValueChange={setActiveDetailTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="overview" className="flex items-center gap-1.5">
                    <LucideBarChart className="h-4 w-4" />
                    <span>Visão Geral</span>
                  </TabsTrigger>
                  <TabsTrigger value="comparison" className="flex items-center gap-1.5">
                    <BarChart2 className="h-4 w-4" />
                    <span>Comparação {comparisonStrategies.length > 0 ? `(${comparisonStrategies.length})` : ""}</span>
                  </TabsTrigger>
                  <TabsTrigger value="allocation" className="flex items-center gap-1.5">
                    <LucidePieChart className="h-4 w-4" />
                    <span>Alocação Sugerida</span>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="mt-0">
                  <Card className="border-0 shadow-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/5">
                      <CardHeader>
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={cn(
                                "px-2 py-0.5",
                                getStrategyCompatibility(selectedStrategy) === 'ideal' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                                  : getStrategyCompatibility(selectedStrategy) === 'suitable'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                              )}>
                                {getStrategyCompatibility(selectedStrategy) === 'ideal' ? 'Estratégia Ideal' : 
                                getStrategyCompatibility(selectedStrategy) === 'suitable' ? 'Estratégia Adequada' : 'Requer Atenção'}
                              </Badge>
                              <Badge variant="outline">
                                {strategyMetadata[selectedStrategy].category === 'classic' ? 'Clássica' :
                                strategyMetadata[selectedStrategy].category === 'advanced' ? 'Avançada' :
                                strategyMetadata[selectedStrategy].category === 'conservative' ? 'Conservadora' :
                                strategyMetadata[selectedStrategy].category === 'aggressive' ? 'Agressiva' : 'Alternativa'}
                              </Badge>
                            </div>
                            
                            <CardTitle className="text-2xl font-bold">
                              {selectedStrategy}
                            </CardTitle>
                            
                            <div className="flex items-center mt-1 mb-2">
                              <RatingStars rating={getStrategyRating(selectedStrategy)} />
                            </div>
                            
                            <CardDescription className="text-base max-w-3xl">
                              {strategyMetadata[selectedStrategy].description}
                            </CardDescription>
                          </div>
                          
                          <div className="flex flex-col items-center md:items-end gap-1">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                  "gap-1",
                                  favoritedStrategies.includes(selectedStrategy) ? "text-yellow-500 border-yellow-200" : ""
                                )}
                                onClick={() => toggleFavorite(selectedStrategy)}
                              >
                                <Star className={cn(
                                  "h-4 w-4",
                                  favoritedStrategies.includes(selectedStrategy) ? "fill-yellow-500" : ""
                                )} />
                                {favoritedStrategies.includes(selectedStrategy) ? "Favoritada" : "Favoritar"}
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                  "gap-1",
                                  comparisonStrategies.includes(selectedStrategy) ? "text-blue-500 border-blue-200" : ""
                                )}
                                onClick={() => toggleComparison(selectedStrategy)}
                                disabled={comparisonStrategies.length >= 3 && !comparisonStrategies.includes(selectedStrategy)}
                              >
                                <BarChart2 className="h-4 w-4" />
                                {comparisonStrategies.includes(selectedStrategy) ? "Na comparação" : "Comparar"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                    </div>
                    
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                            <LucideBarChart className="h-5 w-5 text-primary" />
                            Análise de Perfil da Estratégia
                          </h3>
                          
                          <div className="h-72 -ml-6">
                            <ResponsiveContainer width="100%" height="100%">
                              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={prepareRadarData()}>
                                <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                                <PolarAngleAxis 
                                  dataKey="subject" 
                                  tick={{ fill: "#64748b", fontSize: 12 }}
                                  tickLine={false}
                                />
                                <PolarRadiusAxis 
                                  domain={[0, 100]} 
                                  axisLine={false} 
                                  tick={false} 
                                  stroke="#e2e8f0"
                                />
                                <Radar
                                  name="Perfil da Estratégia"
                                  dataKey="value"
                                  stroke="#6366f1"
                                  fill="#6366f1"
                                  fillOpacity={0.5}
                                  animationDuration={800}
                                  animationBegin={100}
                                />
                              </RadarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                        
                        <div className="space-y-6">
                          <div>
                            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                              <Zap className="h-5 w-5 text-primary" />
                              Características da Estratégia
                            </h3>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg">
                                <p className="text-sm font-medium mb-1 text-green-800 dark:text-green-300 flex items-center">
                                  <TrendingUp className="h-4 w-4 mr-1" />
                                  Retorno Esperado Anual
                                </p>
                                <p className="text-3xl font-bold text-green-600 dark:text-green-400 flex items-baseline">
                                  {strategyMetadata[selectedStrategy].expectedReturn.toFixed(1)}
                                  <span className="text-base ml-0.5">%</span>
                                </p>
                                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                                  {strategyMetadata[selectedStrategy].expectedReturn > 12 
                                    ? "Potencial de alta rentabilidade a longo prazo"
                                    : strategyMetadata[selectedStrategy].expectedReturn > 10
                                      ? "Rentabilidade acima da média do mercado"
                                      : "Rentabilidade estável e consistente"}
                                </p>
                              </div>
                              
                              <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg">
                                <p className="text-sm font-medium mb-1 text-amber-800 dark:text-amber-300 flex items-center">
                                  <TrendingDown className="h-4 w-4 mr-1" />
                                  Volatilidade Estimada
                                </p>
                                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 flex items-baseline">
                                  {strategyMetadata[selectedStrategy].volatility.toFixed(1)}
                                  <span className="text-base ml-0.5">%</span>
                                </p>
                                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                                  {strategyMetadata[selectedStrategy].volatility > 12 
                                    ? "Flutuações significativas no curto prazo"
                                    : strategyMetadata[selectedStrategy].volatility > 8
                                      ? "Volatilidade moderada, aceitável para médio prazo"
                                      : "Baixa volatilidade, ideal para perfil conservador"}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-medium mb-2">Foco Principal</h4>
                            <div className="flex flex-wrap gap-2">
                              {strategyMetadata[selectedStrategy].focus.map((focus, i) => (
                                <div 
                                  key={i} 
                                  className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm"
                                >
                                  {focus}
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-medium mb-2">Adequação ao Perfil</h4>
                            <Alert variant={
                              getStrategyCompatibility(selectedStrategy) === 'caution' 
                                ? "destructive" 
                                : "default"
                            }>
                              <AlertCircle className="h-4 w-4" />
                              <AlertTitle>
                                {getStrategyCompatibility(selectedStrategy) === 'caution'
                                  ? "Atenção: Perfil e Estratégia Podem Ser Incompatíveis"
                                  : getStrategyCompatibility(selectedStrategy) === 'ideal'
                                    ? "Estratégia Ideal para Seu Perfil"
                                    : "Estratégia Adequada para Seu Perfil"}
                              </AlertTitle>
                              <AlertDescription>
                                {getStrategyCompatibility(selectedStrategy) === 'caution'
                                  ? `Esta estratégia tem ${strategyMetadata[selectedStrategy].volatility > 10 ? 'risco elevado' : 'características específicas'} que podem não ser adequadas para seu perfil ${riskProfile}. Considere as implicações cuidadosamente.`
                                  : getStrategyCompatibility(selectedStrategy) === 'ideal'
                                    ? `Esta estratégia é perfeitamente alinhada com seu perfil ${riskProfile}, oferecendo uma relação risco/retorno otimizada para suas necessidades.`
                                    : `A estratégia é compatível com seu perfil ${riskProfile}, mas existem outras opções que podem ser ainda mais adequadas.`}
                              </AlertDescription>
                            </Alert>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    
                    <CardFooter className="flex justify-end gap-2">
                      <Button 
                        variant="outline"
                        onClick={() => setActiveView("selector")}
                        className="gap-1"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Voltar para seleção</span>
                      </Button>
                      
                      <Button 
                        onClick={onNext}
                        className="gap-1"
                      >
                        <span>Continuar com esta Estratégia</span>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                </TabsContent>
                
                <TabsContent value="comparison" className="mt-0">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>
                          Comparação de Estratégias
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Select
                            value={selectedStrategy}
                            onValueChange={(value) => handleStrategyChange(value as AllocationStrategy)}
                          >
                            <SelectTrigger className="w-[240px]">
                              <SelectValue placeholder="Selecionar estratégia principal" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.keys(strategyMetadata).map((key) => (
                                <SelectItem key={key} value={key}>
                                  {key}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => setComparisonStrategies([])}
                            disabled={comparisonStrategies.length === 0}
                          >
                            Limpar
                          </Button>
                        </div>
                      </div>
                      <CardDescription>
                        Compare a estratégia selecionada com outras até 3 estratégias para uma análise detalhada.
                        {comparisonStrategies.length === 0 && " Volte à tela de seleção e adicione estratégias para comparação."}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent>
                      {comparisonStrategies.length > 0 ? (
                        <div className="space-y-6">
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                              <thead>
                                <tr className="text-left border-b border-gray-200 dark:border-gray-800">
                                  <th className="px-4 py-3 text-sm font-medium">Estratégia</th>
                                  <th className="px-4 py-3 text-sm font-medium">Categoria</th>
                                  <th className="px-4 py-3 text-sm font-medium">Retorno</th>
                                  <th className="px-4 py-3 text-sm font-medium">Volatilidade</th>
                                  <th className="px-4 py-3 text-sm font-medium">Compatibilidade</th>
                                  <th className="px-4 py-3 text-sm font-medium">Ações</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr className="bg-primary/5 border-b border-primary/20">
                                  <td className="px-4 py-3 font-medium">{selectedStrategy}</td>
                                  <td className="px-4 py-3 capitalize">{strategyMetadata[selectedStrategy].category}</td>
                                  <td className="px-4 py-3 text-green-600 font-medium">{strategyMetadata[selectedStrategy].expectedReturn.toFixed(1)}%</td>
                                  <td className="px-4 py-3 text-amber-600 font-medium">{strategyMetadata[selectedStrategy].volatility.toFixed(1)}%</td>
                                  <td className="px-4 py-3">
                                    <Badge className={
                                      getStrategyCompatibility(selectedStrategy) === 'ideal'
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 border-green-200 dark:border-green-800'
                                        : getStrategyCompatibility(selectedStrategy) === 'suitable'
                                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'
                                    }>
                                      {getStrategyCompatibility(selectedStrategy) === 'ideal' ? 'Ideal' :
                                      getStrategyCompatibility(selectedStrategy) === 'suitable' ? 'Adequada' : 'Atenção'}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-3">
                                    <Button variant="secondary" size="sm" disabled className="opacity-70">Principal</Button>
                                  </td>
                                </tr>
                                
                                {comparisonStrategies.map((strategy) => (
                                  <tr key={strategy} className="border-b border-gray-100 dark:border-gray-900 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                                    <td className="px-4 py-3 font-medium">{strategy}</td>
                                    <td className="px-4 py-3 capitalize">{strategyMetadata[strategy].category}</td>
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-1">
                                        {strategyMetadata[strategy].expectedReturn.toFixed(1)}%
                                        {strategyMetadata[strategy].expectedReturn > strategyMetadata[selectedStrategy].expectedReturn ? (
                                          <span className="text-green-500 text-xs">(+{(strategyMetadata[strategy].expectedReturn - strategyMetadata[selectedStrategy].expectedReturn).toFixed(1)}%)</span>
                                        ) : strategyMetadata[strategy].expectedReturn < strategyMetadata[selectedStrategy].expectedReturn ? (
                                          <span className="text-red-500 text-xs">(-{(strategyMetadata[selectedStrategy].expectedReturn - strategyMetadata[strategy].expectedReturn).toFixed(1)}%)</span>
                                        ) : null}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-1">
                                        {strategyMetadata[strategy].volatility.toFixed(1)}%
                                        {strategyMetadata[strategy].volatility < strategyMetadata[selectedStrategy].volatility ? (
                                          <span className="text-green-500 text-xs">(-{(strategyMetadata[selectedStrategy].volatility - strategyMetadata[strategy].volatility).toFixed(1)}%)</span>
                                        ) : strategyMetadata[strategy].volatility > strategyMetadata[selectedStrategy].volatility ? (
                                          <span className="text-red-500 text-xs">(+{(strategyMetadata[strategy].volatility - strategyMetadata[selectedStrategy].volatility).toFixed(1)}%)</span>
                                        ) : null}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <Badge className={
                                        getStrategyCompatibility(strategy) === 'ideal'
                                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 border-green-200 dark:border-green-800'
                                          : getStrategyCompatibility(strategy) === 'suitable'
                                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'
                                      }>
                                        {getStrategyCompatibility(strategy) === 'ideal' ? 'Ideal' :
                                        getStrategyCompatibility(strategy) === 'suitable' ? 'Adequada' : 'Atenção'}
                                      </Badge>
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-2">
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          onClick={() => handleStrategyChange(strategy)}
                                          className="border-primary/30 hover:border-primary"
                                        >
                                          Selecionar
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="icon"
                                          onClick={() => toggleComparison(strategy)}
                                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          
                          <div>
                            <h3 className="text-lg font-medium mb-4">Comparação Gráfica</h3>
                            <div className="h-80">
                              <ResponsiveContainer width="100%" height="100%">
                                <RechartsBarChart
                                  data={[
                                    {
                                      name: 'Retorno Esperado',
                                      [selectedStrategy]: strategyMetadata[selectedStrategy].expectedReturn,
                                      ...comparisonStrategies.reduce((acc, strategy) => {
                                        acc[strategy] = strategyMetadata[strategy].expectedReturn;
                                        return acc;
                                      }, {} as Record<string, number>),
                                    },
                                    {
                                      name: 'Volatilidade',
                                      [selectedStrategy]: strategyMetadata[selectedStrategy].volatility,
                                      ...comparisonStrategies.reduce((acc, strategy) => {
                                        acc[strategy] = strategyMetadata[strategy].volatility;
                                        return acc;
                                      }, {} as Record<string, number>),
                                    },
                                  ]}
                                  margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                                  barGap={4}
                                  barCategoryGap={30}
                                >
                                  <CartesianGrid strokeDasharray="3 3" opacity={0.7} />
                                  <XAxis 
                                    dataKey="name" 
                                    axisLine={{ stroke: '#e2e8f0' }}
                                    tickLine={false}
                                  />
                                  <YAxis 
                                    axisLine={{ stroke: '#e2e8f0' }}
                                    tickLine={false}
                                    label={{ 
                                      value: "Valor (%)", 
                                      angle: -90, 
                                      position: 'insideLeft',
                                      style: { textAnchor: 'middle', fill: '#64748b' }
                                    }}
                                  />
                                  <RechartsTooltip 
                                    formatter={(value: number, name: string) => {
                                      return [`${value}%`, `Alocação em ${name}`];
                                    }} 
                                    contentStyle={{ 
                                      backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                                      borderRadius: '6px', 
                                      padding: '8px 12px', 
                                      border: '1px solid #e2e8f0',
                                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                                    }}
                                  />
                                  <Legend 
                                    verticalAlign="top" 
                                    wrapperStyle={{ paddingBottom: 10 }}
                                  />
                                  <Bar 
                                    dataKey={selectedStrategy} 
                                    fill="#6366F1"
                                    radius={[4, 4, 0, 0]}
                                    animationDuration={800}
                                    animationBegin={100}
                                  />
                                  {comparisonStrategies.map((strategy, index) => (
                                    <Bar 
                                      key={strategy} 
                                      dataKey={strategy} 
                                      fill={["#3B82F6", "#10B981", "#F59E0B"][index % 3]} 
                                      radius={[4, 4, 0, 0]}
                                      animationDuration={800}
                                      animationBegin={100 + (index + 1) * 100}
                                    />
                                  ))}
                                </RechartsBarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                            <BarChart2 className="h-8 w-8 text-slate-400" />
                          </div>
                          <h3 className="text-lg font-medium mb-2">Nenhuma estratégia para comparar</h3>
                          <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-4">
                            Adicione estratégias à comparação voltando à tela de seleção e clicando no ícone de comparação.
                          </p>
                          <Button 
                            variant="outline"
                            onClick={() => setActiveView("selector")}
                            className="gap-1"
                          >
                            <ArrowLeft className="h-4 w-4" />
                            Voltar para seleção
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="allocation" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Alocação Sugerida</CardTitle>
                      <CardDescription>
                        Visualize a alocação recomendada por classes de ativos para a estratégia {selectedStrategy}.
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h3 className="text-lg font-medium mb-4">Distribuição por Classe de Ativos</h3>
                          <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                              <RechartsPieChart>
                                <Pie
                                  data={[
                                    { name: 'Renda Fixa', value: selectedStrategy === "Tradicional 60/40" ? 40 : 
                                            selectedStrategy === "Variância Mínima" ? 60 : 
                                            selectedStrategy === "Momentum e Rotação" ? 20 : 35 },
                                    { name: 'Renda Variável', value: selectedStrategy === "Tradicional 60/40" ? 60 : 
                                            selectedStrategy === "Variância Mínima" ? 25 : 
                                            selectedStrategy === "Momentum e Rotação" ? 50 : 40 },
                                    { name: 'Alternativos', value: selectedStrategy === "Tradicional 60/40" ? 0 : 
                                            selectedStrategy === "Variância Mínima" ? 5 : 
                                            selectedStrategy === "Momentum e Rotação" ? 20 : 15 },
                                    { name: 'Internacional', value: selectedStrategy === "Tradicional 60/40" ? 0 : 
                                            selectedStrategy === "Variância Mínima" ? 10 : 
                                            selectedStrategy === "Momentum e Rotação" ? 10 : 10 },
                                  ]}
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={100}
                                  innerRadius={60}
                                  paddingAngle={2}
                                  labelLine={false}
                                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                  fill="#8884d8"
                                  dataKey="value"
                                  animationDuration={800}
                                  animationBegin={100}
                                >
                                  {[
                                    { color: "#4F46E5" },
                                    { color: "#10B981" },
                                    { color: "#F59E0B" },
                                    { color: "#EC4899" },
                                  ].map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="white" strokeWidth={1} />
                                  ))}
                                </Pie>
                                <RechartsTooltip 
                                  formatter={(value: number, name: string) => [
                                    `${value}%`, 
                                    `Alocação em ${name}`
                                  ]} 
                                  contentStyle={{ 
                                    backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                                    borderRadius: '6px', 
                                    padding: '8px 12px', 
                                    border: '1px solid #e2e8f0',
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                                  }}
                                />
                              </RechartsPieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium mb-4">Detalhamento da Alocação</h3>
                          
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-[#4F46E5]"></div>
                                  <span className="font-medium">Renda Fixa</span>
                                </div>
                                <span className="font-medium text-sm bg-[#4F46E5]/10 text-[#4F46E5] px-2 py-0.5 rounded-full">
                                  {selectedStrategy === "Tradicional 60/40" ? "40%" : 
                                  selectedStrategy === "Variância Mínima" ? "60%" : 
                                  selectedStrategy === "Momentum e Rotação" ? "20%" : "35%"}
                                </span>
                              </div>
                              <div className="relative w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div 
                                  className="absolute left-0 top-0 h-full bg-[#4F46E5] rounded-full"
                                  style={{ 
                                    width: `${selectedStrategy === "Tradicional 60/40" ? 40 : 
                                            selectedStrategy === "Variância Mínima" ? 60 : 
                                            selectedStrategy === "Momentum e Rotação" ? 20 : 35}%` 
                                  }}
                                ></div>
                              </div>
                            </div>
                            
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-[#10B981]"></div>
                                  <span className="font-medium">Renda Variável</span>
                                </div>
                                <span className="font-medium text-sm bg-[#10B981]/10 text-[#10B981] px-2 py-0.5 rounded-full">
                                  {selectedStrategy === "Tradicional 60/40" ? "60%" : 
                                  selectedStrategy === "Variância Mínima" ? "25%" : 
                                  selectedStrategy === "Momentum e Rotação" ? "50%" : "40%"}
                                </span>
                              </div>
                              <div className="relative w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div 
                                  className="absolute left-0 top-0 h-full bg-[#10B981] rounded-full"
                                  style={{ 
                                    width: `${selectedStrategy === "Tradicional 60/40" ? 60 : 
                                            selectedStrategy === "Variância Mínima" ? 25 : 
                                            selectedStrategy === "Momentum e Rotação" ? 50 : 40}%` 
                                  }}
                                ></div>
                              </div>
                            </div>
                            
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-[#F59E0B]"></div>
                                  <span className="font-medium">Alternativos</span>
                                </div>
                                <span className="font-medium text-sm bg-[#F59E0B]/10 text-[#F59E0B] px-2 py-0.5 rounded-full">
                                  {selectedStrategy === "Tradicional 60/40" ? "0%" : 
                                  selectedStrategy === "Variância Mínima" ? "5%" : 
                                  selectedStrategy === "Momentum e Rotação" ? "20%" : "15%"}
                                </span>
                              </div>
                              <div className="relative w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div 
                                  className="absolute left-0 top-0 h-full bg-[#F59E0B] rounded-full"
                                  style={{ 
                                    width: `${selectedStrategy === "Tradicional 60/40" ? 0 : 
                                            selectedStrategy === "Variância Mínima" ? 5 : 
                                            selectedStrategy === "Momentum e Rotação" ? 20 : 15}%` 
                                  }}
                                ></div>
                              </div>
                            </div>
                            
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-[#EC4899]"></div>
                                  <span className="font-medium">Internacional</span>
                                </div>
                                <span className="font-medium text-sm bg-[#EC4899]/10 text-[#EC4899] px-2 py-0.5 rounded-full">
                                  {selectedStrategy === "Tradicional 60/40" ? "0%" : 
                                  selectedStrategy === "Variância Mínima" ? "10%" : 
                                  selectedStrategy === "Momentum e Rotação" ? "10%" : "10%"}
                                </span>
                              </div>
                              <div className="relative w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div 
                                  className="absolute left-0 top-0 h-full bg-[#EC4899] rounded-full"
                                  style={{ 
                                    width: `${selectedStrategy === "Tradicional 60/40" ? 0 : 
                                            selectedStrategy === "Variância Mínima" ? 10 : 
                                            selectedStrategy === "Momentum e Rotação" ? 10 : 10}%` 
                                  }}
                                ></div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-6 pt-4 border-t">
                            <Alert className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-950">
                              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              <AlertTitle className="text-blue-700 dark:text-blue-400">Alocação Personalizada</AlertTitle>
                              <AlertDescription className="text-blue-600 dark:text-blue-500">
                                Esta é uma alocação sugerida com base nas características da estratégia. A distribuição exata pode ser refinada nas etapas seguintes de acordo com suas restrições específicas.
                              </AlertDescription>
                            </Alert>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    
                    <CardFooter className="flex justify-end">
                      <Button onClick={onNext}>
                        Continuar com esta Estratégia
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-between pt-4">
        {/* Botão de voltar removido para evitar duplicação */}
        
        {activeView === "selector" && (
          <Button onClick={() => setActiveView("details")} className="ml-auto">
            Ver Detalhes
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default EnhancedStrategyStep; 