import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Download, FileSpreadsheet, AlertCircle, FileUp } from "lucide-react";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { useToast } from "../ui/use-toast";
import { db, Cliente, Posicao } from "../../lib/db";
import { read, utils } from "xlsx";
import * as XLSX from "xlsx";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Progress } from "../ui/progress";
import { useAuth } from "../auth/AuthContext";
import { Badge } from "../ui/badge";

interface ImportResult {
  status: "success" | "error" | "warning";
  message: string;
  details?: string[];
  imported?: number;
  errors?: number;
  warnings?: number;
}

const ImportExportManager: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("import");
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [exportProgress, setExportProgress] = useState(0);

  // Verificar permissões do administrador ao iniciar
  useEffect(() => {
    if (!user || !user.isAdmin) {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Você precisa ter privilégios de administrador para acessar esta página."
      });
      navigate("/");
    }
  }, [user, navigate, toast]);

  // Função para validar o formato do arquivo de posições
  const validatePositionsFormat = (data: any[]) => {
    const requiredColumns = ["cliente_id", "ativo", "quantidade", "preco_medio"];
    const errors: string[] = [];
    
    // Verificar se há dados
    if (!data || data.length === 0) {
      errors.push("Arquivo vazio ou sem dados");
      return { valid: false, errors };
    }
    
    // Verificar colunas obrigatórias
    const headers = Object.keys(data[0]);
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    
    if (missingColumns.length > 0) {
      errors.push(`Colunas obrigatórias ausentes: ${missingColumns.join(", ")}`);
    }
    
    return { valid: errors.length === 0, errors };
  };

  // Função para importar posições de um arquivo
  const importPositions = async (file: File) => {
    setImporting(true);
    setImportProgress(10);
    setImportResult(null);
    
    try {
      // Ler o arquivo Excel/CSV
      const data = await file.arrayBuffer();
      const workbook = read(data, { type: 'array' });
      setImportProgress(30);
      
      // Obter a primeira planilha
      const firstSheet = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheet];
      
      // Converter para JSON
      const jsonData = utils.sheet_to_json(worksheet);
      setImportProgress(50);
      
      // Validar formato
      const validation = validatePositionsFormat(jsonData);
      if (!validation.valid) {
        setImportResult({
          status: "error",
          message: "Formato de arquivo inválido",
          details: validation.errors
        });
        setImporting(false);
        setImportProgress(0);
        return;
      }
      
      // Processar dados
      let imported = 0;
      let errors = 0;
      let warnings = 0;
      const processDetails: string[] = [];
      
      // Verificar clientes e ativos existentes
      const clientes = await db.clientes.toArray();
      const clientesMap = new Map(clientes.map(c => [c.id, c]));
      
      const ativos = await db.ativos.toArray();
      const ativosMap = new Map(ativos.map(a => [a.nome.toLowerCase(), a]));
      
      setImportProgress(70);
      
      // Processar cada linha
      for (const row of jsonData) {
        try {
          const clienteId = Number(row.cliente_id);
          const ativoNome = String(row.ativo);
          const quantidade = Number(row.quantidade);
          const precoMedio = Number(row.preco_medio);
          
          // Verificar se cliente existe
          if (!clientesMap.has(clienteId)) {
            processDetails.push(`Cliente ID ${clienteId} não encontrado`);
            warnings++;
            continue;
          }
          
          // Verificar/encontrar ativo
          let ativoId;
          const ativoEncontrado = Array.from(ativosMap.values()).find(
            a => a.nome.toLowerCase() === ativoNome.toLowerCase()
          );
          
          if (ativoEncontrado) {
            ativoId = ativoEncontrado.id;
          } else {
            // Criar novo ativo se não existir
            const novoAtivo = {
              nome: ativoNome,
              tipo: row.tipo || "Não especificado",
              categoria: row.categoria || "Outros",
              descricao: row.descricao || `Ativo importado: ${ativoNome}`
            };
            
            const id = await db.ativos.add(novoAtivo);
            ativoId = id;
            processDetails.push(`Novo ativo criado: ${ativoNome}`);
          }
          
          // Criar posição
          const novaPosicao: Posicao = {
            clienteId,
            ativoId,
            quantidade,
            precoMedio,
            dataAtualizacao: new Date(),
            valorTotal: quantidade * precoMedio,
            notasAdicionais: `Importado em ${new Date().toLocaleString()}`
          };
          
          await db.posicoes.add(novaPosicao);
          imported++;
          
        } catch (err) {
          console.error("Erro ao processar linha:", row, err);
          processDetails.push(`Erro ao processar: ${JSON.stringify(row)}`);
          errors++;
        }
      }
      
      setImportProgress(100);
      
      // Resultado final
      setImportResult({
        status: errors > 0 ? "warning" : "success",
        message: `Importação concluída com ${imported} posições importadas`,
        details: processDetails,
        imported,
        errors,
        warnings
      });
      
      toast({
        title: "Importação concluída",
        description: `${imported} posições importadas, ${errors} erros, ${warnings} avisos`,
        variant: errors > 0 ? "destructive" : "default"
      });
      
    } catch (error) {
      console.error("Erro na importação:", error);
      setImportResult({
        status: "error",
        message: "Erro durante a importação",
        details: [(error as Error).message]
      });
      
      toast({
        variant: "destructive",
        title: "Erro na importação",
        description: "Não foi possível processar o arquivo"
      });
    } finally {
      setImporting(false);
    }
  };

  // Função para exportar todos os dados
  const exportAllData = async () => {
    setExporting(true);
    setExportProgress(10);
    
    try {
      // Carregar dados do banco
      const clientes = await db.clientes.toArray();
      setExportProgress(30);
      
      const posicoes = await db.posicoes.toArray();
      setExportProgress(50);
      
      const ativos = await db.ativos.toArray();
      const ativosMap = new Map(ativos.map(a => [a.id, a]));
      
      const recomendacoes = await db.recomendacoes.toArray();
      setExportProgress(70);
      
      // Preparar planilhas
      const clientesSheet = utils.json_to_sheet(clientes);
      
      // Preparar dados de posições com nomes de ativos
      const posicoesProcessadas = posicoes.map(p => ({
        ...p,
        nomeAtivo: p.ativoId ? ativosMap.get(p.ativoId)?.nome || "Desconhecido" : "Desconhecido",
        dataAtualizacao: p.dataAtualizacao.toISOString()
      }));
      const posicoesSheet = utils.json_to_sheet(posicoesProcessadas);
      
      const ativosSheet = utils.json_to_sheet(ativos);
      
      const recomendacoesProcessadas = recomendacoes.map(r => ({
        ...r,
        data: r.data.toISOString()
      }));
      const recomendacoesSheet = utils.json_to_sheet(recomendacoesProcessadas);
      
      // Criar workbook
      const wb = utils.book_new();
      utils.book_append_sheet(wb, clientesSheet, "Clientes");
      utils.book_append_sheet(wb, posicoesSheet, "Posições");
      utils.book_append_sheet(wb, ativosSheet, "Ativos");
      utils.book_append_sheet(wb, recomendacoesSheet, "Recomendações");
      
      setExportProgress(90);
      
      // Exportar arquivo
      const now = new Date();
      const fileName = `investt_export_${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      setExportProgress(100);
      
      toast({
        title: "Exportação concluída",
        description: `Dados exportados para ${fileName}`
      });
      
    } catch (error) {
      console.error("Erro na exportação:", error);
      toast({
        variant: "destructive",
        title: "Erro na exportação",
        description: "Não foi possível exportar os dados"
      });
    } finally {
      setExporting(false);
      setExportProgress(0);
    }
  };

  // Handler para seleção de arquivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Verificar extensão do arquivo
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (fileExt !== 'xlsx' && fileExt !== 'xls' && fileExt !== 'csv') {
      toast({
        variant: "destructive",
        title: "Formato inválido",
        description: "Por favor, selecione um arquivo Excel (.xlsx/.xls) ou CSV"
      });
      return;
    }
    
    importPositions(file);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Importação e Exportação</h1>
          <p className="text-muted-foreground">
            Transfira dados entre sistemas ou para análise externa
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="import">Importar Dados</TabsTrigger>
          <TabsTrigger value="export">Exportar Dados</TabsTrigger>
        </TabsList>
        
        <TabsContent value="import">
          <Card>
            <CardHeader>
              <CardTitle>Importar Carteira</CardTitle>
              <CardDescription>
                Importe posições de ativos de arquivos Excel ou CSV
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Formato necessário</AlertTitle>
                  <AlertDescription>
                    O arquivo deve conter as colunas: cliente_id, ativo, quantidade, preco_medio.
                    Colunas opcionais: tipo, categoria, descricao.
                  </AlertDescription>
                </Alert>
                
                {importing ? (
                  <div className="space-y-2">
                    <Progress value={importProgress} className="w-full" />
                    <p className="text-sm text-muted-foreground">Importando dados...</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-full">
                    <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <FileUp className="w-8 h-8 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                          <span className="font-semibold">Clique para selecionar</span> ou arraste o arquivo
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Excel (.xlsx/.xls) ou CSV
                        </p>
                      </div>
                      <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept=".xlsx,.xls,.csv" />
                    </label>
                  </div>
                )}
                
                {importResult && (
                  <Alert variant={importResult.status === "error" ? "destructive" : (importResult.status === "warning" ? "default" : "default")}>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{importResult.message}</AlertTitle>
                    <AlertDescription>
                      {importResult.imported && <div>Posições importadas: {importResult.imported}</div>}
                      {importResult.errors && <div>Erros: {importResult.errors}</div>}
                      {importResult.warnings && <div>Avisos: {importResult.warnings}</div>}
                      
                      {importResult.details && importResult.details.length > 0 && (
                        <details className="mt-2">
                          <summary className="text-sm font-medium cursor-pointer">Detalhes</summary>
                          <ul className="mt-2 text-sm space-y-1 list-disc list-inside">
                            {importResult.details.slice(0, 10).map((detail, i) => (
                              <li key={i}>{detail}</li>
                            ))}
                            {importResult.details.length > 10 && (
                              <li>...e mais {importResult.details.length - 10} itens</li>
                            )}
                          </ul>
                        </details>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => document.getElementById('file-upload')?.click()} disabled={importing}>
                <Upload className="mr-2 h-4 w-4" />
                Selecionar Arquivo
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="export">
          <Card>
            <CardHeader>
              <CardTitle>Exportar Dados</CardTitle>
              <CardDescription>
                Exporte todos os dados do sistema para análise externa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <FileSpreadsheet className="h-4 w-4" />
                  <AlertTitle>Exportação completa</AlertTitle>
                  <AlertDescription>
                    Este processo exportará todos os dados: clientes, posições, ativos e recomendações para um arquivo Excel.
                  </AlertDescription>
                </Alert>
                
                {exporting && (
                  <div className="space-y-2">
                    <Progress value={exportProgress} className="w-full" />
                    <p className="text-sm text-muted-foreground">Exportando dados...</p>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={exportAllData} disabled={exporting}>
                <Download className="mr-2 h-4 w-4" />
                Exportar Todos os Dados
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ImportExportManager; 