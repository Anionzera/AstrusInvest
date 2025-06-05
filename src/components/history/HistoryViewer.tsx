import React, { useEffect, useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  Eye, 
  FileText, 
  Pencil, 
  Trash2, 
  Archive, 
  CalendarIcon, 
  SearchIcon, 
  UserIcon 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { getAllRecommendations, getAllReports } from "@/lib/historyUtils";
import { Recomendacao } from "@/lib/db";

const HistoryViewer = () => {
  const [recomendacoes, setRecomendacoes] = useState<Recomendacao[]>([]);
  const [relatorios, setRelatorios] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("recomendacoes");
  const navigate = useNavigate();
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    setLoading(true);
    
    try {
      // Carregar recomendações
      const recomendacoesData = await getAllRecommendations();
      setRecomendacoes(recomendacoesData);
      
      // Carregar relatórios
      const relatoriosData = await getAllReports();
      setRelatorios(relatoriosData);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    } finally {
      setLoading(false);
    }
  };
  
  // Filtrar recomendações com base na busca
  const filteredRecomendacoes = recomendacoes.filter(rec => {
    if (!searchTerm) return true;
    
    const term = searchTerm.toLowerCase();
    return (
      rec.titulo?.toLowerCase().includes(term) ||
      rec.descricao?.toLowerCase().includes(term) ||
      rec.conteudo?.clienteData?.name?.toLowerCase().includes(term) ||
      rec.conteudo?.perfilRisco?.profile?.toLowerCase().includes(term)
    );
  });
  
  // Filtrar relatórios com base na busca
  const filteredRelatorios = relatorios.filter(rel => {
    if (!searchTerm) return true;
    
    const term = searchTerm.toLowerCase();
    return (
      rel.titulo?.toLowerCase().includes(term) ||
      rel.descricao?.toLowerCase().includes(term)
    );
  });
  
  // Função para visualizar recomendação
  const handleViewRecomendacao = (id: string) => {
    navigate(`/recomendacao/${id}`);
  };
  
  // Função para editar recomendação
  const handleEditRecomendacao = (id: string) => {
    navigate(`/recomendacao/editar/${id}`);
  };
  
  // Função para visualizar relatório
  const handleViewRelatorio = (id: string) => {
    navigate(`/relatorio/${id}`);
  };
  
  // Função para formatar status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline" className="bg-gray-100 text-gray-700">Rascunho</Badge>;
      case "sent":
        return <Badge variant="outline" className="bg-blue-100 text-blue-700">Enviada</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-100 text-green-700">Aprovada</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-100 text-red-700">Rejeitada</Badge>;
      case "archived":
        return <Badge variant="outline" className="bg-amber-100 text-amber-700">Arquivada</Badge>;
      case "converted_to_report":
        return <Badge variant="outline" className="bg-purple-100 text-purple-700">Convertida</Badge>;
      default:
        return <Badge variant="outline">{status || "Indefinido"}</Badge>;
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">Histórico de Recomendações e Relatórios</CardTitle>
        <CardDescription>
          Visualize e gerencie suas recomendações e relatórios salvos
        </CardDescription>
        
        <div className="mt-4 relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="Buscar por título, cliente ou conteúdo..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="recomendacoes">
              Recomendações ({filteredRecomendacoes.length})
            </TabsTrigger>
            <TabsTrigger value="relatorios">
              Relatórios ({filteredRelatorios.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="recomendacoes">
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
              </div>
            ) : filteredRecomendacoes.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-md">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-800">Nenhuma recomendação encontrada</h3>
                <p className="text-gray-500">
                  {searchTerm ? "Nenhuma recomendação corresponde à busca." : "Você ainda não possui recomendações."}
                </p>
              </div>
            ) : (
              <Table>
                <TableCaption>Lista de recomendações salvas</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecomendacoes.map((rec) => (
                    <TableRow key={rec.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <CalendarIcon size={16} className="text-gray-400" />
                          {format(new Date(rec.dataCriacao), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      </TableCell>
                      <TableCell>{rec.titulo}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <UserIcon size={16} className="text-gray-400" />
                          {rec.conteudo?.clienteData?.name || "Cliente não especificado"}
                        </div>
                      </TableCell>
                      <TableCell>{rec.conteudo?.perfilRisco?.profile || "-"}</TableCell>
                      <TableCell>{getStatusBadge(rec.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleViewRecomendacao(rec.id)}>
                            <Eye size={16} />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEditRecomendacao(rec.id)}>
                            <Pencil size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
          
          <TabsContent value="relatorios">
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
              </div>
            ) : filteredRelatorios.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-md">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-800">Nenhum relatório encontrado</h3>
                <p className="text-gray-500">
                  {searchTerm ? "Nenhum relatório corresponde à busca." : "Você ainda não possui relatórios."}
                </p>
              </div>
            ) : (
              <Table>
                <TableCaption>Lista de relatórios salvos</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRelatorios.map((rel) => (
                    <TableRow key={rel.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <CalendarIcon size={16} className="text-gray-400" />
                          {format(new Date(rel.dataCriacao), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      </TableCell>
                      <TableCell>{rel.titulo}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <UserIcon size={16} className="text-gray-400" />
                          {rel.clienteNome || "Cliente não especificado"}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(rel.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleViewRelatorio(rel.id)}>
                            <Eye size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default HistoryViewer; 