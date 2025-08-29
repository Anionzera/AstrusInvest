import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { Separator } from '@/components/ui/separator';
import { 
  AlertCircle, 
  ArrowLeft, 
  BarChart4, 
  CheckCircle2, 
  ChevronRight, 
  Clock, 
  Download, 
  FileText, 
  Home, 
  LayoutDashboard, 
  Loader2, 
  PieChart, 
  Share2
} from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { AssetAllocationChart } from '../charts/AssetAllocationChart';
import { PerformanceProjectionChart } from '../charts/PerformanceProjectionChart';
import { getRecommendationById, updateRecommendationStatus } from '@/utils/historyUtils';
import { exportToCSV, exportToJSON } from '@/utils/exportUtils';

// Componente principal
export const RecommendationDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [recommendation, setRecommendation] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchRecommendation = async () => {
      if (!id) {
        setError('ID da recomendação não fornecido');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await getRecommendationById(id);
        
        if (!data) {
          setError('Recomendação não encontrada');
        } else {
          setRecommendation(data);
        }
      } catch (error) {
        console.error('Erro ao buscar detalhes da recomendação:', error);
        setError('Erro ao carregar dados da recomendação');
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendation();
  }, [id]);

  // Manipular navegação de volta
  const handleGoBack = () => {
    navigate(-1);
  };

  // Manipular exportação para PDF
  const handleExportPDF = () => {
    // Implementação futura para exportação PDF
    toast({
      title: "Em desenvolvimento",
      description: "A exportação para PDF será implementada em breve",
    });
  };

  // Manipular exportação para CSV
  const handleExportCSV = () => {
    if (!recommendation) return;

    const formattedData = {
      "ID": recommendation.id,
      "Título": recommendation.title || "Recomendação sem título",
      "Cliente": recommendation.clientName,
      "Data de Criação": recommendation.date ? format(new Date(recommendation.date), 'dd/MM/yyyy') : "N/A",
      "Status": getStatusLabel(recommendation.status),
      "Perfil de Risco": recommendation.riskProfile || "N/A",
      "Horizonte de Investimento": recommendation.investmentHorizon || "N/A",
      "Valor Recomendado": recommendation.investmentAmount ? 
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(recommendation.investmentAmount) : "N/A",
      "Objetivos": recommendation.objectives ? recommendation.objectives.join(", ") : "N/A",
      "Criado por": recommendation.createdBy || "N/A"
    };

    // Adicionar alocação de ativos se disponível
    if (recommendation.assetAllocation && Array.isArray(recommendation.assetAllocation)) {
      recommendation.assetAllocation.forEach((asset: any, index: number) => {
        formattedData[`Ativo ${index + 1}`] = `${asset.name} (${asset.allocation}%)`;
      });
    }

    exportToCSV([formattedData], `recomendacao_${recommendation.id}`);
    
    toast({
      title: "Exportação concluída",
      description: "Os dados foram exportados com sucesso",
    });
  };

  // Manipular exportação para JSON
  const handleExportJSON = () => {
    if (!recommendation) return;
    exportToJSON(recommendation, `recomendacao_${recommendation.id}`);
    
    toast({
      title: "Exportação concluída",
      description: "Os dados foram exportados com sucesso",
    });
  };

  // Manipular compartilhamento
  const handleShare = () => {
    if (!recommendation) return;
    
    // URL para compartilhamento
    const shareUrl = window.location.href;
    
    // Verificar se a API de compartilhamento está disponível
    if (navigator.share) {
      navigator.share({
        title: recommendation.title || "Recomendação de Investimento",
        text: `Recomendação para ${recommendation.clientName}: ${recommendation.title || ""}`,
        url: shareUrl,
      })
        .then(() => console.log('Compartilhado com sucesso'))
        .catch((error) => console.error('Erro ao compartilhar', error));
    } else {
      // Fallback: copiar URL para clipboard
      navigator.clipboard.writeText(shareUrl).then(() => {
        toast({
          title: "Link copiado",
          description: "URL copiada para a área de transferência",
        });
      });
    }
  };

  // Manipular atualização de status
  const handleUpdateStatus = async (newStatus: string) => {
    if (!recommendation || !id) return;
    
    try {
      await updateRecommendationStatus(id, newStatus);
      
      setRecommendation({
        ...recommendation,
        status: newStatus
      });
      
      toast({
        title: "Status atualizado",
        description: `Status alterado para ${getStatusLabel(newStatus)}`,
      });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro ao atualizar status",
        description: "Não foi possível atualizar o status da recomendação",
        variant: "destructive",
      });
    }
  };

  // Obter label do status
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'approved': return 'Aprovada';
      case 'rejected': return 'Rejeitada';
      case 'implemented': return 'Implementada';
      case 'expired': return 'Expirada';
      default: return status;
    }
  };

  // Renderizar badge de status
  const renderStatusBadge = (status: string) => {
    let variant: 'default' | 'outline' | 'secondary' | 'destructive' = 'default';
    let icon = null;
    
    switch (status) {
      case 'pending':
        variant = 'outline';
        icon = <Clock className="h-3 w-3 mr-1" />;
        break;
      case 'approved':
        variant = 'default';
        icon = <CheckCircle2 className="h-3 w-3 mr-1" />;
        break;
      case 'rejected':
        variant = 'destructive';
        icon = <AlertCircle className="h-3 w-3 mr-1" />;
        break;
      case 'implemented':
        variant = 'secondary';
        icon = <CheckCircle2 className="h-3 w-3 mr-1" />;
        break;
      case 'expired':
        variant = 'outline';
        icon = <Clock className="h-3 w-3 mr-1" />;
        break;
    }
    
    return (
      <Badge variant={variant} className="ml-2 flex items-center">
        {icon}
        {getStatusLabel(status)}
      </Badge>
    );
  };

  // Renderizar iniciais do cliente para o Avatar
  const getClientInitials = (name: string) => {
    if (!name) return '??';
    
    const nameParts = name.split(' ');
    if (nameParts.length === 1) return nameParts[0].substring(0, 2).toUpperCase();
    
    return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
  };

  // Renderizar dados de projeção de retorno para o gráfico
  const getReturnProjectionData = () => {
    if (!recommendation || !recommendation.projections) {
      return [];
    }

    // Se já tiver dados formatados, usar diretamente
    if (Array.isArray(recommendation.projections)) {
      return recommendation.projections;
    }

    // Caso contrário, criar dados de exemplo baseados no perfil de risco
    const riskProfile = recommendation.riskProfile || 'moderado';
    const horizonMonths = recommendation.investmentHorizonMonths || 60;
    
    // Taxas de retorno estimadas baseadas no perfil de risco
    const riskReturnRates: Record<string, number> = {
      'conservador': 0.5,
      'moderado-conservador': 0.7,
      'moderado': 0.9,
      'moderado-agressivo': 1.1,
      'agressivo': 1.3
    };
    
    const monthlyRate = riskReturnRates[riskProfile] || 0.8;
    
    // Gerar pontos de dados para diferentes períodos
    const periods = [
      { label: '6M', months: 6 },
      { label: '1A', months: 12 },
      { label: '2A', months: 24 },
      { label: '3A', months: 36 },
      { label: '5A', months: 60 }
    ].filter(p => p.months <= horizonMonths);
    
    return periods.map(period => {
      const expectedReturn = period.months * monthlyRate;
      const volatility = expectedReturn * (riskProfile === 'conservador' ? 0.2 : 
                                          riskProfile === 'agressivo' ? 0.5 : 0.3);

      // CDI real anual, se disponível (cache global ou sessionStorage preenchidos em outras telas)
      let cdiAnnual: number | undefined = (window as any).__macro_cdi_annual;
      if (typeof cdiAnnual !== 'number') {
        try {
          const cached = sessionStorage.getItem('macroData');
          if (cached) {
            const macro = JSON.parse(cached);
            const cdi = macro?.indicadores?.taxasDI?.um_ano;
            if (typeof cdi === 'number') cdiAnnual = cdi;
          }
        } catch {}
      }
      const cdiPeriod = typeof cdiAnnual === 'number' && isFinite(cdiAnnual)
        ? (Math.pow(1 + (cdiAnnual / 100), period.months / 12) - 1) * 100
        : undefined;
      
      return {
        period: period.label,
        expectedReturn: parseFloat(expectedReturn.toFixed(2)),
        pessimisticReturn: parseFloat((expectedReturn - volatility).toFixed(2)),
        optimisticReturn: parseFloat((expectedReturn + volatility).toFixed(2)),
        benchmark: parseFloat((expectedReturn * 0.8).toFixed(2)),
        cdi: cdiPeriod !== undefined ? parseFloat(cdiPeriod.toFixed(2)) : undefined
      };
    });
  };

  // Renderizar dados de alocação de ativos para o gráfico
  const getAssetAllocationData = () => {
    if (!recommendation) return [];
    
    // Se já tiver dados de alocação, usar diretamente
    if (recommendation.assetAllocation && Array.isArray(recommendation.assetAllocation)) {
      return recommendation.assetAllocation;
    }
    
    // Caso contrário, criar dados de exemplo baseados no perfil de risco
    const riskProfile = recommendation.riskProfile || 'moderado';
    
    const allocations: Record<string, any[]> = {
      'conservador': [
        { name: 'Renda Fixa', allocation: 70, color: '#0088FE' },
        { name: 'Tesouro Direto', allocation: 20, color: '#00C49F' },
        { name: 'Fundos Imobiliários', allocation: 5, color: '#FFBB28' },
        { name: 'Ações', allocation: 5, color: '#FF8042' }
      ],
      'moderado-conservador': [
        { name: 'Renda Fixa', allocation: 55, color: '#0088FE' },
        { name: 'Tesouro Direto', allocation: 15, color: '#00C49F' },
        { name: 'Fundos Imobiliários', allocation: 15, color: '#FFBB28' },
        { name: 'Ações', allocation: 10, color: '#FF8042' },
        { name: 'Multimercado', allocation: 5, color: '#A28BFC' }
      ],
      'moderado': [
        { name: 'Renda Fixa', allocation: 40, color: '#0088FE' },
        { name: 'Tesouro Direto', allocation: 10, color: '#00C49F' },
        { name: 'Fundos Imobiliários', allocation: 20, color: '#FFBB28' },
        { name: 'Ações', allocation: 20, color: '#FF8042' },
        { name: 'Multimercado', allocation: 10, color: '#A28BFC' }
      ],
      'moderado-agressivo': [
        { name: 'Renda Fixa', allocation: 25, color: '#0088FE' },
        { name: 'Tesouro Direto', allocation: 5, color: '#00C49F' },
        { name: 'Fundos Imobiliários', allocation: 20, color: '#FFBB28' },
        { name: 'Ações', allocation: 35, color: '#FF8042' },
        { name: 'Multimercado', allocation: 10, color: '#A28BFC' },
        { name: 'Investimento Internacional', allocation: 5, color: '#FF6B8B' }
      ],
      'agressivo': [
        { name: 'Renda Fixa', allocation: 10, color: '#0088FE' },
        { name: 'Fundos Imobiliários', allocation: 15, color: '#FFBB28' },
        { name: 'Ações', allocation: 45, color: '#FF8042' },
        { name: 'Multimercado', allocation: 15, color: '#A28BFC' },
        { name: 'Investimento Internacional', allocation: 10, color: '#FF6B8B' },
        { name: 'Criptomoedas', allocation: 5, color: '#4BC0C0' }
      ]
    };
    
    return allocations[riskProfile] || allocations['moderado'];
  };

  // Renderizar tela de carregamento
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Carregando detalhes da recomendação...</p>
      </div>
    );
  }

  // Renderizar tela de erro
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Erro ao carregar recomendação</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={handleGoBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>
    );
  }

  // Calcular período formatado para exibição
  const formatPeriod = () => {
    if (!recommendation) return 'N/A';
    
    const months = recommendation.investmentHorizonMonths || 0;
    
    if (months === 0) return 'Indefinido';
    if (months < 12) return `${months} meses`;
    
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    
    if (remainingMonths === 0) return `${years} ${years === 1 ? 'ano' : 'anos'}`;
    return `${years} ${years === 1 ? 'ano' : 'anos'} e ${remainingMonths} ${remainingMonths === 1 ? 'mês' : 'meses'}`;
  };

  return (
    <div className="container mx-auto my-4 space-y-4 max-w-7xl">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">
              <Home className="h-4 w-4" />
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight className="h-4 w-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbLink href="/recommendations">Recomendações</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight className="h-4 w-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbLink>Detalhes</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleGoBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">
              {recommendation?.title || "Recomendação de Investimento"}
              {recommendation?.status && renderStatusBadge(recommendation.status)}
            </h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Criado em {recommendation?.date ? format(new Date(recommendation.date), 'PPP', { locale: pt }) : 'data desconhecida'} 
            {recommendation?.createdBy && ` por ${recommendation.createdBy}`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Compartilhar
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportPDF}>
                <FileText className="mr-2 h-4 w-4" />
                Exportar como PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV}>
                <FileDown className="mr-2 h-4 w-4" />
                Exportar como CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportJSON}>
                <FileJson className="mr-2 h-4 w-4" />
                Exportar como JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="default" size="sm" onClick={() => navigate(`/recommendations/edit/${id}`)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 md:grid-cols-5 lg:w-[600px]">
          <TabsTrigger value="overview">
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="analysis">
            <PieChart className="h-4 w-4 mr-2" />
            Análise
          </TabsTrigger>
          <TabsTrigger value="projections">
            <BarChart4 className="h-4 w-4 mr-2" />
            Projeções
          </TabsTrigger>
          <TabsTrigger value="history">
            <Clock className="h-4 w-4 mr-2" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="documents" className="hidden md:flex">
            <FileText className="h-4 w-4 mr-2" />
            Documentos
          </TabsTrigger>
        </TabsList>

        {/* Conteúdo da Visão Geral */}
        <TabsContent value="overview">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            {/* Informações do Cliente */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Informações do Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={recommendation?.clientPicture} />
                    <AvatarFallback>{getClientInitials(recommendation?.clientName || '')}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg">{recommendation?.clientName || 'Cliente'}</h3>
                    <p className="text-sm text-muted-foreground">{recommendation?.clientEmail || 'Email não disponível'}</p>
                  </div>
                </div>
                <Separator className="my-4" />
                <div className="space-y-3">
                  {recommendation?.clientCpf && (
                    <div>
                      <p className="text-sm font-medium">CPF:</p>
                      <p className="text-sm text-muted-foreground">{recommendation.clientCpf}</p>
                    </div>
                  )}
                  {recommendation?.clientPhone && (
                    <div>
                      <p className="text-sm font-medium">Telefone:</p>
                      <p className="text-sm text-muted-foreground">{recommendation.clientPhone}</p>
                    </div>
                  )}
                  {recommendation?.clientBirthdate && (
                    <div>
                      <p className="text-sm font-medium">Data de Nascimento:</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(recommendation.clientBirthdate), 'dd/MM/yyyy')}
                      </p>
                    </div>
                  )}
                  {recommendation?.clientOccupation && (
                    <div>
                      <p className="text-sm font-medium">Profissão:</p>
                      <p className="text-sm text-muted-foreground">{recommendation.clientOccupation}</p>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => navigate(`/clients/${recommendation?.clientId}`)}>
                  Ver perfil completo
                </Button>
              </CardFooter>
            </Card>

            {/* Resumo da Recomendação */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Resumo da Recomendação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Perfil de Risco</p>
                    <div className="flex items-center">
                      <Badge variant="outline" className="text-sm">
                        {recommendation?.riskProfile || 'Não definido'}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Horizonte</p>
                    <p className="text-sm">{formatPeriod()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Valor Recomendado</p>
                    <p className="text-base font-bold">
                      {recommendation?.investmentAmount 
                        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                            .format(recommendation.investmentAmount)
                        : 'Não definido'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Rentabilidade Esperada</p>
                    <p className="text-base font-bold">
                      {recommendation?.expectedReturn 
                        ? `${recommendation.expectedReturn.toFixed(2)}%`
                        : 'Não definida'}
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium mb-2">Objetivos de Investimento</p>
                  <div className="flex flex-wrap gap-2">
                    {recommendation?.objectives && recommendation.objectives.length > 0 ? (
                      recommendation.objectives.map((objective: string, index: number) => (
                        <Badge key={index} variant="secondary">
                          {objective}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Não definidos</p>
                    )}
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium mb-2">Descrição</p>
                  <p className="text-sm text-muted-foreground">
                    {recommendation?.description || 'Sem descrição disponível'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Gráfico de Alocação de Ativos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Alocação de Ativos</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <AssetAllocationChart allocation={getAssetAllocationData()} />
              </CardContent>
            </Card>

            {/* Gráfico de Projeção de Retorno */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Projeção de Retorno</CardTitle>
              </CardHeader>
              <CardContent>
                <PerformanceProjectionChart 
                  data={getReturnProjectionData()} 
                  showRange={true}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Conteúdo de Análise */}
        <TabsContent value="analysis">
          <Card>
            <CardHeader>
              <CardTitle>Análise Detalhada</CardTitle>
              <CardDescription>
                Análise fundamentalista e critérios utilizados para a recomendação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Conteúdo da análise detalhada será implementado em breve
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conteúdo de Projeções */}
        <TabsContent value="projections">
          <Card>
            <CardHeader>
              <CardTitle>Projeções Financeiras</CardTitle>
              <CardDescription>
                Projeções detalhadas de rentabilidade e simulações de cenários
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Conteúdo de projeções financeiras será implementado em breve
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conteúdo de Histórico */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Alterações</CardTitle>
              <CardDescription>
                Registro de alterações e atualizações da recomendação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Conteúdo do histórico de alterações será implementado em breve
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conteúdo de Documentos */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Documentos</CardTitle>
              <CardDescription>
                Documentos relacionados a esta recomendação de investimento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Conteúdo de documentos será implementado em breve
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Ações de Atualização de Status */}
      {recommendation?.status && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {recommendation.status === 'pending' && (
                <>
                  <Button 
                    onClick={() => handleUpdateStatus('approved')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Aprovar Recomendação
                  </Button>
                  <Button 
                    onClick={() => handleUpdateStatus('rejected')}
                    variant="destructive"
                  >
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Rejeitar Recomendação
                  </Button>
                </>
              )}
              {recommendation.status === 'approved' && (
                <Button 
                  onClick={() => handleUpdateStatus('implemented')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Marcar como Implementada
                </Button>
              )}
              {recommendation.status === 'rejected' && (
                <Button 
                  onClick={() => handleUpdateStatus('pending')}
                  variant="outline"
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Retornar para Pendente
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 