import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  ChevronUp, 
  MoreHorizontal, 
  FileDown, 
  Search, 
  Filter, 
  Eye, 
  FileEdit, 
  Trash2, 
  Calendar,
  User,
  Tag,
  DollarSign,
  Clock,
  LayoutGrid,
  List,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { getRecommendationHistory } from '@/utils/historyUtils';
import { exportToCSV } from '@/utils/exportUtils';

interface RecommendationHistoryTableProps {
  onViewDetails?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  displayMode?: 'table' | 'grid';
}

export const RecommendationHistoryTable: React.FC<RecommendationHistoryTableProps> = ({
  onViewDetails,
  onEdit,
  onDelete,
  displayMode = 'table'
}) => {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [filteredRecommendations, setFilteredRecommendations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [view, setView] = useState<'table' | 'grid'>(displayMode);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' }>({
    key: 'date',
    direction: 'descending'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Carregar histórico de recomendações
  useEffect(() => {
    const loadRecommendations = async () => {
      try {
        setIsLoading(true);
        const history = await getRecommendationHistory();
        
        if (history && Array.isArray(history)) {
          setRecommendations(history);
          setFilteredRecommendations(history);
        } else {
          console.error('Histórico inválido:', history);
          setRecommendations([]);
          setFilteredRecommendations([]);
        }
      } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        setRecommendations([]);
        setFilteredRecommendations([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadRecommendations();
  }, []);

  // Atualizar a visualização quando o prop displayMode mudar
  useEffect(() => {
    setView(displayMode);
  }, [displayMode]);

  // Aplicar filtros e ordenação
  useEffect(() => {
    let result = [...recommendations];

    // Aplicar filtro de status
    if (statusFilter !== 'all') {
      result = result.filter(rec => rec.status === statusFilter);
    }

    // Aplicar busca
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(rec => 
        (rec.clientName?.toLowerCase().includes(query)) || 
        (rec.title?.toLowerCase().includes(query)) ||
        (rec.id?.toLowerCase().includes(query))
      );
    }

    // Aplicar ordenação
    if (sortConfig.key) {
      result.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    setFilteredRecommendations(result);
    // Reset para página 1 quando filtros mudarem
    setCurrentPage(1);
  }, [recommendations, searchQuery, statusFilter, sortConfig]);

  // Paginação
  const totalPages = Math.ceil(filteredRecommendations.length / itemsPerPage);
  const currentItems = filteredRecommendations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Alternar ordenação
  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === 'ascending' ? 'descending' : 'ascending'
        };
      }
      return { key, direction: 'ascending' };
    });
  };

  // Renderizar ícone de ordenação
  const renderSortIcon = (key: string) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? 
      <ChevronUp className="ml-1 h-4 w-4" /> : 
      <ChevronDown className="ml-1 h-4 w-4" />;
  };

  // Exportar para CSV
  const handleExportCSV = () => {
    const dataToExport = filteredRecommendations.map(rec => ({
      'ID': rec.id,
      'Cliente': rec.clientName,
      'Título': rec.title,
      'Data': rec.date ? format(new Date(rec.date), 'dd/MM/yyyy') : '',
      'Status': getStatusLabel(rec.status),
      'Perfil de Risco': rec.riskProfile,
      'Valor': rec.investmentAmount ? 
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
          .format(rec.investmentAmount) : '',
      'Horizonte': rec.investmentHorizon,
      'Criado por': rec.createdBy,
    }));

    exportToCSV(dataToExport, `recomendacoes_${format(new Date(), 'dd-MM-yyyy')}`);
  };

  // Obter label de status
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
    
    switch (status) {
      case 'pending':
        variant = 'outline';
        break;
      case 'approved':
        variant = 'default';
        break;
      case 'rejected':
        variant = 'destructive';
        break;
      case 'implemented':
        variant = 'secondary';
        break;
      case 'expired':
        variant = 'outline';
        break;
    }
    
    return <Badge variant={variant}>{getStatusLabel(status)}</Badge>;
  };

  // Manipular visualização de detalhes
  const handleViewDetails = (id: string) => {
    if (onViewDetails) {
      onViewDetails(id);
    } else {
      navigate(`/recommendation/${id}`);
    }
  };
  
  // Obter cor baseada no status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'border-yellow-400';
      case 'approved': return 'border-green-400';
      case 'rejected': return 'border-red-400';
      case 'implemented': return 'border-blue-400';
      case 'expired': return 'border-gray-400';
      default: return 'border-gray-300';
    }
  };

  // Manipular visualização de detalhes do cliente
  const handleViewClient = (clientId: string) => {
    if (clientId) {
      navigate(`/clients/${clientId}`);
    }
  };

  // Renderizar carregamento
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-6">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-10 w-1/4" />
          </div>
          
          {view === 'table' ? (
            <div className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                      <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                      <TableHead><Skeleton className="h-4 w-32" /></TableHead>
                      <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                      <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array(5).fill(null).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array(6).fill(null).map((_, index) => (
                <Card key={index} className="overflow-hidden">
                  <div className="p-6">
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-4" />
                    <div className="flex gap-2 mb-4">
                      <Skeleton className="h-6 w-16" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-4/5" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Renderizar mensagem de lista vazia
  if (filteredRecommendations.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-4 justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, título ou ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-[150px]">
                  <Filter className="mr-1 h-4 w-4" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="approved">Aprovada</SelectItem>
                  <SelectItem value="rejected">Rejeitada</SelectItem>
                  <SelectItem value="implemented">Implementada</SelectItem>
                  <SelectItem value="expired">Expirada</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex border rounded-md overflow-hidden">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`rounded-none px-3 ${view === 'table' ? 'bg-muted' : ''}`} 
                  onClick={() => setView('table')}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`rounded-none px-3 ${view === 'grid' ? 'bg-muted' : ''}`} 
                  onClick={() => setView('grid')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma recomendação encontrada</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              Não existem recomendações que correspondam aos critérios de busca. 
              Tente ajustar os filtros ou criar uma nova recomendação.
            </p>
            <Button onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}>
              Limpar filtros
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row gap-4 mb-4 justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, título ou ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
            >
              <SelectTrigger className="w-[150px]">
                <Filter className="mr-1 h-4 w-4" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="approved">Aprovada</SelectItem>
                <SelectItem value="rejected">Rejeitada</SelectItem>
                <SelectItem value="implemented">Implementada</SelectItem>
                <SelectItem value="expired">Expirada</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleExportCSV} variant="outline" size="sm">
              <FileDown className="mr-1 h-4 w-4" />
              Exportar CSV
            </Button>
            <div className="flex border rounded-md overflow-hidden">
              <Button 
                variant="ghost" 
                size="sm" 
                className={`rounded-none px-3 ${view === 'table' ? 'bg-muted' : ''}`} 
                onClick={() => setView('table')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`rounded-none px-3 ${view === 'grid' ? 'bg-muted' : ''}`} 
                onClick={() => setView('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {view === 'table' ? (
            <motion.div 
              key="table-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="rounded-md border"
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer w-[120px]"
                      onClick={() => handleSort('date')}
                    >
                      <div className="flex items-center">
                        <Calendar className="mr-1 h-3 w-3 text-muted-foreground" />
                        Data {renderSortIcon('date')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => handleSort('title')}
                    >
                      <div className="flex items-center">
                        <FileText className="mr-1 h-3 w-3 text-muted-foreground" />
                        Título {renderSortIcon('title')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => handleSort('clientName')}
                    >
                      <div className="flex items-center">
                        <User className="mr-1 h-3 w-3 text-muted-foreground" />
                        Cliente {renderSortIcon('clientName')}
                      </div>
                    </TableHead>
                    <TableHead className="w-[120px]">
                      <div className="flex items-center">
                        <Tag className="mr-1 h-3 w-3 text-muted-foreground" />
                        Status
                      </div>
                    </TableHead>
                    <TableHead className="text-right w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentItems.map((recommendation, index) => (
                    <TableRow 
                      key={recommendation.id} 
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleViewDetails(recommendation.id)}
                    >
                      <TableCell>
                        {recommendation.date ? 
                          format(new Date(recommendation.date), 'dd/MM/yyyy') : 
                          'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{recommendation.title || 'Sem título'}</div>
                        <div className="text-xs text-muted-foreground">
                          ID: {recommendation.id ? String(recommendation.id).slice(0, 8) + '...' : 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {recommendation.clientName || recommendation.conteudo?.clienteData?.name || 'Cliente não especificado'}
                      </TableCell>
                      <TableCell>
                        {renderStatusBadge(recommendation.status)}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetails(recommendation.id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            {recommendation.clientId && (
                              <DropdownMenuItem onClick={() => handleViewClient(recommendation.clientId)}>
                                <User className="mr-2 h-4 w-4" />
                                Ver Cliente
                              </DropdownMenuItem>
                            )}
                            {onEdit && (
                              <DropdownMenuItem onClick={() => onEdit(recommendation.id)}>
                                <FileEdit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                            )}
                            {onDelete && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => onDelete(recommendation.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Excluir
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </motion.div>
          ) : (
            <motion.div 
              key="grid-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {currentItems.map((recommendation) => (
                <motion.div
                  key={recommendation.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card 
                    className={`overflow-hidden border-l-4 ${getStatusColor(recommendation.status)} hover:shadow-md transition-shadow cursor-pointer`}
                    onClick={() => handleViewDetails(recommendation.id)}
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg truncate">{recommendation.title || 'Sem título'}</CardTitle>
                          <p className="text-xs text-muted-foreground">
                            ID: {recommendation.id ? String(recommendation.id).slice(0, 10) + '...' : 'N/A'}
                          </p>
                        </div>
                        <div onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewDetails(recommendation.id)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver Detalhes
                              </DropdownMenuItem>
                              {recommendation.clientId && (
                                <DropdownMenuItem onClick={() => handleViewClient(recommendation.clientId)}>
                                  <User className="mr-2 h-4 w-4" />
                                  Ver Cliente
                                </DropdownMenuItem>
                              )}
                              {onEdit && (
                                <DropdownMenuItem onClick={() => onEdit(recommendation.id)}>
                                  <FileEdit className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                              )}
                              {onDelete && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => onDelete(recommendation.id)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Excluir
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <div className="flex gap-2 items-center mb-3">
                        {renderStatusBadge(recommendation.status)}
                        <div className="text-xs text-muted-foreground flex items-center">
                          <Calendar className="mr-1 h-3 w-3" />
                          {recommendation.date ? 
                            format(new Date(recommendation.date), 'dd/MM/yyyy') : 
                            'N/A'}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="h-6 w-6 bg-primary text-xs text-primary-foreground">
                          {recommendation.clientName ? recommendation.clientName.charAt(0) : 'C'}
                        </Avatar>
                        <span className="text-sm truncate">
                          {recommendation.clientName || recommendation.conteudo?.clienteData?.name || 'Cliente não especificado'}
                        </span>
                      </div>
                      
                      {(recommendation.riskProfile || recommendation.investmentHorizon) && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
                          {recommendation.riskProfile && (
                            <div className="flex items-center">
                              <Tag className="mr-1 h-3 w-3" />
                              {recommendation.riskProfile}
                            </div>
                          )}
                          {recommendation.investmentHorizon && (
                            <div className="flex items-center">
                              <Clock className="mr-1 h-3 w-3" />
                              {recommendation.investmentHorizon}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Mostrando {(currentPage - 1) * itemsPerPage + 1} a {
                Math.min(currentPage * itemsPerPage, filteredRecommendations.length)
              } de {filteredRecommendations.length}
            </p>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const pageToShow = totalPages <= 5 
                  ? i + 1 
                  : currentPage <= 3 
                    ? i + 1 
                    : currentPage >= totalPages - 2 
                      ? totalPages - 4 + i 
                      : currentPage - 2 + i;
                
                return (
                  <Button
                    key={pageToShow}
                    variant={currentPage === pageToShow ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageToShow)}
                    className="w-9"
                  >
                    {pageToShow}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 