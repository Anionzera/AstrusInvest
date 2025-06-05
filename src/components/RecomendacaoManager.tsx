import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  FilePlus,
  Search,
  Filter,
  RefreshCw,
  Pencil,
  FileText,
  Trash,
  LayoutGrid,
  LayoutList,
  AlertCircle,
  MoreVertical,
  Calendar,
  User,
  X,
} from "lucide-react";

import { db, Recomendacao } from "@/lib/db";
import { useClientes } from "@/lib/hooks/useClientes";
import { useRecomendacoes } from "@/lib/hooks/useRecomendacoes";

import RecomendacaoCard from "./recomendacao/RecomendacaoCard";

function RecomendacaoManager() {
  const { recomendacoes, addRecomendacao, updateRecomendacao, deleteRecomendacao } = useRecomendacoes();
  const { clientes } = useClientes();
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const navigate = useNavigate();

  // Filtrar recomendações com base na busca e no filtro de status
  const filteredRecomendacoes = recomendacoes.filter((recomendacao) => {
    // Aplicar filtro de busca
    const searchLower = searchTerm.toLowerCase();
    const searchMatch =
      !searchTerm ||
      recomendacao.titulo?.toLowerCase().includes(searchLower) ||
      recomendacao.descricao?.toLowerCase().includes(searchLower) ||
      getNomeCliente(recomendacao.clienteId).toLowerCase().includes(searchLower);

    // Aplicar filtro de status
    const statusMatch = !statusFilter || recomendacao.status === statusFilter;

    return searchMatch && statusMatch;
  });

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Simulando carregamento de dados
        await new Promise(resolve => setTimeout(resolve, 800));
        setError(null);
      } catch (error) {
        console.error("Erro ao carregar recomendações:", error);
        setError("Falha ao carregar recomendações. Tente novamente.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const getNomeCliente = (clienteId: string) => {
    const cliente = clientes.find((c) => c.id === clienteId);
    return cliente?.nome || "Cliente não encontrado";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700">
            Rascunho
          </Badge>
        );
      case "sent":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800">
            Enviada
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800">
            Aprovada
          </Badge>
        );
      case "converted_to_report":
        return (
          <Badge variant="outline" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800">
            Convertida
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800">
            Rejeitada
          </Badge>
        );
      case "archived":
        return (
          <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800">
            Arquivada
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status || "Indefinido"}
          </Badge>
        );
    }
  };

  const handleCreateRecomendacao = () => {
    navigate("/recomendacao/nova");
  };

  const handleEditRecomendacao = (id: string) => {
    navigate(`/recomendacao/editar/${id}`);
  };

  const handleViewRecomendacao = (id: string) => {
    navigate(`/recomendacao/${id}`);
  };

  const handleDeleteRecomendacao = async (id: string) => {
    try {
      const recomendacao = recomendacoes.find(r => r.id === id);
      if (!recomendacao) return;

      const confirmed = window.confirm(
        `Tem certeza que deseja excluir a recomendação "${recomendacao.titulo}"?`
      );

      if (confirmed) {
        await deleteRecomendacao(id);
        toast.success("Recomendação excluída com sucesso!");
      }
    } catch (error) {
      console.error("Erro ao excluir recomendação:", error);
      setError("Ocorreu um erro ao excluir a recomendação. Tente novamente.");
    }
  };

  const handleConvertToReport = async (id: string) => {
    try {
      const recomendacao = recomendacoes.find(r => r.id === id);
      if (!recomendacao) return;

      // Gerar a nova ID para o relatório
      const reportId = uuidv4();

      // Atualizar o status da recomendação para indicar que foi convertida
      const updatedRecomendacao = {
        ...recomendacao,
        status: "converted_to_report",
        relatedReportId: reportId
      };

      await updateRecomendacao(updatedRecomendacao);

      // Redirecionar para a tela de edição do relatório
      navigate(`/relatorio/editar/${reportId}?fromRecomendacao=${id}`);
    } catch (error) {
      console.error("Erro ao converter recomendação:", error);
      setError("Ocorreu um erro ao converter a recomendação. Tente novamente.");
    }
  };

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter(null);
  };

  return (
    <div className="w-full h-full p-4 md:p-6">
      <Card className="w-full shadow-md border border-border/40">
        <CardHeader className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-950/30 dark:to-indigo-950/30 border-b border-border/40 pb-4">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <CardTitle className="text-2xl font-bold text-blue-800 dark:text-blue-300 tracking-tight">
                Recomendações de Investimentos
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300 mt-1 max-w-2xl">
                Gerencie recomendações e relatórios de investimentos personalizados para seus clientes
              </CardDescription>
            </div>
            <Button 
              onClick={handleCreateRecomendacao}
              className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-600 self-start transition-colors"
            >
              <FilePlus className="h-4 w-4 mr-2" />
              Nova Recomendação
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-4 md:p-6">
          {error && (
            <Alert variant="destructive" className="mb-4 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertTitle className="text-red-800 dark:text-red-300 ml-2">Erro</AlertTitle>
              <AlertDescription className="text-red-700 dark:text-red-300 ml-2">
                {error}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    className="pl-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    placeholder="Buscar recomendações..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400 hidden md:inline">Visualização:</span>
                  <div className="border rounded-md bg-white dark:bg-gray-800 p-1 flex">
                    <Button
                      variant={viewMode === "table" ? "default" : "ghost"}
                      size="sm"
                      className={`rounded-sm ${viewMode === "table" ? "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50" : "hover:bg-gray-100 dark:hover:bg-gray-700"}`}
                      onClick={() => setViewMode("table")}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === "cards" ? "default" : "ghost"}
                      size="sm"
                      className={`rounded-sm ${viewMode === "cards" ? "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50" : "hover:bg-gray-100 dark:hover:bg-gray-700"}`}
                      onClick={() => setViewMode("cards")}
                    >
                      <LayoutList className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/30"
                    onClick={resetFilters}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Limpar Filtros
                  </Button>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 p-2 bg-gray-50/70 dark:bg-gray-800/30 rounded-md border border-gray-200 dark:border-gray-700">
                <div className="flex items-center">
                  <Filter className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Status:</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className={`px-3 py-1 h-8 rounded-full ${
                    statusFilter === null
                      ? "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  }`}
                  onClick={() => setStatusFilter(null)}
                >
                  Todos
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={`px-3 py-1 h-8 rounded-full ${
                    statusFilter === "draft"
                      ? "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  }`}
                  onClick={() => setStatusFilter("draft")}
                >
                  Rascunhos
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={`px-3 py-1 h-8 rounded-full ${
                    statusFilter === "sent"
                      ? "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  }`}
                  onClick={() => setStatusFilter("sent")}
                >
                  Enviadas
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={`px-3 py-1 h-8 rounded-full ${
                    statusFilter === "approved"
                      ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  }`}
                  onClick={() => setStatusFilter("approved")}
                >
                  Aprovadas
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={`px-3 py-1 h-8 rounded-full ${
                    statusFilter === "converted_to_report"
                      ? "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  }`}
                  onClick={() => setStatusFilter("converted_to_report")}
                >
                  Convertidas
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={`px-3 py-1 h-8 rounded-full ${
                    statusFilter === "rejected"
                      ? "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  }`}
                  onClick={() => setStatusFilter("rejected")}
                >
                  Rejeitadas
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={`px-3 py-1 h-8 rounded-full ${
                    statusFilter === "archived"
                      ? "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  }`}
                  onClick={() => setStatusFilter("archived")}
                >
                  Arquivadas
                </Button>
              </div>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                  Carregando recomendações...
                </p>
              </div>
            </div>
          ) : filteredRecomendacoes.length === 0 ? (
            <div className="text-center py-12 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <FileText className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
              <h3 className="mt-4 text-lg font-medium text-gray-800 dark:text-gray-200">
                {searchTerm || statusFilter ? "Nenhuma recomendação encontrada" : "Nenhuma recomendação cadastrada"}
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                {searchTerm || statusFilter
                  ? "Nenhuma recomendação corresponde aos filtros aplicados. Tente modificar seus critérios de busca."
                  : "Você ainda não possui recomendações cadastradas. Clique no botão abaixo para criar sua primeira recomendação."}
              </p>
              {!searchTerm && !statusFilter && (
                <Button
                  onClick={handleCreateRecomendacao}
                  variant="outline"
                  size="sm"
                  className="mt-4 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/30"
                >
                  <FilePlus className="h-4 w-4 mr-1.5" />
                  Criar Recomendação
                </Button>
              )}
            </div>
          ) : viewMode === "table" ? (
            <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <Table>
                <TableHeader className="bg-gray-50 dark:bg-gray-800/50">
                  <TableRow>
                    <TableHead className="font-medium">Título</TableHead>
                    <TableHead className="font-medium">Cliente</TableHead>
                    <TableHead className="font-medium">Data</TableHead>
                    <TableHead className="font-medium">Status</TableHead>
                    <TableHead className="font-medium w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecomendacoes.map((recomendacao) => (
                    <TableRow
                      key={recomendacao.id}
                      className="hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors"
                    >
                      <TableCell className="font-medium">
                        <button 
                          className="text-left hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors truncate max-w-[250px]"
                          onClick={() => handleViewRecomendacao(recomendacao.id)}
                        >
                          {recomendacao.titulo || "Sem título"}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="truncate max-w-[150px]">
                            {getNomeCliente(recomendacao.clienteId)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {format(recomendacao.dataCriacao, "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(recomendacao.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20"
                            onClick={() => handleEditRecomendacao(recomendacao.id)}
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-600 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-800/70"
                              >
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Mais opções</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewRecomendacao(recomendacao.id)}>
                                <FileText className="h-4 w-4 mr-2 text-blue-600" />
                                Visualizar
                              </DropdownMenuItem>
                              {recomendacao.status !== "converted_to_report" && (
                                <DropdownMenuItem onClick={() => handleConvertToReport(recomendacao.id)}>
                                  <FilePlus className="h-4 w-4 mr-2 text-purple-600" />
                                  Converter para Relatório
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => handleDeleteRecomendacao(recomendacao.id)}
                                className="text-red-600 dark:text-red-400"
                              >
                                <Trash className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRecomendacoes.map((recomendacao) => (
                <RecomendacaoCard
                  key={recomendacao.id}
                  recomendacao={recomendacao}
                  clienteNome={getNomeCliente(recomendacao.clienteId)}
                  onEdit={() => handleEditRecomendacao(recomendacao.id)}
                  onView={() => handleViewRecomendacao(recomendacao.id)}
                  onDelete={() => handleDeleteRecomendacao(recomendacao.id)}
                  onConvert={() => handleConvertToReport(recomendacao.id)}
                />
              ))}
            </div>
          )}
          
          {filteredRecomendacoes.length > 0 && (
            <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 flex justify-between items-center">
              <span>
                Exibindo {filteredRecomendacoes.length} {filteredRecomendacoes.length === 1 ? "recomendação" : "recomendações"}
                {(searchTerm || statusFilter) && " com os filtros aplicados"}
              </span>
              
              {(searchTerm || statusFilter) && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={resetFilters}
                  className="text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Limpar filtros
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default RecomendacaoManager; 