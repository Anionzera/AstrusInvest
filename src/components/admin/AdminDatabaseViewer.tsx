import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/lib/db";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from "@/components/auth/AuthContext";
import { AlertCircle, Download, Plus, RefreshCw, Search, Trash, User, Database, FileSpreadsheet, FileJson, Activity } from "lucide-react";
import * as XLSX from 'xlsx';

interface TableData {
  id?: number;
  [key: string]: any;
}

const AdminDatabaseViewer = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("clientes");
  const [isLoading, setIsLoading] = useState(false);
  const [tableData, setTableData] = useState<TableData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [tableInfo, setTableInfo] = useState({
    totalRecords: 0,
    columns: [] as string[],
  });
  const [selectedRecords, setSelectedRecords] = useState<number[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  // Verificar permissões do administrador
  useEffect(() => {
    if (!user || !user.isAdmin) {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Você não tem permissão para acessar esta área."
      });
      navigate("/");
    }
  }, [user, navigate, toast]);

  // Carregar dados da tabela selecionada
  useEffect(() => {
    loadTableData();
  }, [activeTab]);

  const loadTableData = async () => {
    if (!activeTab) return;
    
    setIsLoading(true);
    try {
      // Limpar seleção
      setSelectedRecords([]);
      
      // Obter dados da tabela selecionada
      const data = await db.table(activeTab).toArray();
      setTableData(data);
      
      // Calcular informações da tabela
      setTableInfo({
        totalRecords: data.length,
        columns: data.length > 0 ? Object.keys(data[0]).filter(k => k !== 'id') : [],
      });
    } catch (error) {
      console.error(`Erro ao carregar dados da tabela ${activeTab}:`, error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar dados",
        description: `Não foi possível carregar os dados da tabela ${activeTab}.`
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Função para filtrar dados com base na pesquisa
  const filteredData = tableData.filter(item => {
    if (!searchQuery) return true;
    
    // Buscar em todas as propriedades
    return Object.entries(item).some(([key, value]) => {
      if (value === null || value === undefined) return false;
      return String(value).toLowerCase().includes(searchQuery.toLowerCase());
    });
  });

  // Função para exportar dados da tabela atual
  const exportTableData = async (format: 'xlsx' | 'json') => {
    setIsExporting(true);
    
    try {
      if (filteredData.length === 0) {
        toast({
          variant: "destructive",
          title: "Sem dados",
          description: "Não há dados para exportar."
        });
        return;
      }
      
      if (format === 'xlsx') {
        // Exportar para Excel
        const ws = XLSX.utils.json_to_sheet(filteredData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, activeTab);
        XLSX.writeFile(wb, `astrus_${activeTab}_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      } else {
        // Exportar para JSON
        const dataStr = JSON.stringify(filteredData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const dataUrl = URL.createObjectURL(dataBlob);
        
        // Criar link e simular clique para download
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `astrus_${activeTab}_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      toast({
        title: "Exportação concluída",
        description: `Os dados da tabela ${activeTab} foram exportados com sucesso.`
      });
    } catch (error) {
      console.error("Erro na exportação:", error);
      toast({
        variant: "destructive",
        title: "Erro na exportação",
        description: "Ocorreu um erro ao exportar os dados."
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Função para excluir registros selecionados
  const deleteSelectedRecords = async () => {
    if (selectedRecords.length === 0) return;
    
    const confirmMessage = selectedRecords.length === 1
      ? "Tem certeza que deseja excluir o registro selecionado?"
      : `Tem certeza que deseja excluir ${selectedRecords.length} registros?`;
    
    if (!window.confirm(confirmMessage)) return;
    
    setIsLoading(true);
    
    try {
      await db.table(activeTab).bulkDelete(selectedRecords);
      
      toast({
        title: "Registros excluídos",
        description: `${selectedRecords.length} registro(s) excluído(s) com sucesso.`
      });
      
      // Recarregar dados
      loadTableData();
    } catch (error) {
      console.error("Erro ao excluir registros:", error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: "Ocorreu um erro ao excluir os registros selecionados."
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Função para alternar seleção de registro
  const toggleRecordSelection = (id?: number) => {
    if (!id) return;
    
    setSelectedRecords(prev => 
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  // Função para selecionar/desselecionar todos
  const toggleSelectAll = () => {
    if (selectedRecords.length === filteredData.length) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(filteredData.filter(item => item.id).map(item => item.id as number));
    }
  };

  // Função para formatar valor da célula para exibição
  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (value instanceof Date) return value.toLocaleString();
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  if (!user?.isAdmin) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Acesso Restrito</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Você precisa ter privilégios de administrador para acessar esta página.
        </p>
        <Button onClick={() => navigate("/")}>Voltar ao Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Banco de Dados</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie os registros do banco de dados
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => navigate("/admin")}>
            Voltar ao Painel
          </Button>
          <Badge variant={user?.hasRealAdminAccess ? "default" : "outline"} className="ml-2">
            {user?.hasRealAdminAccess ? "Admin Completo" : "Acesso Limitado"}
          </Badge>
        </div>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center">
                <Database className="h-6 w-6 mr-2" />
                Visualizador de Banco de Dados
              </CardTitle>
              <CardDescription>
                Visualize e gerencie dados de todas as tabelas do sistema
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="clientes" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="clientes">Clientes</TabsTrigger>
              <TabsTrigger value="ativos">Ativos</TabsTrigger>
              <TabsTrigger value="recomendacoes">Recomendações</TabsTrigger>
              <TabsTrigger value="posicoes">Posições</TabsTrigger>
              <TabsTrigger value="portfolioAnalyses">Análises</TabsTrigger>
              <TabsTrigger value="backups">Backups</TabsTrigger>
            </TabsList>
            
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadTableData}
                  disabled={isLoading}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={deleteSelectedRecords}
                  disabled={isLoading || selectedRecords.length === 0}
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Excluir Selecionados
                </Button>
                {activeTab === 'portfolioAnalyses' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/risk-analysis')}
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    Análise de Risco
                  </Button>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Buscar registros..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                
                <Select
                  onValueChange={(value) => exportTableData(value as 'xlsx' | 'json')}
                  disabled={isExporting || isLoading || tableData.length === 0}
                >
                  <SelectTrigger className="w-[180px]">
                    <div className="flex items-center">
                      <Download className="h-4 w-4 mr-2" />
                      <span>Exportar</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xlsx">
                      <div className="flex items-center">
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        <span>Excel (XLSX)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="json">
                      <div className="flex items-center">
                        <FileJson className="h-4 w-4 mr-2" />
                        <span>JSON</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-md border">
              {isLoading ? (
                <div className="flex justify-center items-center p-12">
                  <LoadingSpinner size="lg" />
                  <span className="ml-2">Carregando dados...</span>
                </div>
              ) : tableData.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <Database className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhum registro encontrado</h3>
                  <p className="text-gray-500 mb-4">
                    A tabela {activeTab} está vazia ou não existe.
                  </p>
                  <Button onClick={loadTableData}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Atualizar
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableCaption>
                      {filteredData.length} de {tableInfo.totalRecords} registros em {activeTab}
                    </TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <input
                            type="checkbox"
                            checked={selectedRecords.length > 0 && selectedRecords.length === filteredData.length}
                            onChange={toggleSelectAll}
                            className="h-4 w-4"
                          />
                        </TableHead>
                        <TableHead className="w-20">ID</TableHead>
                        {tableInfo.columns.map((column) => (
                          <TableHead key={column}>{column}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.map((row) => (
                        <TableRow 
                          key={row.id} 
                          className={selectedRecords.includes(row.id as number) ? "bg-blue-50 dark:bg-blue-900/20" : ""}
                        >
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedRecords.includes(row.id as number)}
                              onChange={() => toggleRecordSelection(row.id)}
                              className="h-4 w-4"
                            />
                          </TableCell>
                          <TableCell className="font-medium">{row.id}</TableCell>
                          {tableInfo.columns.map((column) => (
                            <TableCell key={`${row.id}-${column}`}>
                              {formatCellValue(row[column])}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </Tabs>
        </CardContent>
        
        <CardFooter className="flex justify-between border-t p-4">
          <div className="text-sm text-gray-500">
            {user && user.hasRealAdminAccess 
              ? "Acesso completo ao banco de dados. Você tem permissão para modificar todos os registros."
              : "Acesso de visualização ao banco de dados. Algumas operações podem ser restritas."}
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {user?.username}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {user?.role}
            </Badge>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AdminDatabaseViewer;