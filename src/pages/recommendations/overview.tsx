import React from "react";
import Head from "next/head";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Sparkles,
  TrendingUp,
  BarChart4,
  Scale,
  CheckCircle,
  FileText,
  ChevronRight,
  User,
  PieChart,
  Activity,
  Lock,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/page-header";
import { DashboardShell } from "@/components/dashboard-shell";

// Animação para os cards
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
    },
  }),
};

export default function RecommendationOverview() {
  return (
    <>
      <Head>
        <title>Visão Geral do Sistema de Recomendações | InvestT</title>
      </Head>
      <DashboardShell>
        <PageHeader>
          <div className="flex items-center gap-2">
            <div>
              <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Sistema de Recomendações Inteligentes
              </h1>
              <p className="text-muted-foreground">
                Visão geral das melhorias implementadas no sistema de recomendações
              </p>
            </div>
          </div>
        </PageHeader>

        <div className="space-y-8">
          {/* Introdução */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/30 border-blue-100 dark:border-blue-900">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Revolução nas Recomendações de Investimentos
              </CardTitle>
              <CardDescription className="text-base text-blue-800/80 dark:text-blue-300/80">
                Nossa plataforma evoluiu para oferecer recomendações personalizadas de alto valor,
                combinando análise histórica, simulação avançada e conformidade regulatória.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-blue-700/90 dark:text-blue-400/90">
                As recomendações inteligentes foram projetadas para atender às necessidades específicas de cada cliente,
                considerando seu perfil de risco, histórico de investimentos e objetivos financeiros.
                O sistema utiliza algoritmos avançados para gerar sugestões altamente precisas e regulatoriamente
                adequadas.
              </p>
              
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300">
                  Personalização Avançada
                </Badge>
                <Badge className="bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300">
                  Simulação de Cenários
                </Badge>
                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-300">
                  Verificação Regulatória
                </Badge>
                <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900/50 dark:text-purple-300">
                  Histórico Comportamental
                </Badge>
                <Badge className="bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300">
                  Comparação de Benchmarks
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Cards de Principais Melhorias */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div
              custom={0}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
            >
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <Badge className="w-fit mb-2">Recomendações</Badge>
                  <CardTitle className="text-lg">Personalização Inteligente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-center p-4">
                    <User className="h-16 w-16 text-blue-500 opacity-80" />
                  </div>
                  
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Análise de histórico comportamental do cliente</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Padrões de investimento e tolerância real a riscos</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Objetivos financeiros específicos considerados</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div
              custom={1}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
            >
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <Badge className="w-fit mb-2">Simulações</Badge>
                  <CardTitle className="text-lg">Cenários Econômicos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-center p-4">
                    <BarChart4 className="h-16 w-16 text-amber-500 opacity-80" />
                  </div>
                  
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Projeções em cenários otimista, base e pessimista</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Visualização detalhada de resultados projetados</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Comparação com indicadores de referência (CDI, IPCA)</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div
              custom={2}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
            >
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <Badge className="w-fit mb-2">Compliance</Badge>
                  <CardTitle className="text-lg">Conformidade Regulatória</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-center p-4">
                    <Scale className="h-16 w-16 text-green-500 opacity-80" />
                  </div>
                  
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Verificação automática de adequação ao perfil (Suitability)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Alertas e divulgações obrigatórias conforme CVM</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Análise de eficiência tributária por classe de ativo</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Comparativo Antes e Depois */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Evolução do Sistema de Recomendações</CardTitle>
              <CardDescription>
                Comparativo das funcionalidades antes e depois das melhorias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left p-2 border-b">Funcionalidade</th>
                      <th className="text-left p-2 border-b">Versão Anterior</th>
                      <th className="text-left p-2 border-b">Nova Versão</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 border-b">Personalização</td>
                      <td className="p-2 border-b text-muted-foreground">
                        Baseada apenas no perfil de risco declarado
                      </td>
                      <td className="p-2 border-b text-green-600 dark:text-green-400">
                        Análise de comportamento histórico e objetivos específicos
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 border-b">Projeções</td>
                      <td className="p-2 border-b text-muted-foreground">
                        Cenário único com retorno médio estimado
                      </td>
                      <td className="p-2 border-b text-green-600 dark:text-green-400">
                        Múltiplos cenários econômicos com simulações visuais
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 border-b">Benchmarks</td>
                      <td className="p-2 border-b text-muted-foreground">
                        Sem comparação com índices de mercado
                      </td>
                      <td className="p-2 border-b text-green-600 dark:text-green-400">
                        Comparação com múltiplos benchmarks e correlações
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 border-b">Compliance</td>
                      <td className="p-2 border-b text-muted-foreground">
                        Verificação manual de adequação regulatória
                      </td>
                      <td className="p-2 border-b text-green-600 dark:text-green-400">
                        Sistema automatizado de verificação com alertas
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 border-b">Interface</td>
                      <td className="p-2 border-b text-muted-foreground">
                        Formulário básico sequencial
                      </td>
                      <td className="p-2 border-b text-green-600 dark:text-green-400">
                        Painéis interativos com visualizações dinâmicas
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 border-b">Alocação</td>
                      <td className="p-2 border-b text-muted-foreground">
                        Alocação padrão por perfil de risco
                      </td>
                      <td className="p-2 border-b text-green-600 dark:text-green-400">
                        Alocação inteligente ajustada para cada cliente
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Benefícios para o Negócio */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-500" />
                  Benefícios Operacionais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-muted/50 p-3 rounded-md">
                  <h3 className="font-medium mb-1 flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 h-6 w-6 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                    Maior Eficiência
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Redução de até 40% no tempo necessário para criar recomendações 
                    de alta qualidade, permitindo atender mais clientes.
                  </p>
                </div>
                
                <div className="bg-muted/50 p-3 rounded-md">
                  <h3 className="font-medium mb-1 flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 h-6 w-6 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                    Padronização
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Consistência nas recomendações, independente do assessor,
                    seguindo as melhores práticas e políticas da empresa.
                  </p>
                </div>
                
                <div className="bg-muted/50 p-3 rounded-md">
                  <h3 className="font-medium mb-1 flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 h-6 w-6 rounded-full flex items-center justify-center text-sm font-bold">3</span>
                    Minimização de Riscos
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Redução de erros humanos e exposição a riscos regulatórios 
                    com verificações automáticas de conformidade.
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lock className="h-5 w-5 text-green-500" />
                  Conformidade e Segurança
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-muted/50 p-3 rounded-md">
                  <h3 className="font-medium mb-1 flex items-center gap-2">
                    <span className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 h-6 w-6 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                    Adequação à CVM
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Cumprimento automático das exigências da Instrução CVM 539 (Suitability) 
                    com registro de verificações e justificativas.
                  </p>
                </div>
                
                <div className="bg-muted/50 p-3 rounded-md">
                  <h3 className="font-medium mb-1 flex items-center gap-2">
                    <span className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 h-6 w-6 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                    Transparência
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Relatórios detalhados sobre as recomendações, incluindo fundamentação
                    técnica e divulgações obrigatórias aos clientes.
                  </p>
                </div>
                
                <div className="bg-muted/50 p-3 rounded-md">
                  <h3 className="font-medium mb-1 flex items-center gap-2">
                    <span className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 h-6 w-6 rounded-full flex items-center justify-center text-sm font-bold">3</span>
                    Auditabilidade
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Histórico completo de recomendações e alterações, facilitando
                    processos de auditoria interna e externa.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Call to Action */}
          <div className="mt-8 flex flex-col items-center justify-center">
            <div className="text-center max-w-lg mb-6">
              <h2 className="text-xl font-bold mb-2">Experimente o Novo Sistema</h2>
              <p className="text-muted-foreground mb-4">
                Comece a utilizar agora mesmo o sistema de recomendações inteligentes 
                e ofereça um serviço diferenciado aos seus clientes.
              </p>
              <div className="space-x-4">
                <Button asChild size="lg" className="gap-2">
                  <Link href="/recommendations/new-advanced">
                    <Sparkles className="h-4 w-4" />
                    Nova Recomendação Avançada
                  </Link>
                </Button>
                <Button asChild variant="outline" className="gap-2">
                  <Link href="/recommendations">
                    <ArrowUpRight className="h-4 w-4" />
                    Ver Recomendações
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DashboardShell>
    </>
  );
} 