import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Download,
  FileText,
  PieChart as PieChartIcon,
  LineChart,
  User,
  Clock,
  Briefcase,
  Share2,
  FileCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getRecommendationById } from "@/lib/historyUtils";
import { AssetAllocationChart } from './charts/AssetAllocationChart';
import { ReturnProjectionsChart } from './charts/ReturnProjectionsChart';
import { ComparisonChart } from './charts/ComparisonChart';
import { formatCurrency } from "@/utils/formatters";

const RecommendationDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recommendation, setRecommendation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!id) return;
    
    const loadRecommendation = async () => {
      setLoading(true);
      try {
        const rec = await getRecommendationById(id);
        if (!rec) {
          throw new Error('Recomendação não encontrada');
        }
        setRecommendation(rec);
      } catch (error) {
        console.error('Erro ao carregar recomendação:', error);
        // Implementar melhor tratamento de erro
      } finally {
        setLoading(false);
      }
    };
    
    loadRecommendation();
  }, [id]);

  if (loading) {
    return (
      <div className="w-full h-[600px] flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-primary rounded-full border-t-transparent"></div>
      </div>
    );
  }

  if (!recommendation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Recomendação não encontrada</CardTitle>
          <CardDescription>
            Não foi possível encontrar os detalhes desta recomendação
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const clientData = recommendation.conteudo?.clienteData || {};
  const riskProfile = recommendation.conteudo?.perfilRisco || {};
  const horizon = recommendation.conteudo?.horizonte || {};
  const strategy = recommendation.conteudo?.estrategia || {};
  const allocation = recommendation.conteudo?.alocacao || [];
  const projections = recommendation.conteudo?.projecoes || {};
  const compliance = recommendation.conteudo?.conformidade || {};
  
  // Calcula a porcentagem total por categoria de ativos
  const assetCategories = allocation.reduce((acc: Record<string, number>, asset: any) => {
    const category = asset.type || asset.category || asset.assetClass || 'Outros';
    acc[category] = (acc[category] || 0) + asset.allocation;
    return acc;
  }, {});
  
  const formattedDate = recommendation.dataCriacao 
    ? format(new Date(recommendation.dataCriacao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : 'Data não disponível';
  
  const getRiskProfileColor = (profile: string) => {
    switch (profile?.toLowerCase()) {
      case 'conservador': return 'bg-blue-100 text-blue-800';
      case 'moderado': return 'bg-yellow-100 text-yellow-800';
      case 'agressivo': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const handleBack = () => {
    navigate(-1);
  };
  
  const handleExport = () => {
    // Implementar função de exportação PDF
    console.log('Exportando recomendação...');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="mb-2 -ml-3 text-muted-foreground"
            onClick={handleBack}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para o histórico
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">
            {recommendation.titulo || 'Recomendação de Investimento'}
          </h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>Criado em {formattedDate}</span>
            <span className="text-muted-foreground/40">•</span>
            <Badge variant="outline" className={getRiskProfileColor(riskProfile.profile)}>
              {riskProfile.profile || 'Perfil não definido'}
            </Badge>
          </div>
        </div>
        
        <Button onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-4 md:w-[500px]">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="analysis">Análise</TabsTrigger>
          <TabsTrigger value="projections">Projeções</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
        </TabsList>
        
        {/* Aba de Visão Geral */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Card do Cliente */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium">Cliente</CardTitle>
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-muted-foreground">Nome</div>
                    <div className="font-medium">{clientData.name || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Idade</div>
                    <div className="font-medium">{clientData.age || 'N/A'} anos</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Email</div>
                    <div className="font-medium">{clientData.email || 'N/A'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Card do Perfil de Risco */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium">Perfil de Risco</CardTitle>
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-muted-foreground">Perfil</div>
                    <div className="font-medium">{riskProfile.profile || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Pontuação</div>
                    <div className="font-medium">{riskProfile.score || 'N/A'} pontos</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Volatilidade aceitável</div>
                    <div className="font-medium">{strategy.volatility || 'N/A'}%</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Card do Horizonte */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium">Horizonte de Investimento</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-muted-foreground">Período</div>
                    <div className="font-medium">{horizon.years || 'N/A'} anos</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Objetivo</div>
                    <div className="font-medium">{horizon.objective || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Valor Inicial</div>
                    <div className="font-medium">{formatCurrency(horizon.amount || 0)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de Alocação */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">Alocação de Ativos</CardTitle>
              <CardDescription>
                Distribuição recomendada por classe de ativos
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <AssetAllocationChart allocation={allocation} />
            </CardContent>
          </Card>

          {/* Estratégia e Justificativa */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">Estratégia de Investimento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-medium mb-2">Estratégia Selecionada</h3>
                  <p>{strategy.name || 'Estratégia não definida'}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {strategy.description || 'Sem descrição disponível'}
                  </p>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-base font-medium mb-2">Focos da Estratégia</h3>
                  <div className="flex flex-wrap gap-2">
                    {(strategy.focus || []).map((focus: string, idx: number) => (
                      <Badge key={idx} variant="outline">
                        {focus}
                      </Badge>
                    ))}
                    {(!strategy.focus || strategy.focus.length === 0) && (
                      <span className="text-sm text-muted-foreground">Nenhum foco definido</span>
                    )}
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-base font-medium mb-2">Justificativa</h3>
                  <p className="text-sm text-muted-foreground">
                    {strategy.justification || 'Não foi fornecida justificativa para esta recomendação.'}
                  </p>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="bg-muted rounded-lg p-4 text-center">
                    <div className="text-sm text-muted-foreground mb-1">Retorno Esperado</div>
                    <div className="text-xl font-bold text-primary">
                      {strategy.expectedReturn || '0'}%
                    </div>
                  </div>
                  <div className="bg-muted rounded-lg p-4 text-center">
                    <div className="text-sm text-muted-foreground mb-1">Volatilidade</div>
                    <div className="text-xl font-bold text-primary">
                      {strategy.volatility || '0'}%
                    </div>
                  </div>
                  <div className="bg-muted rounded-lg p-4 text-center">
                    <div className="text-sm text-muted-foreground mb-1">Sharpe Ratio</div>
                    <div className="text-xl font-bold text-primary">
                      {strategy.sharpeRatio || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Aba de Análise */}
        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Análise de Ativos</CardTitle>
              <CardDescription>
                Detalhamento da alocação recomendada
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-base font-medium mb-4">Composição da Carteira</h3>
                    <AssetAllocationChart allocation={allocation} />
                  </div>
                  <div>
                    <h3 className="text-base font-medium mb-4">Comparativo com Benchmark</h3>
                    <ComparisonChart allocation={allocation} benchmark="mercado" />
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-base font-medium mb-4">Detalhamento por Classe de Ativo</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-muted">
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Classe de Ativo
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Alocação %
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Valor (R$)
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Retorno Esperado
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Risco
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {allocation.map((asset: any, index: number) => (
                          <tr key={index} className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                            <td className="px-4 py-2 text-sm">{asset.name}</td>
                            <td className="px-4 py-2 text-sm">{asset.allocation}%</td>
                            <td className="px-4 py-2 text-sm">
                              {formatCurrency((horizon.amount || 0) * (asset.allocation / 100))}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              {(asset.expectedReturn?.baseline || asset.expectedReturn || 0).toFixed(2)}%
                            </td>
                            <td className="px-4 py-2 text-sm">
                              {(asset.risk || asset.volatility || 'N/A')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-base font-medium mb-4">Análise de Risco e Retorno</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-muted/30 p-4 rounded-lg space-y-4">
                      <h4 className="text-sm font-medium">Indicadores de Risco</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Volatilidade da Carteira:</span>
                          <span className="font-medium">{strategy.volatility || 'N/A'}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Drawdown Máximo:</span>
                          <span className="font-medium">
                            {strategy.maxDrawdown || strategy.worst_case || 'N/A'}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">VaR (95%):</span>
                          <span className="font-medium">{strategy.var95 || 'N/A'}%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-muted/30 p-4 rounded-lg space-y-4">
                      <h4 className="text-sm font-medium">Indicadores de Retorno</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Retorno Anualizado:</span>
                          <span className="font-medium">{strategy.expectedReturn || 'N/A'}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Alpha:</span>
                          <span className="font-medium">{strategy.alpha || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Sharpe Ratio:</span>
                          <span className="font-medium">{strategy.sharpeRatio || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Aba de Projeções */}
        <TabsContent value="projections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Projeções de Retorno</CardTitle>
              <CardDescription>
                Simulações de retorno para diferentes cenários
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                <div className="h-[400px]">
                  <ReturnProjectionsChart 
                    projections={projections} 
                    initialValue={horizon.amount} 
                    years={horizon.years} 
                  />
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-red-50 border-red-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-medium text-red-800">
                        Cenário Pessimista
                      </CardTitle>
                      <CardDescription className="text-red-700">
                        Baixo desempenho de mercado
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm text-red-600">Retorno Anual</div>
                          <div className="text-xl font-bold text-red-800">
                            {projections.pessimistic?.expectedReturn || '0'}%
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-red-600">Montante Final</div>
                          <div className="text-xl font-bold text-red-800">
                            {formatCurrency(projections.pessimistic?.finalValue || 0)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-blue-50 border-blue-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-medium text-blue-800">
                        Cenário Base
                      </CardTitle>
                      <CardDescription className="text-blue-700">
                        Desempenho normal de mercado
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm text-blue-600">Retorno Anual</div>
                          <div className="text-xl font-bold text-blue-800">
                            {projections.baseline?.expectedReturn || '0'}%
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-blue-600">Montante Final</div>
                          <div className="text-xl font-bold text-blue-800">
                            {formatCurrency(projections.baseline?.finalValue || 0)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-green-50 border-green-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-medium text-green-800">
                        Cenário Otimista
                      </CardTitle>
                      <CardDescription className="text-green-700">
                        Alto desempenho de mercado
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm text-green-600">Retorno Anual</div>
                          <div className="text-xl font-bold text-green-800">
                            {projections.optimistic?.expectedReturn || '0'}%
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-green-600">Montante Final</div>
                          <div className="text-xl font-bold text-green-800">
                            {formatCurrency(projections.optimistic?.finalValue || 0)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-base font-medium mb-4">Comparação com Benchmarks</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-muted">
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Benchmark
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Retorno Esperado
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Volatilidade
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Performance Relativa
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(compliance.benchmarkComparison || []).map((benchmark: any, index: number) => (
                          <tr key={index} className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                            <td className="px-4 py-2 text-sm">{benchmark.name}</td>
                            <td className="px-4 py-2 text-sm">{benchmark.expectedReturn || 'N/A'}%</td>
                            <td className="px-4 py-2 text-sm">{benchmark.volatility || 'N/A'}%</td>
                            <td className="px-4 py-2 text-sm">
                              <span className={benchmark.expectedOutperformance > 0 ? 'text-green-600' : 'text-red-600'}>
                                {benchmark.expectedOutperformance > 0 ? '+' : ''}{benchmark.expectedOutperformance || 0}%
                              </span>
                            </td>
                          </tr>
                        ))}
                        {(!compliance.benchmarkComparison || compliance.benchmarkComparison.length === 0) && (
                          <tr>
                            <td colSpan={4} className="px-4 py-4 text-center text-sm text-muted-foreground">
                              Não há dados comparativos disponíveis
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Aba de Documentos */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Documentos e Conformidade</CardTitle>
              <CardDescription>
                Documentação e verificações regulatórias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-medium mb-4">Status de Conformidade</h3>
                  <div className="flex items-center space-x-2 mb-4">
                    <Badge variant={compliance.isCompliant ? "default" : "destructive"}>
                      {compliance.isCompliant ? 'Em conformidade' : 'Atenção requisitada'}
                    </Badge>
                    {compliance.isCompliant && (
                      <FileCheck className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                  
                  {compliance.warnings && compliance.warnings.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                      <h4 className="text-sm font-medium text-amber-800 mb-2">Advertências</h4>
                      <ul className="space-y-1 text-sm text-amber-700">
                        {compliance.warnings.map((warning: string, idx: number) => (
                          <li key={idx}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-base font-medium mb-4">Divulgações Obrigatórias</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">Informações ao Investidor</h4>
                    <div className="space-y-2 text-sm text-blue-700">
                      {(compliance.requiredDisclosures || []).map((disclosure: string, idx: number) => (
                        <p key={idx}>{disclosure}</p>
                      ))}
                      {(!compliance.requiredDisclosures || compliance.requiredDisclosures.length === 0) && (
                        <p>Não há divulgações obrigatórias específicas para esta recomendação.</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-base font-medium mb-4">Documentos Disponíveis</h3>
                  <div className="space-y-3">
                    <div className="border rounded-lg p-4 flex justify-between items-center hover:bg-muted/40 transition cursor-pointer">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium">Relatório de Recomendação Detalhado</p>
                          <p className="text-sm text-muted-foreground">PDF, 245 KB</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Baixar
                      </Button>
                    </div>
                    
                    <div className="border rounded-lg p-4 flex justify-between items-center hover:bg-muted/40 transition cursor-pointer">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium">Lâmina de Produtos Recomendados</p>
                          <p className="text-sm text-muted-foreground">PDF, 180 KB</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Baixar
                      </Button>
                    </div>
                    
                    <div className="border rounded-lg p-4 flex justify-between items-center hover:bg-muted/40 transition cursor-pointer">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-purple-600" />
                        <div>
                          <p className="font-medium">Análise de Cenários</p>
                          <p className="text-sm text-muted-foreground">PDF, 320 KB</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Baixar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RecommendationDetailsPage; 