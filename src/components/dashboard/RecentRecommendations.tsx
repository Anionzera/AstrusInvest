import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Eye,
  FileText,
  MoreHorizontal,
  Pencil,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { db, Recomendacao } from "@/lib/db";
import { recommendationsApi } from "@/services/recommendationsService";
import { api } from "@/services/api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { getRecentRecommendations } from "@/lib/historyUtils";
import { toast } from "@/components/ui/use-toast";

interface RecentRecommendationsProps {
  recommendations?: Recomendacao[];
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onExport?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const RecentRecommendations = ({
  recommendations = [],
  onView = () => {},
  onEdit = () => {},
  onExport = () => {},
  onDelete = () => {},
}: RecentRecommendationsProps) => {
  const [recomendacoes, setRecomendacoes] =
    useState<Recomendacao[]>(recommendations);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    carregarRecomendacoes();
  }, []);

  const carregarRecomendacoes = async () => {
    try {
      setIsLoading(true);
      // Busca as 10 recomendações mais recentes usando o historyUtils
      const recentes = await getRecentRecommendations(10);
      setRecomendacoes(recentes);
    } catch (error) {
      console.error("Erro ao carregar recomendações recentes:", error);
      setRecomendacoes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const online = await api.health().then(h => h.ok && h.db).catch(() => false);
      if (online) {
        await recommendationsApi.delete(id);
      }
      // limpar local
      await db.recomendacoes.delete(id);
      
      toast({
        title: "Sucesso",
        description: "Recomendação excluída com sucesso",
      });
      
      // Recarregar a lista após excluir
      carregarRecomendacoes(); 
    } catch (error) {
      console.error("Erro ao excluir recomendação:", error);
      toast({
        title: "Erro",
        description: "Erro ao excluir recomendação",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="w-full rounded-lg border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Recomendações Recentes</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={carregarRecomendacoes}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/history">Ver Todas</Link>
          </Button>
        </div>
      </div>

      <Table>
        <TableCaption>
          Uma lista das suas recomendações de investimento recentes.
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Título</TableHead>
            <TableHead>Perfil de Risco</TableHead>
            <TableHead>Horizonte de Investimento</TableHead>
            <TableHead>Estratégia</TableHead>
            <TableHead className="text-right">Valor Investido</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-10">
                <div className="flex justify-center">
                  <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                </div>
              </TableCell>
            </TableRow>
          ) : recomendacoes.length > 0 ? (
            recomendacoes.map((recomendacao) => (
              <TableRow
                key={recomendacao.id}
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <TableCell>
                  {format(new Date(recomendacao.dataCriacao), "dd/MM/yyyy", {
                    locale: ptBR,
                  })}
                </TableCell>
                <TableCell className="font-medium">
                  {recomendacao.titulo}
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                      recomendacao.conteudo?.perfilRisco?.profile
                        ? getRiskProfileBadgeColor(recomendacao.conteudo.perfilRisco.profile)
                        : ""
                    }`}
                  >
                    {recomendacao.conteudo?.perfilRisco?.profile || "Não definido"}
                  </span>
                </TableCell>
                <TableCell>{recomendacao.conteudo?.horizonte?.years || "-"} anos</TableCell>
                <TableCell>{recomendacao.conteudo?.estrategia?.name || "-"}</TableCell>
                <TableCell className="font-medium text-right">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(recomendacao.conteudo?.horizonte?.amount || 0)}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Abrir menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView(recomendacao.id)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Visualizar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(recomendacao.id)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onExport(recomendacao.id)}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Exportar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(recomendacao.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center py-6 text-muted-foreground"
              >
                Nenhuma recomendação encontrada. Crie sua primeira recomendação
                de alocação.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

const getRiskProfileBadgeColor = (riskProfile: string): string => {
  const profileColors: Record<string, string> = {
    conservador: "bg-blue-100 text-blue-800",
    moderado: "bg-yellow-100 text-yellow-800",
    agressivo: "bg-red-100 text-red-800",
    default: "bg-gray-100 text-gray-800",
  };

  return profileColors[riskProfile.toLowerCase()] || profileColors.default;
};

export default RecentRecommendations;
