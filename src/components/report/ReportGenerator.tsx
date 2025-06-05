import React, { useState, useEffect } from "react";
import {
  FileText,
  Save,
  ArrowRight,
  Download,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import ReportCustomization from "./ReportCustomization";
import ReportPreview from "./ReportPreview";
import { db } from "@/lib/db";
import { calculateAssetAllocation } from "@/lib/investmentUtils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { exportRecommendationToPDF } from "@/lib/pdfExport";

interface ReportGeneratorProps {
  recommendationData?: {
    riskProfile?: string;
    investmentHorizon?: string;
    allocationStrategy?: string;
    marketScenario?: string;
    assetAllocation?: {
      name: string;
      percentage: number;
      color: string;
      category?: string;
      description?: string;
    }[];
  };
  onSave?: (reportData: any) => void;
  onCancel?: () => void;
}

const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  recommendationData = {
    riskProfile: "",
    investmentHorizon: "",
    allocationStrategy: "",
    marketScenario: "baseline",
    assetAllocation: [],
  },

  onSave = () => {},
  onCancel = () => {},
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("customize");
  const [isGenerating, setIsGenerating] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedRecommendationId, setSelectedRecommendationId] = useState<
    number | null
  >(null);
  const [reportData, setReportData] = useState({
    title: "Relatório de Alocação de Portfólio de Investimentos",
    description:
      "Alocação de investimentos personalizada com base no perfil de risco e horizonte de investimento do cliente",
    clientName: "",
    includeExecutiveSummary: true,
    includeMarketAnalysis: true,
    includeAssetAllocation: true,
    includePerformanceProjections: false,
    includeRiskAnalysis: true,
    includeRecommendations: true,
    reportFormat: "detailed",
    additionalNotes: "",
    marketScenario: recommendationData.marketScenario || "baseline",
    ...recommendationData,
  });

  // Adicionar um estado para armazenar a alocação original extraída da recomendação
  const [originalAllocation, setOriginalAllocation] = useState([]);

  // Carregar recomendações do banco de dados
  useEffect(() => {
    const loadRecommendations = async () => {
      try {
        const recomendacoes = await db.recomendacoes.toArray();
        setRecommendations(recomendacoes);
      } catch (error) {
        console.error("Erro ao carregar recomendações:", error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar recomendações",
          description:
            "Não foi possível carregar as recomendações do banco de dados.",
        });
      }
    };

    loadRecommendations();
  }, [toast]);

  // Atualizar dados do relatório quando uma recomendação for selecionada
  useEffect(() => {
    if (selectedRecommendationId) {
      const loadRecommendationData = async () => {
        try {
          const recomendacao = await db.recomendacoes.get(
            selectedRecommendationId,
          );
          if (recomendacao) {
            // Extrair alocação de ativos da recomendação, considerando diferentes estruturas
            let calculatedAssets = [];
            
            // Função helper para extrair dados de alocação das diferentes estruturas
            const extractAllocationData = () => {
              // Verificar todas as possíveis fontes de dados de alocação
              let allocationData = null;
              
              // 1. Verificar em alocacaoAtivos array (formato comum em recomendações avançadas)
              if (Array.isArray(recomendacao.alocacaoAtivos) && recomendacao.alocacaoAtivos.length > 0) {
                allocationData = recomendacao.alocacaoAtivos.map((item) => ({
                  nome: item.name || item.nome || '',
                  percentual: item.allocation || item.percentual || 0,
                  cor: item.color || '#0088FE',
                  categoria: item.type || item.category || 'Outros',
                  descricao: item.description || 'Ativo recomendado'
                }));
              }
              // 2. Verificar no objeto allocation (formato chave-valor)
              else if (recomendacao.allocation && typeof recomendacao.allocation === 'object' && !Array.isArray(recomendacao.allocation)) {
                allocationData = Object.entries(recomendacao.allocation).map(([key, value]) => ({
                  nome: key,
                  percentual: typeof value === 'number' ? value : 0,
                  cor: getAssetColor(key),
                  categoria: getCategoryFromAssetName(key),
                  descricao: `Alocação em ${key}`
                }));
              }
              // 3. Verificar em conteudo.alocacao array
              else if (Array.isArray(recomendacao.conteudo?.alocacao) && recomendacao.conteudo.alocacao.length > 0) {
                allocationData = recomendacao.conteudo.alocacao.map((item) => ({
                  nome: item.name || item.nome || '',
                  percentual: item.allocation || item.percentual || item.peso || item.weight || 0,
                  cor: item.color || getAssetColor(item.name || item.nome || ''),
                  categoria: item.type || item.category || getCategoryFromAssetName(item.name || item.nome || ''),
                  descricao: item.description || `Alocação em ${item.name || item.nome || 'ativo'}`
                }));
              }
              // 4. Verificar em conteudo.alocacaoRecomendada objeto
              else if (recomendacao.conteudo?.alocacaoRecomendada && typeof recomendacao.conteudo.alocacaoRecomendada === 'object') {
                allocationData = Object.entries(recomendacao.conteudo.alocacaoRecomendada).map(([key, value]) => ({
                  nome: key,
                  percentual: typeof value === 'number' ? value : 0,
                  cor: getAssetColor(key),
                  categoria: getCategoryFromAssetName(key),
                  descricao: `Alocação em ${key}`
                }));
              }
              
              return allocationData || [];
            };
            
            // Funções auxiliares para formatar os dados de alocação
            const getAssetColor = (assetName) => {
              // Mapeamento de classes de ativos para cores
              const colorMap = {
                // Categorias principais com cores distintas
                "Renda Variável": "#0088FE",        // Azul
                "Fundos Imobiliários": "#FF8042",   // Laranja
                "Fundos Multimercado": "#FFBB28",   // Amarelo
                "Investimentos Internacionais": "#82ca9d", // Verde
                "Criptomoedas": "#8884d8",          // Roxo
                "Renda Fixa": "#00C49F",            // Verde água
                
                // Outras categorias específicas
                "Ações": "#0088FE",                 // Azul (mesma da Renda Variável)
                "Tesouro": "#00C49F",               // Verde água (mesma da Renda Fixa)
                "CDB": "#00C49F",                   // Verde água
                "Fundos": "#FFBB28",                // Amarelo
                "Imobiliários": "#FF8042",          // Laranja
                "FII": "#FF8042",                   // Laranja
                "Multimercado": "#FFBB28",          // Amarelo
                "Cripto": "#8884d8",                // Roxo
                "Bitcoin": "#8884d8",               // Roxo
                "Ethereum": "#8884d8",              // Roxo
                "Internacional": "#82ca9d",         // Verde
                "Alternativos": "#D264B6",          // Rosa
                "Reserva": "#6a5acd"                // Violeta
              };
              
              // Primeiro tentar correspondência exata
              if (colorMap[assetName]) {
                return colorMap[assetName];
              }
              
              // Depois procurar por correspondência parcial no nome
              for (const [key, color] of Object.entries(colorMap)) {
                if (assetName.toLowerCase().includes(key.toLowerCase())) {
                  return color;
                }
              }
              
              // Cores de fallback distintas para garantir diversidade
              const fallbackColors = [
                "#0088FE", // Azul
                "#00C49F", // Verde água
                "#FFBB28", // Amarelo
                "#FF8042", // Laranja
                "#8884d8", // Roxo
                "#82ca9d", // Verde
                "#ff6b6b", // Vermelho
                "#6a5acd", // Violeta
                "#D264B6", // Rosa
                "#26C6DA", // Ciano
                "#EF6C00", // Laranja escuro
                "#283593"  // Azul escuro
              ];
              
              // Hash simples para selecionar uma cor baseada no nome do ativo
              const hash = assetName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
              return fallbackColors[hash % fallbackColors.length];
            };
            
            const getCategoryFromAssetName = (assetName) => {
              const categoryMap = {
                // Categorias principais
                "Renda Variável": "Renda Variável",
                "Fundos Imobiliários": "Fundos Imobiliários",
                "Fundos Multimercado": "Fundos Multimercado",
                "Investimentos Internacionais": "Investimentos Internacionais",
                "Criptomoedas": "Criptomoedas",
                "Renda Fixa": "Renda Fixa",
                
                // Subcategorias e termos relacionados
                "Ações": "Renda Variável",
                "Tesouro": "Renda Fixa",
                "CDB": "Renda Fixa",
                "LCI": "Renda Fixa",
                "LCA": "Renda Fixa",
                "Poupança": "Renda Fixa",
                "FII": "Fundos Imobiliários",
                "Imobiliários": "Fundos Imobiliários",
                "Multimercado": "Fundos Multimercado",
                "Internacional": "Investimentos Internacionais",
                "Exterior": "Investimentos Internacionais",
                "Bitcoin": "Criptomoedas",
                "Ethereum": "Criptomoedas",
                "Cripto": "Criptomoedas",
                "Ouro": "Commodities",
                "Commodities": "Commodities",
                "Reserva": "Liquidez"
              };
              
              // Tentar correspondência exata primeiro
              if (categoryMap[assetName]) {
                return categoryMap[assetName];
              }
              
              // Depois procurar por correspondências parciais
              for (const [key, category] of Object.entries(categoryMap)) {
                if (assetName.toLowerCase().includes(key.toLowerCase())) {
                  return category;
                }
              }
              
              return "Outros";
            };
            
            // Extrair dados de alocação da recomendação
            calculatedAssets = extractAllocationData();
            
            // Salvar a alocação original para uso posterior
            setOriginalAllocation(calculatedAssets);
            
            // Se não encontramos nenhum dado de alocação na recomendação avançada, usar a alocação padrão
            if (calculatedAssets.length === 0) {
              console.warn("Nenhuma alocação encontrada na recomendação - usando alocação padrão");
              // Criar uma alocação padrão básica apenas como última opção
              calculatedAssets = [
                {
                  nome: "Renda Fixa",
                  percentual: 60,
                  cor: "#00C49F",
                  categoria: "Renda Fixa",
                  descricao: "Alocação padrão - renda fixa"
                },
                {
                  nome: "Renda Variável",
                  percentual: 40,
                  cor: "#0088FE",
                  categoria: "Renda Variável",
                  descricao: "Alocação padrão - renda variável"
                }
              ];
            }

            // Usar os dados extraídos da recomendação para o relatório
            setReportData({
              ...reportData,
              title: `Relatório de Investimentos - ${recomendacao.nomeCliente || 'Cliente'}`,
              description: `Alocação de investimentos personalizada para ${recomendacao.nomeCliente || 'Cliente'} com base no perfil de risco ${recomendacao.perfilRisco || 'personalizado'} e horizonte de investimento ${recomendacao.horizonteInvestimento || 'definido'}`,
              clientName: recomendacao.nomeCliente || 'Cliente',
              riskProfile: recomendacao.perfilRisco || 'Personalizado',
              investmentHorizon: recomendacao.horizonteInvestimento || 'Personalizado',
              allocationStrategy: recomendacao.estrategia || 'Personalizada',
              marketScenario: recomendacao.marketScenario || "baseline",
              assetAllocation: calculatedAssets.map((asset) => ({
                name: asset.nome,
                percentage: asset.percentual,
                color: asset.cor,
                category: asset.categoria || "Outros",
                description:
                  asset.descricao || "Ativo selecionado para alocação",
              })),
            });
          }
        } catch (error) {
          console.error("Erro ao carregar dados da recomendação:", error);
        }
      };

      loadRecommendationData();
    }
  }, [selectedRecommendationId]);

  // Modificar a função handleCustomizationSubmit para não incluir lógica de preservação
  const handleCustomizationSubmit = (values: any) => {
    // Manter a alocação original sem alterações
    setReportData(prev => ({
      ...prev,
      ...values,
      // Garantir que a alocação não seja modificada
      assetAllocation: prev.assetAllocation
    }));
    
    // Mudar para a aba de prévia
    setActiveTab("preview");
  };

  const handleGenerateReport = async () => {
    try {
      setIsGenerating(true);

      // Verificar se existe um cenário de mercado detectado no sessionStorage
      const detectedScenario = sessionStorage.getItem('detectedMarketScenario');
      if (detectedScenario) {
        console.log("Usando cenário de mercado detectado automaticamente:", detectedScenario);
      }

      // Construir os dados para o relatório
      const reportDataFinal = {
        ...reportData,
        riskProfile: reportData.riskProfile || recommendationData.riskProfile,
        investmentHorizon:
          reportData.investmentHorizon || recommendationData.investmentHorizon,
        allocationStrategy:
          reportData.allocationStrategy ||
          recommendationData.allocationStrategy,
        marketScenario:
          detectedScenario || reportData.marketScenario || recommendationData.marketScenario,
        assetAllocation:
          reportData.assetAllocation || recommendationData.assetAllocation,
      };

      // Debug logs para verificar os valores antes da exportação
      console.log("DEBUG - marketScenario:", reportDataFinal.marketScenario);
      console.log("DEBUG - reportDataFinal completo:", reportDataFinal);

      // Construir os dados específicos para o modelo de PDF
      const reportDataForPDF = {
        ...reportDataFinal,
        dataCriacao: new Date(),
        formatoExportacao: "pdf",
      };

      try {
        // Salvar o relatório no banco de dados primeiro
        const reportId = await db.recomendacoes.add(reportDataForPDF);

        // Em vez de excluir, atualizar o status da recomendação original
        if (selectedRecommendationId) {
          try {
            // Obter a recomendação antes de atualizá-la
            const recomendacaoOriginal = await db.recomendacoes.get(
              selectedRecommendationId,
            );

            // Atualizar a recomendação com o novo status e referência ao relatório
            await db.recomendacoes.update(selectedRecommendationId, {
              status: 'converted_to_report',
              relatedReportId: reportId,
              lastModified: new Date(),
              version: (recomendacaoOriginal?.version || 0) + 1
            });

            // Importar o utilitário de histórico
            const { addHistoryEntry } = await import('../../lib/historyUtils');
            
            // Registrar a ação no histórico
            await addHistoryEntry(
              'recomendacao',
              selectedRecommendationId,
              'convert',
              `Recomendação convertida em relatório ID: ${reportId}`,
              { reportId }
            );
            
            console.log(
              `Recomendação original ${selectedRecommendationId} convertida para relatório ${reportId}`,
            );

            // Notificar o usuário
            toast({
              title: "Recomendação convertida",
              description:
                "A recomendação original foi marcada como convertida após a geração do relatório.",
              duration: 5000,
            });
          } catch (updateError) {
            console.error(
              "Erro ao atualizar status da recomendação original:",
              updateError,
            );
          }
        }

        // Depois tentar gerar o PDF
        const success = await exportRecommendationToPDF(reportDataForPDF);

        if (success) {
          toast({
            title: "Relatório gerado com sucesso",
            description:
              "O relatório foi salvo e está disponível no histórico. A recomendação original foi convertida.",
          });
        } else {
          // Se falhar o PDF, mostrar mensagem de erro mas continuar o fluxo
          toast({
            variant: "destructive",
            title: "Erro ao gerar PDF",
            description:
              "O relatório foi salvo no histórico e a recomendação original foi convertida, mas não foi possível gerar o arquivo PDF. Verifique as permissões do sistema e tente exportar novamente mais tarde.",
          });

          onSave(reportDataFinal);

          // Redirecionar para o histórico após salvar
          navigate("/history");
        }
      } catch (pdfError) {
        console.error("Erro específico ao gerar PDF:", pdfError);
        toast({
          variant: "destructive",
          title: "Erro ao gerar PDF",
          description: `Falha ao gerar o arquivo PDF: ${pdfError.message}. Verifique se você tem permissões para salvar arquivos.`,
        });
      }
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      toast({
        variant: "destructive",
        title: "Erro ao gerar relatório",
        description: "Ocorreu um erro ao gerar o relatório. Tente novamente.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Funções auxiliares para obter dados da recomendação selecionada
  const getClientAge = async (id: number) => {
    try {
      const recommendation = await db.recomendacoes.get(id);
      return recommendation?.idadeCliente || 35;
    } catch (error) {
      console.error("Erro ao obter idade do cliente:", error);
      return 35;
    }
  };

  const getInvestmentObjective = async (id: number) => {
    try {
      const recommendation = await db.recomendacoes.get(id);
      return recommendation?.objetivoInvestimento || "wealth";
    } catch (error) {
      console.error("Erro ao obter objetivo de investimento:", error);
      return "wealth";
    }
  };

  const getInvestmentValue = async (id: number) => {
    try {
      const recommendation = await db.recomendacoes.get(id);
      return recommendation?.valorInvestimento || 100000;
    } catch (error) {
      console.error("Erro ao obter valor de investimento:", error);
      return 100000;
    }
  };

  return (
    <div className="w-full h-full bg-background p-4 md:p-6 dark:bg-gray-900">
      <Card className="w-full h-full overflow-hidden flex flex-col border-blue-100 shadow-md dark:border-gray-700 dark:bg-gray-800">
        <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b dark:from-blue-900/20 dark:to-indigo-900/20 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl text-blue-800 dark:text-blue-300">
                Gerador de Relatórios
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300">
                Personalize e gere relatórios de recomendação de investimentos
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={onCancel}
                className="border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleGenerateReport}
                disabled={isGenerating}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
              >
                {isGenerating ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Gerando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Relatório
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        {recommendations.length === 0 && (
          <div className="mx-6 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md shadow-sm dark:bg-amber-900/20 dark:border-amber-800/50">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 mr-2" />
              <div>
                <p className="text-amber-800 dark:text-amber-300 text-sm font-medium">
                  Nenhuma recomendação encontrada
                </p>
                <p className="text-amber-700 dark:text-amber-400 text-xs mt-1">
                  Crie uma recomendação primeiro para gerar um relatório
                  completo com dados personalizados.
                </p>
              </div>
            </div>
          </div>
        )}

        <CardContent className="flex-1 overflow-hidden p-0">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex flex-col h-full"
          >
            <div className="px-6 border-b dark:border-gray-700">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="customize" className="flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Personalizar Relatório
                </TabsTrigger>
                <TabsTrigger value="preview" className="flex items-center">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Prévia do Relatório
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-auto">
              <TabsContent value="customize" className="h-full m-0 p-0">
                <ScrollArea className="h-[calc(100vh-12rem)] pr-4">
                <ReportCustomization
                    title={reportData.title}
                    description={reportData.description}
                    clientName={reportData.clientName}
                    includeExecutiveSummary={reportData.includeExecutiveSummary}
                    includeMarketAnalysis={reportData.includeMarketAnalysis}
                    includeAssetAllocation={reportData.includeAssetAllocation}
                    includePerformanceProjections={reportData.includePerformanceProjections}
                    includeRiskAnalysis={reportData.includeRiskAnalysis}
                    includeRecommendations={reportData.includeRecommendations}
                    reportFormat={reportData.reportFormat}
                    additionalNotes={reportData.additionalNotes}
                  recommendations={recommendations}
                    selectedRecommendation={selectedRecommendationId}
                  onRecommendationSelect={setSelectedRecommendationId}
                    onSubmit={handleCustomizationSubmit}
                />
                </ScrollArea>
              </TabsContent>

              <TabsContent value="preview" className="h-full m-0 p-0">
                <ReportPreview
                  title={reportData.title}
                  description={reportData.description}
                  clientName={reportData.clientName}
                  riskProfile={reportData.riskProfile}
                  investmentHorizon={reportData.investmentHorizon}
                  allocationStrategy={reportData.allocationStrategy}
                  assetAllocation={reportData.assetAllocation}
                  includeExecutiveSummary={reportData.includeExecutiveSummary}
                  includeMarketAnalysis={reportData.includeMarketAnalysis}
                  includeAssetAllocation={reportData.includeAssetAllocation}
                  includePerformanceProjections={
                    reportData.includePerformanceProjections
                  }
                  marketScenario={reportData.marketScenario}
                  onDownload={handleGenerateReport}
                  onPrint={() => window.print()}
                  onShare={() => {
                    toast({
                      title: "Compartilhamento",
                      description:
                        "Função de compartilhamento será implementada em breve.",
                    });
                  }}
                />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>

        <CardFooter className="border-t p-4 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex justify-between w-full items-center">
            <Button
              variant="outline"
              onClick={() => navigate("/history")}
              className="border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              <FileText className="h-4 w-4 mr-2" />
              Ver Histórico de Relatórios
            </Button>

            <Button
              variant="outline"
              onClick={handleGenerateReport}
              className="border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar como PDF
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ReportGenerator;
