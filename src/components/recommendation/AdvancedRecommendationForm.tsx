import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  User,
  TrendingUp,
  Compass,
  BarChart,
  PieChart,
  FileCheck,
  Clock,
  Save,
  Loader2,
  Info,
  Users,
  X,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { db, Cliente } from "@/lib/db";
import { Asset, AllocationStrategy } from "@/lib/investmentUtils";
import { ClientContext, generateSmartRecommendation, EnhancedAssetClass } from "@/lib/smartRecommendationEngine";

// Importação dos componentes de passos
import ClientSelector from "./ClientSelector";
import ClientInfoStep from "./steps/ClientInfoStep";
import RiskProfileStep from "./steps/RiskProfileStep";
import InvestmentHorizonStep from "./steps/InvestmentHorizonStep";
import StrategySelectionStep from "./steps/StrategySelectionStep";
import EnhancedStrategyStep from "./steps/EnhancedStrategyStep";
import AssetAllocationStep from "./steps/AssetAllocationStep";
import EnhancedAllocationStep from "./steps/EnhancedAllocationStep";
import RegulatoryComplianceStep from "./RegulatoryComplianceStep";

// Interface para os dados completos do formulário de recomendação (para substituir a do RecommendationForm)
export interface FormData {
  clientInfo: {
    id?: number;
    nome: string;
    email: string;
    telefone: string;
    objetivoInvestimento: string;
    valorInvestimento: number;
    idade?: number;
    titulo?: string;
  };
  riskProfile: {
    selectedProfile: string;
    recommendedProfile?: string;
  };
  investmentHorizon: {
    years: number;
    type: string;
  };
  strategy?: string;
  assetClasses: AssetClass[];
}

// Definir tipos para os objetos de dados
interface ClientData {
  id?: string;
  name: string;
  email: string;
  age: number;
  income: number;
  objetivos: string[];
  currentInvestments?: {
    amount: number;
    composition?: Array<{
      name: string;
      percentage: number;
    }>;
  };
  historicalBehavior?: {
    riskTolerance: number;
    investmentStyle: string;
    previousRedemptions: number;
  };
  // Campos adicionais do perfil cliente
  cpf?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  documentoIdentidade?: string;
  perfilRisco?: string;
}

interface RiskProfileData {
  score: number;
  profile: string;
  questions: Array<{
    id: string;
    answer: string;
    weight: number;
  }>;
}

interface HorizonData {
  years: number;
  objective: string;
  amount: number;
  monthlyContribution: number;
}

interface StrategyData {
  name: string;
  focus: string[];
  expectedReturn: number;
  volatility: number;
  description: string;
}

// Definir a interface AssetClass localmente
interface AssetClass {
  name: string;
  allocation: number;
  color: string;
  expectedReturn?: {
    pessimistic: number;
    baseline: number;
    optimistic: number;
  };
  regulatoryInfo?: {
    suitabilityProfiles: string[];
    requiredDisclosures: string[];
    regulatoryCategory: string;
    taxEfficiency: number;
  };
}

// Definir a interface AssetAllocationData
interface AssetAllocationData {
  allocation: EnhancedAssetClass[];
  scenarioProjections?: any;
  regulatoryCompliance?: any;
}

interface ComplianceData {
  isCompliant: boolean;
  warnings: string[];
  requiredDisclosures: string[];
  benchmarkComparison: Array<{
    name: string;
    expectedOutperformance: number;
    historicalCorrelation: number;
  }>;
}

// Tipo para a etapa atual - adicionando "client-selection"
type StepType = 
  | "client-selection"
  | "client-info" 
  | "risk-profile" 
  | "investment-horizon" 
  | "strategy" 
  | "asset-allocation" 
  | "compliance";

// Definir constante de passos para melhorar feedback visual
const STEPS = [
  {
    id: "client-selection",
    title: "Selecionar Cliente",
    icon: <Users className="h-5 w-5" />,
    description: "Escolha um cliente cadastrado"
  },
  {
    id: "client-info",
    title: "Dados do Cliente",
    icon: <User className="h-5 w-5" />,
    description: "Informações pessoais e financeiras"
  },
  {
    id: "risk-profile",
    title: "Perfil de Risco",
    icon: <AlertTriangle className="h-5 w-5" />,
    description: "Avaliação de tolerância a risco"
  },
  {
    id: "investment-horizon",
    title: "Horizonte",
    icon: <Clock className="h-5 w-5" />,
    description: "Prazo e objetivos"
  },
  {
    id: "strategy",
    title: "Estratégia",
    icon: <Compass className="h-5 w-5" />,
    description: "Abordagem de investimento"
  },
  {
    id: "asset-allocation",
    title: "Alocação",
    icon: <PieChart className="h-5 w-5" />,
    description: "Distribuição dos ativos"
  },
  {
    id: "compliance",
    title: "Compliance",
    icon: <FileCheck className="h-5 w-5" />,
    description: "Conformidade regulatória"
  }
];

// Modificar o tipo para camposAdicionais
type CamposAdicionais = {
  cpf?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  documentoIdentidade?: string;
  profissao?: string;
  [key: string]: any;
};

// Melhorar a função calcularIdadePrecisa para lidar com diferentes formatos de data
const calcularIdadePrecisa = (dataNascimentoInput: Date | string): number => {
  const hoje = new Date();
  let nascimento: Date;
  
  // Verificar se a entrada é uma string ou Date e converter apropriadamente
  if (typeof dataNascimentoInput === 'string') {
    // Tentar diferentes formatos de data
    if (dataNascimentoInput.includes('T')) {
      // Formato ISO
      nascimento = new Date(dataNascimentoInput);
    } else if (dataNascimentoInput.includes('/')) {
      // Formato DD/MM/YYYY
      const [dia, mes, ano] = dataNascimentoInput.split('/');
      nascimento = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
    } else if (dataNascimentoInput.includes('-')) {
      // Formato YYYY-MM-DD
      nascimento = new Date(dataNascimentoInput);
    } else {
      // Tentar parse padrão
      nascimento = new Date(dataNascimentoInput);
    }
  } else {
    nascimento = dataNascimentoInput;
  }
  
  // Verificar se a data é válida
  if (isNaN(nascimento.getTime())) {
    console.error('Data de nascimento inválida:', dataNascimentoInput);
    return 30; // Valor padrão se a data for inválida
  }
  
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  
  // Ajustar se ainda não fez aniversário este ano
  if (
    hoje.getMonth() < nascimento.getMonth() || 
    (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() < nascimento.getDate())
  ) {
    idade--;
  }
  
  return idade;
};

// Adicionar a interface AdvancedRecommendationFormProps
interface AdvancedRecommendationFormProps {
  initialData?: any;
  onSaveRecommendation?: (data: any) => void;
}

const AdvancedRecommendationForm: React.FC<AdvancedRecommendationFormProps> = ({
  initialData,
  onSaveRecommendation,
}) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<StepType>("client-selection");
  const [saving, setSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  
  // Estados para cada etapa do formulário
  const [clientData, setClientData] = useState<ClientData>({
    name: "",
    email: "",
    age: 30,
    income: 0,
    objetivos: [],
  });
  
  const [riskProfileData, setRiskProfileData] = useState<RiskProfileData>({
    score: 0,
    profile: "",
    questions: [],
  });
  
  const [horizonData, setHorizonData] = useState<HorizonData>({
    years: 5,
    objective: "",
    amount: 0,
    monthlyContribution: 0,
  });
  
  const [strategyData, setStrategyData] = useState<StrategyData>({
    name: "",
    focus: [],
    expectedReturn: 0,
    volatility: 0,
    description: "",
  });
  
  const [assetAllocationData, setAssetAllocationData] = useState<AssetAllocationData>({
    allocation: [],
  });

  const [complianceData, setComplianceData] = useState<ComplianceData>({
    isCompliant: false,
    warnings: [],
    requiredDisclosures: [],
    benchmarkComparison: [],
  });

  // Novo estado para monitorar se cada etapa foi concluída
  const [completedSteps, setCompletedSteps] = useState<Record<StepType, boolean>>({
    "client-selection": false,
    "client-info": false,
    "risk-profile": false,
    "investment-horizon": false,
    "strategy": false, 
    "asset-allocation": false,
    "compliance": false
  });

  // Função para gerar recomendações inteligentes baseadas nos dados
  const generateRecommendations = async () => {
    try {
      if (!clientData || !horizonData) {
        toast.error("Dados incompletos para gerar recomendação");
        return;
      }
      
      // Indicar que está obtendo dados macroeconômicos e gerando recomendações
      setIsSubmitting(true);
      
      // Usar toast para feedback em vez do estado submitStatus
      toast.info("Obtendo dados macroeconômicos atualizados...");
      
      // Aguardar um breve momento para mostrar o progresso
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Preparar o contexto do cliente para gerar a recomendação
      const clientContext: ClientContext = {
        id: clientData.id ? parseInt(clientData.id.toString()) : undefined,
        name: clientData.name,
        profile: {
          age: parseInt(clientData.age?.toString() || "30"),
          riskProfile: clientData.perfilRisco || "moderado",
          income: parseFloat(clientData.income?.toString() || "0"),
          objectives: clientData.objetivos || []
        },
        investmentData: {
          initialAmount: parseFloat(horizonData.amount?.toString() || "0"),
          monthlyContribution: parseFloat(horizonData.monthlyContribution?.toString() || "0"),
          targetHorizon: parseInt(horizonData.years?.toString() || "5"),
          targetObjective: horizonData.objective || ""
        },
        historicalBehavior: clientData.historicalBehavior ? {
          riskTolerance: parseFloat(clientData.historicalBehavior.riskTolerance?.toString() || "0.5"),
          investmentStyle: clientData.historicalBehavior.investmentStyle || "balanced",
          previousRedemptions: parseInt(clientData.historicalBehavior.previousRedemptions?.toString() || "0")
        } : undefined,
        investmentObjective: horizonData.objective,
        investmentValue: parseFloat(horizonData.amount?.toString() || "0"),
        investmentHorizon: parseInt(horizonData.years?.toString() || "5")
      };
      
      toast.info("Analisando dados macroeconômicos e perfil do investidor...");
      
      // Aguardar um breve momento para mostrar o progresso
      await new Promise(resolve => setTimeout(resolve, 800));
      
      toast.info("Calculando recomendação personalizada com base no cenário econômico atual...");
      
      // Gerar a recomendação personalizada
      try {
        const recommendation = await generateSmartRecommendation(clientContext);
        
        toast.info("Preparando resultados da recomendação personalizada...");
        
        // Verificar a recomendação
        if (!recommendation || !recommendation.enhancedAllocation) {
          throw new Error("Recomendação gerada sem alocação de ativos");
        }
        
        // Preparar os dados para o estado (convertendo para o formato necessário)
        const newData: AssetAllocationData = {
          allocation: recommendation.enhancedAllocation,
          scenarioProjections: recommendation.scenarioProjections,
          regulatoryCompliance: recommendation.regulatoryCompliance
        };
        
        // Atualizar o estado com a nova alocação
        setAssetAllocationData(newData);
        
        // Avançar para o próximo passo
        if (currentStep !== "asset-allocation") {
          setCurrentStep("asset-allocation");
        }
        
        // Adicionar uma mensagem de sucesso
        toast.success("Recomendação gerada com sucesso!");
        
      } catch (error) {
        console.error("Erro ao gerar recomendações:", error);
        
        toast.error("Erro ao obter dados macroeconômicos. Usando dados locais...");
        
        // Tentar novamente com modo offline (sem dados macroeconômicos em tempo real)
        try {
          // Aguardar um breve momento para mostrar a mensagem de erro
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const offlineRecommendation = await generateSmartRecommendation(clientContext, "baseline");
          
          if (!offlineRecommendation || !offlineRecommendation.enhancedAllocation) {
            throw new Error("Recomendação offline gerada sem alocação de ativos");
          }
          
          // Preparar os dados para o estado (convertendo para o formato necessário)
          const newData: AssetAllocationData = {
            allocation: offlineRecommendation.enhancedAllocation,
            scenarioProjections: offlineRecommendation.scenarioProjections,
            regulatoryCompliance: offlineRecommendation.regulatoryCompliance
          };
          
          // Atualizar o estado com a nova alocação
          setAssetAllocationData(newData);
          
          // Avançar para o próximo passo
          if (currentStep !== "asset-allocation") {
            setCurrentStep("asset-allocation");
          }
          
          // Adicionar uma mensagem de alerta
          toast.warning("Não foi possível obter dados macroeconômicos em tempo real");
        } catch (fallbackError) {
          console.error("Erro ao gerar recomendações com fallback:", fallbackError);
          toast.error("Não foi possível gerar a recomendação. Tente novamente mais tarde.");
        }
      }
    } catch (error) {
      console.error("Erro ao gerar recomendações:", error);
      toast.error("Falha ao gerar recomendação personalizada");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Efeito para carregar os dados do cliente selecionado
  useEffect(() => {
    if (selectedClient && !completedSteps["client-selection"]) {
      console.log("Processando cliente selecionado...");
      
      // Extrair dados adicionais do JSON em observacoes, se existirem
      let camposAdicionais: CamposAdicionais = {};
      if (selectedClient.observacoes) {
        try {
          const observacoesObj = JSON.parse(selectedClient.observacoes);
          if (observacoesObj.camposAdicionais) {
            camposAdicionais = observacoesObj.camposAdicionais;
          }
        } catch (e) {
          console.log("Dados adicionais não encontrados no formato JSON");
        }
      }

      // Determinar a idade do cliente com base na data de nascimento ou dados adicionais
      let idadeCliente = 30; // Valor padrão apenas se nenhuma outra fonte estiver disponível
      let idadeCalculadaComSucesso = false;
      
      // Tentar extrair idade da data de nascimento
      if (selectedClient.dataNascimento) {
        try {
          // Usar a data de nascimento para calcular a idade com precisão
          idadeCliente = calcularIdadePrecisa(selectedClient.dataNascimento);
          if (idadeCliente !== 30) { // Se não é o valor padrão, foi calculada com sucesso
            idadeCalculadaComSucesso = true;
          }
        } catch (error) {
          console.error("Erro ao calcular idade a partir da data:", error);
        }
      }
      
      // Se não conseguiu calcular da data de nascimento, tentar de campos adicionais
      if (!idadeCalculadaComSucesso && camposAdicionais.idade) {
        try {
          const idadeExtraida = parseInt(camposAdicionais.idade, 10);
          if (!isNaN(idadeExtraida)) {
            idadeCliente = idadeExtraida;
            idadeCalculadaComSucesso = true;
          }
        } catch (error) {
          console.error("Erro ao converter idade dos campos adicionais:", error);
        }
      }
      
      // Como último recurso, tentar extrair ano da data de nascimento para calcular idade aproximada
      if (!idadeCalculadaComSucesso && selectedClient.dataNascimento) {
        try {
          const dataNascimentoStr = String(selectedClient.dataNascimento);
          // Tentar extrair o ano de formatos comuns: YYYY-MM-DD, DD/MM/YYYY ou qualquer string que contenha 4 dígitos que pareça um ano
          const anoMatch = dataNascimentoStr.match(/(\d{4})/);
          if (anoMatch) {
            const anoNascimento = parseInt(anoMatch[0], 10);
            const anoAtual = new Date().getFullYear();
            if (anoNascimento > 1900 && anoNascimento < anoAtual) {
              idadeCliente = anoAtual - anoNascimento;
              idadeCalculadaComSucesso = true;
            }
          }
        } catch (error) {
          console.error("Erro ao tentar extrair ano da data de nascimento:", error);
        }
      }

      // Obter o perfil de risco do cliente, com fallback para campos adicionais
      const perfilRiscoCliente = selectedClient.perfilRisco || camposAdicionais.perfilRisco || "";

      // Atualizar todos os estados em uma única atualização para evitar renderizações extras
      const updateStates = async () => {
        // Atualizar o estado com a idade calculada
        setClientData(prevState => ({
          ...prevState,
          id: selectedClient.id,
          name: selectedClient.nome,
          email: selectedClient.email || "",
          age: idadeCliente,
          income: prevState.income,
          objetivos: prevState.objetivos,
          cpf: camposAdicionais.cpf || "",
          endereco: camposAdicionais.endereco || "",
          cidade: camposAdicionais.cidade || "",
          estado: camposAdicionais.estado || "",
          documentoIdentidade: camposAdicionais.documentoIdentidade || "",
          perfilRisco: perfilRiscoCliente,
        }));
        
        // Se o cliente já tem um perfil de risco, pré-selecionar no componente de perfil de risco
        if (perfilRiscoCliente) {
          setRiskProfileData({
            score: 0, // Será recalculado pelo componente conforme necessário
            profile: perfilRiscoCliente,
            questions: [] // Será preenchido pelo componente
          });
          
          // Marcar a etapa de perfil de risco como concluída
          setCompletedSteps(prev => ({
            ...prev,
            "risk-profile": true
          }));
        }
        
        // Marcar etapa de seleção de cliente como concluída - deve ser o último passo
        setCompletedSteps(prev => ({
          ...prev,
          "client-selection": true
        }));
        
        // Registrar seleção no histórico após todas as atualizações de estado
        // Isso garante que registramos apenas uma vez após o processamento completo
        try {
          await addHistoryEntry({
            entityType: 'cliente',
            entityId: selectedClient.id,
            entityName: selectedClient.nome,
            action: 'update',
            details: `Cliente ${selectedClient.nome} selecionado para recomendação`,
            metadata: { clienteId: selectedClient.id }
          });
        } catch (err) {
          console.error("Erro ao adicionar entrada no histórico:", err);
        }
        
        // Avançar para a próxima etapa após o cliente ser selecionado
        if (currentStep === "client-selection") {
          setCurrentStep("client-info");
        }
      };
      
      // Executar todas as atualizações de estado
      updateStates();
    }
  }, [selectedClient, completedSteps, currentStep]);

  // Carregar dados iniciais se disponíveis
  useEffect(() => {
    if (initialData) {
      // Preencher os estados com os dados iniciais
      if (initialData.client) {
        setClientData(initialData.client);
      }
      
      if (initialData.riskProfile) {
        setRiskProfileData(initialData.riskProfile);
      }
      
      if (initialData.horizon) {
        setHorizonData(initialData.horizon);
      }
      
      if (initialData.strategy) {
        setStrategyData(initialData.strategy);
      }
      
      if (initialData.assetAllocation) {
        setAssetAllocationData(initialData.assetAllocation);
      }
    }
  }, [initialData]);

  // Função para marcar um passo como concluído
  const markStepAsCompleted = (step: StepType) => {
    setCompletedSteps(prev => ({
      ...prev,
      [step]: true
    }));
  };
  
  // Calcular progresso geral
  const calculateProgress = () => {
    const totalSteps = STEPS.length;
    const completedCount = Object.values(completedSteps).filter(Boolean).length;
    return Math.round((completedCount / totalSteps) * 100);
  };

  // Função para salvar a recomendação
  const saveRecommendation = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      // Gerar ID único para a recomendação
      const recommendationId = uuidv4();
      
      // Criar um objeto de alocação normalizado para garantir consistência
      const normalizedAllocation = assetAllocationData.allocation.map(item => ({
        name: item.name,
        type: item.type || item.assetClass || 'Outros',
        allocation: item.allocation || item.weight || item.percentual || 0,
        expectedReturn: item.expectedReturn || 0,
        risk: item.risk || 'medium'
      }));

      // Criar objeto com os mesmos dados do array, mas em formato de objeto para melhor acesso
      const allocationAsObject = {};
      normalizedAllocation.forEach(item => {
        allocationAsObject[item.name] = item.allocation;
      });

      // Criar objeto de recomendação completo no formato esperado pelo banco de dados
      const recommendation = {
        id: recommendationId,
        clienteId: selectedClient?.id || '',
        titulo: `Recomendação para ${selectedClient?.nome}`,
        descricao: `Recomendação de investimentos para ${selectedClient?.nome} com perfil ${riskProfileData.profile} e horizonte de ${horizonData.years} anos.`,
        dataCriacao: new Date(),
        status: 'draft',
        perfilRisco: riskProfileData.profile,
        horizonteInvestimento: `${horizonData.years} anos`,
        valorInvestimento: horizonData.amount,
        estrategia: strategyData.name,
        // Salvar a alocação em MÚLTIPLOS formatos para garantir compatibilidade com visualização
        alocacaoAtivos: normalizedAllocation,
        // Salvar como objeto direto para acesso fácil
        allocation: allocationAsObject, // Usar dados reais, não valores fixos
        // Campo conteudo para armazenar todos os detalhes da recomendação
        conteudo: {
          clienteData: {
            id: selectedClient?.id,
            name: selectedClient?.nome,
            email: selectedClient?.email
          },
          perfilRisco: riskProfileData,
          horizonte: horizonData,
          estrategia: strategyData,
          // Salvar alocação em múltiplos formatos para compatibilidade
          alocacao: normalizedAllocation,
          // Formato de objeto chave-valor para compatibilidade
          alocacaoRecomendada: allocationAsObject, // Usar dados reais, não valores fixos
          // Também incluir em outra localização alternativa
          allocationData: allocationAsObject, // Usar dados reais, não valores fixos
          objetivo: horizonData.objective,
          justificativa: "Recomendação baseada no perfil de risco e horizonte de investimento do cliente",
          observacoes: "Recomendação gerada através do sistema de recomendação avançada",
          projecoes: {
            pessimistic: assetAllocationData.scenarioProjections?.pessimistic || 0,
            baseline: assetAllocationData.scenarioProjections?.baseline || 0,
            optimistic: assetAllocationData.scenarioProjections?.optimistic || 0
          }
        }
      };
      
      // Salvar no banco de dados
      await db.recomendacoes.add(recommendation);
      
      toast.success("Recomendação salva com sucesso!");
      
      // Redirecionar para a página de visualização
      setTimeout(() => {
        navigate(`/recommendation/${recommendationId}`);
      }, 1500);
    } catch (error) {
      console.error("Erro ao salvar recomendação:", error);
      toast.error("Ocorreu um erro ao salvar a recomendação");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determinar se o botão próximo deve ser ativado
  const isNextButtonEnabled = () => {
    switch (currentStep) {
      case "client-selection":
        return selectedClient !== null;
      case "client-info":
        return clientData.name && clientData.email;
      case "risk-profile":
        return riskProfileData.profile !== "";
      case "investment-horizon":
        return horizonData.years > 0 && horizonData.objective !== "";
      case "strategy":
        return strategyData.name !== "";
      case "asset-allocation":
        return assetAllocationData.allocation.length > 0;
      case "compliance":
        return true; // Sempre pode finalizar
      default:
        return false;
    }
  };
  
  // Determinar qual é o próximo passo
  const getNextStep = (current: StepType): StepType => {
    switch (current) {
      case "client-selection": return "client-info";
      case "client-info": return "risk-profile";
      case "risk-profile": return "investment-horizon";
      case "investment-horizon": return "strategy";
      case "strategy": return "asset-allocation";
      case "asset-allocation": return "compliance";
      default: return "compliance";
    }
  };
  
  // Determinar qual é o passo anterior
  const getPreviousStep = (current: StepType): StepType | null => {
    switch (current) {
      case "client-info": return "client-selection";
      case "risk-profile": return "client-info";
      case "investment-horizon": return "risk-profile";
      case "strategy": return "investment-horizon";
      case "asset-allocation": return "strategy";
      case "compliance": return "asset-allocation";
      default: return null;
    }
  };
  
  // Avançar para o próximo passo
  const goToNextStep = () => {
    markStepAsCompleted(currentStep);
    
    const nextStep = getNextStep(currentStep);
    setCurrentStep(nextStep);
    
    // Quando o usuário chegar na etapa de alocação, apenas gerar a recomendação explicitamente
    if (nextStep === "asset-allocation" && !assetAllocationData.allocation.length) {
      generateRecommendations();
    }
  };
  
  // Voltar para o passo anterior
  const goToPreviousStep = () => {
    const previousStep = getPreviousStep(currentStep);
    if (previousStep) {
      setCurrentStep(previousStep);
    }
  };
  
  // Manipulador para a seleção de cliente
  const handleClientSelect = (client: Cliente | null) => {
    // Se já temos um cliente selecionado e estamos selecionando o mesmo novamente, não fazer nada
    if (selectedClient && client && selectedClient.id === client.id) {
      return;
    }

    setSelectedClient(client);
    
    if (client) {
      // Tentar extrair outros campos relevantes que possam estar no JSON
      if (client.observacoes) {
        try {
          const observacoesObj = JSON.parse(client.observacoes);
          if (observacoesObj.camposAdicionais && observacoesObj.camposAdicionais.profissao) {
            console.log("Informações adicionais encontradas:", observacoesObj.camposAdicionais);
          }
        } catch (e) {
          // Silenciosamente ignorar erros de parse
        }
      }
      
      // Adicionar registro ao histórico - mover para dentro da função updateStates do useEffect
      // O registro de histórico agora será feito apenas uma vez, quando o cliente for efetivamente processado
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 bg-white dark:bg-gray-900 rounded-xl shadow-md">
      {/* Cabeçalho com progresso */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Nova Recomendação Personalizada
          </h1>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">
              Progresso: {calculateProgress()}%
            </span>
            {currentStep === "compliance" && completedSteps["asset-allocation"] && (
              <Button 
                onClick={saveRecommendation}
                className="gap-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Finalizar e Salvar Recomendação</span>
                  </>
                )}
              </Button>
            )}
          </div>
          <Progress value={calculateProgress()} className="h-2" />
        </div>
        
        {/* Passos (visual) */}
        <div className="mt-6 mb-8">
          <div className="flex justify-between w-full">
            {STEPS.map((step, index) => (
              <TooltipProvider key={step.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className={`flex flex-col items-center relative ${
                        currentStep === step.id
                          ? "text-primary"
                          : completedSteps[step.id as StepType]
                          ? "text-green-500 dark:text-green-400"
                          : "text-gray-400 dark:text-gray-600"
                      }`}
                    >
                      <div 
                        className={`
                          z-10 flex items-center justify-center w-10 h-10 rounded-full mb-2
                          ${
                            currentStep === step.id
                              ? "bg-primary text-white"
                              : completedSteps[step.id as StepType]
                              ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400"
                              : "bg-gray-100 text-gray-400 dark:bg-gray-800"
                          }
                        `}
                      >
                        {completedSteps[step.id as StepType] ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          step.icon
                        )}
                      </div>
                      <span className="text-xs font-medium hidden sm:block">{step.title}</span>
                      
                      {/* Linha conectora */}
                      {index < STEPS.length - 1 && (
                        <div 
                          className={`absolute top-5 w-full h-[2px] left-1/2 ${
                            completedSteps[step.id as StepType]
                              ? "bg-green-500 dark:bg-green-400"
                              : "bg-gray-200 dark:bg-gray-700"
                          }`}
                        />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-sm">
                      <p className="font-medium">{step.title}</p>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>
      </div>
      
      {/* Conteúdo principal */}
      <div className="mb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {currentStep === "client-selection" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold">Selecionar Cliente</h2>
                  <p className="text-muted-foreground">
                    Para criar uma recomendação, primeiro selecione um cliente existente
                  </p>
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>Cliente para Recomendação</CardTitle>
                    <CardDescription>
                      Escolha um cliente para o qual você deseja criar uma recomendação de investimento personalizada
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ClientSelector 
                      onClientSelect={handleClientSelect}
                      selectedClientId={selectedClient?.id}
                      required={true}
                      label="Selecione um cliente para prosseguir"
                    />
                  </CardContent>
                </Card>
              </div>
            )}
            
            {currentStep === "client-info" && (
              <ClientInfoStep
                initialData={clientData}
                onUpdateClientInfo={setClientData}
                onNext={goToNextStep}
              />
            )}
            
            {currentStep === "risk-profile" && (
              <RiskProfileStep
                initialData={riskProfileData}
                clientAge={clientData.age}
                onUpdateRiskProfile={setRiskProfileData}
                onNext={goToNextStep}
                onBack={goToPreviousStep}
              />
            )}
            
            {currentStep === "investment-horizon" && (
              <InvestmentHorizonStep
                initialData={horizonData}
                clientRiskProfile={riskProfileData.profile}
                onUpdateHorizon={setHorizonData}
                onNext={goToNextStep}
                onBack={goToPreviousStep}
              />
            )}
            
            {currentStep === "strategy" && (
              <EnhancedStrategyStep
                initialData={{
                  ...strategyData,
                  strategy: strategyData.name as AllocationStrategy
                }}
                clientRiskProfile={riskProfileData.profile}
                investmentHorizon={horizonData.years}
                objective={horizonData.objective}
                age={clientData?.age}
                onUpdateStrategy={(data) => {
                  setStrategyData({
                    name: data.name,
                    focus: data.focus,
                    expectedReturn: data.expectedReturn,
                    volatility: data.volatility,
                    description: data.description
                  });
                }}
                onNext={goToNextStep}
                onBack={goToPreviousStep}
              />
            )}
            
            {currentStep === "asset-allocation" && (
              <EnhancedAllocationStep
                initialData={assetAllocationData as any}
                clientData={{
                  id: selectedClient?.id ? parseInt(selectedClient.id) : undefined,
                  name: clientData.name,
                  age: clientData.age,
                  riskProfile: riskProfileData.profile,
                  income: clientData.income,
                  objectives: clientData.objetivos
                }}
                investmentData={{
                  initialAmount: horizonData.amount,
                  monthlyContribution: horizonData.monthlyContribution,
                  targetHorizon: horizonData.years,
                  targetObjective: horizonData.objective
                }}
                investmentStrategy={strategyData.name}
                onUpdateAssetAllocation={setAssetAllocationData}
                onNext={() => setCurrentStep("compliance")}
                onBack={() => setCurrentStep("strategy")}
              />
            )}
            
            {currentStep === "compliance" && (
              <RegulatoryComplianceStep
                clientRiskProfile={riskProfileData.profile}
                assetAllocation={assetAllocationData.allocation}
                selectedStrategy={strategyData.name}
                complianceData={complianceData}
                onUpdate={setComplianceData}
                onNext={goToNextStep}
                onBack={goToPreviousStep}
                onFinish={saveRecommendation}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Barra de navegação inferior */}
      <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          variant="outline"
          onClick={goToPreviousStep}
          disabled={!getPreviousStep(currentStep)}
          className="gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Anterior</span>
        </Button>
        
        {currentStep !== "compliance" && (
          <Button
            onClick={goToNextStep}
            disabled={!isNextButtonEnabled()}
            className="gap-1"
          >
            <span>Próximo</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default AdvancedRecommendationForm; 