import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Clock, 
  Target, 
  DollarSign, 
  Info,
  Home,
  GraduationCap,
  Plane,
  Building,
  CoinsIcon,
  Umbrella,
  Calendar,
  PiggyBank,
  PlusIcon,
  MinusIcon,
  Check,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface InvestmentHorizonStepProps {
  initialData?: {
    years: number;
    objective: string;
    amount: number;
    monthlyContribution?: number; // Agora opcional
  };
  clientRiskProfile?: string;
  onUpdateHorizon: (data: {
    years: number;
    objective: string;
    amount: number;
    monthlyContribution: number; // Mantido para compatibilidade
  }) => void;
  onNext: () => void;
  onBack: () => void;
}

// Opções de objetivos com ícones correspondentes
const OBJETIVOS_OPCOES = [
  { 
    id: "aposentadoria", 
    label: "Aposentadoria", 
    defaultYears: 20,
    icon: <PiggyBank />,
    description: "Acumular recursos para garantir qualidade de vida na aposentadoria",
    color: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
  },
  { 
    id: "reserva", 
    label: "Reserva de Emergência", 
    defaultYears: 1,
    icon: <Umbrella />,
    description: "Fundo para despesas inesperadas ou emergências",
    color: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
  },
  { 
    id: "casa", 
    label: "Compra de Imóvel", 
    defaultYears: 7,
    icon: <Home />,
    description: "Recursos para aquisição ou entrada em um imóvel",
    color: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400"
  },
  { 
    id: "educacao", 
    label: "Educação", 
    defaultYears: 5,
    icon: <GraduationCap />,
    description: "Investir em formação acadêmica ou profissional",
    color: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400"
  },
  { 
    id: "viagem", 
    label: "Viagem", 
    defaultYears: 2,
    icon: <Plane />,
    description: "Guardar recursos para realizar viagens",
    color: "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400"
  },
  { 
    id: "patrimonio", 
    label: "Construção de Patrimônio", 
    defaultYears: 10,
    icon: <Building />,
    description: "Acumular e multiplicar capital ao longo do tempo",
    color: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400"
  },
  { 
    id: "renda", 
    label: "Geração de Renda", 
    defaultYears: 15,
    icon: <CoinsIcon />,
    description: "Criar fluxo de rendimentos passivos",
    color: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400"
  }
];

// Taxas de retorno aproximadas
const ESTIMATED_RETURNS = {
  conservador: 0.08, // 8% a.a.
  moderado: 0.10,    // 10% a.a.
  agressivo: 0.12    // 12% a.a.
};

// Função para formatação de dinheiro
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const InvestmentHorizonStep: React.FC<InvestmentHorizonStepProps> = ({
  initialData,
  clientRiskProfile = "moderado",
  onUpdateHorizon,
  onNext,
  onBack
}) => {
  const [years, setYears] = useState(initialData?.years || 5);
  const [objective, setObjective] = useState(initialData?.objective || "");
  const [initialAmount, setInitialAmount] = useState(initialData?.amount || 100000);
  const [currentSection, setCurrentSection] = useState<'objetivo' | 'prazo-valor'>(!objective ? 'objetivo' : 'prazo-valor');
  
  // Normalizar perfil de risco
  const normalizedProfile = clientRiskProfile.toLowerCase() as "conservador" | "moderado" | "agressivo";
  
  // Atualizar dados no componente pai quando os campos mudam
  useEffect(() => {
    onUpdateHorizon({
      years,
      objective,
      amount: initialAmount,
      monthlyContribution: 0 // Mantido 0 para compatibilidade
    });
  }, [years, objective, initialAmount, onUpdateHorizon]);
  
  // Atualizar anos baseado no objetivo selecionado
  const handleObjectiveChange = (selected: string) => {
    setObjective(selected);
    const selectedObjective = OBJETIVOS_OPCOES.find(opt => opt.id === selected);
    if (selectedObjective) {
      setYears(selectedObjective.defaultYears);
    }
    
    // Avançar para a próxima seção após selecionar o objetivo
    setTimeout(() => {
      setCurrentSection('prazo-valor');
    }, 300);
  };
  
  // Calcular valor futuro com aporte único
  const calculateFutureValue = () => {
    const rate = ESTIMATED_RETURNS[normalizedProfile]; // Taxa anual
    
    // Cálculo de valor futuro de aporte único com juros compostos
    // FV = PV * (1 + r)^n
    const futureValue = initialAmount * Math.pow(1 + rate, years);
    
    return Math.round(futureValue);
  };
  
  // Encontrar objetivo selecionado
  const selectedObjective = OBJETIVOS_OPCOES.find(opt => opt.id === objective);
  
  // Incrementar e decrementar anos
  const incrementYears = () => setYears(prev => Math.min(prev + 1, 40));
  const decrementYears = () => setYears(prev => Math.max(prev - 1, 1));
  
  // Incrementar e decrementar valor inicial
  const incrementInitial = () => setInitialAmount(prev => prev + 10000);
  const decrementInitial = () => setInitialAmount(prev => Math.max(prev - 10000, 10000));
  
  // Valor futuro para referência
  const futureValue = calculateFutureValue();
  
  // Calcular progresso do formulário
  const calculateProgress = () => {
    let progress = 0;
    
    if (objective) progress += 50;
    if (years > 0 && initialAmount > 0) progress += 50;
    
    return progress;
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Horizonte de Investimento</h2>
          <p className="text-muted-foreground">
            Defina o prazo e o objetivo financeiro para o planejamento
          </p>
        </div>
        
        {clientRiskProfile && (
          <Badge 
            variant="outline" 
            className={`px-3 py-1 ${
              normalizedProfile === "conservador" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
              normalizedProfile === "moderado" ? "bg-blue-50 text-blue-700 border-blue-200" :
              "bg-amber-50 text-amber-700 border-amber-200"
            }`}
          >
            Perfil: {clientRiskProfile}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 ml-1 opacity-70" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">
                    Retorno estimado: {(ESTIMATED_RETURNS[normalizedProfile] * 100).toFixed(1)}% a.a.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Badge>
        )}
      </div>
      
      {/* Indicador de progresso */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progresso</span>
          <span>{calculateProgress()}%</span>
        </div>
        <Progress value={calculateProgress()} className="h-2" />
      </div>
      
      {/* Passos do formulário */}
      <div className="mb-2 flex border rounded-lg overflow-hidden">
        <button
          className={`flex-1 py-2.5 px-4 text-sm font-medium flex justify-center items-center gap-2 
          ${currentSection === 'objetivo' 
            ? 'bg-primary text-primary-foreground' 
            : objective 
              ? 'bg-primary/10 text-primary' 
              : 'bg-background text-muted-foreground'}`}
          onClick={() => setCurrentSection('objetivo')}
        >
          {objective && <Check className="h-4 w-4" />}
          <span>1. Objetivo</span>
        </button>
        <button
          className={`flex-1 py-2.5 px-4 text-sm font-medium flex justify-center items-center gap-2
          ${currentSection === 'prazo-valor' 
            ? 'bg-primary text-primary-foreground' 
            : years > 0 && initialAmount > 0
              ? 'bg-primary/10 text-primary' 
              : 'bg-background text-muted-foreground'}`}
          onClick={() => objective && setCurrentSection('prazo-valor')}
          disabled={!objective}
        >
          {years > 0 && initialAmount > 0 && <Check className="h-4 w-4" />}
          <span>2. Prazo e Valor</span>
        </button>
      </div>
      
      <div className="space-y-6">
        {/* Seção de Objetivo */}
        {currentSection === 'objetivo' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div>
              <h3 className="text-lg font-medium mb-3 flex gap-2 items-center">
                <Target className="h-5 w-5 text-primary" />
                Selecione o objetivo
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {OBJETIVOS_OPCOES.map((obj) => (
                  <motion.div 
                    key={obj.id}
                    whileHover={{ y: -5 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card 
                      className={`cursor-pointer h-full transition-all duration-200 border ${
                        objective === obj.id 
                          ? "border-2 border-primary shadow-md" 
                          : "hover:shadow-sm hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                      onClick={() => handleObjectiveChange(obj.id)}
                    >
                      <CardContent className="p-4 flex flex-col h-full">
                        <div className={`p-2 rounded-full w-10 h-10 flex items-center justify-center ${obj.color} mb-3`}>
                          {obj.icon}
                        </div>
                        <h4 className="font-medium">{obj.label}</h4>
                        <p className="text-xs text-muted-foreground mt-1 flex-grow">{obj.description}</p>
                        <div className="flex items-center gap-1 mt-3">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium">
                            {obj.defaultYears} {obj.defaultYears === 1 ? "ano" : "anos"}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Seção de Prazo e Valor */}
        {currentSection === 'prazo-valor' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Card do objetivo selecionado */}
            {objective && selectedObjective && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <Card className={`border ${selectedObjective.color.replace('text-', 'border-').split(' ')[2]}`}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className={`p-2 rounded-full w-9 h-9 flex items-center justify-center ${selectedObjective.color} flex-shrink-0`}>
                      {selectedObjective.icon}
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-medium">Objetivo: {selectedObjective.label}</h3>
                      <p className="text-sm text-muted-foreground">{selectedObjective.description}</p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 text-xs mt-1 px-2 text-muted-foreground hover:text-foreground"
                        onClick={() => setCurrentSection('objetivo')}
                      >
                        Alterar objetivo
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Prazo do investimento */}
              <Card className="border-primary/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <span>Prazo do Investimento</span>
                  </CardTitle>
                  <CardDescription>
                    Por quanto tempo o dinheiro ficará investido
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-center gap-3">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={decrementYears}
                      disabled={years <= 1}
                      className="h-10 w-10 rounded-full"
                    >
                      <MinusIcon className="h-4 w-4" />
                    </Button>
                    <div className="flex flex-col items-center">
                      <div className="text-5xl font-bold text-primary">
                        {years}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {years === 1 ? "ano" : "anos"}
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={incrementYears}
                      disabled={years >= 40}
                      className="h-10 w-10 rounded-full"
                    >
                      <PlusIcon className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="pt-2">
                    <Slider
                      value={[years]}
                      min={1}
                      max={40}
                      step={1}
                      onValueChange={(value) => setYears(value[0])}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1 px-0.5">
                      <span>Curto</span>
                      <span>Médio</span>
                      <span>Longo</span>
                    </div>
                  </div>
                  
                  {/* Tempo caracterizações */}
                  <div className="flex justify-between gap-1 mt-2">
                    <Badge variant="outline" className={`flex-1 justify-center py-1.5 ${years <= 2 ? "bg-primary/10 border-primary text-primary" : ""}`}>
                      Curto prazo
                    </Badge>
                    <Badge variant="outline" className={`flex-1 justify-center py-1.5 ${years > 2 && years <= 8 ? "bg-primary/10 border-primary text-primary" : ""}`}>
                      Médio prazo
                    </Badge>
                    <Badge variant="outline" className={`flex-1 justify-center py-1.5 ${years > 8 ? "bg-primary/10 border-primary text-primary" : ""}`}>
                      Longo prazo
                    </Badge>
                  </div>
                </CardContent>
              </Card>
              
              {/* Valor inicial */}
              <Card className="border-primary/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <span>Aporte Único</span>
                  </CardTitle>
                  <CardDescription>
                    Valor inicial a ser investido
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={decrementInitial}
                      disabled={initialAmount <= 10000}
                      className="h-10 w-10 rounded-full"
                    >
                      <MinusIcon className="h-4 w-4" />
                    </Button>
                    <div className="flex-1">
                      <Input
                        type="number"
                        min={10000}
                        step={10000}
                        value={initialAmount}
                        onChange={(e) => setInitialAmount(Number(e.target.value))}
                        className="text-center font-medium text-lg h-12"
                      />
                    </div>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={incrementInitial}
                      className="h-10 w-10 rounded-full"
                    >
                      <PlusIcon className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Valores predefinidos */}
                  <div className="grid grid-cols-3 gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setInitialAmount(50000)}
                      className={initialAmount === 50000 ? "bg-primary/10 border-primary" : ""}
                    >
                      R$ 50.000
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setInitialAmount(100000)}
                      className={initialAmount === 100000 ? "bg-primary/10 border-primary" : ""}
                    >
                      R$ 100.000
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setInitialAmount(250000)}
                      className={initialAmount === 250000 ? "bg-primary/10 border-primary" : ""}
                    >
                      R$ 250.000
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}
      </div>
      
      {/* Botões de navegação */}
      <div className="flex justify-between pt-4 border-t">
        {currentSection === 'prazo-valor' && objective ? (
          <Button
            variant="outline"
            onClick={() => setCurrentSection('objetivo')}
            className="gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar para Objetivo</span>
          </Button>
        ) : null}
        
        {currentSection === 'objetivo' && objective ? (
          <Button
            onClick={() => setCurrentSection('prazo-valor')}
            className="gap-1 ml-auto"
          >
            <span>Continuar</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
};

export default InvestmentHorizonStep; 