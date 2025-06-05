import React, { useState, useEffect } from "react";
import { 
  ArrowRight, 
  User, 
  Mail, 
  Calendar, 
  DollarSign, 
  Target, 
  PieChart, 
  TrendingUp, 
  AlertCircle,
  Info,
  Wallet,
  BadgeInfo
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface ClientInfoStepProps {
  initialData?: {
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
  };
  onUpdateClientInfo: (data: {
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
  }) => void;
  onNext: () => void;
}

const OBJETIVOS_OPCOES = [
  { id: "aposentadoria", label: "Aposentadoria" },
  { id: "reserva", label: "Reserva de Emergência" },
  { id: "casa", label: "Compra de Imóvel" },
  { id: "educacao", label: "Educação" },
  { id: "viagem", label: "Viagem" },
  { id: "patrimonio", label: "Construção de Patrimônio" },
  { id: "renda", label: "Geração de Renda" }
];

const INVESTMENT_STYLES = [
  { id: "conservador", label: "Conservador" },
  { id: "moderado", label: "Moderado" },
  { id: "agressivo", label: "Agressivo" },
  { id: "dinamico", label: "Dinâmico" }
];

const ASSET_TYPES = [
  { id: "renda-fixa", label: "Renda Fixa" },
  { id: "acoes", label: "Ações" },
  { id: "fundos", label: "Fundos de Investimento" },
  { id: "imoveis", label: "Fundos Imobiliários" },
  { id: "internacional", label: "Investimentos Internacionais" }
];

const ClientInfoStep: React.FC<ClientInfoStepProps> = ({
  initialData,
  onUpdateClientInfo,
  onNext
}) => {
  // Mantemos os estados dos campos, mas nome e email serão apenas para exibição
  const [name] = useState(initialData?.name || "");
  const [email] = useState(initialData?.email || "");
  const [age] = useState(initialData?.age || 30);
  const [income, setIncome] = useState(initialData?.income || 0);
  const [objetivos, setObjetivos] = useState<string[]>(initialData?.objetivos || []);
  
  const [investmentAmount, setInvestmentAmount] = useState(
    initialData?.currentInvestments?.amount || 0
  );
  
  const [showComposition, setShowComposition] = useState(
    initialData?.currentInvestments?.composition && 
    initialData.currentInvestments.composition.length > 0
  );
  
  const [composition, setComposition] = useState<Array<{name: string; percentage: number}>>(
    initialData?.currentInvestments?.composition || [
      { name: "renda-fixa", percentage: 100 }
    ]
  );
  
  const [showHistorical, setShowHistorical] = useState(
    initialData?.historicalBehavior !== undefined
  );
  
  const [riskTolerance, setRiskTolerance] = useState(
    initialData?.historicalBehavior?.riskTolerance || 5
  );
  
  const [investmentStyle, setInvestmentStyle] = useState(
    initialData?.historicalBehavior?.investmentStyle || "moderado"
  );
  
  const [previousRedemptions, setPreviousRedemptions] = useState(
    initialData?.historicalBehavior?.previousRedemptions || 0
  );
  
  // Validação de campos
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  
  // Atualizar dados no componente pai quando os campos mudam
  useEffect(() => {
    const clientInfoData = {
      id: initialData?.id,
      name,
      email,
      age,
      income,
      objetivos,
      currentInvestments: showComposition ? {
        amount: investmentAmount,
        composition
      } : undefined,
      historicalBehavior: showHistorical ? {
        riskTolerance,
        investmentStyle,
        previousRedemptions
      } : undefined
    };
    
    onUpdateClientInfo(clientInfoData);
  }, [
    income, objetivos, 
    showComposition, investmentAmount, composition,
    showHistorical, riskTolerance, investmentStyle, previousRedemptions
  ]);
  
  // Validar antes de avançar
  const validateAndContinue = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (objetivos.length === 0) {
      newErrors.objetivos = "Selecione pelo menos um objetivo";
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      onNext();
    }
  };
  
  // Atualizar composição
  const updateComposition = (index: number, field: "name" | "percentage", value: string | number) => {
    const newComposition = [...composition];
    
    if (field === "name") {
      newComposition[index].name = value as string;
    } else {
      // Garantir que a porcentagem seja um número
      let percentage = typeof value === "string" ? parseFloat(value) : value;
      
      // Limitar entre 0 e 100
      percentage = Math.min(100, Math.max(0, percentage));
      
      newComposition[index].percentage = percentage;
    }
    
    setComposition(newComposition);
  };
  
  // Adicionar novo item na composição
  const addCompositionItem = () => {
    // Verificar se a soma atual é menor que 100 antes de adicionar
    const currentSum = composition.reduce((sum, item) => sum + item.percentage, 0);
    const remainingPercentage = Math.max(0, 100 - currentSum);
    
    setComposition([
      ...composition,
      { name: "renda-fixa", percentage: remainingPercentage }
    ]);
  };
  
  // Remover item da composição
  const removeCompositionItem = (index: number) => {
    const newComposition = composition.filter((_, i) => i !== index);
    setComposition(newComposition);
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Informações do Cliente</h2>
        <p className="text-muted-foreground">
          Forneça os dados financeiros e objetivos do cliente para personalizar as recomendações
        </p>
      </div>
      
      {/* Dados pessoais (somente exibição) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BadgeInfo className="h-5 w-5 text-primary/80" />
            <span>Dados cadastrais do cliente</span>
          </CardTitle>
          <CardDescription>
            Estes dados são provenientes do cadastro e não podem ser alterados nesta etapa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-sm">Nome</Label>
              <div className="flex items-center gap-2 font-medium">
                <User className="h-4 w-4 text-primary/70" />
                {name}
              </div>
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-sm">Email</Label>
              <div className="flex items-center gap-2 font-medium">
                <Mail className="h-4 w-4 text-primary/70" />
                {email}
              </div>
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-sm">Idade</Label>
              <div className="flex items-center gap-2 font-medium">
                <Calendar className="h-4 w-4 text-primary/70" />
                {age} anos
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Dados financeiros (editáveis) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary/80" />
            <span>Dados financeiros</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="income" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>Renda Mensal</span>
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80">
                    <p className="text-sm">
                      Informe a renda mensal aproximada do cliente para ajustar as recomendações de investimento.
                    </p>
                  </HoverCardContent>
                </HoverCard>
              </Label>
              <Input
                id="income"
                type="number"
                min={0}
                value={income}
                onChange={(e) => setIncome(parseFloat(e.target.value) || 0)}
                placeholder="Ex: 5000"
                className={errors.income ? "border-red-500" : ""}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Objetivos */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span>Objetivos Financeiros</span>
              </Label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {OBJETIVOS_OPCOES.map((objetivo) => (
                  <div key={objetivo.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`objetivo-${objetivo.id}`}
                      checked={objetivos.includes(objetivo.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setObjetivos([...objetivos, objetivo.id]);
                        } else {
                          setObjetivos(objetivos.filter(id => id !== objetivo.id));
                        }
                      }}
                    />
                    <label
                      htmlFor={`objetivo-${objetivo.id}`}
                      className="text-sm"
                    >
                      {objetivo.label}
                    </label>
                  </div>
                ))}
              </div>
              {errors.objetivos && (
                <p className="text-red-500 text-sm mt-2">{errors.objetivos}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Investimentos atuais */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-3">
              <Label className="flex items-center gap-2">
                <PieChart className="h-4 w-4 text-muted-foreground" />
                <span>Investimentos Atuais</span>
              </Label>
              
              <div className="flex items-center">
                <Checkbox
                  id="has-investments"
                  checked={showComposition}
                  onCheckedChange={(checked) => setShowComposition(!!checked)}
                  className="mr-2"
                />
                <label htmlFor="has-investments" className="text-sm">
                  Já possui investimentos
                </label>
              </div>
            </div>
            
            {showComposition && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="investment-amount">Valor Total Investido</Label>
                  <Input
                    id="investment-amount"
                    type="number"
                    min={0}
                    value={investmentAmount}
                    onChange={(e) => setInvestmentAmount(parseFloat(e.target.value) || 0)}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Composição da Carteira</Label>
                    <Badge variant="outline">
                      Total: {composition.reduce((sum, item) => sum + item.percentage, 0)}%
                    </Badge>
                  </div>
                  
                  {composition.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-6">
                        <Select
                          value={item.name}
                          onValueChange={(value) => updateComposition(index, "name", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ASSET_TYPES.map((asset) => (
                              <SelectItem key={asset.id} value={asset.id}>
                                {asset.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="col-span-4">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={item.percentage}
                          onChange={(e) => updateComposition(index, "percentage", e.target.value)}
                        />
                      </div>
                      
                      <div className="col-span-2 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCompositionItem(index)}
                          disabled={composition.length <= 1}
                        >
                          Remover
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCompositionItem}
                    disabled={composition.reduce((sum, item) => sum + item.percentage, 0) >= 100}
                    className="mt-2"
                  >
                    Adicionar Ativo
                  </Button>
                </div>
                
                {composition.reduce((sum, item) => sum + item.percentage, 0) !== 100 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      A soma das porcentagens deve ser igual a 100%.
                    </AlertDescription>
                  </Alert>
                )}
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Histórico de investimentos */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-3">
              <Label className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span>Comportamento Histórico</span>
              </Label>
              
              <div className="flex items-center">
                <Checkbox
                  id="has-historical"
                  checked={showHistorical}
                  onCheckedChange={(checked) => setShowHistorical(!!checked)}
                  className="mr-2"
                />
                <label htmlFor="has-historical" className="text-sm">
                  Incluir histórico de investimentos
                </label>
              </div>
            </div>
            
            {showHistorical && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="risk-tolerance">Tolerância a Risco (1-10)</Label>
                  <Input
                    id="risk-tolerance"
                    type="number"
                    min={1}
                    max={10}
                    value={riskTolerance}
                    onChange={(e) => setRiskTolerance(parseInt(e.target.value) || 5)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="investment-style">Estilo de Investimento</Label>
                  <Select
                    value={investmentStyle}
                    onValueChange={setInvestmentStyle}
                  >
                    <SelectTrigger id="investment-style">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INVESTMENT_STYLES.map((style) => (
                        <SelectItem key={style.id} value={style.id}>
                          {style.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="previous-redemptions">Resgates Antecipados (últimos 12 meses)</Label>
                  <Input
                    id="previous-redemptions"
                    type="number"
                    min={0}
                    value={previousRedemptions}
                    onChange={(e) => setPreviousRedemptions(parseInt(e.target.value) || 0)}
                  />
                </div>
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Botão para avançar */}
      <div className="flex justify-end" style={{ display: 'none' }}>
        <Button type="button" onClick={validateAndContinue} className="gap-2">
          <span>Próximo Passo</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ClientInfoStep; 