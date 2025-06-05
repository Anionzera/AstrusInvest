import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, Download, RefreshCw, Filter, SlidersHorizontal, Calendar, ChevronDown
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RecommendationTable } from './RecommendationTable';
import { getAllRecommendations, getAllReports } from "@/lib/historyUtils";
import { DateRange } from "react-day-picker";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from "@/components/ui/badge";

const riskProfileOptions = [
  { value: "conservador", label: "Conservador" },
  { value: "moderado", label: "Moderado" },
  { value: "agressivo", label: "Agressivo" }
];

const horizonOptions = [
  { value: "curto", label: "Curto (1-2 anos)" },
  { value: "medio", label: "Médio (3-5 anos)" },
  { value: "longo", label: "Longo (6+ anos)" }
];

const RecommendationHistoryTab = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedRiskProfiles, setSelectedRiskProfiles] = useState<string[]>([]);
  const [selectedHorizons, setSelectedHorizons] = useState<string[]>([]);
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('recommendations');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Atualiza os filtros ativos para exibição das badges
    const newActiveFilters = [];
    
    if (dateRange?.from) {
      newActiveFilters.push('data');
    }
    
    if (selectedRiskProfiles.length > 0) {
      newActiveFilters.push('perfil');
    }
    
    if (selectedHorizons.length > 0) {
      newActiveFilters.push('horizonte');
    }
    
    if (minValue || maxValue) {
      newActiveFilters.push('valor');
    }
    
    if (searchTerm) {
      newActiveFilters.push('busca');
    }
    
    setActiveFilters(newActiveFilters);
  }, [dateRange, selectedRiskProfiles, selectedHorizons, minValue, maxValue, searchTerm]);

  const loadData = async () => {
    setLoading(true);
    try {
      const recsData = await getAllRecommendations();
      setRecommendations(recsData);
      
      const reportsData = await getAllReports();
      setReports(reportsData);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecommendations = recommendations
    .filter(rec => {
      // Filtrar por termo de busca
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (
          !rec.titulo?.toLowerCase().includes(term) && 
          !rec.conteudo?.clienteData?.name?.toLowerCase().includes(term) &&
          !rec.conteudo?.perfilRisco?.profile?.toLowerCase().includes(term)
        ) {
          return false;
        }
      }
      
      // Filtrar por data
      if (dateRange?.from) {
        const recDate = new Date(rec.dataCriacao);
        if (dateRange.from && recDate < dateRange.from) return false;
        if (dateRange.to && recDate > dateRange.to) return false;
      }
      
      // Filtrar por perfil de risco
      if (selectedRiskProfiles.length > 0) {
        if (!selectedRiskProfiles.includes(rec.conteudo?.perfilRisco?.profile)) {
          return false;
        }
      }
      
      // Filtrar por horizonte de investimento
      if (selectedHorizons.length > 0) {
        const years = rec.conteudo?.horizonte?.years || 0;
        const horizon = years <= 2 ? 'curto' : years <= 5 ? 'medio' : 'longo';
        if (!selectedHorizons.includes(horizon)) {
          return false;
        }
      }
      
      // Filtrar por valor
      const value = rec.conteudo?.horizonte?.amount || 0;
      if (minValue && value < parseFloat(minValue)) return false;
      if (maxValue && value > parseFloat(maxValue)) return false;
      
      return true;
    });

  const handleRiskProfileChange = (value: string) => {
    setSelectedRiskProfiles(prev => {
      if (prev.includes(value)) {
        return prev.filter(p => p !== value);
      } else {
        return [...prev, value];
      }
    });
  };

  const handleHorizonChange = (value: string) => {
    setSelectedHorizons(prev => {
      if (prev.includes(value)) {
        return prev.filter(h => h !== value);
      } else {
        return [...prev, value];
      }
    });
  };

  const resetFilters = () => {
    setSearchTerm('');
    setDateRange(undefined);
    setSelectedRiskProfiles([]);
    setSelectedHorizons([]);
    setMinValue('');
    setMaxValue('');
    setShowFilters(false);
  };

  const handleExportToExcel = () => {
    // Implementar lógica de exportação para Excel
  };
  
  const formattedDateRange = dateRange?.from
    ? `${format(dateRange.from, 'dd/MM/yyyy')}${
        dateRange.to ? ` - ${format(dateRange.to, 'dd/MM/yyyy')}` : ''
      }`
    : 'Selecionar período';

  return (
    <Card className="w-full border border-border/40 shadow-sm">
      <CardHeader className="bg-muted/30 border-b border-border/40 pb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Histórico de Recomendações
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-1">
              Acompanhe todas as recomendações realizadas e análise seus resultados
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2 self-end md:self-auto">
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            
            <Button variant="outline" size="sm" onClick={handleExportToExcel}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
        
        <div className="mt-6 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por cliente, perfil ou título..." 
              className="pl-10 bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap gap-2 items-center">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-10">
                  <Calendar className="h-4 w-4 mr-2" />
                  {formattedDateRange}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Filtrar por período</DialogTitle>
                </DialogHeader>
                <div className="p-4">
                  <CalendarComponent
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    locale={ptBR}
                    className="rounded border p-3"
                  />
                </div>
              </DialogContent>
            </Dialog>
            
            <Sheet open={showFilters} onOpenChange={setShowFilters}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-10">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filtros avançados
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filtros avançados</SheetTitle>
                  <SheetDescription>
                    Refine a lista com parâmetros específicos
                  </SheetDescription>
                </SheetHeader>
                
                <div className="py-6 space-y-6">
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium">Perfil de Risco</h3>
                    <div className="space-y-2">
                      {riskProfileOptions.map(option => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`risk-${option.value}`} 
                            checked={selectedRiskProfiles.includes(option.value)}
                            onCheckedChange={() => handleRiskProfileChange(option.value)}
                          />
                          <Label htmlFor={`risk-${option.value}`}>{option.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium">Horizonte Temporal</h3>
                    <div className="space-y-2">
                      {horizonOptions.map(option => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`horizon-${option.value}`} 
                            checked={selectedHorizons.includes(option.value)}
                            onCheckedChange={() => handleHorizonChange(option.value)}
                          />
                          <Label htmlFor={`horizon-${option.value}`}>{option.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium">Valor Recomendado</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="min-value">Valor Mínimo (R$)</Label>
                        <Input 
                          id="min-value" 
                          placeholder="0,00" 
                          value={minValue}
                          onChange={(e) => setMinValue(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="max-value">Valor Máximo (R$)</Label>
                        <Input 
                          id="max-value" 
                          placeholder="1.000.000,00" 
                          value={maxValue}
                          onChange={(e) => setMaxValue(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4 flex justify-between">
                    <Button variant="outline" onClick={resetFilters}>
                      Limpar filtros
                    </Button>
                    <Button onClick={() => setShowFilters(false)}>
                      Aplicar filtros
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        
        {activeFilters.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {activeFilters.map(filter => (
              <Badge key={filter} variant="secondary" className="flex items-center gap-1">
                {filter === 'data' && 'Período'}
                {filter === 'perfil' && 'Perfil de Risco'}
                {filter === 'horizonte' && 'Horizonte'}
                {filter === 'valor' && 'Valor'}
                {filter === 'busca' && 'Busca'}
              </Badge>
            ))}
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 text-xs" 
              onClick={resetFilters}
            >
              Limpar todos
            </Button>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="p-0">
        <Tabs defaultValue="recommendations" value={activeTab} onValueChange={setActiveTab}>
          <div className="px-6 py-3 border-b border-border/40">
            <TabsList>
              <TabsTrigger value="recommendations" className="px-4 py-2">
                Recomendações
              </TabsTrigger>
              <TabsTrigger value="reports" className="px-4 py-2">
                Relatórios
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="recommendations" className="p-0 focus-visible:outline-none focus-visible:ring-0">
            <RecommendationTable 
              recommendations={filteredRecommendations} 
              loading={loading} 
            />
          </TabsContent>
          
          <TabsContent value="reports" className="p-0 focus-visible:outline-none focus-visible:ring-0">
            <div className="py-10 text-center text-muted-foreground">
              Módulo de relatórios em desenvolvimento
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default RecommendationHistoryTab; 