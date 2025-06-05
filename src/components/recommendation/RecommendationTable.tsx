import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, FileText, MoreHorizontal, BarChart, ArrowUpDown } from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Recomendacao } from "@/lib/db";

interface RecommendationTableProps {
  recommendations: Recomendacao[];
  loading: boolean;
}

type SortField = 'data' | 'cliente' | 'perfil' | 'horizonte' | 'valor' | 'retorno';
type SortDirection = 'asc' | 'desc';

export const RecommendationTable: React.FC<RecommendationTableProps> = ({ 
  recommendations, 
  loading 
}) => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('data');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  const itemsPerPage = 10;
  const totalPages = Math.ceil(recommendations.length / itemsPerPage);
  
  // Função para ordenar recomendações
  const sortedRecommendations = [...recommendations].sort((a, b) => {
    let aValue: any;
    let bValue: any;
    
    switch (sortField) {
      case 'data':
        aValue = new Date(a.dataCriacao).getTime();
        bValue = new Date(b.dataCriacao).getTime();
        break;
      case 'cliente':
        aValue = a.conteudo?.clienteData?.name || '';
        bValue = b.conteudo?.clienteData?.name || '';
        break;
      case 'perfil':
        aValue = a.conteudo?.perfilRisco?.profile || '';
        bValue = b.conteudo?.perfilRisco?.profile || '';
        break;
      case 'horizonte':
        aValue = a.conteudo?.horizonte?.years || 0;
        bValue = b.conteudo?.horizonte?.years || 0;
        break;
      case 'valor':
        aValue = a.conteudo?.horizonte?.amount || 0;
        bValue = b.conteudo?.horizonte?.amount || 0;
        break;
      case 'retorno':
        aValue = a.conteudo?.projecoes?.baseline || 0;
        bValue = b.conteudo?.projecoes?.baseline || 0;
        break;
      default:
        aValue = new Date(a.dataCriacao).getTime();
        bValue = new Date(b.dataCriacao).getTime();
    }
    
    const sortMultiplier = sortDirection === 'asc' ? 1 : -1;
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return aValue.localeCompare(bValue) * sortMultiplier;
    }
    
    return (aValue - bValue) * sortMultiplier;
  });
  
  // Paginação
  const paginatedRecommendations = sortedRecommendations.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );
  
  // Alternar ordenação
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };
  
  // Renderizar seta de ordenação
  const renderSortIndicator = (field: SortField) => {
    return sortField === field ? (
      <ArrowUpDown className={`h-4 w-4 ml-1 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
    ) : (
      <ArrowUpDown className="h-4 w-4 ml-1 opacity-20" />
    );
  };
  
  // Formatar percentual de alocação
  const formatAllocation = (allocation: any[]) => {
    if (!allocation || !Array.isArray(allocation) || allocation.length === 0) {
      return 'N/A';
    }
    
    // Agrupa por tipo principal de ativo
    const categories = allocation.reduce((acc: Record<string, number>, asset) => {
      const category = asset.type || asset.category || 'Outros';
      acc[category] = (acc[category] || 0) + asset.allocation;
      return acc;
    }, {});
    
    // Formata para exibição (ex: "60% RF, 20% RV, 20% Alt")
    return Object.entries(categories)
      .map(([cat, percentage]) => `${Math.round(percentage)}% ${cat}`)
      .join(', ');
  };
  
  // Navegar para a página de detalhes
  const handleViewDetails = (id: string) => {
    navigate(`/recommendation/${id}/details`);
  };
  
  // Formatar retorno projetado
  const formatReturn = (projection: any) => {
    if (!projection) return 'N/A';
    
    const returnValue = typeof projection === 'object' 
      ? projection.expectedReturn || projection.baseline || 0
      : projection;
      
    return `${returnValue.toFixed(2)}%`;
  };
  
  // Formatar perfil de risco
  const getRiskProfileBadge = (profile: string) => {
    if (!profile) return null;
    
    const profileColors: Record<string, { bg: string, text: string }> = {
      'conservador': { bg: 'bg-blue-100', text: 'text-blue-800' },
      'moderado': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      'agressivo': { bg: 'bg-red-100', text: 'text-red-800' },
    };
    
    const style = profileColors[profile.toLowerCase()] || { bg: 'bg-gray-100', text: 'text-gray-800' };
    
    return (
      <Badge variant="outline" className={`${style.bg} ${style.text}`}>
        {profile}
      </Badge>
    );
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin h-10 w-10 border-4 border-primary rounded-full border-t-transparent"></div>
      </div>
    );
  }
  
  if (recommendations.length === 0) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/60" />
        <h3 className="text-lg font-medium mb-1">Nenhuma recomendação encontrada</h3>
        <p>Não há recomendações que correspondam aos critérios selecionados.</p>
      </div>
    );
  }
  
  return (
    <div>
      <div className="overflow-auto">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead 
                className="w-[120px] cursor-pointer"
                onClick={() => toggleSort('data')}
              >
                <div className="flex items-center">
                  Data {renderSortIndicator('data')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer"
                onClick={() => toggleSort('cliente')}
              >
                <div className="flex items-center">
                  Cliente {renderSortIndicator('cliente')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer"
                onClick={() => toggleSort('perfil')}
              >
                <div className="flex items-center">
                  Perfil de Risco {renderSortIndicator('perfil')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer"
                onClick={() => toggleSort('horizonte')}
              >
                <div className="flex items-center">
                  Horizonte {renderSortIndicator('horizonte')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer text-right"
                onClick={() => toggleSort('valor')}
              >
                <div className="flex items-center justify-end">
                  Valor {renderSortIndicator('valor')}
                </div>
              </TableHead>
              <TableHead>Alocação</TableHead>
              <TableHead 
                className="cursor-pointer text-right"
                onClick={() => toggleSort('retorno')}
              >
                <div className="flex items-center justify-end">
                  Retorno Proj. {renderSortIndicator('retorno')}
                </div>
              </TableHead>
              <TableHead className="w-[90px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRecommendations.map((rec) => (
              <TableRow 
                key={rec.id}
                className="group cursor-pointer"
                onClick={() => handleViewDetails(rec.id)}
              >
                <TableCell className="font-medium">
                  {format(new Date(rec.dataCriacao), "dd/MM/yy", { locale: ptBR })}
                </TableCell>
                <TableCell>
                  {rec.conteudo?.clienteData?.name || 'Cliente não especificado'}
                </TableCell>
                <TableCell>
                  {getRiskProfileBadge(rec.conteudo?.perfilRisco?.profile)}
                </TableCell>
                <TableCell>
                  {rec.conteudo?.horizonte?.years || '-'} anos
                </TableCell>
                <TableCell className="text-right font-medium">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(rec.conteudo?.horizonte?.amount || 0)}
                </TableCell>
                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="text-left underline underline-offset-4 decoration-dotted decoration-muted-foreground/50">
                        {formatAllocation(rec.conteudo?.alocacao || [])}
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <div className="space-y-1 p-1">
                          {(rec.conteudo?.alocacao || []).map((asset: any, i: number) => (
                            <div key={i} className="flex justify-between text-xs">
                              <span>{asset.name}:</span>
                              <span className="font-medium">{asset.allocation}%</span>
                            </div>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell className="text-right">
                  {formatReturn(rec.conteudo?.projecoes?.baseline)}
                </TableCell>
                <TableCell className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetails(rec.id);
                      }}>
                        <Eye className="h-4 w-4 mr-2" />
                        Detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/recommendation/${rec.id}/chart`);
                      }}>
                        <BarChart className="h-4 w-4 mr-2" />
                        Gráficos
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {totalPages > 1 && (
        <div className="flex justify-center py-4 border-t border-border/40">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    setPage(p => Math.max(1, p - 1));
                  }}
                  className={page === 1 ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                
                if (pageNum === 1 || pageNum === totalPages || 
                    (pageNum >= page - 1 && pageNum <= page + 1)) {
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setPage(pageNum);
                        }}
                        isActive={page === pageNum}
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                } else if (pageNum === 2 || pageNum === totalPages - 1) {
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  );
                }
                
                return null;
              }).filter(Boolean)}
              
              <PaginationItem>
                <PaginationNext 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    setPage(p => Math.min(totalPages, p + 1));
                  }}
                  className={page === totalPages ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}; 