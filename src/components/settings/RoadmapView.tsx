import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Milestone, 
  Calendar, 
  Timer, 
  CheckCircle, 
  Clock, 
  Flag, 
  Activity,
  Rocket,
  Sparkles,
  Layers,
  Brain,
  Cpu,
  Building2,
  Users
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface RoadmapPhase {
  id: string;
  title: string;
  timeframe: string;
  description: string;
  progress: number;
  features: RoadmapFeature[];
  icon: JSX.Element;
  color: string;
}

interface RoadmapFeature {
  title: string;
  description: string;
  category: string;
  status: 'planned' | 'inProgress' | 'completed';
}

const RoadmapView = () => {
  const [activePhase, setActivePhase] = useState<string>('phase1');

  const phases: RoadmapPhase[] = [
    {
      id: 'phase1',
      title: 'Fundação',
      timeframe: '1-3 meses',
      description: 'Fortalecimento da base e melhorias críticas.',
      progress: 85,
      icon: <Building2 className="w-5 h-5" />,
      color: 'bg-blue-500',
      features: [
        {
          title: 'Modo Escuro Consistente',
          description: 'Corrigir inconsistências visuais em todas as telas',
          category: 'Interface',
          status: 'completed'
        },
        {
          title: 'Importação/Exportação Avançada',
          description: 'Suporte para Excel, CSV com mapeamento de campos',
          category: 'Produtividade',
          status: 'inProgress'
        },
        {
          title: 'Backups Automáticos',
          description: 'Implementar sistema de backup com redundância',
          category: 'Segurança',
          status: 'inProgress'
        },
        {
          title: 'Dashboard Inicial Personalizado',
          description: 'Visão consolidada por tipo de usuário',
          category: 'Interface',
          status: 'planned'
        },
        {
          title: 'Validação em Tempo Real',
          description: 'Formulários com feedback instantâneo',
          category: 'Experiência',
          status: 'completed'
        },
        {
          title: 'Relatórios Básicos Aprimorados',
          description: 'Melhorar formatação e opções de exportação',
          category: 'Produtividade',
          status: 'inProgress'
        }
      ]
    },
    {
      id: 'phase2',
      title: 'Ampliação',
      timeframe: '4-6 meses',
      description: 'Expansão de recursos analíticos e experiência do usuário.',
      progress: 30,
      icon: <Layers className="w-5 h-5" />,
      color: 'bg-green-500',
      features: [
        {
          title: 'Matriz de Correlação Aprimorada',
          description: 'Filtros, agrupamento e exportação',
          category: 'Análise',
          status: 'inProgress'
        },
        {
          title: 'Análise de Drawdown',
          description: 'Avaliação de quedas históricas e potenciais',
          category: 'Análise',
          status: 'planned'
        },
        {
          title: 'Gráficos Comparativos',
          description: 'Visualização lado a lado de diferentes portfólios',
          category: 'Visualização',
          status: 'planned'
        },
        {
          title: 'Integração com API de Mercado',
          description: 'Conectar com fonte de dados de mercado',
          category: 'Integração',
          status: 'planned'
        },
        {
          title: 'Questionário de Perfil Avançado',
          description: 'Avaliação situacional de tolerância a risco',
          category: 'Cadastro',
          status: 'inProgress'
        },
        {
          title: 'Objetivos Financeiros',
          description: 'Sistema para definir metas com prazos e valores',
          category: 'Cadastro',
          status: 'planned'
        }
      ]
    },
    {
      id: 'phase3',
      title: 'Otimização',
      timeframe: '7-9 meses',
      description: 'Refinamento de recomendações e simulações avançadas.',
      progress: 10,
      icon: <Activity className="w-5 h-5" />,
      color: 'bg-purple-500',
      features: [
        {
          title: 'Rebalanceamento Tributário',
          description: 'Sugestões considerando impactos fiscais',
          category: 'Recomendações',
          status: 'planned'
        },
        {
          title: 'Análise de Custo-Benefício',
          description: 'Avaliar viabilidade econômica de ajustes',
          category: 'Análise',
          status: 'planned'
        },
        {
          title: 'Simulador "E se?"',
          description: 'Testar mudanças hipotéticas no portfólio',
          category: 'Simulação',
          status: 'inProgress'
        },
        {
          title: 'Projeções Monte Carlo',
          description: 'Visualização probabilística de cenários futuros',
          category: 'Simulação',
          status: 'planned'
        },
        {
          title: 'Templates Personalizáveis',
          description: 'Diferentes formatos por tipo de cliente',
          category: 'Relatórios',
          status: 'planned'
        },
        {
          title: 'White-labeling',
          description: 'Personalização com marca do assessor/escritório',
          category: 'Relatórios',
          status: 'planned'
        }
      ]
    },
    {
      id: 'phase4',
      title: 'Expansão',
      timeframe: '10-12 meses',
      description: 'Expansão do ecossistema com portal de clientes.',
      progress: 5,
      icon: <Rocket className="w-5 h-5" />,
      color: 'bg-orange-500',
      features: [
        {
          title: 'Portal do Cliente',
          description: 'Interface dedicada para clientes',
          category: 'Portal',
          status: 'planned'
        },
        {
          title: 'Visualizações Personalizadas',
          description: 'Dashboards adaptados às preferências',
          category: 'Portal',
          status: 'planned'
        },
        {
          title: 'Aprovações Digitais',
          description: 'Fluxo para autorização de recomendações',
          category: 'Workflow',
          status: 'planned'
        },
        {
          title: 'Decomposição de Risco',
          description: 'Visualização de fontes de risco por fator',
          category: 'Análise',
          status: 'planned'
        },
        {
          title: 'Análise de Fluxo de Caixa',
          description: 'Projeção de receitas passivas',
          category: 'Análise',
          status: 'planned'
        },
        {
          title: 'Conexão com Corretoras',
          description: 'Importação automática de posições',
          category: 'Integração',
          status: 'planned'
        }
      ]
    },
    {
      id: 'phase5',
      title: 'Evolução',
      timeframe: '13-18 meses',
      description: 'Inteligência avançada e melhorias de comunicação.',
      progress: 2,
      icon: <Brain className="w-5 h-5" />,
      color: 'bg-red-500',
      features: [
        {
          title: 'Aprendizado de Máquina',
          description: 'Padrões de preferência por perfil de cliente',
          category: 'IA',
          status: 'planned'
        },
        {
          title: 'Recomendações Contextuais',
          description: 'Adaptação a condições de mercado atuais',
          category: 'IA',
          status: 'planned'
        },
        {
          title: 'Sistema de Notificações',
          description: 'Alertas multicanal (email, app, SMS)',
          category: 'Comunicação',
          status: 'planned'
        },
        {
          title: 'Agenda de Revisões',
          description: 'Programação automatizada de revisões periódicas',
          category: 'Relacionamento',
          status: 'planned'
        },
        {
          title: 'LGPD Avançada',
          description: 'Gerenciamento granular de consentimentos',
          category: 'Conformidade',
          status: 'planned'
        },
        {
          title: 'Verificação de Adequação',
          description: 'Compatibilidade entre recomendações e perfil',
          category: 'Conformidade',
          status: 'planned'
        }
      ]
    },
    {
      id: 'phase6',
      title: 'Inovação',
      timeframe: '19-24 meses',
      description: 'Recursos inovadores e disruptivos.',
      progress: 0,
      icon: <Sparkles className="w-5 h-5" />,
      color: 'bg-amber-500',
      features: [
        {
          title: 'Visualização 3D de Dados',
          description: 'Exploração interativa de portfólio',
          category: 'Visualização',
          status: 'planned'
        },
        {
          title: 'Realidade Aumentada',
          description: 'Apresentações de alto impacto para clientes',
          category: 'Visualização',
          status: 'planned'
        },
        {
          title: 'Assistente por Voz',
          description: 'Comandos e consultas por interface de voz',
          category: 'Interface',
          status: 'planned'
        },
        {
          title: 'Cenários Macroeconômicos',
          description: 'Impacto de variáveis econômicas no portfólio',
          category: 'Análise',
          status: 'planned'
        },
        {
          title: 'Otimização Multi-objetivo',
          description: 'Balanceamento automático entre objetivos conflitantes',
          category: 'Otimização',
          status: 'planned'
        },
        {
          title: 'Marketplace de Estratégias',
          description: 'Biblioteca de estratégias compartilháveis',
          category: 'Ecossistema',
          status: 'planned'
        }
      ]
    }
  ];

  const getActivePhase = () => {
    return phases.find(phase => phase.id === activePhase) || phases[0];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'inProgress':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'planned':
        return <Timer className="h-4 w-4 text-gray-400" />;
      default:
        return <Timer className="h-4 w-4 text-gray-400" />;
    }
  };

  const getCategoryColor = (category: string) => {
    const categoryColors: {[key: string]: string} = {
      'Interface': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      'Experiência': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      'Produtividade': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'Segurança': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      'Análise': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
      'Visualização': 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300',
      'Integração': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
      'Cadastro': 'bg-stone-100 text-stone-800 dark:bg-stone-900 dark:text-stone-300',
      'Recomendações': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
      'Simulação': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      'Relatórios': 'bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-300',
      'Portal': 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-300',
      'Workflow': 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-300',
      'IA': 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300',
      'Comunicação': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
      'Relacionamento': 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300',
      'Conformidade': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
      'Otimização': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
      'Ecossistema': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
    };
    
    return categoryColors[category] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Concluído';
      case 'inProgress':
        return 'Em Progresso';
      case 'planned':
        return 'Planejado';
      default:
        return 'Planejado';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Roadmap de Desenvolvimento</h2>
          <p className="text-muted-foreground">
            Acompanhe o futuro da plataforma e os recursos planejados
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-4 lg:col-span-3 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Fases do Roadmap</CardTitle>
              <CardDescription>
                Selecione uma fase para ver detalhes
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1 px-1">
                {phases.map((phase) => (
                  <Button
                    key={phase.id}
                    variant={activePhase === phase.id ? "default" : "ghost"}
                    className={`w-full justify-start ${activePhase === phase.id ? '' : 'dark:text-gray-300'}`}
                    onClick={() => setActivePhase(phase.id)}
                  >
                    <div className={`w-2 h-2 rounded-full mr-2 ${phase.color}`}></div>
                    <span className="mr-auto">{phase.title}</span>
                    <span className="text-xs bg-gray-100 dark:bg-gray-800 rounded px-1.5 py-0.5">
                      {phase.progress}%
                    </span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Legenda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Concluído</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                <span>Em Progresso</span>
              </div>
              <div className="flex items-center gap-2">
                <Timer className="h-5 w-5 text-gray-400" />
                <span>Planejado</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-8 lg:col-span-9 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full ${getActivePhase().color}`}></div>
                    <CardTitle className="text-xl">Fase {getActivePhase().id.slice(-1)}: {getActivePhase().title}</CardTitle>
                  </div>
                  <CardDescription>
                    {getActivePhase().description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-1">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Cronograma: {getActivePhase().timeframe}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Flag className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Progresso: {getActivePhase().progress}%</span>
                </div>
              </div>
              <Progress value={getActivePhase().progress} className="h-2 mb-4" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Funcionalidades Planejadas</CardTitle>
              <CardDescription>
                Recursos e melhorias que serão implementados nesta fase
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[450px]">
                <div className="grid grid-cols-1 gap-px bg-muted">
                  {getActivePhase().features.map((feature, index) => (
                    <div 
                      key={index} 
                      className="p-4 bg-card flex flex-col gap-2 border-b last:border-b-0"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(feature.status)}
                            <h3 className="font-medium">{feature.title}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {feature.description}
                          </p>
                        </div>
                        <Badge variant="outline" className={`${getCategoryColor(feature.category)} border-0`}>
                          {feature.category}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-muted-foreground">
                          Status: {getStatusText(feature.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RoadmapView; 