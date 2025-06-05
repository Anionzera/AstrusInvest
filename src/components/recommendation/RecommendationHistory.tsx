import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { CheckIcon, ChevronDown, FilterIcon, SortIcon, EyeIcon, ArrowUpDown, Download, CalendarIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { db, Recomendacao } from '@/lib/db';
import { getAllRecommendations } from '@/lib/historyUtils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";

// Componente para renderizar a distribuição de ativos de forma compacta
const AssetDistribution = ({ allocation }) => {
  if (!allocation || !Array.isArray(allocation) || allocation.length === 0) {
    return <span className="text-gray-500">Não disponível</span>;
  }

  // Agrupar por categorias principais (RF, RV, Alt, etc)
  const groupedAllocation = allocation.reduce((acc, asset) => {
    const category = getAssetCategory(asset.name);
    if (!acc[category]) {
      acc[category] = 0;
    }
    acc[category] += asset.allocation;
    return acc;
  }, {});

  // Converter para string (ex: 60% RF, 20% RV, 20% Alt)
  return (
    <div className="flex flex-wrap gap-1">
      {Object.entries(groupedAllocation).map(([category, percentage], idx) => (
        <Badge 
          key={idx} 
          variant="outline" 
          className={`font-medium ${getCategoryColor(category)}`}
        >
          {Math.round(percentage)}% {category}
        </Badge>
      ))}
    </div>
  );
};

// Funções auxiliares para categorias de ativos
const getAssetCategory = (assetName) => {
  const lowerName = assetName.toLowerCase();
  if (lowerName.includes('renda fixa') || lowerName.includes('tesouro') || lowerName.includes('cdb')) {
    return 'RF';
  } else if (lowerName.includes('ações') || lowerName.includes('fundo imobiliário') || lowerName.includes('renda variável')) {
    return 'RV';
  } else if (lowerName.includes('internacional') || lowerName.includes('global')) {
    return 'Int';
  } else if (lowerName.includes('alternativo') || lowerName.includes('hedge') || lowerName.includes('private')) {
    return 'Alt';
  }
  return 'Outros';
};

const getCategoryColor = (category) => {
  const colors = {
    'RF': 'bg-blue-50 text-blue-700 border-blue-200',
    'RV': 'bg-orange-50 text-orange-700 border-orange-200',
    'Int': 'bg-purple-50 text-purple-700 border-purple-200',
    'Alt': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Outros': 'bg-gray-50 text-gray-700 border-gray-200',
  };
  return colors[category] || 'bg-gray-50 text-gray-700 border-gray-200';
};

// Componente para filtragem avançada
const AdvancedFilters = ({ 
  filters, 
  setFilters, 
  isOpen, 
  setIsOpen, 
  applyFilters,
  clearFilters,
  riskProfiles,
  horizons,
  clients,
  assetClasses 
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Filtros Avançados</DialogTitle>
          <DialogDescription>
            Configure os filtros para refinar sua busca de recomendações
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-5 py-4">
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select
              value={filters.clientId}
              onValueChange={(value) => setFilters({...filters, clientId: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os clientes</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Perfil de Risco</Label>
            <div className="flex flex-wrap gap-2">
              {riskProfiles.map((profile) => (
                <Toggle
                  key={profile.id}
                  pressed={filters.riskProfiles.includes(profile.id)}
                  onPressedChange={(pressed) => {
                    if (pressed) {
                      setFilters({
                        ...filters,
                        riskProfiles: [...filters.riskProfiles, profile.id]
                      });
                    } else {
                      setFilters({
                        ...filters,
                        riskProfiles: filters.riskProfiles.filter(id => id !== profile.id)
                      });
                    }
                  }}
                  variant="outline"
                  className="text-sm"
                >
                  {profile.name}
                </Toggle>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Horizonte de Investimento</Label>
            <div className="flex flex-wrap gap-2">
              {horizons.map((horizon) => (
                <Toggle
                  key={horizon.id}
                  pressed={filters.horizons.includes(horizon.id)}
                  onPressedChange={(pressed) => {
                    if (pressed) {
                      setFilters({
                        ...filters,
                        horizons: [...filters.horizons, horizon.id]
                      });
                    } else {
                      setFilters({
                        ...filters,
                        horizons: filters.horizons.filter(id => id !== horizon.id)
                      });
                    }
                  }}
                  variant="outline"
                  className="text-sm"
                >
                  {horizon.name}
                </Toggle>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Valor Recomendado (R$)</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  type="number"
                  placeholder="Valor mínimo"
                  value={filters.minValue}
                  onChange={(e) => setFilters({...filters, minValue: e.target.value})}
                />
              </div>
              <div>
                <Input
                  type="number"
                  placeholder="Valor máximo"
                  value={filters.maxValue}
                  onChange={(e) => setFilters({...filters, maxValue: e.target.value})}
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Data da Recomendação</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      {filters.dateFrom ? (
                        format(filters.dateFrom, "dd/MM/yyyy")
                      ) : (
                        <span className="text-muted-foreground">Data inicial</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateFrom}
                      onSelect={(date) => setFilters({...filters, dateFrom: date})}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      {filters.dateTo ? (
                        format(filters.dateTo, "dd/MM/yyyy")
                      ) : (
                        <span className="text-muted-foreground">Data final</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateTo}
                      onSelect={(date) => setFilters({...filters, dateTo: date})}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between">
          <Button variant="outline" onClick={clearFilters}>
            Limpar Filtros
          </Button>
          <Button onClick={() => {
            applyFilters();
            setIsOpen(false);
          }}>
            Aplicar Filtros
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const RecommendationHistory = () => {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState([]);
  const [filteredRecommendations, setFilteredRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({
    key: 'dataCriacao',
    direction: 'desc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para filtros avançados
  const [filters, setFilters] = useState({
    clientId: '',
    riskProfiles: [],
    horizons: [],
    assetClasses: [],
    minValue: '',
    maxValue: '',
    dateFrom: null,
    dateTo: null
  });

  // Dados para os filtros de seleção
  const riskProfiles = [
    { id: 'conservador', name: 'Conservador' },
    { id: 'moderado', name: 'Moderado' },
    { id: 'agressivo', name: 'Agressivo' },
    { id: 'arrojado', name: 'Arrojado' }
  ];
  
  const horizons = [
    { id: 'curto', name: 'Curto (1-2 anos)' },
    { id: 'medio', name: 'Médio (3-5 anos)' },
    { id: 'longo', name: 'Longo (6+ anos)' }
  ];
  
  const [clients, setClients] = useState([]);
  const [assetClasses, setAssetClasses] = useState([]);

  // Carregar dados
  useEffect(() => {
    fetchData();
  }, []);

  // Aplicar filtros e ordenação quando mudarem
  useEffect(() => {
    applyFiltersAndSort();
  }, [recommendations, searchTerm, sortConfig]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Buscar recomendações
      const recsData = await getAllRecommendations();
      setRecommendations(recsData);
      
      // Extrair clientes únicos das recomendações
      const uniqueClients = Array.from(
        new Set(
          recsData
            .filter(rec => rec.conteudo?.clienteData?.name)
            .map(rec => JSON.stringify({
              id: rec.clienteId,
              name: rec.conteudo.clienteData.name
            }))
        )
      ).map(clientStr => JSON.parse(clientStr));
      setClients(uniqueClients);
      
      // Extrair classes de ativos únicos
      const allAssetClasses = new Set();
      recsData.forEach(rec => {
        if (rec.conteudo?.alocacao && Array.isArray(rec.conteudo.alocacao)) {
          rec.conteudo.alocacao.forEach(asset => {
            if (asset.name) {
              allAssetClasses.add(asset.name);
            }
          });
        }
      });
      setAssetClasses(Array.from(allAssetClasses).map(name => ({ id: name, name })));
      
      setFilteredRecommendations(recsData);
    } catch (error) {
      console.error("Erro ao carregar recomendações:", error);
    } finally {
      setLoading(false);
    }
  };

  // Função para aplicar filtros de pesquisa e ordenação
  const applyFiltersAndSort = () => {
    let result = [...recommendations];
    
    // Aplicar filtro de busca simples
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      result = result.filter(rec => 
        rec.titulo?.toLowerCase().includes(lowerSearchTerm) ||
        rec.conteudo?.clienteData?.name?.toLowerCase().includes(lowerSearchTerm) ||
        rec.conteudo?.perfilRisco?.profile?.toLowerCase().includes(lowerSearchTerm)
      );
    }
    
    // Aplicar ordenação
    result.sort((a, b) => {
      const valueA = getValueByKey(a, sortConfig.key);
      const valueB = getValueByKey(b, sortConfig.key);
      
      if (valueA < valueB) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    
    setFilteredRecommendations(result);
    // Resetar para a primeira página após filtrar
    setCurrentPage(1);
  };

  // Função para aplicar filtros avançados
  const applyAdvancedFilters = () => {
    let result = [...recommendations];
    
    // Filtrar por cliente
    if (filters.clientId) {
      result = result.filter(rec => rec.clienteId === filters.clientId);
    }
    
    // Filtrar por perfil de risco
    if (filters.riskProfiles.length > 0) {
      result = result.filter(rec => 
        filters.riskProfiles.includes(rec.conteudo?.perfilRisco?.profile)
      );
    }
    
    // Filtrar por horizonte
    if (filters.horizons.length > 0) {
      result = result.filter(rec => {
        const years = rec.conteudo?.horizonte?.years || 0;
        return filters.horizons.some(horizon => {
          if (horizon === 'curto') return years <= 2;
          if (horizon === 'medio') return years > 2 && years <= 5;
          if (horizon === 'longo') return years > 5;
          return false;
        });
      });
    }
    
    // Filtrar por valor
    if (filters.minValue) {
      const minValue = parseFloat(filters.minValue);
      result = result.filter(rec => (rec.conteudo?.horizonte?.amount || 0) >= minValue);
    }
    
    if (filters.maxValue) {
      const maxValue = parseFloat(filters.maxValue);
      result = result.filter(rec => (rec.conteudo?.horizonte?.amount || 0) <= maxValue);
    }
    
    // Filtrar por data
    if (filters.dateFrom) {
      result = result.filter(rec => new Date(rec.dataCriacao) >= filters.dateFrom);
    }
    
    if (filters.dateTo) {
      // Ajustar para incluir todo o dia final
      const endDate = new Date(filters.dateTo);
      endDate.setHours(23, 59, 59, 999);
      result = result.filter(rec => new Date(rec.dataCriacao) <= endDate);
    }
    
    // Aplicar também o filtro de busca
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      result = result.filter(rec => 
        rec.titulo?.toLowerCase().includes(lowerSearchTerm) ||
        rec.conteudo?.clienteData?.name?.toLowerCase().includes(lowerSearchTerm) ||
        rec.conteudo?.perfilRisco?.profile?.toLowerCase().includes(lowerSearchTerm)
      );
    }
    
    // Ordenar resultados
    result.sort((a, b) => {
      const valueA = getValueByKey(a, sortConfig.key);
      const valueB = getValueByKey(b, sortConfig.key);
      
      if (valueA < valueB) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    
    setFilteredRecommendations(result);
    setCurrentPage(1); // Voltar para a primeira página
  };

  // Função para limpar todos os filtros
  const clearFilters = () => {
    setFilters({
      clientId: '',
      riskProfiles: [],
      horizons: [],
      assetClasses: [],
      minValue: '',
      maxValue: '',
      dateFrom: null,
      dateTo: null
    });
    setSearchTerm('');
  };

  // Função auxiliar para obter valor de um campo aninhado
  const getValueByKey = (obj, key) => {
    switch (key) {
      case 'dataCriacao':
        return new Date(obj.dataCriacao);
      case 'cliente':
        return obj.conteudo?.clienteData?.name || '';
      case 'perfilRisco':
        return obj.conteudo?.perfilRisco?.profile || '';
      case 'horizonte':
        return obj.conteudo?.horizonte?.years || 0;
      case 'valor':
        return obj.conteudo?.horizonte?.amount || 0;
      case 'retornoBase':
        return obj.conteudo?.projecoes?.baseline || 0;
      default:
        return obj[key] || '';
    }
  };

  // Função para alterar ordenação
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Cálculos para paginação
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRecommendations = filteredRecommendations.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredRecommendations.length / itemsPerPage);

  // Função para formatar valores monetários
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função para formatar percentuais
  const formatPercentage = (value) => {
    return `${value.toFixed(2)}%`;
  };

  // Função para navegar para os detalhes
  const handleViewDetails = (id) => {
    navigate(`/recommendations/${id}/details`);
  };

  // Renderizar o componente
  return (
    <Card className="w-full shadow-lg border-border/60 bg-card">
      <CardHeader className="pb-2 border-b border-b-border/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Histórico de Recomendações
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-1">
              Gerencie todas as recomendações salvas no sistema
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowFilters(true)}
              className="flex items-center gap-2"
            >
              <FilterIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Filtros Avançados</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6 space-y-6">
        {/* Barra de filtros rápidos */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative flex-1">
            <Input
              placeholder="Buscar por cliente ou título..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background"
            />
            <ChevronDown className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground pointer-events-none" />
          </div>
          
          <div className="flex gap-2">
            <Select value={String(itemsPerPage)} onValueChange={(value) => setItemsPerPage(Number(value))}>
              <SelectTrigger className="w-[115px]">
                <SelectValue placeholder="10 por página" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 por página</SelectItem>
                <SelectItem value="10">10 por página</SelectItem>
                <SelectItem value="20">20 por página</SelectItem>
                <SelectItem value="50">50 por página</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Tabela de recomendações */}
        <div className="rounded-md border border-border/80">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[125px]">
                  <div 
                    className="flex items-center cursor-pointer"
                    onClick={() => requestSort('dataCriacao')}
                  >
                    Data
                    <ArrowUpDown className={cn(
                      "ml-1 h-4 w-4",
                      sortConfig.key === 'dataCriacao' ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                </TableHead>
                <TableHead>
                  <div 
                    className="flex items-center cursor-pointer"
                    onClick={() => requestSort('cliente')}
                  >
                    Cliente
                    <ArrowUpDown className={cn(
                      "ml-1 h-4 w-4",
                      sortConfig.key === 'cliente' ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                </TableHead>
                <TableHead>
                  <div 
                    className="flex items-center cursor-pointer"
                    onClick={() => requestSort('perfilRisco')}
                  >
                    Perfil de Risco
                    <ArrowUpDown className={cn(
                      "ml-1 h-4 w-4",
                      sortConfig.key === 'perfilRisco' ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                </TableHead>
                <TableHead>
                  <div 
                    className="flex items-center cursor-pointer"
                    onClick={() => requestSort('horizonte')}
                  >
                    Horizonte
                    <ArrowUpDown className={cn(
                      "ml-1 h-4 w-4",
                      sortConfig.key === 'horizonte' ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                </TableHead>
                <TableHead className="text-right">
                  <div 
                    className="flex items-center justify-end cursor-pointer"
                    onClick={() => requestSort('valor')}
                  >
                    Valor
                    <ArrowUpDown className={cn(
                      "ml-1 h-4 w-4",
                      sortConfig.key === 'valor' ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                </TableHead>
                <TableHead>
                  <div>Alocação</div>
                </TableHead>
                <TableHead className="text-right">
                  <div 
                    className="flex items-center justify-end cursor-pointer"
                    onClick={() => requestSort('retornoBase')}
                  >
                    Retorno Base
                    <ArrowUpDown className={cn(
                      "ml-1 h-4 w-4",
                      sortConfig.key === 'retornoBase' ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                </TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <div className="flex justify-center items-center h-24">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : currentRecommendations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center h-24">
                      <p className="text-muted-foreground text-sm">
                        Nenhuma recomendação encontrada
                      </p>
                      <Button 
                        variant="link" 
                        onClick={clearFilters}
                        className="text-primary text-sm mt-1"
                      >
                        Limpar filtros
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                currentRecommendations.map((rec) => (
                  <TableRow 
                    key={rec.id}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => handleViewDetails(rec.id)}
                  >
                    <TableCell className="font-medium whitespace-nowrap">
                      {format(new Date(rec.dataCriacao), 'dd/MM/yyyy', {locale: ptBR})}
                    </TableCell>
                    <TableCell>
                      {rec.conteudo?.clienteData?.name || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        "font-medium",
                        rec.conteudo?.perfilRisco?.profile === 'conservador' && "bg-blue-50 text-blue-700 border-blue-200",
                        rec.conteudo?.perfilRisco?.profile === 'moderado' && "bg-yellow-50 text-yellow-700 border-yellow-200",
                        rec.conteudo?.perfilRisco?.profile === 'agressivo' && "bg-red-50 text-red-700 border-red-200",
                        rec.conteudo?.perfilRisco?.profile === 'arrojado' && "bg-orange-50 text-orange-700 border-orange-200"
                      )}>
                        {rec.conteudo?.perfilRisco?.profile || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {rec.conteudo?.horizonte?.years ? `${rec.conteudo.horizonte.years} anos` : "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {rec.conteudo?.horizonte?.amount 
                        ? formatCurrency(rec.conteudo.horizonte.amount) 
                        : "—"
                      }
                    </TableCell>
                    <TableCell>
                      <AssetDistribution allocation={rec.conteudo?.alocacao} />
                    </TableCell>
                    <TableCell className="text-right">
                      {rec.conteudo?.projecoes?.baseline 
                        ? formatPercentage(rec.conteudo.projecoes.baseline) 
                        : "—"
                      }
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation(); // Evitar que a linha seja clicada
                          handleViewDetails(rec.id);
                        }}
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Paginação */}
        {filteredRecommendations.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Mostrando {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredRecommendations.length)} de {filteredRecommendations.length} recomendações
            </p>
            
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  />
                </PaginationItem>
                
                {/* Renderização inteligente de números de página */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => 
                    page === 1 || 
                    page === totalPages || 
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  )
                  .map((page, index, array) => {
                    // Adicionar elipses quando necessário
                    if (index > 0 && array[index - 1] !== page - 1) {
                      return (
                        <React.Fragment key={`ellipsis-${page}`}>
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                          <PaginationItem>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={page === currentPage}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        </React.Fragment>
                      );
                    }
                    
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => setCurrentPage(page)}
                          isActive={page === currentPage}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })
                }
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </CardContent>
      
      {/* Filtros avançados em Dialog */}
      <AdvancedFilters
        filters={filters}
        setFilters={setFilters}
        isOpen={showFilters}
        setIsOpen={setShowFilters}
        applyFilters={applyAdvancedFilters}
        clearFilters={clearFilters}
        riskProfiles={riskProfiles}
        horizons={horizons}
        clients={clients}
        assetClasses={assetClasses}
      />
    </Card>
  );
};

export default RecommendationHistory; 