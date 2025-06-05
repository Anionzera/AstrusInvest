import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RecommendationHistoryTable } from './RecommendationHistoryTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  PlusCircle, 
  ClipboardList, 
  Clock, 
  BarChart,
  PieChart,
  TrendingUp,
  UserSquare2,
  CalendarRange,
  ListFilter,
  CheckSquare,
  Layers,
  TrendingDown
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getRecommendationHistory, deleteRecommendationById } from '@/utils/historyUtils';
import { Progress } from '@/components/ui/progress';

export const RecommendationHistoryTab: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recommendationToDelete, setRecommendationToDelete] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    implemented: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    expired: 0,
    commonRiskProfile: '-',
    averageAmount: 0
  });
  const [displayMode, setDisplayMode] = useState<'table' | 'grid'>('table');
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar recomendações e estatísticas
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const history = await getRecommendationHistory();
        
        if (history && Array.isArray(history)) {
          setRecommendations(history);
          
          // Calcular estatísticas
          const total = history.length;
          const implemented = history.filter(r => r.status === 'implemented').length;
          const pending = history.filter(r => r.status === 'pending').length;
          const approved = history.filter(r => r.status === 'approved').length;
          const rejected = history.filter(r => r.status === 'rejected').length;
          const expired = history.filter(r => r.status === 'expired').length;
          
          // Encontrar o perfil de risco mais comum
          const riskProfiles = history
            .map(r => r.riskProfile)
            .filter(Boolean)
            .reduce<Record<string, number>>((acc, profile) => {
              if (profile) {
                acc[profile] = (acc[profile] || 0) + 1;
              }
              return acc;
            }, {});
            
          const commonRiskProfile = Object.entries(riskProfiles).length > 0 
            ? Object.entries(riskProfiles).sort((a, b) => b[1] - a[1])[0][0] 
            : '-';
          
          // Calcular valor médio
          const amounts = history
            .map(r => r.investmentAmount)
            .filter((amount): amount is number => amount !== undefined && amount !== null);
          const averageAmount = amounts.length 
            ? amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length
            : 0;
            
          setStats({
            total,
            implemented,
            pending,
            approved,
            rejected,
            expired,
            commonRiskProfile,
            averageAmount
          });
        }
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Manipular criação de nova recomendação
  const handleCreateNew = () => {
    navigate('/recommendation/new');
  };

  // Manipular edição de recomendação
  const handleEdit = (id: string) => {
    navigate(`/recommendation/${id}`);
  };

  // Abrir diálogo de confirmação de exclusão
  const handleRequestDelete = (id: string) => {
    setRecommendationToDelete(id);
    setDeleteDialogOpen(true);
  };

  // Confirmar exclusão de recomendação
  const handleConfirmDelete = async () => {
    if (!recommendationToDelete) return;
    
    try {
      await deleteRecommendationById(recommendationToDelete);
      
      toast({
        title: "Recomendação excluída",
        description: "A recomendação foi removida com sucesso",
        variant: "default",
      });
      
      // Atualizar localmente (melhor que recarregar a página)
      setRecommendations(prev => prev.filter(r => r.id !== recommendationToDelete));
      
      // Atualizar estatísticas
      const deletedRec = recommendations.find(r => r.id === recommendationToDelete);
      if (deletedRec && deletedRec.status) {
        const statusKey = deletedRec.status as keyof typeof stats;
        if (typeof stats[statusKey] === 'number') {
          setStats(prev => ({
            ...prev,
            total: prev.total - 1,
            [statusKey]: (prev[statusKey] as number) - 1
          }));
        }
      }
    } catch (error) {
      console.error('Erro ao excluir recomendação:', error);
      
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir a recomendação. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setRecommendationToDelete(null);
    }
  };

  // Cancelar exclusão
  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setRecommendationToDelete(null);
  };

  // Formatar valor monetário
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="text-2xl font-bold tracking-tight">Histórico de Recomendações</h2>
          <p className="text-muted-foreground">
            Gerencie e acompanhe todas as recomendações de investimento
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Button onClick={handleCreateNew} size="default" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova Recomendação
          </Button>
        </motion.div>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList className="bg-muted/60 border">
            <TabsTrigger value="all">
              <ClipboardList className="mr-2 h-4 w-4" />
              Todas
            </TabsTrigger>
            <TabsTrigger value="recent">
              <Clock className="mr-2 h-4 w-4" />
              Recentes
            </TabsTrigger>
            <TabsTrigger value="stats">
              <BarChart className="mr-2 h-4 w-4" />
              Estatísticas
            </TabsTrigger>
          </TabsList>
          
          {/* Opção de alternar entre tabela e grid diretamente nas abas de dados */}
          {activeTab !== 'stats' && (
            <div className="flex border rounded-md overflow-hidden mr-2">
              <Button 
                variant={displayMode === 'table' ? "default" : "ghost"}
                size="sm"
                onClick={() => setDisplayMode('table')}
                className="rounded-none px-3"
              >
                <ListFilter className="h-4 w-4" />
              </Button>
              <Button 
                variant={displayMode === 'grid' ? "default" : "ghost"}
                size="sm"
                onClick={() => setDisplayMode('grid')}
                className="rounded-none px-3"
              >
                <Layers className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        
        <TabsContent value="all" className="space-y-4 m-0">
          <RecommendationHistoryTable 
            onEdit={handleEdit}
            onDelete={handleRequestDelete}
            displayMode={displayMode}
          />
        </TabsContent>
        
        <TabsContent value="recent" className="space-y-4 m-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5 text-blue-500" />
                Recomendações Recentes
              </CardTitle>
              <CardDescription>
                Recomendações criadas ou modificadas nos últimos 30 dias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RecommendationHistoryTable 
                onEdit={handleEdit}
                onDelete={handleRequestDelete}
                displayMode={displayMode}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="stats" className="m-0">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart className="mr-2 h-5 w-5 text-blue-500" />
                  Estatísticas
                </CardTitle>
                <CardDescription>
                  Visão geral das recomendações e métricas de desempenho
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  {/* Métricas principais */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="overflow-hidden border-t-4 border-t-blue-500">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-medium flex items-center">
                          <Layers className="h-4 w-4 mr-2 text-blue-500" />
                          Total de Recomendações
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Todas as recomendações no sistema
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card className="overflow-hidden border-t-4 border-t-green-500">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-medium flex items-center">
                          <CheckSquare className="h-4 w-4 mr-2 text-green-500" />
                          Implementadas
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold">{stats.implemented}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {stats.total ? `${Math.round((stats.implemented / stats.total) * 100)}% do total` : '0% do total'}
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card className="overflow-hidden border-t-4 border-t-indigo-500">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-medium flex items-center">
                          <UserSquare2 className="h-4 w-4 mr-2 text-indigo-500" />
                          Perfil Mais Comum
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold">{stats.commonRiskProfile}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Perfil de risco mais frequente
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card className="overflow-hidden border-t-4 border-t-amber-500">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-medium flex items-center">
                          <TrendingUp className="h-4 w-4 mr-2 text-amber-500" />
                          Valor Médio
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold">
                          {formatCurrency(stats.averageAmount)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Valor médio por recomendação
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Status breakdown */}
                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-md font-medium flex items-center">
                        <PieChart className="h-4 w-4 mr-2 text-blue-500" />
                        Distribuição por Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-4">
                        {/* Barras de progresso com estilos Tailwind */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="w-3 h-3 rounded-full bg-yellow-400 mr-2"></div>
                              <span className="text-sm">Pendentes</span>
                            </div>
                            <span className="text-sm font-medium">{stats.pending}</span>
                          </div>
                          <div className="h-2 w-full bg-yellow-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-yellow-400 rounded-full transition-all duration-500 ease-in-out" 
                              style={{ width: `${stats.total ? (stats.pending / stats.total) * 100 : 0}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="w-3 h-3 rounded-full bg-green-400 mr-2"></div>
                              <span className="text-sm">Aprovadas</span>
                            </div>
                            <span className="text-sm font-medium">{stats.approved}</span>
                          </div>
                          <div className="h-2 w-full bg-green-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-400 rounded-full transition-all duration-500 ease-in-out" 
                              style={{ width: `${stats.total ? (stats.approved / stats.total) * 100 : 0}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="w-3 h-3 rounded-full bg-blue-400 mr-2"></div>
                              <span className="text-sm">Implementadas</span>
                            </div>
                            <span className="text-sm font-medium">{stats.implemented}</span>
                          </div>
                          <div className="h-2 w-full bg-blue-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-400 rounded-full transition-all duration-500 ease-in-out" 
                              style={{ width: `${stats.total ? (stats.implemented / stats.total) * 100 : 0}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="w-3 h-3 rounded-full bg-red-400 mr-2"></div>
                              <span className="text-sm">Rejeitadas</span>
                            </div>
                            <span className="text-sm font-medium">{stats.rejected}</span>
                          </div>
                          <div className="h-2 w-full bg-red-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-red-400 rounded-full transition-all duration-500 ease-in-out" 
                              style={{ width: `${stats.total ? (stats.rejected / stats.total) * 100 : 0}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="w-3 h-3 rounded-full bg-gray-400 mr-2"></div>
                              <span className="text-sm">Expiradas</span>
                            </div>
                            <span className="text-sm font-medium">{stats.expired}</span>
                          </div>
                          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gray-400 rounded-full transition-all duration-500 ease-in-out" 
                              style={{ width: `${stats.total ? (stats.expired / stats.total) * 100 : 0}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Placeholder para um gráfico futuro */}
                  <Card className="overflow-hidden">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-md font-medium flex items-center">
                        <CalendarRange className="h-4 w-4 mr-2 text-blue-500" />
                        Tendência de Recomendações
                      </CardTitle>
                      <CardDescription>
                        Evolução histórica das recomendações
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="w-full h-[200px] rounded-md bg-muted/40 flex items-center justify-center">
                        <div className="text-center px-4 py-5">
                          <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Estatísticas de tendência serão exibidas aqui em breve
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir recomendação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isto removerá permanentemente a recomendação
              e todos os dados associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}; 