import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Calendar, 
  PieChart, 
  Clock, 
  Target, 
  Package, 
  FileText, 
  Download, 
  Edit, 
  Archive, 
  Trash2,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  FileOutput
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { db } from '@/lib/db';
import { api } from '@/services/api';
import { recommendationsApi } from '@/services/recommendationsService';
import { toast } from 'sonner';
import { AnimatedContainer, AnimatedSection } from '@/components/ui/animated-container';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from '@/components/ui/scroll-area';
import RecommendationSummary from './RecommendationSummary';
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { PieChartComponent } from "@/components/charts/PieChart";

// Função simples para exportar para PDF
const exportToPDF = async ({ type, data }: { type: string, data: any }) => {
  try {
    // Cria um elemento temporário para renderizar
    const tempDiv = document.createElement('div');
    tempDiv.className = 'pdf-container p-8 bg-white';
    document.body.appendChild(tempDiv);

    // Renderiza o conteúdo com base no tipo
    if (type === 'recommendation') {
      const { recommendation, client } = data;
      tempDiv.innerHTML = `
        <div class="mb-8">
          <h1 class="text-2xl font-bold mb-2">${recommendation.titulo || 'Recomendação de Investimento'}</h1>
          <p class="text-gray-600">Criado em: ${format(new Date(recommendation.dataCriacao), 'dd/MM/yyyy')}</p>
          ${client ? `<p class="text-gray-600">Cliente: ${client.nome}</p>` : ''}
        </div>
        <div class="mb-8">
          <h2 class="text-xl font-semibold mb-2">Detalhes da Recomendação</h2>
          <p>${recommendation.descricao || 'Sem descrição disponível'}</p>
        </div>
      `;
    } else {
      tempDiv.innerHTML = '<p>Tipo de exportação não suportado</p>';
    }

    // Captura como imagem
    const canvas = await html2canvas(tempDiv, { scale: 2 });
    document.body.removeChild(tempDiv);
    
    // Cria PDF
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const imgWidth = 210; // A4 width in mm (portrait)
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    
    // Retorna o blob
    return pdf.output('blob');
  } catch (error) {
    console.error('Erro ao exportar para PDF:', error);
    throw new Error('Falha ao gerar PDF');
  }
};

// Função para gerar cores para cada tipo de ativo
const getAssetColor = (assetName: string): string => {
  // Mapeamento de classes de ativos para cores
  const colorMap: Record<string, string> = {
    "Tesouro Direto": "#4299E1", // azul
    "Renda Fixa": "#3182CE", // azul escuro
    "CDB": "#2B6CB0", // azul mais escuro
    "LCI/LCA": "#2C5282",
    "Debêntures": "#2A4365",
    "Renda Variável": "#48BB78", // verde
    "Ações": "#38A169", // verde escuro
    "Fundos Imobiliários": "#F6AD55", // laranja
    "FII": "#ED8936", // laranja escuro
    "Fundos Multimercado": "#9F7AEA", // roxo
    "Reserva de Emergência": "#D53F8C", // rosa
    "Imóveis": "#805AD5", // roxo escuro
    "Private Equity": "#667EEA", // indigo
    "Criptomoedas": "#F56565", // vermelho
    "Ouro": "#F6E05E", // amarelo
    "Internacional": "#0BC5EA" // ciano
  };

  // Procura pela correspondência exata primeiro
  if (colorMap[assetName]) {
    return colorMap[assetName];
  }

  // Se não encontrar correspondência exata, procura por substrings
  for (const [key, color] of Object.entries(colorMap)) {
    if (assetName.toLowerCase().includes(key.toLowerCase())) {
      return color;
    }
  }

  // Cores para casos não mapeados baseadas no primeiro caractere da string
  const fallbackColors = [
    "#4C51BF", "#2B6CB0", "#2C7A7B", "#2F855A", "#744210", 
    "#975A16", "#9B2C2C", "#702459", "#553C9A", "#1A365D"
  ];

  // Hash simples do nome para escolher uma cor
  const hashCode = assetName.split("").reduce(
    (acc, char) => acc + char.charCodeAt(0), 0
  );
  
  return fallbackColors[hashCode % fallbackColors.length];
};

// Componente para visualizar uma recomendação existente
const RecommendationView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recommendation, setRecommendation] = useState<any | null>(null);
  const [client, setClient] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Carregar dados da recomendação
  useEffect(() => {
    const loadRecommendation = async () => {
      try {
        if (!id) return;
        
        setLoading(true);
        // Não converter o ID para número, usar o parâmetro como string
        const recommendationId = id;
        
        // Buscar recomendação (tenta API primeiro)
        let recData = await db.recomendacoes.get(recommendationId);
        try {
          const online = await api.health().then(h => h.ok && h.db).catch(() => false);
          if (online) {
            const list = await recommendationsApi.list();
            const found = list.find(r => r.id === recommendationId);
            if (found) {
              recData = recData || {
                id: found.id,
                titulo: found.title,
                descricao: found.description,
                dataCriacao: found.created_at ? new Date(found.created_at) : new Date(),
                status: found.status,
                perfilRisco: found.risk_profile,
                horizonteInvestimento: found.investment_horizon,
                conteudo: found.content,
                clienteId: found.client_id,
              };
            }
          }
        } catch { /* ignore */ }
        
        if (!recData) {
          toast.error("Recomendação não encontrada");
          navigate('/history');
          return;
        }
        
        setRecommendation(recData);
        
        // Buscar cliente associado
        if (recData.clienteId) {
          const clientData = await db.clientes.get(recData.clienteId);
          setClient(clientData || null);
        }
        
      } catch (error) {
        console.error("Erro ao carregar recomendação:", error);
        toast.error("Erro ao carregar dados da recomendação");
      } finally {
        setLoading(false);
      }
    };
    
    loadRecommendation();
  }, [id, navigate]);

  // Função para lidar com a edição da recomendação
  const handleEdit = () => {
    if (!id) return;
    navigate(`/recommendation/edit/${id}`);
  };

  // Função para gerar relatório a partir da recomendação
  const handleGenerateReport = () => {
    if (!id) return;
    setIsGeneratingReport(true);
    
    // Redirecionar para o gerador de relatórios com o ID da recomendação
    navigate(`/report/${id}`);
  };

  // Função para exportar recomendação
  const handleExport = async () => {
    if (!recommendation || !client) {
      toast.error("Dados insuficientes para exportação");
      return;
    }
    
    try {
      const pdfBlob = await exportToPDF({
        type: 'recommendation',
        data: {
          recommendation,
          client
        }
      });
      
      // Criar URL para download
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Recomendacao_${recommendation.id}_${format(new Date(), 'yyyyMMdd')}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Limpar
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      toast.success("Recomendação exportada com sucesso");
    } catch (error) {
      console.error("Erro ao exportar recomendação:", error);
      toast.error("Erro ao exportar recomendação");
    }
  };

  // Função para arquivar recomendação
  const handleArchive = async () => {
    if (!recommendation || !id) return;
    
    try {
      await db.recomendacoes.update(id, {
        ...recommendation,
        status: 'archived'
      });
      try {
        const online = await api.health().then(h => h.ok && h.db).catch(() => false);
        if (online) await recommendationsApi.update(id, { status: 'archived' });
      } catch { /* ignore */ }
      
      // Atualizar estado local
      setRecommendation({
        ...recommendation,
        status: 'archived'
      });
      
      toast.success("Recomendação arquivada com sucesso");
    } catch (error) {
      console.error("Erro ao arquivar recomendação:", error);
      toast.error("Erro ao arquivar recomendação");
    }
  };

  // Função para excluir recomendação
  const handleDelete = async () => {
    if (!id || !recommendation) return;
    
    try {
      try {
        const online = await api.health().then(h => h.ok && h.db).catch(() => false);
        if (online) await recommendationsApi.delete(id);
      } catch { /* ignore */ }
      await db.recomendacoes.delete(id);
      
      toast.success("Recomendação excluída com sucesso");
      navigate('/history');
    } catch (error) {
      console.error("Erro ao excluir recomendação:", error);
      toast.error("Erro ao excluir recomendação");
    }
  };

  // Renderizar estado de carregamento
  if (loading) {
    return (
      <AnimatedContainer>
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl">Carregando Recomendação...</CardTitle>
            <CardDescription>
              Aguarde enquanto os dados são carregados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="mt-4 text-muted-foreground">Carregando dados...</p>
            </div>
          </CardContent>
        </Card>
      </AnimatedContainer>
    );
  }

  // Renderizar mensagem se recomendação não encontrada
  if (!recommendation) {
    return (
      <AnimatedContainer>
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl text-red-500">Recomendação não encontrada</CardTitle>
            <CardDescription>
              A recomendação solicitada não foi encontrada no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro ao carregar recomendação</AlertTitle>
              <AlertDescription>
                A recomendação com ID {id} não foi encontrada ou pode ter sido excluída.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate('/history')}>
              Voltar para Histórico
            </Button>
          </CardFooter>
        </Card>
      </AnimatedContainer>
    );
  }

  // Funções de formatação e mapeamento
  const formatDate = (date: string | Date) => {
    if (!date) return "Data não disponível";
    return format(new Date(date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  const formatStatus = (status: string) => {
    const statusMap: Record<string, { label: string, variant: "default" | "secondary" | "destructive" | "outline" }> = {
      draft: { label: "Rascunho", variant: "outline" },
      sent: { label: "Enviada", variant: "default" },
      approved: { label: "Aprovada", variant: "default" },
      rejected: { label: "Rejeitada", variant: "destructive" },
      archived: { label: "Arquivada", variant: "secondary" },
      converted_to_report: { label: "Convertida em Relatório", variant: "secondary" }
    };
    
    return statusMap[status] || { label: status, variant: "outline" };
  };

  // Renderizar recomendação
  return (
    <AnimatedContainer>
      <AnimatedSection delay={0.1}>
        <Card className="border-t-4 border-t-blue-500 shadow-md">
          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <Badge variant={formatStatus(recommendation.status).variant} className="mb-2">
                  {formatStatus(recommendation.status).label}
                </Badge>
                <CardTitle className="text-2xl font-bold">{recommendation.titulo}</CardTitle>
                <CardDescription className="text-base">
                  {recommendation.descricao || "Sem descrição disponível"}
                </CardDescription>
              </div>
              <div className="flex flex-col md:flex-row gap-2 mt-4">
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={handleEdit}
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </Button>

                <Button
                  variant="outline"
                  className="flex items-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-800/40"
                  onClick={handleGenerateReport}
                  disabled={isGeneratingReport}
                >
                  <FileOutput className="h-4 w-4" />
                  Gerar Relatório
                </Button>

                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={handleArchive}
                >
                  <Archive className="h-4 w-4" />
                  Arquivar
                </Button>
                
                <Button
                  variant="outline"
                  className="flex items-center gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="px-6">
              <TabsTrigger value="overview">
                <FileText className="h-4 w-4 mr-2" />
                Visão Geral
              </TabsTrigger>
              <TabsTrigger value="allocation">
                <PieChart className="h-4 w-4 mr-2" />
                Alocação
              </TabsTrigger>
              <TabsTrigger value="details">
                <Target className="h-4 w-4 mr-2" />
                Detalhes
              </TabsTrigger>
            </TabsList>
            
            <CardContent className="pt-6">
              <TabsContent value="overview" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Informações do Cliente */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Informações do Cliente</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {client ? (
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-2 text-blue-500" />
                            <span className="font-medium">Nome:</span>
                            <span className="ml-2">{client.nome}</span>
                          </div>
                          
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-blue-500" />
                            <span className="font-medium">Data de Cadastro:</span>
                            <span className="ml-2">{formatDate(client.dataCadastro)}</span>
                          </div>
                          
                          <Button 
                            variant="link" 
                            className="p-0 h-auto text-blue-500"
                            onClick={() => navigate(`/clients/${client.id}`)}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Ver perfil completo
                          </Button>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">Cliente não encontrado ou não especificado</p>
                      )}
                    </CardContent>
                  </Card>
                  
                  {/* Informações da Recomendação */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Informações da Recomendação</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-blue-500" />
                          <span className="font-medium">Data de Criação:</span>
                          <span className="ml-2">{formatDate(recommendation.dataCriacao)}</span>
                        </div>
                        
                        {recommendation.dataAtualizacao && (
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-blue-500" />
                            <span className="font-medium">Última Atualização:</span>
                            <span className="ml-2">{formatDate(recommendation.dataAtualizacao)}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center">
                          <Target className="h-4 w-4 mr-2 text-blue-500" />
                          <span className="font-medium">Perfil de Risco:</span>
                          <span className="ml-2">{recommendation.perfilRisco || recommendation.conteudo?.perfilRisco?.profile || "Não especificado"}</span>
                        </div>
                        

                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-blue-500" />
                          <span className="font-medium">Horizonte de Investimento:</span>
                          <span className="ml-2">
                            {recommendation.horizonteInvestimento || 
                             (recommendation.conteudo?.horizonte?.years ? 
                              `${recommendation.conteudo.horizonte.years} anos` : 
                              "Não especificado")}
                          </span>
                        </div>

                        <div className="flex items-center">
                          <FileText className="h-4 w-4 mr-2 text-blue-500" />
                          <span className="font-medium">Valor do Investimento:</span>
                          <span className="ml-2">
                            {recommendation.valorInvestimento ? 
                             new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                              .format(recommendation.valorInvestimento) : 
                             recommendation.conteudo?.horizonte?.amount ?
                             new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                              .format(recommendation.conteudo.horizonte.amount) :
                             "Não especificado"}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="mt-6">
                  {/* Adaptação para mostrar um resumo simplificado em vez do componente completo */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Resumo da Recomendação</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-sm font-medium mb-1">Objetivo:</h3>
                          <p className="text-sm">
                            {recommendation.conteudo?.objetivo || 
                             recommendation.conteudo?.horizonte?.objective || 
                             `Investimento com horizonte de ${recommendation.horizonteInvestimento || recommendation.conteudo?.horizonte?.years + ' anos'}`}
                          </p>
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-medium mb-1">Estratégia:</h3>
                          <p className="text-sm">
                            {recommendation.estrategia || 
                             (recommendation.conteudo?.estrategia?.name) || 
                             (recommendation.conteudo?.estrategia?.description) || 
                             (typeof recommendation.conteudo?.estrategia === 'string' ? recommendation.conteudo.estrategia : '') || 
                             `Estratégia baseada no perfil ${recommendation.perfilRisco || recommendation.conteudo?.perfilRisco?.profile || 'do cliente'}`}
                          </p>
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-medium mb-1">Justificativa:</h3>
                          <p className="text-sm">
                            {recommendation.conteudo?.justificativa || 
                             `Recomendação personalizada para o perfil de risco ${recommendation.perfilRisco || recommendation.conteudo?.perfilRisco?.profile || ''} 
                              e horizonte de investimento de ${recommendation.horizonteInvestimento || recommendation.conteudo?.horizonte?.years + ' anos'}`}
                          </p>
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-medium mb-1">Valor do Investimento:</h3>
                          <p className="text-sm">
                            {recommendation.valorInvestimento ? 
                             new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                              .format(recommendation.valorInvestimento) : 
                             recommendation.conteudo?.horizonte?.amount ?
                             new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                              .format(recommendation.conteudo.horizonte.amount) :
                             "Valor não especificado"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="allocation" className="mt-0">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Alocação de Ativos</CardTitle>
                    <CardDescription>
                      Distribuição recomendada para o portfólio
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      // Função para depurar o objeto de recomendação - para desenvolvimento
                      const logRecommendationStructure = () => {
                        console.log("ESTRUTURA COMPLETA DA RECOMENDAÇÃO:", recommendation);
                        console.log("DADOS DE ALOCAÇÃO DISPONÍVEIS:");
                        if (recommendation.conteudo?.alocacao) console.log("- conteudo.alocacao:", recommendation.conteudo.alocacao);
                        if (recommendation.conteudo?.alocacaoRecomendada) console.log("- conteudo.alocacaoRecomendada:", recommendation.conteudo.alocacaoRecomendada);
                        if (recommendation.alocacaoAtivos) console.log("- alocacaoAtivos:", recommendation.alocacaoAtivos);
                        if (recommendation.allocation) console.log("- allocation:", recommendation.allocation);
                        if (recommendation.conteudo?.estrategia?.alocacao) console.log("- conteudo.estrategia.alocacao:", recommendation.conteudo.estrategia.alocacao);
                        if (recommendation.conteudo?.estrategia?.allocations) console.log("- conteudo.estrategia.allocations:", recommendation.conteudo.estrategia.allocations);
                      };
                      
                      // Depurar ao carregar para diagnóstico
                      logRecommendationStructure();
                      
                      // Função para extrair e normalizar os dados de alocação - SEM VALORES FIXOS
                      const extractAllAllocationData = () => {
                        // Verificar todas as possíveis fontes de dados de alocação
                        let allocationData = null;
                        
                        // 1) Prioridade absoluta: campo canônico (objeto) salvo no Postgres/Dexie
                        if (recommendation.allocation && typeof recommendation.allocation === 'object' && !Array.isArray(recommendation.allocation)) {
                          allocationData = Object.entries(recommendation.allocation).map(([key, value]: [string, any]) => ({
                            name: key,
                            allocation: typeof value === 'number' ? value : 0
                          }));
                        }
                        // Verificar em recommendation.conteudo.alocacaoRecomendada como objeto
                        else if (recommendation.conteudo?.alocacaoRecomendada && typeof recommendation.conteudo.alocacaoRecomendada === 'object' && !Array.isArray(recommendation.conteudo.alocacaoRecomendada)) {
                          allocationData = Object.entries(recommendation.conteudo.alocacaoRecomendada).map(([key, value]: [string, any]) => ({
                            name: key, 
                            allocation: typeof value === 'number' ? value : 0
                          }));
                        }
                        // Verificar em recommendation.conteudo.allocationData como objeto
                        else if (recommendation.conteudo?.allocationData && typeof recommendation.conteudo.allocationData === 'object' && !Array.isArray(recommendation.conteudo.allocationData)) {
                          allocationData = Object.entries(recommendation.conteudo.allocationData).map(([key, value]: [string, any]) => ({
                            name: key, 
                            allocation: typeof value === 'number' ? value : 0
                          }));
                        }
                        // Verificar em alocacaoAtivos array
                        else if (Array.isArray(recommendation.alocacaoAtivos) && recommendation.alocacaoAtivos.length > 0) {
                          allocationData = recommendation.alocacaoAtivos.map((item: any) => ({
                            name: item.name || item.nome || item.tipo || item.type,
                            allocation: item.allocation || item.percentual || item.peso || item.weight || 0
                          }));
                        }
                        // Verificar em conteudo.alocacao array
                        else if (Array.isArray(recommendation.conteudo?.alocacao) && recommendation.conteudo.alocacao.length > 0) {
                          allocationData = recommendation.conteudo.alocacao.map((item: any) => ({
                            name: item.name || item.nome || item.tipo || item.type,
                            allocation: item.allocation || item.percentual || item.peso || item.weight || 0
                          }));
                        }
                        // Verificar conteudo.estrategia.allocation se existir
                        else if (recommendation.conteudo?.estrategia?.allocation) {
                          if (Array.isArray(recommendation.conteudo.estrategia.allocation)) {
                            allocationData = recommendation.conteudo.estrategia.allocation.map((item: any) => ({
                              name: item.name || item.nome || item.className || item.type, 
                              allocation: item.allocation || item.percentage || item.weight || 0
                            }));
                          } else if (typeof recommendation.conteudo.estrategia.allocation === 'object') {
                            allocationData = Object.entries(recommendation.conteudo.estrategia.allocation).map(([key, value]: [string, any]) => ({
                              name: key,
                              allocation: typeof value === 'number' ? value : 0
                            }));
                          }
                        }
                        
                        // Se não encontrarmos dados de alocação, mostrar erro no console
                        if (!allocationData || allocationData.length === 0) {
                          console.error("Não foi possível encontrar dados de alocação em nenhum formato", recommendation);
                        }
                        
                        return allocationData || [];
                      };
                      
                      // Extrair os dados de alocação usando a função aprimorada
                      const allocationData = extractAllAllocationData();
                      
                      if (allocationData.length > 0) {
                        return (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <div className="h-[250px] w-full bg-white dark:bg-gray-800 rounded-md">
                                  <PieChartComponent 
                                    data={allocationData.map((item: any) => ({
                                      name: item.name,
                                      value: item.allocation,
                                      color: getAssetColor(item.name)
                                    }))}
                                  />
                                </div>
                              </div>
                              
                              <div>
                                <ScrollArea className="h-[250px] pr-4">
                                  <table className="w-full border-collapse">
                                    <thead>
                                      <tr className="border-b">
                                        <th className="text-left py-2">Classe de Ativo</th>
                                        <th className="text-right py-2">Alocação</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {allocationData.map((item: any, index: number) => (
                                        <tr key={index} className="border-b border-gray-200 dark:border-gray-700">
                                          <td className="py-2 font-medium">{item.name || `Ativo ${index + 1}`}</td>
                                          <td className="text-right py-2 font-medium">{item.allocation}%</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </ScrollArea>
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        return <p className="text-muted-foreground">Nenhuma informação de alocação disponível</p>;
                      }
                    })()}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="details" className="mt-0">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Detalhes da Recomendação</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Objetivo */}
                      <div>
                        <h3 className="text-base font-semibold mb-2">Objetivo</h3>
                        <p>{recommendation.conteudo?.objetivo || recommendation.conteudo?.horizonte?.objective || "Nenhum objetivo especificado"}</p>
                      </div>
                      
                      <Separator />
                      
                      {/* Estratégia */}
                      <div>
                        <h3 className="text-base font-semibold mb-2">Estratégia</h3>
                        <p>
                          {recommendation.estrategia || 
                           recommendation.conteudo?.estrategia?.name || 
                           recommendation.conteudo?.estrategia?.description || 
                           (recommendation.conteudo?.estrategia && 
                            typeof recommendation.conteudo.estrategia === 'string' ? 
                              recommendation.conteudo.estrategia : "") || 
                           "Nenhuma estratégia especificada"}
                        </p>
                        {recommendation.conteudo?.estrategia?.description && (
                          <p className="mt-2 text-muted-foreground">
                            {recommendation.conteudo.estrategia.description}
                          </p>
                        )}
                      </div>
                      
                      <Separator />
                      
                      {/* Justificativa */}
                      <div>
                        <h3 className="text-base font-semibold mb-2">Justificativa</h3>
                        <p>
                          {recommendation.conteudo?.justificativa || 
                           (recommendation.perfilRisco ? 
                            `Recomendação baseada no perfil de risco ${recommendation.perfilRisco} e horizonte de investimento ${recommendation.horizonteInvestimento}.` : 
                            "Nenhuma justificativa disponível")}
                        </p>
                      </div>
                      
                      <Separator />
                      
                      {/* Observações */}
                      <div>
                        <h3 className="text-base font-semibold mb-2">Observações</h3>
                        <p>{recommendation.conteudo?.observacoes || "Nenhuma observação adicional"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </CardContent>
          </Tabs>
          
          <CardFooter className="flex justify-between border-t pt-6">
            <Button variant="outline" onClick={() => navigate('/history')}>
              Voltar para Histórico
            </Button>
            
            <div>
              <Button variant="default" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Exportar PDF
              </Button>
            </div>
          </CardFooter>
        </Card>
      </AnimatedSection>
    </AnimatedContainer>
  );
};

export default RecommendationView; 