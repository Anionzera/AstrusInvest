import React, { useState, useEffect } from 'react';
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { AllocationStrategy, RiskProfile } from '@/lib/investmentUtils';
import { Button } from '../ui/button';
import { ArrowRight, Info, TrendingUp, LineChart, Briefcase, Shield, Zap } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';

interface StrategyCardProps {
  title: string;
  description: string;
  pros: string[];
  cons: string[];
  bestFor: string[];
  strategyType: AllocationStrategy;
  selected: boolean;
  onSelect: (strategy: AllocationStrategy) => void;
  riskProfile: RiskProfile;
  compatibility: 'ideal' | 'suitable' | 'caution';
}

const StrategyCard: React.FC<StrategyCardProps> = ({
  title,
  description,
  pros,
  cons,
  bestFor,
  strategyType,
  selected,
  onSelect,
  riskProfile,
  compatibility
}) => {
  // Determinar cores baseadas na compatibilidade
  const getCompatibilityColor = () => {
    switch (compatibility) {
      case 'ideal': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'suitable': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'caution': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <Card className={`w-full mb-4 ${selected ? 'border-2 border-primary' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>{title}</CardTitle>
          <Badge className={getCompatibilityColor()}>
            {compatibility === 'ideal' ? 'Ideal' : 
             compatibility === 'suitable' ? 'Adequado' : 'Atenção'}
          </Badge>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pb-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium flex items-center mb-1">
              <TrendingUp className="h-4 w-4 mr-1 text-green-600" />
              Vantagens
            </h4>
            <ul className="text-sm pl-5 list-disc space-y-1">
              {pros.map((pro, i) => (
                <li key={i}>{pro}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium flex items-center mb-1">
              <Shield className="h-4 w-4 mr-1 text-red-600" />
              Desvantagens
            </h4>
            <ul className="text-sm pl-5 list-disc space-y-1">
              {cons.map((con, i) => (
                <li key={i}>{con}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-3">
          <h4 className="text-sm font-medium flex items-center mb-1">
            <Briefcase className="h-4 w-4 mr-1 text-blue-600" />
            Ideal para
          </h4>
          <div className="flex flex-wrap gap-1">
            {bestFor.map((item, i) => (
              <Badge key={i} variant="outline" className="bg-blue-50 dark:bg-blue-950 text-xs">
                {item}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-4">
        <Button 
          variant={selected ? "default" : "outline"} 
          onClick={() => onSelect(strategyType)}
          className="w-full"
        >
          {selected ? 'Selecionado' : 'Selecionar'}
          {selected && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </CardFooter>
    </Card>
  );
};

interface StrategySelectorProps {
  riskProfile: RiskProfile;
  onChange: (strategy: AllocationStrategy) => void;
  value?: AllocationStrategy;
  investmentHorizon?: string;
  age?: number;
}

const StrategySelector: React.FC<StrategySelectorProps> = ({
  riskProfile,
  onChange,
  value,
  investmentHorizon,
  age
}) => {
  const [selectedStrategy, setSelectedStrategy] = useState<AllocationStrategy>(
    value || "Portfólio Permanente"
  );
  const [activeTab, setActiveTab] = useState<string>("recomendadas");

  // Mapear horizonte de investimento para um valor numérico
  const getHorizonValue = (): number => {
    if (!investmentHorizon) return 5;
    if (investmentHorizon.includes("Curto")) return 2;
    if (investmentHorizon.includes("Médio")) return 5;
    return 10;
  };

  // Determinar compatibilidade da estratégia com o perfil
  const getStrategyCompatibility = (strategy: AllocationStrategy): 'ideal' | 'suitable' | 'caution' => {
    const horizon = getHorizonValue();
    const isYoung = age ? age < 40 : false;
    const isOld = age ? age > 60 : false;

    // Regras específicas por perfil e estratégia
    if (riskProfile === "Conservador") {
      if (["Variância Mínima", "Tradicional 60/40", "Portfólio Permanente"].includes(strategy)) {
        return 'ideal';
      }
      if (["Momentum e Rotação", "Fator de Risco", "Otimização de Markowitz"].includes(strategy)) {
        return 'caution';
      }
    }
    
    if (riskProfile === "Moderado") {
      if (["Portfólio All Weather", "Black-Litterman", "Tradicional 60/40"].includes(strategy)) {
        return 'ideal';
      }
      if (["Momentum e Rotação", "Endowment"].includes(strategy) && horizon < 5) {
        return 'caution';
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

    // Regras baseadas em horizonte, independente do perfil
    if (horizon < 3 && ["Endowment", "Momentum e Rotação"].includes(strategy)) {
      return 'caution';
    }
    
    if (horizon > 8 && ["Barbell", "Endowment"].includes(strategy)) {
      return 'ideal';
    }

    // Regras baseadas em idade
    if (isOld && ["Momentum e Rotação", "Barbell"].includes(strategy)) {
      return 'caution';
    }
    
    if (isYoung && ["Endowment", "Fator de Risco"].includes(strategy)) {
      return 'ideal';
    }

    // Padrão
    return 'suitable';
  };

  // Quando a estratégia muda, notificar o componente pai
  useEffect(() => {
    onChange(selectedStrategy);
  }, [selectedStrategy, onChange]);

  // Dados de estratégias de investimento
  const strategies: {
    type: AllocationStrategy;
    title: string;
    description: string;
    pros: string[];
    cons: string[];
    bestFor: string[];
    category: 'classic' | 'advanced' | 'specialized' | 'conservative' | 'moderate' | 'aggressive' | 'alternative';
  }[] = [
    {
      type: "Portfólio Permanente",
      title: "Portfólio Permanente",
      description: "Estratégia desenvolvida por Harry Browne que aloca igualmente entre ações, títulos, ouro e caixa para resistir a diferentes cenários econômicos.",
      pros: [
        "Alta resistência a diferentes cenários econômicos",
        "Baixa volatilidade e drawdowns reduzidos",
        "Rebalanceamento simples e pouco frequente"
      ],
      cons: [
        "Retorno potencialmente menor em mercados de alta",
        "Alocação significativa em ouro (25%)",
        "Pode ter longos períodos de desempenho abaixo do mercado"
      ],
      bestFor: [
        "Investidores avessos ao risco",
        "Preservação de capital",
        "Aposentados",
        "Quem não quer acompanhar o mercado frequentemente"
      ],
      category: 'classic'
    },
    {
      type: "Portfólio All Weather",
      title: "All Weather",
      description: "Criado por Ray Dalio, busca performance em qualquer ambiente econômico balanceando exposição a crescimento, inflação, deflação e recessão.",
      pros: [
        "Diversificação entre múltiplas classes de ativos",
        "Desempenho consistente em diferentes ciclos econômicos",
        "Boa proporção risco/retorno de longo prazo"
      ],
      cons: [
        "Complexidade na implementação para investidores individuais",
        "Potencial subperformance em mercados de alta contínua",
        "Requer rebalanceamentos periódicos"
      ],
      bestFor: [
        "Investidores de longo prazo",
        "Quem busca consistência de retornos",
        "Proteção contra diferentes ciclos econômicos",
        "Investidores moderados"
      ],
      category: 'classic'
    },
    {
      type: "Tradicional 60/40",
      title: "Tradicional 60/40",
      description: "Alocação clássica com 60% em ações e 40% em renda fixa, balanceando crescimento e estabilidade.",
      pros: [
        "Simplicidade de implementação e manutenção",
        "Histórico longo e bem documentado",
        "Boa performance de longo prazo"
      ],
      cons: [
        "Menos eficaz em ambientes de alta inflação",
        "Falta de diversificação em outras classes de ativos",
        "Desempenho potencialmente limitado em certos ciclos econômicos"
      ],
      bestFor: [
        "Investidores iniciantes",
        "Quem busca uma estratégia simples e testada",
        "Investidores moderados",
        "Objetivos de médio a longo prazo"
      ],
      category: 'classic'
    },
    {
      type: "Otimização de Markowitz",
      title: "Otimização de Markowitz",
      description: "Baseada na Teoria Moderna do Portfólio, busca a relação ótima entre risco e retorno utilizando correlações entre ativos.",
      pros: [
        "Otimização matemática para melhor retorno ajustado ao risco",
        "Considera correlações entre ativos",
        "Base acadêmica sólida"
      ],
      cons: [
        "Sensibilidade a erros de estimativa de retornos futuros",
        "Pode gerar concentrações extremas",
        "Complexidade matemática"
      ],
      bestFor: [
        "Investidores analíticos",
        "Quem valoriza abordagens quantitativas",
        "Portfólios com múltiplas classes de ativos",
        "Investidores com conhecimento avançado"
      ],
      category: 'advanced'
    },
    {
      type: "Paridade de Risco",
      title: "Paridade de Risco",
      description: "Aloca recursos para que cada ativo contribua igualmente para o risco total do portfólio, equalizando a contribuição de risco.",
      pros: [
        "Melhor diversificação de risco",
        "Menor impacto de eventos extremos",
        "Não depende de previsões de retorno"
      ],
      cons: [
        "Pode requerer alavancagem para atingir retornos desejados",
        "Complexidade de implementação",
        "Potencial subalocação em ativos de maior retorno"
      ],
      bestFor: [
        "Investidores que priorizam controle de risco",
        "Portfólios com classes de ativos de volatilidades muito diferentes",
        "Quem busca estabilidade com diversificação"
      ],
      category: 'advanced'
    },
    {
      type: "Pesos Iguais",
      title: "Pesos Iguais",
      description: "Divide o investimento igualmente entre as classes de ativos selecionadas, sem favorecer nenhuma delas.",
      pros: [
        "Extrema simplicidade de implementação",
        "Evita erros de timing e seleção",
        "Diversificação natural"
      ],
      cons: [
        "Ignora diferenças de risco entre ativos",
        "Não considera correlações",
        "Potencialmente subótima em termos de risco/retorno"
      ],
      bestFor: [
        "Investidores iniciantes",
        "Quem deseja evitar complexidade",
        "Carteiras com número limitado de ativos",
        "Quem desconfia de previsões e modelos"
      ],
      category: 'classic'
    },
    {
      type: "Momentum e Rotação",
      title: "Momentum e Rotação",
      description: "Investe nos ativos com melhor desempenho recente, realocando periodicamente para capturar tendências de mercado.",
      pros: [
        "Captura tendências de mercado",
        "Potencial de superar o mercado em períodos prolongados",
        "Adaptação a diferentes contextos de mercado"
      ],
      cons: [
        "Maior rotatividade e custos de transação",
        "Vulnerabilidade a reversões rápidas",
        "Potenciais impactos tributários"
      ],
      bestFor: [
        "Investidores ativos",
        "Tolerância a maior rotatividade",
        "Quem acredita em tendências de mercado",
        "Perfis mais arrojados"
      ],
      category: 'specialized'
    },
    {
      type: "Variância Mínima",
      title: "Variância Mínima",
      description: "Busca minimizar a volatilidade total do portfólio, independentemente do retorno esperado, priorizando estabilidade.",
      pros: [
        "Menor volatilidade possível",
        "Bom desempenho em mercados instáveis",
        "Não requer estimativas de retorno"
      ],
      cons: [
        "Potencial sacrifício de retorno",
        "Pode gerar concentrações não intuitivas",
        "Melhor para curto/médio prazo"
      ],
      bestFor: [
        "Investidores extremamente avessos ao risco",
        "Horizontes de curto a médio prazo",
        "Quem prioriza preservação de capital",
        "Aposentados em fase de desacumulação"
      ],
      category: 'advanced'
    },
    {
      type: "Black-Litterman",
      title: "Black-Litterman",
      description: "Combina equilíbrio de mercado com visões específicas do investidor, permitindo personalização baseada em expectativas.",
      pros: [
        "Combina dados de mercado com visões pessoais",
        "Evita alocações extremas",
        "Flexibilidade para incorporar cenários"
      ],
      cons: [
        "Complexidade de implementação",
        "Dependência da qualidade das visões incorporadas",
        "Requer conhecimento avançado"
      ],
      bestFor: [
        "Investidores sofisticados",
        "Gestores profissionais",
        "Quem tem visões específicas sobre mercados",
        "Portfólios de grande porte"
      ],
      category: 'advanced'
    },
    {
      type: "Fator de Risco",
      title: "Fator de Risco",
      description: "Aloca baseado em fatores de risco sistemáticos como valor, tamanho, momentum, qualidade e volatilidade.",
      pros: [
        "Exposição a prêmios de risco comprovados academicamente",
        "Diversificação por fatores, não apenas por ativos",
        "Potencial de superar o mercado no longo prazo"
      ],
      cons: [
        "Períodos prolongados de underperformance possíveis",
        "Complexidade na implementação correta",
        "Requer disciplina de longo prazo"
      ],
      bestFor: [
        "Investidores com horizonte longo",
        "Quem valoriza evidências acadêmicas",
        "Perfis arrojados e agressivos",
        "Portfólios maiores"
      ],
      category: 'specialized'
    },
    {
      type: "Barbell",
      title: "Barbell (Haltere)",
      description: "Combina ativos de risco muito baixo com ativos de risco muito alto, evitando exposições intermediárias.",
      pros: [
        "Proteção contra eventos extremos",
        "Potencial de capturar movimentos de alta",
        "Clareza na definição de alocações"
      ],
      cons: [
        "Pode parecer contraintuitiva",
        "Sensibilidade à proporção escolhida",
        "Potencialmente mais volátil"
      ],
      bestFor: [
        "Cenários de alta incerteza",
        "Investidores que querem diversificar abordagens",
        "Proteção contra 'cisnes negros'",
        "Complemento a estratégias tradicionais"
      ],
      category: 'specialized'
    },
    {
      type: "Endowment",
      title: "Endowment",
      description: "Inspirada nos fundos de universidades como Harvard e Yale, com alta alocação em alternativos e foco em longo prazo.",
      pros: [
        "Diversificação em classes não tradicionais",
        "Aproveitamento do prêmio de iliquidez",
        "Foco no muito longo prazo"
      ],
      cons: [
        "Difícil acesso a algumas classes de ativos",
        "Menor liquidez do portfólio",
        "Complexidade de implementação"
      ],
      bestFor: [
        "Investidores de patrimônio elevado",
        "Horizontes muito longos",
        "Quem pode tolerar iliquidez",
        "Busca de retornos superiores ajustados ao risco"
      ],
      category: 'specialized'
    },
    {
      type: "Alocação Personalizada",
      title: "Alocação Personalizada",
      description: "Definida com base nos objetivos, restrições e preferências específicas do cliente, totalmente customizada.",
      pros: [
        "Adaptada às necessidades específicas do cliente",
        "Considera restrições particulares e preferências",
        "Flexibilidade total na implementação"
      ],
      cons: [
        "Depende da qualidade da análise inicial",
        "Potencial viés de confirmação",
        "Requer mais atenção e revisões"
      ],
      bestFor: [
        "Situações específicas não atendidas por modelos padrão",
        "Clientes com necessidades ou restrições particulares",
        "Quem valoriza personalização completa"
      ],
      category: 'classic'
    },
    {
      type: "Value Investing",
      title: "Value Investing",
      description: "Foco em empresas com valuation atrativo e bons fundamentos, buscando ativos subvalorizados pelo mercado.",
      pros: [
        "Foco em preservação de capital",
        "Abordagem disciplinada e racional",
        "Margem de segurança contra erros de avaliação"
      ],
      cons: [
        "Pode subaproveitar mercados em forte crescimento",
        "Períodos de underperformance em momentos de euforia",
        "Exige paciência e disciplina"
      ],
      bestFor: [
        "Investidores com visão de longo prazo",
        "Perfis moderados e arrojados",
        "Quem prefere abordagem fundamentalista",
        "Investidores que valorizam dividendos"
      ],
      category: 'specialized'
    },
    {
      type: "Growth Investing",
      title: "Growth Investing",
      description: "Concentração em empresas com alto potencial de crescimento, priorizando expansão de receitas sobre valuations atuais.",
      pros: [
        "Exposição a empresas inovadoras e disruptivas",
        "Potencial de retornos acima da média",
        "Captura de tendências emergentes"
      ],
      cons: [
        "Maior volatilidade",
        "Risco de avaliar incorretamente potencial de crescimento",
        "Sensibilidade a alterações de taxas de juros"
      ],
      bestFor: [
        "Horizontes de investimento de longo prazo",
        "Perfis arrojados e agressivos",
        "Quem acredita em inovação e disrupção",
        "Investidores que toleram volatilidade"
      ],
      category: 'specialized'
    },
    {
      type: "Income Focus",
      title: "Foco em Renda",
      description: "Estratégia voltada para geração de renda recorrente, com foco em ativos que distribuem rendimentos periódicos.",
      pros: [
        "Fluxo de caixa previsível",
        "Menor dependência de valorização",
        "Adequada para fase de desacumulação"
      ],
      cons: [
        "Potencial menor retorno total no longo prazo",
        "Sensibilidade a taxas de juros",
        "Tratamento tributário sobre rendimentos"
      ],
      bestFor: [
        "Investidores próximos à aposentadoria",
        "Quem vive de rendimentos",
        "Perfis conservadores e moderados",
        "Complemento de renda mensal"
      ],
      category: 'classic'
    },
    {
      type: "Golden Butterfly",
      title: "Golden Butterfly",
      description: "Variação do Portfólio Permanente, com alocação equilibrada entre 5 classes de ativos para resistir a diferentes cenários.",
      pros: [
        "Alta resiliência a cenários adversos",
        "Bom equilíbrio entre risco e retorno",
        "Baixa correlação entre ativos"
      ],
      cons: [
        "Requer disciplina nos rebalanceamentos",
        "Pode parecer conservadora em bull markets",
        "Alocação em ouro pode ser desafiadora no Brasil"
      ],
      bestFor: [
        "Investidores que valorizam estabilidade",
        "Horizontes de médio a longo prazo",
        "Perfis moderados",
        "Quem quer simplificar a gestão do portfólio"
      ],
      category: 'classic'
    },
    {
      type: "Global Macro",
      title: "Global Macro",
      description: "Alocação baseada em tendências macroeconômicas globais, ajustando exposições conforme mudanças no cenário.",
      pros: [
        "Adaptabilidade a diferentes cenários",
        "Diversificação geográfica",
        "Captura de oportunidades em diferentes mercados"
      ],
      cons: [
        "Depende da qualidade da análise macroeconômica",
        "Maior complexidade na implementação",
        "Exposição a riscos geopolíticos e cambiais"
      ],
      bestFor: [
        "Investidores que acompanham cenários globais",
        "Perfis arrojados",
        "Portfólios maiores",
        "Quem busca descorrelação com mercado local"
      ],
      category: 'specialized'
    },
    {
      type: "Dual Momentum",
      title: "Dual Momentum",
      description: "Combina momentum absoluto e relativo para identificar tendências e alternar entre classes de ativos.",
      pros: [
        "Disciplina na captura de tendências",
        "Proteção contra mercados em queda prolongada",
        "Baseada em evidências históricas"
      ],
      cons: [
        "Custos de transação nas rotações",
        "Timing pode gerar falsos sinais",
        "Períodos de baixa performance em mercados laterais"
      ],
      bestFor: [
        "Investidores disciplinados",
        "Perfis arrojados e agressivos",
        "Quem aceita seguir sinais sistemáticos",
        "Horizontes de médio a longo prazo"
      ],
      category: 'specialized'
    },
    {
      type: "Smart Beta",
      title: "Smart Beta",
      description: "Utiliza fatores sistemáticos (valor, qualidade, baixa volatilidade) para construção de portfólios mais eficientes.",
      pros: [
        "Combinação de gestão passiva e ativa",
        "Exposição a fatores com prêmio histórico",
        "Potencial de superar índices tradicionais"
      ],
      cons: [
        "Possíveis longos períodos de underperformance",
        "Maior complexidade que indexação pura",
        "Necessidade de entender os fatores utilizados"
      ],
      bestFor: [
        "Investidores com visão de longo prazo",
        "Quem valoriza evidências acadêmicas",
        "Perfis moderados a arrojados",
        "Complemento a estratégias tradicionais"
      ],
      category: 'advanced'
    },
    {
      type: "Core-Satellite",
      title: "Core-Satellite",
      description: "Combina um núcleo estável e diversificado (core) com investimentos satélites visando retornos diferenciados.",
      pros: [
        "Equilíbrio entre diversificação e potencial de alfa",
        "Flexibilidade nas alocações satélites",
        "Adaptável a diferentes perfis"
      ],
      cons: [
        "Requer decisões ativas nos satélites",
        "Pode ter maior custo que estratégias passivas puras",
        "Risco de diluir resultados positivos dos satélites"
      ],
      bestFor: [
        "Investidores que buscam o melhor dos dois mundos",
        "Perfis moderados a arrojados",
        "Quem quer manter parte do portfólio mais estável",
        "Possibilidade de testar novas ideias nos satélites"
      ],
      category: 'advanced'
    },
    {
      type: "Preservação de Capital",
      title: "Preservação de Capital",
      description: "Prioriza a proteção do patrimônio, com foco em ativos de alta qualidade e baixa volatilidade.",
      pros: [
        "Menor volatilidade e drawdowns",
        "Proteção em cenários adversos",
        "Maior previsibilidade de resultados"
      ],
      cons: [
        "Potencial de retorno mais limitado",
        "Pode não acompanhar mercados em alta",
        "Risco de perda de poder aquisitivo no longo prazo"
      ],
      bestFor: [
        "Investidores próximos à aposentadoria",
        "Perfil conservador",
        "Reservas emergenciais de médio prazo",
        "Quem não tolera perdas temporárias"
      ],
      category: 'classic'
    },
    {
      type: "Títulos Corporativos High Grade",
      title: "Títulos Corporativos High Grade",
      description: "Estratégia focada em títulos corporativos de alta qualidade de crédito, buscando rendimento superior a títulos públicos com risco controlado.",
      pros: [
        "Rendimento superior aos títulos públicos",
        "Risco de crédito controlado",
        "Diversificação entre emissores de alta qualidade"
      ],
      cons: [
        "Menos líquido que títulos públicos",
        "Risco de crédito superior ao Tesouro Direto",
        "Sensibilidade a ciclos econômicos"
      ],
      bestFor: [
        "Investidores conservadores buscando incremento de rendimento",
        "Complemento à carteira de renda fixa",
        "Recursos com horizonte de médio prazo",
        "Quem busca diversificação de emissores"
      ],
      category: 'conservative'
    },
    {
      type: "Fundos de Crédito Privado",
      title: "Fundos de Crédito Privado",
      description: "Estratégia que investe em fundos especializados em crédito privado, diversificando entre diferentes emissores e prazos.",
      pros: [
        "Diversificação ampla de emissores",
        "Gestão profissional do risco de crédito",
        "Acesso a operações restritas a investidores maiores"
      ],
      cons: [
        "Taxas de administração reduzem rentabilidade",
        "Menor transparência sobre ativos subjacentes",
        "Liquidez pode ser mais restrita"
      ],
      bestFor: [
        "Investidores que valorizam diversificação de crédito",
        "Perfil conservador com alguma tolerância a risco",
        "Quem prefere delegação da análise de crédito",
        "Horizonte de médio prazo"
      ],
      category: 'conservative'
    },
    {
      type: "Dividend Growth",
      title: "Dividend Growth",
      description: "Estratégia focada em empresas com histórico consistente de crescimento de dividendos, buscando renda crescente ao longo do tempo.",
      pros: [
        "Fluxo de renda crescente ao longo do tempo",
        "Empresas geralmente mais estáveis e lucrativas",
        "Menor volatilidade que o mercado geral"
      ],
      cons: [
        "Concentração em setores mais maduros",
        "Potencial menor valorização em mercados de alta",
        "Sensibilidade a aumentos de taxas de juros"
      ],
      bestFor: [
        "Investidores focados em renda passiva crescente",
        "Perfil moderado",
        "Horizonte de médio a longo prazo",
        "Quem valoriza qualidade empresarial"
      ],
      category: 'moderate'
    },
    {
      type: "Defensive Equities",
      title: "Defensive Equities",
      description: "Investimento em ações de setores defensivos com menor beta e volatilidade, como utilities, bens de consumo básico e saúde.",
      pros: [
        "Menor volatilidade dentro da renda variável",
        "Melhor desempenho relativo em mercados de baixa",
        "Empresas com receitas mais previsíveis"
      ],
      cons: [
        "Potencial upside limitado em mercados altistas",
        "Sensibilidade a taxas de juros",
        "Possível subperformance em ciclos de recuperação econômica"
      ],
      bestFor: [
        "Investidores avessos à volatilidade",
        "Primeiro passo em renda variável",
        "Complemento defensivo em carteira de ações",
        "Perfil moderado"
      ],
      category: 'moderate'
    },
    {
      type: "Fundos Multiestratégia",
      title: "Fundos Multiestratégia",
      description: "Alocação em fundos multimercado que combinam diferentes estratégias de investimento, delegando decisões táticas aos gestores.",
      pros: [
        "Diversificação entre estratégias e gestores",
        "Adaptabilidade a diferentes cenários de mercado",
        "Gestão profissional de alocações táticas"
      ],
      cons: [
        "Taxas elevadas impactam retorno líquido",
        "Dependência da qualidade dos gestores selecionados",
        "Menor transparência nas posições"
      ],
      bestFor: [
        "Investidores que preferem delegar decisões táticas",
        "Quem busca diversificação entre estratégias",
        "Perfil moderado a arrojado",
        "Complemento a estratégias passivas"
      ],
      category: 'moderate'
    },
    {
      type: "Private Equity & Venture Capital",
      title: "Private Equity & Venture Capital",
      description: "Estratégia focada em investimentos em empresas não listadas, tanto em estágio inicial quanto em empresas maduras em transformação.",
      pros: [
        "Acesso a potencial de crescimento não disponível em mercados públicos",
        "Baixa correlação com ativos tradicionais",
        "Potencial de retornos superiores no longo prazo"
      ],
      cons: [
        "Baixíssima liquidez, com lockups de 5-10 anos",
        "Alto ticket mínimo para acesso direto",
        "Maior dispersão de resultados entre gestores"
      ],
      bestFor: [
        "Investidores de alto patrimônio",
        "Perfil agressivo com horizonte muito longo",
        "Quem aceita iliquidez em troca de potencial de retorno",
        "Diversificação para portfólios maiores"
      ],
      category: 'aggressive'
    },
    {
      type: "Small Caps de Crescimento",
      title: "Small Caps de Crescimento",
      description: "Foco em empresas de menor capitalização com alto potencial de crescimento, buscando oportunidades ainda não precificadas pelo mercado.",
      pros: [
        "Potencial de descoberta de futuras líderes de mercado",
        "Segmento geralmente menos coberto por analistas",
        "Possibilidade de retornos acima da média"
      ],
      cons: [
        "Volatilidade substancialmente maior",
        "Menor liquidez das ações",
        "Risco específico das empresas elevado"
      ],
      bestFor: [
        "Investidores com alta tolerância a risco",
        "Horizonte de longo prazo (5+ anos)",
        "Perfil agressivo",
        "Complemento a posições em blue chips"
      ],
      category: 'aggressive'
    },
    {
      type: "Setores Temáticos",
      title: "Setores Temáticos",
      description: "Investimento em setores específicos com potencial de crescimento acima da média devido a tendências seculares (tecnologia, saúde, energia limpa).",
      pros: [
        "Exposição a tendências de longo prazo",
        "Potencial de crescimento acima da média",
        "Diversificação dentro de temas específicos"
      ],
      cons: [
        "Risco de concentração setorial",
        "Vulnerabilidade a bolhas de valuations",
        "Timing pode impactar fortemente os resultados"
      ],
      bestFor: [
        "Investidores que identificam tendências estruturais",
        "Perfil arrojado a agressivo",
        "Complemento a estratégias core mais diversificadas",
        "Horizonte de médio a longo prazo"
      ],
      category: 'aggressive'
    },
    {
      type: "Renda Fixa High Yield",
      title: "Renda Fixa High Yield",
      description: "Investimento em títulos de renda fixa de maior risco e retorno, incluindo debêntures de empresas menores e FIDCs de crédito estruturado.",
      pros: [
        "Rendimento potencial significativamente superior",
        "Fluxo de pagamentos geralmente mais frequente",
        "Baixa correlação com renda variável"
      ],
      cons: [
        "Risco de crédito substancialmente maior",
        "Menor liquidez no mercado secundário",
        "Mais sensível a condições econômicas adversas"
      ],
      bestFor: [
        "Investidores com conhecimento em análise de crédito",
        "Perfil arrojado buscando renda",
        "Diversificação de portfólios mais tradicionais",
        "Quem aceita maior risco por retorno superior"
      ],
      category: 'alternative'
    },
    {
      type: "Cripto + Blockchain Innovation",
      title: "Cripto + Blockchain Innovation",
      description: "Exposição ao ecossistema de ativos digitais e empresas inovadoras no setor de blockchain, combinando investimento direto e indireto.",
      pros: [
        "Exposição a classe de ativos potencialmente disruptiva",
        "Baixa correlação histórica com ativos tradicionais",
        "Potencial de retorno assimétrico"
      ],
      cons: [
        "Volatilidade extrema",
        "Regulação ainda em desenvolvimento",
        "Maior complexidade operacional e tributária"
      ],
      bestFor: [
        "Investidores com alta tolerância a risco",
        "Alocação pequena do portfólio total (1-5%)",
        "Perfil agressivo e tecnicamente informado",
        "Horizonte de longo prazo"
      ],
      category: 'alternative'
    },
    {
      type: "Trading Algorítmico",
      title: "Trading Algorítmico",
      description: "Utilização de estratégias quantitativas sistemáticas que exploram ineficiências de mercado de curto e médio prazo.",
      pros: [
        "Eliminação de vieses emocionais",
        "Capacidade de operar múltiplas estratégias simultaneamente",
        "Potencial descorrelação com mercados tradicionais"
      ],
      cons: [
        "Complexidade técnica elevada",
        "Risco de falha do modelo em condições extremas",
        "Custos operacionais podem ser significativos"
      ],
      bestFor: [
        "Investidores com conhecimento quantitativo",
        "Perfil agressivo e tecnicamente sofisticado",
        "Complemento a estratégias de longo prazo",
        "Quem valoriza abordagens sistemáticas"
      ],
      category: 'alternative'
    },
    {
      type: "Arbitragem Estatística",
      title: "Arbitragem Estatística",
      description: "Estratégia que busca explorar divergências temporárias de preços entre ativos correlacionados através de posições long-short.",
      pros: [
        "Baixa correlação com mercados tradicionais",
        "Potencial de retorno independente de direção do mercado",
        "Gestão de risco mais precisa"
      ],
      cons: [
        "Complexidade operacional elevada",
        "Resultados podem ser afetados por custos operacionais",
        "Risco de convergência mais lenta que o esperado"
      ],
      bestFor: [
        "Investidores sofisticados",
        "Perfil agressivo buscando diversificação",
        "Complemento a estratégias direcionais",
        "Proteção parcial contra quedas de mercado"
      ],
      category: 'alternative'
    },
    {
      type: "Tail Risk Hedging",
      title: "Tail Risk Hedging",
      description: "Estratégia focada em proteger o portfólio contra eventos extremos de mercado, utilizando combinação de ativos defensivos e derivativos.",
      pros: [
        "Proteção contra eventos extremos ('cisnes negros')",
        "Permite manter posições de risco com maior segurança",
        "Redução de drawdowns severos"
      ],
      cons: [
        "Custo contínuo em períodos normais ou positivos",
        "Complexidade na estruturação e timing",
        "Potencial drag no desempenho de longo prazo"
      ],
      bestFor: [
        "Portfólios maiores com posições relevantes em renda variável",
        "Proteção em momentos de maior incerteza",
        "Investidores institucionais e family offices",
        "Complemento a estratégias otimizadas para condições normais"
      ],
      category: 'alternative'
    },
    {
      type: "Ultra Conservador",
      title: "Ultra Conservador",
      description: "Estratégia extremamente conservadora com prioridade total na segurança do capital, combinando títulos públicos de alta qualidade e CDBs.",
      pros: [
        "Minimização de volatilidade ao extremo",
        "Alta previsibilidade de rendimentos",
        "Proteção contra eventos negativos de mercado"
      ],
      cons: [
        "Potencial de retorno significativamente limitado",
        "Alta probabilidade de perda de poder aquisitivo",
        "Sub-otimização do capital em longo prazo"
      ],
      bestFor: [
        "Recursos com objetivo de curtíssimo prazo",
        "Perfil extremamente conservador",
        "Idosos em fase de desacumulação",
        "Reserva de emergência estendida"
      ],
      category: 'classic'
    },
    {
      type: "Renda Fixa Escalonada",
      title: "Renda Fixa Escalonada",
      description: "Escalonamento de vencimentos em renda fixa para maximizar rendimentos e manter liquidez distribuída ao longo do tempo.",
      pros: [
        "Melhor aproveitamento de juros em diferentes prazos",
        "Liquidez programada em intervalos regulares",
        "Redução do risco de reinvestimento"
      ],
      cons: [
        "Complexidade na gestão de vencimentos",
        "Potencial rendimento abaixo de estratégias com risco",
        "Requer disciplina na renovação dos títulos"
      ],
      bestFor: [
        "Planejamento financeiro de médio prazo",
        "Perfil conservador com objetivos definidos",
        "Planejamento para despesas futuras programadas",
        "Investidores que valorizam previsibilidade"
      ],
      category: 'advanced'
    },
    {
      type: "Renda Mensal",
      title: "Renda Mensal",
      description: "Foco exclusivo na geração de renda passiva mensal previsível, ideal para quem vive dos rendimentos.",
      pros: [
        "Fluxo de caixa mensal consistente",
        "Diversificação entre fontes de renda",
        "Previsibilidade para planejamento financeiro"
      ],
      cons: [
        "Foco em renda pode sacrificar crescimento de capital",
        "Sensibilidade a flutuações de juros e dividendos",
        "Possível deterioração do principal em cenários inflacionários"
      ],
      bestFor: [
        "Aposentados vivendo de rendimentos",
        "Complemento de renda para despesas mensais",
        "Fase de transição para aposentadoria",
        "Investidores que priorizam liquidez e renda"
      ],
      category: 'specialized'
    },
    {
      type: "Proteção Inflacionária Plus",
      title: "Proteção Inflacionária Plus",
      description: "Estratégia defensiva com ênfase em proteção contra inflação através de múltiplos mecanismos e classes de ativos.",
      pros: [
        "Alta resiliência em ambientes inflacionários",
        "Diversificação entre diferentes protetores de inflação",
        "Manutenção do poder de compra real"
      ],
      cons: [
        "Desempenho abaixo do ideal em cenários deflacionários",
        "Complexidade na gestão de diferentes indexadores",
        "Pode subutilizar oportunidades de mercado"
      ],
      bestFor: [
        "Preservação de patrimônio em ambientes incertos",
        "Proteção de capital em cenários de inflação elevada",
        "Complemento a estratégias tradicionais",
        "Horizonte de investimento médio a longo"
      ],
      category: 'specialized'
    },
    {
      type: "Crescimento Conservador",
      title: "Crescimento Conservador",
      description: "Equilibra crescimento moderado com baixa volatilidade, adequada para quem deseja superar a inflação com risco controlado.",
      pros: [
        "Potencial de crescimento superior às estratégias puramente conservadoras",
        "Volatilidade controlada através de diversificação",
        "Bom equilíbrio entre risco e retorno"
      ],
      cons: [
        "Menor proteção em crises severas de mercado",
        "Potential underperformance em mercados fortemente altistas",
        "Requer acompanhamento mais frequente"
      ],
      bestFor: [
        "Investidores conservadores com horizonte de médio prazo",
        "Transição gradual de conservador para moderado",
        "Objetivos financeiros de 3-5 anos",
        "Complemento a estratégias mais agressivas"
      ],
      category: 'classic'
    },
    {
      type: "Diversificação Conservadora",
      title: "Diversificação Conservadora",
      description: "Maximiza diversificação entre classes de ativos mantendo perfil conservador, visando baixa correlação entre investimentos.",
      pros: [
        "Excelente descorrelação entre componentes",
        "Boa proteção contra diferentes cenários econômicos",
        "Redução de volatilidade através de diversificação real"
      ],
      cons: [
        "Complexidade na gestão de múltiplas classes de ativos",
        "Possível diluição de retornos em alguns cenários",
        "Requer rebalanceamentos periódicos"
      ],
      bestFor: [
        "Investidores com conhecimento mais amplo de mercado",
        "Perfil conservador que valoriza resiliência",
        "Carteiras de médio a longo prazo",
        "Quem deseja exposição controlada a múltiplos fatores"
      ],
      category: 'advanced'
    },
    {
      type: "Previdência Tranquila",
      title: "Previdência Tranquila",
      description: "Estratégia de longo prazo focada em aposentadoria com crescimento gradual e proteção crescente do capital com o tempo.",
      pros: [
        "Alocação alinhada com objetivos previdenciários",
        "Adaptação gradual ao ciclo de vida do investidor",
        "Equilíbrio entre acumulação e proteção"
      ],
      cons: [
        "Potencial de crescimento limitado nas fases finais",
        "Requer ajustes conforme a proximidade da aposentadoria",
        "Pode necessitar complementação com outras estratégias"
      ],
      bestFor: [
        "Planejamento específico para aposentadoria",
        "Investidores de meia-idade (40-55 anos)",
        "Perfil conservador a moderado",
        "Complemento a planos de previdência tradicionais"
      ],
      category: 'specialized'
    },
    {
      type: "Barbell Conservador",
      title: "Barbell Conservador",
      description: "Versão mais prudente da estratégia barbell, combinando alta segurança em maior proporção com exposição limitada a ativos de crescimento.",
      pros: [
        "Proteção substancial do principal",
        "Captura parcial de movimentos de alta do mercado",
        "Excelente controle de risco com exposição estratégica"
      ],
      cons: [
        "Pode parecer contraditória para investidores tradicionais",
        "Requer monitoramento da parte mais arriscada",
        "Performance potencialmente abaixo do ideal em mercados medianos"
      ],
      bestFor: [
        "Investidores conservadores que buscam alguma exposição a crescimento",
        "Quem valoriza proteção mas não quer perder oportunidades",
        "Complemento a estratégias muito conservadoras",
        "Perfil que busca diversificação real"
      ],
      category: 'specialized'
    },
    {
      type: "Conservador Renda Fixa",
      title: "Conservador Renda Fixa",
      description: "Modelo otimizado para quem prioriza segurança absoluta, com foco em títulos públicos e renda fixa de alta qualidade.",
      pros: [
        "Máxima segurança do capital investido",
        "Previsibilidade de rendimentos",
        "Baixíssima volatilidade",
        "Liquidez adequada para emergências"
      ],
      cons: [
        "Rendimento limitado ao básico da renda fixa",
        "Maior sensibilidade às mudanças na taxa SELIC",
        "Pode perder para a inflação em cenários adversos",
        "Oportunidades de crescimento extremamente limitadas"
      ],
      bestFor: [
        "Investidores com aversão completa a riscos",
        "Recursos destinados a objetivos de curto prazo",
        "Idosos em fase final de desacumulação",
        "Perfil muito conservador sem tolerância a perdas temporárias"
      ],
      category: 'classic'
    },
    {
      type: "Títulos Corporativos High Grade",
      title: "Títulos Corporativos High Grade",
      description: "Portfólio focado em debêntures e CRIs/CRAs de empresas sólidas com rating elevado.",
      pros: [
        "Rentabilidade superior a títulos públicos",
        "Risco de crédito controlado",
        "Diversificação entre emissores",
        "Potencial de isenção fiscal (LCI/LCA/Debêntures)"
      ],
      cons: [
        "Menor liquidez que títulos públicos",
        "Risco de crédito superior ao Tesouro",
        "Análise de emissores mais complexa",
        "Menos acessível a pequenos investidores"
      ],
      bestFor: [
        "Investidores que buscam melhorar o retorno da renda fixa",
        "Pessoas que valorizam segurança com rendimento incrementado",
        "Quem já tem uma base sólida em Tesouro Direto",
        "Investidores que desejam diversificação na renda fixa"
      ],
      category: 'classic'
    },
    {
      type: "Fundos de Crédito Privado",
      title: "Fundos de Crédito Privado",
      description: "Alocação em fundos especializados em crédito privado que investem em diversos emissores.",
      pros: [
        "Diversificação ampla em vários emissores",
        "Gestão profissional de risco de crédito",
        "Liquidez normalmente superior a papéis individuais",
        "Acesso a operações estruturadas"
      ],
      cons: [
        "Taxa de administração reduz rentabilidade",
        "Menor controle sobre os papéis específicos",
        "Exposição a decisões de terceiros",
        "Performance histórica nem sempre se repete"
      ],
      bestFor: [
        "Investidores que desejam terceirizar análise de crédito",
        "Quem prefere não precisar acompanhar vencimentos individuais",
        "Pessoas com menor capital para diversificação própria",
        "Investidores que valorizam liquidez em renda fixa"
      ],
      category: 'classic'
    },
    {
      type: "Dividend Growth",
      title: "Dividend Growth",
      description: "Foco em empresas com histórico de aumento consistente de dividendos ao longo do tempo.",
      pros: [
        "Renda passiva crescente",
        "Empresas normalmente mais estáveis",
        "Menor volatilidade que growth stocks",
        "Potencial de valorização de capital"
      ],
      cons: [
        "Crescimento de preço das ações pode ser mais lento",
        "Tributação de dividendos menos eficiente",
        "Possível concentração setorial (utilities, bancos)",
        "Sensibilidade a mudanças nas taxas de juros"
      ],
      bestFor: [
        "Investidores que buscam renda crescente",
        "Pessoas na fase de transição para aposentadoria",
        "Quem valoriza empresas com negócios previsíveis",
        "Investidores com horizonte de médio a longo prazo"
      ],
      category: 'specialized'
    },
    {
      type: "Defensive Equities",
      title: "Defensive Equities",
      description: "Ações de setores menos voláteis como consumo básico, saúde e utilities.",
      pros: [
        "Menor volatilidade que o mercado geral",
        "Melhor desempenho em mercados em queda",
        "Negócios mais previsíveis e resilientes",
        "Boa proteção contra crises econômicas"
      ],
      cons: [
        "Potencial de retorno limitado em mercados de alta",
        "Sensibilidade a taxas de juros (utilities)",
        "Crescimento potencialmente mais lento",
        "Valuation frequentemente mais elevado"
      ],
      bestFor: [
        "Investidores moderados entrando no mercado de ações",
        "Pessoas que valorizam sono tranquilo",
        "Quem busca exposição a ações com volatilidade controlada",
        "Investidores preocupados com proteção patrimonial"
      ],
      category: 'specialized'
    },
    {
      type: "Fundos Multiestratégia",
      title: "Fundos Multiestratégia",
      description: "Portfólio com fundos de diferentes abordagens para diversificação ativa.",
      pros: [
        "Diversificação entre diferentes gestores e estilos",
        "Potencial de capturar vários alfa de mercado",
        "Complementaridade entre estratégias",
        "Melhor gestão de risco vs fundos individuais"
      ],
      cons: [
        "Camada adicional de taxas",
        "Possibilidade de overlap entre estratégias",
        "Due diligence complexa na seleção de fundos",
        "Desempenho dependente da escolha adequada de gestores"
      ],
      bestFor: [
        "Investidores que buscam terceirizar decisões táticas",
        "Quem valoriza diversificação de gestão ativa",
        "Pessoas sem tempo para acompanhar múltiplos investimentos",
        "Investidores que preferem delegar a especialistas"
      ],
      category: 'specialized'
    },
    {
      type: "Private Equity & Venture Capital",
      title: "Private Equity & Venture Capital",
      description: "Exposição a empresas privadas em crescimento acelerado e startups inovadoras.",
      pros: [
        "Potencial de retornos muito elevados",
        "Acesso a empresas antes de IPOs",
        "Baixa correlação com mercados públicos",
        "Exposição a inovação e disrupção"
      ],
      cons: [
        "Extremamente ilíquido (horizonte de 5-10 anos)",
        "Alto risco de perda total em startups",
        "Investimento mínimo elevado",
        "Difícil avaliação e due diligence"
      ],
      bestFor: [
        "Investidores agressivos com horizonte de longo prazo",
        "Pessoas com patrimônio substancial já diversificado",
        "Quem busca retornos muito acima da média",
        "Investidores dispostos a aceitar iliquidez por prêmio de retorno"
      ],
      category: 'advanced'
    },
    {
      type: "Small Caps de Crescimento",
      title: "Small Caps de Crescimento",
      description: "Foco em empresas menores com alto potencial de valorização futura.",
      pros: [
        "Potencial de crescimento exponencial",
        "Menor cobertura de analistas cria ineficiências",
        "Possibilidade de encontrar futuros líderes de mercado",
        "Histórico de superação de large caps no longo prazo"
      ],
      cons: [
        "Volatilidade substancialmente maior",
        "Maior risco de falência e fracasso",
        "Menor liquidez nos papéis",
        "Ciclos de subvalorização prolongados"
      ],
      bestFor: [
        "Investidores com alta tolerância a volatilidade",
        "Pessoas com horizonte de investimento longo",
        "Quem busca exposição a alto crescimento",
        "Investidores que aceitam maior risco por retorno potencial"
      ],
      category: 'advanced'
    },
    {
      type: "Setores Temáticos",
      title: "Setores Temáticos",
      description: "Investimentos concentrados em temas como IA, ESG, biotecnologia e energia limpa.",
      pros: [
        "Exposição a tendências seculares de longo prazo",
        "Potencial de crescimento acima da média",
        "Captura de transformações econômicas fundamentais",
        "Alinhamento com visão de futuro do investidor"
      ],
      cons: [
        "Alta concentração setorial",
        "Maior volatilidade por menor diversificação",
        "Risco de bolhas especulativas em temas populares",
        "Timing difícil (temas podem levar décadas para maturar)"
      ],
      bestFor: [
        "Investidores que identificam tendências transformadoras",
        "Pessoas com convicção em setores específicos",
        "Quem deseja complementar carteiras diversificadas",
        "Investidores com visão de muito longo prazo"
      ],
      category: 'advanced'
    },
    {
      type: "Renda Fixa High Yield",
      title: "Renda Fixa High Yield",
      description: "Exposição a ativos de renda fixa com maior risco, mas retornos mais elevados.",
      pros: [
        "Rendimentos potencialmente muito superiores",
        "Diversificação vs renda fixa tradicional",
        "Oportunidades em situações especiais",
        "Pagamentos de juros normalmente atrativos"
      ],
      cons: [
        "Risco de crédito substancialmente maior",
        "Alta volatilidade para categoria de renda fixa",
        "Correlação com ações em períodos de estresse",
        "Risco de calote e reestruturações"
      ],
      bestFor: [
        "Investidores que buscam maximizar rendimentos em renda fixa",
        "Pessoas com conhecimento de análise de crédito",
        "Quem aceita maior risco para rendimento superior",
        "Investidores que sabem avaliar qualidade de emissores"
      ],
      category: 'advanced'
    },
    {
      type: "Cripto + Blockchain Innovation",
      title: "Cripto + Blockchain Innovation",
      description: "Exposição a criptomoedas e empresas ligadas ao setor de blockchain.",
      pros: [
        "Potencial disruptivo para o sistema financeiro",
        "Possibilidade de retornos extraordinários",
        "Exposição a uma nova classe de ativos",
        "Baixa correlação com investimentos tradicionais"
      ],
      cons: [
        "Volatilidade extrema",
        "Riscos regulatórios significativos",
        "Tecnologia ainda em desenvolvimento",
        "Alta incidência de fraudes e projetos falidos"
      ],
      bestFor: [
        "Investidores que compreendem a tecnologia blockchain",
        "Pessoas dispostas a aceitar altas perdas potenciais",
        "Quem acredita na transformação digital das finanças",
        "Investidores com pequena alocação para apostas de alto risco"
      ],
      category: 'advanced'
    },
    {
      type: "Trading Algorítmico",
      title: "Trading Algorítmico",
      description: "Uso de modelos quantitativos para operar ativos de forma sistemática.",
      pros: [
        "Eliminação de vieses emocionais",
        "Capacidade de analisar múltiplos fatores",
        "Disciplina e consistência na execução",
        "Potencial para retornos não correlacionados"
      ],
      cons: [
        "Risco de modelos desatualizados ou com falhas",
        "Necessidade de conhecimento técnico avançado",
        "Custos operacionais significativos",
        "Dependência de dados históricos que podem não se repetir"
      ],
      bestFor: [
        "Investidores com conhecimento de programação e estatística",
        "Pessoas metódicas que valorizam abordagem científica",
        "Quem busca estratégias baseadas em dados objetivos",
        "Investidores que acreditam em abordagem sistemática"
      ],
      category: 'advanced'
    },
    {
      type: "Arbitragem Estatística",
      title: "Arbitragem Estatística",
      description: "Estratégia de curto prazo baseada em divergências de preços entre ativos correlacionados.",
      pros: [
        "Baixa correlação com mercados tradicionais",
        "Potencial para retornos em qualquer direção de mercado",
        "Operações baseadas em probabilidades estatísticas",
        "Diversificação real para portfólios tradicionais"
      ],
      cons: [
        "Operações complexas que exigem conhecimento avançado",
        "Custos operacionais podem ser significativos",
        "Risco de correlações históricas mudarem",
        "Oportunidades podem ser limitadas e efêmeras"
      ],
      bestFor: [
        "Investidores com conhecimento avançado de estatística",
        "Pessoas que buscam retornos descorrelacionados",
        "Quem possui infraestrutura para execução eficiente",
        "Investidores que valorizam estratégias market-neutral"
      ],
      category: 'advanced'
    },
    {
      type: "Tail Risk Hedging",
      title: "Tail Risk Hedging",
      description: "Estratégia de proteção contra eventos extremos no mercado.",
      pros: [
        "Proteção contra eventos catastróficos ('cisnes negros')",
        "Permite manter exposição a ativos de risco",
        "Seguro contra quedas extremas de mercado",
        "Tranquilidade em momentos de pânico"
      ],
      cons: [
        "Custo contínuo que reduz retornos em períodos normais",
        "Timing difícil para implementação",
        "Complexidade na estruturação e gestão",
        "Pode parecer desperdício em mercados de alta contínua"
      ],
      bestFor: [
        "Investidores preocupados com proteção patrimonial",
        "Pessoas com grande exposição a ativos de risco",
        "Quem se preocupa com eventos de cauda imprevisíveis",
        "Investidores que querem limitar perdas máximas potenciais"
      ],
      category: 'advanced'
    }
  ];

  // Filtrar estratégias baseadas no perfil de risco
  const getFilteredStrategies = (category: string) => {
    return strategies
      .filter(strategy => {
        if (category === 'recomendadas') {
          return getStrategyCompatibility(strategy.type) === 'ideal';
        }
        if (category === 'todas') {
          return true;
        }
        return strategy.category === category;
      })
      .sort((a, b) => {
        // Ordenar primeiro por compatibilidade, depois por ordem alfabética
        const compatA = getStrategyCompatibility(a.type);
        const compatB = getStrategyCompatibility(b.type);
        
        const compatOrder = { 'ideal': 0, 'suitable': 1, 'caution': 2 };
        
        if (compatOrder[compatA] !== compatOrder[compatB]) {
          return compatOrder[compatA] - compatOrder[compatB];
        }
        
        return a.title.localeCompare(b.title);
      });
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Estratégia de Investimento</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <Info className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              <p>A estratégia de investimento define como os ativos serão alocados e gerenciados. 
              Escolha a que melhor se adapte aos seus objetivos e perfil de risco.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Tabs defaultValue="recomendadas" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 mb-4">
          <TabsTrigger value="recomendadas">Recomendadas</TabsTrigger>
          <TabsTrigger value="classic">Clássicas</TabsTrigger>
          <TabsTrigger value="advanced">Avançadas</TabsTrigger>
          <TabsTrigger value="specialized">Especializadas</TabsTrigger>
          <TabsTrigger value="todas">Todas</TabsTrigger>
        </TabsList>

        {["recomendadas", "classic", "advanced", "specialized", "todas"].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-0">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {getFilteredStrategies(tab).map((strategy) => (
                  <StrategyCard
                    key={strategy.type}
                    title={strategy.title}
                    description={strategy.description}
                    pros={strategy.pros}
                    cons={strategy.cons}
                    bestFor={strategy.bestFor}
                    strategyType={strategy.type}
                    selected={selectedStrategy === strategy.type}
                    onSelect={setSelectedStrategy}
                    riskProfile={riskProfile}
                    compatibility={getStrategyCompatibility(strategy.type)}
                  />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default StrategySelector; 