import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Calendar, FilePlus, FileText, MoreVertical, Pencil, Trash, User } from 'lucide-react';
import { Recomendacao } from '@/lib/db';

interface RecomendacaoCardProps {
  recomendacao: Recomendacao;
  clienteNome: string;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onConvert: () => void;
}

const RecomendacaoCard = ({
  recomendacao,
  clienteNome,
  onView,
  onEdit,
  onDelete,
  onConvert
}: RecomendacaoCardProps) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700">
            Rascunho
          </Badge>
        );
      case 'sent':
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800">
            Enviada
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800">
            Aprovada
          </Badge>
        );
      case 'converted_to_report':
        return (
          <Badge variant="outline" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800">
            Convertida
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800">
            Rejeitada
          </Badge>
        );
      case 'archived':
        return (
          <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800">
            Arquivada
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status || 'Indefinido'}
          </Badge>
        );
    }
  };

  return (
    <Card className="overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all duration-200">
      <CardHeader className="pb-3 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-blue-800 dark:text-blue-300 font-semibold">
              <button
                className="text-left hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors"
                onClick={onView}
              >
                {recomendacao.titulo || 'Recomendação sem título'}
              </button>
            </CardTitle>
            <div className="mt-2">
              {getStatusBadge(recomendacao.status)}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onView}>
                <FileText className="h-4 w-4 mr-2 text-blue-600" />
                Visualizar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-2 text-green-600" />
                Editar
              </DropdownMenuItem>
              {recomendacao.status !== 'converted_to_report' && (
                <DropdownMenuItem onClick={onConvert}>
                  <FilePlus className="h-4 w-4 mr-2 text-purple-600" />
                  Converter para Relatório
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onDelete} className="text-red-600 dark:text-red-400">
                <Trash className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center text-sm">
            <User className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
            <span className="text-gray-800 dark:text-gray-200">{clienteNome}</span>
          </div>
          <div className="flex items-center text-sm">
            <Calendar className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
            <span className="text-gray-600 dark:text-gray-400">
              {format(recomendacao.dataCriacao, 'dd MMMM yyyy', { locale: ptBR })}
            </span>
          </div>
          {recomendacao.descricao && (
            <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{recomendacao.descricao}</p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-end p-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/30"
            onClick={onView}
          >
            <FileText className="h-3.5 w-3.5 mr-1" />
            Detalhes
          </Button>
          {recomendacao.status !== 'converted_to_report' && recomendacao.status !== 'archived' && (
            <Button 
              variant="outline" 
              size="sm"
              className="border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/30"
              onClick={onEdit}
            >
              <Pencil className="h-3.5 w-3.5 mr-1" />
              Editar
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};

export default RecomendacaoCard; 