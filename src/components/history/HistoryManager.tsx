import React, { useState } from 'react';
import { RecommendationHistoryTab } from '../recommendation/history/RecommendationHistoryTab';
import { motion } from 'framer-motion';
import { CalendarClock, LayoutGrid, List, BarChart3, PieChart, History, Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const HistoryManager: React.FC = () => {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [timePeriod, setTimePeriod] = useState('all');

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 10 }
  };

  return (
    <motion.div 
      className="container mx-auto py-6 space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Cabeçalho com animação */}
      <motion.div 
        className="flex flex-col space-y-1"
        variants={fadeIn}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.1 }}
      >
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
          Histórico do Sistema
        </h1>
        <p className="text-muted-foreground text-lg">
          Visualize e gerencie todo o histórico de recomendações e atividades
        </p>
      </motion.div>

      {/* Controles e filtros */}
      <motion.div 
        className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center"
        variants={fadeIn}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.2 }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex border rounded-md overflow-hidden">
            <Button 
              variant={viewMode === 'list' ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-none px-3"
            >
              <List className="h-4 w-4 mr-2" />
              Lista
            </Button>
            <Button 
              variant={viewMode === 'grid' ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-none px-3"
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              Grade
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-[180px] bg-background border">
              <CalendarClock className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo o período</SelectItem>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">Última semana</SelectItem>
              <SelectItem value="month">Último mês</SelectItem>
              <SelectItem value="quarter">Último trimestre</SelectItem>
            </SelectContent>
          </Select>

          <Select>
            <SelectTrigger className="w-[180px] bg-background border">
              <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Tipo de atividade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas atividades</SelectItem>
              <SelectItem value="recommendation">Recomendações</SelectItem>
              <SelectItem value="client">Clientes</SelectItem>
              <SelectItem value="report">Relatórios</SelectItem>
              <SelectItem value="system">Sistema</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Abas principais */}
      <motion.div 
        variants={fadeIn}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.3 }}
        className="bg-card border rounded-lg shadow-sm overflow-hidden"
      >
        <Tabs defaultValue="recommendations" className="w-full">
          <div className="border-b bg-muted/30">
            <div className="px-4">
              <TabsList className="h-14 bg-transparent gap-2">
                <TabsTrigger value="recommendations" className="data-[state=active]:bg-background rounded-none h-full">
                  <PieChart className="h-4 w-4 mr-2" />
                  Recomendações
                </TabsTrigger>
                <TabsTrigger value="activity" className="data-[state=active]:bg-background rounded-none h-full">
                  <History className="h-4 w-4 mr-2" />
                  Histórico de Atividades
                </TabsTrigger>
                <TabsTrigger value="analytics" className="data-[state=active]:bg-background rounded-none h-full">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Análise e Estatísticas
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value="recommendations" className="p-0 m-0">
            <div className="p-4">
              <RecommendationHistoryTab />
            </div>
          </TabsContent>

          <TabsContent value="activity" className="p-4 m-0">
            <div className="grid place-items-center p-8">
              <div className="text-center">
                <History className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <h3 className="text-xl font-semibold mb-2">Histórico de Atividades</h3>
                <p className="text-muted-foreground max-w-md">
                  Acompanhe todas as ações realizadas no sistema, incluindo login, modificações e operações do sistema.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="p-4 m-0">
            <div className="grid place-items-center p-8">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <h3 className="text-xl font-semibold mb-2">Análise e Estatísticas</h3>
                <p className="text-muted-foreground max-w-md">
                  Visualize métricas e estatísticas avançadas sobre as recomendações e atividades do sistema.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
};

export default HistoryManager; 