import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { ScrollArea } from "../ui/scroll-area";
import { useToast } from "../ui/use-toast";
import { db } from "@/lib/db";
import {
  Download,
  Upload,
  Calendar,
  Clock,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Database,
  Settings,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { Badge } from "../ui/badge";

const BackupManager = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("backup");
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [backupHistory, setBackupHistory] = useState<any[]>([]);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [backupFrequency, setBackupFrequency] = useState("daily");
  const [backupTime, setBackupTime] = useState("23:00");
  const [backupLocation, setBackupLocation] = useState("");
  const [maxBackups, setMaxBackups] = useState("5");

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

  // Função para criar backup
  const createBackup = async () => {
    setIsBackingUp(true);
    try {
      // Obter todos os dados do banco
      const recomendacoes = await db.recomendacoes.toArray();
      const ativos = await db.ativos.toArray();

      // Verificar se existe a tabela de clientes
      let clientes = [];
      try {
        clientes = await db.table("clientes").toArray();
      } catch (error) {
        console.log("Tabela de clientes não encontrada");
      }

      // Criar objeto de backup
      const backupData = {
        version: 1,
        timestamp: new Date().toISOString(),
        data: {
          recomendacoes,
          ativos,
          clientes,
        },
      };

      // Converter para JSON
      const backupJson = JSON.stringify(backupData, null, 2);

      // Criar blob e link para download
      const blob = new Blob([backupJson], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `astrus_backup_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Registrar backup no histórico
      const newBackupHistory = [
        ...backupHistory,
        {
          date: new Date(),
          size: (blob.size / 1024).toFixed(2) + " KB",
          items: recomendacoes.length + ativos.length + clientes.length,
          status: "success",
        },
      ];
      setBackupHistory(newBackupHistory);

      toast({
        title: "Backup criado com sucesso",
        description: "O arquivo de backup foi gerado e está sendo baixado.",
      });
    } catch (error) {
      console.error("Erro ao criar backup:", error);
      toast({
        variant: "destructive",
        title: "Erro ao criar backup",
        description: "Ocorreu um erro ao gerar o arquivo de backup.",
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  // Função para restaurar backup
  const restoreBackup = async () => {
    if (!backupFile) {
      toast({
        variant: "destructive",
        title: "Nenhum arquivo selecionado",
        description:
          "Por favor, selecione um arquivo de backup para restaurar.",
      });
      return;
    }

    setIsRestoring(true);
    try {
      // Ler arquivo
      const fileReader = new FileReader();
      fileReader.onload = async (event) => {
        try {
          const backupData = JSON.parse(event.target?.result as string);

          // Verificar versão do backup
          if (!backupData.version) {
            throw new Error("Formato de backup inválido");
          }

          // Confirmar restauração
          if (
            !window.confirm(
              "Atenção: Esta operação substituirá todos os dados atuais. Deseja continuar?",
            )
          ) {
            setIsRestoring(false);
            return;
          }

          // Limpar banco de dados atual
          await db.recomendacoes.clear();
          await db.ativos.clear();

          // Verificar se existe a tabela de clientes
          try {
            await db.table("clientes").clear();
          } catch (error) {
            // Se a tabela não existir, criá-la
            if (!db.table("clientes")) {
              await db.version(db.verno + 1).stores({
                clientes: "++id, nome, email, telefone, cpf, dataCadastro",
              });
            }
          }

          // Restaurar dados
          if (backupData.data.recomendacoes?.length > 0) {
            await db.recomendacoes.bulkAdd(backupData.data.recomendacoes);
          }

          if (backupData.data.ativos?.length > 0) {
            await db.ativos.bulkAdd(backupData.data.ativos);
          }

          if (backupData.data.clientes?.length > 0) {
            await db.table("clientes").bulkAdd(backupData.data.clientes);
          }

          toast({
            title: "Backup restaurado com sucesso",
            description: "Todos os dados foram restaurados a partir do backup.",
          });
        } catch (error) {
          console.error("Erro ao processar arquivo de backup:", error);
          toast({
            variant: "destructive",
            title: "Erro ao restaurar backup",
            description:
              "O arquivo de backup parece estar corrompido ou em formato inválido.",
          });
        } finally {
          setIsRestoring(false);
        }
      };

      fileReader.readAsText(backupFile);
    } catch (error) {
      console.error("Erro ao restaurar backup:", error);
      toast({
        variant: "destructive",
        title: "Erro ao restaurar backup",
        description: "Ocorreu um erro ao processar o arquivo de backup.",
      });
      setIsRestoring(false);
    }
  };

  // Função para salvar configurações de backup automático
  const saveBackupSettings = () => {
    // Aqui seria implementada a lógica para salvar as configurações
    // Como estamos em um ambiente Electron, isso poderia ser feito usando o módulo fs
    // ou alguma biblioteca de persistência de configurações

    localStorage.setItem("autoBackupEnabled", autoBackupEnabled.toString());
    localStorage.setItem("backupFrequency", backupFrequency);
    localStorage.setItem("backupTime", backupTime);
    localStorage.setItem("backupLocation", backupLocation);
    localStorage.setItem("maxBackups", maxBackups);

    toast({
      title: "Configurações salvas",
      description:
        "As configurações de backup automático foram salvas com sucesso.",
    });
  };

  // Função para exportar dados em CSV
  const exportCSV = async (type: string) => {
    try {
      let data = [];
      let filename = "";
      let headers = "";

      if (type === "recomendacoes") {
        data = await db.recomendacoes.toArray();
        filename = "recomendacoes";
        headers =
          "ID,Título,Data,Cliente,Perfil de Risco,Horizonte,Estratégia,Status\n";
      } else if (type === "clientes") {
        try {
          data = await db.table("clientes").toArray();
          filename = "clientes";
          headers = "ID,Nome,Email,Telefone,CPF,Data de Cadastro\n";
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Erro ao exportar clientes",
            description: "A tabela de clientes não foi encontrada.",
          });
          return;
        }
      }

      if (data.length === 0) {
        toast({
          variant: "destructive",
          title: "Sem dados para exportar",
          description: `Não há ${type} para exportar.`,
        });
        return;
      }

      let csvContent = headers;

      // Converter dados para CSV
      data.forEach((item) => {
        let row = "";
        if (type === "recomendacoes") {
          row = `${item.id},"${item.titulo}",${new Date(item.data).toLocaleDateString()},"${item.nomeCliente}",${item.perfilRisco},"${item.horizonteInvestimento}","${item.estrategia}",${item.status}\n`;
        } else if (type === "clientes") {
          row = `${item.id},"${item.nome}","${item.email}","${item.telefone}","${item.cpf || ""}",${new Date(item.dataCadastro).toLocaleDateString()}\n`;
        }
        csvContent += row;
      });

      // Criar blob e link para download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Exportação concluída",
        description: `Os dados de ${type} foram exportados com sucesso em formato CSV.`,
      });
    } catch (error) {
      console.error(`Erro ao exportar ${type}:`, error);
      toast({
        variant: "destructive",
        title: "Erro na exportação",
        description: `Ocorreu um erro ao exportar os dados de ${type}.`,
      });
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Backup e Restauração</h1>
          <p className="text-muted-foreground">
            Gerencie backups e restaure dados do sistema
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
          <CardTitle>Sistema de Backup</CardTitle>
          <CardDescription>
            Faça backup e restaure dados do sistema para evitar perdas de informações
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="backup">
                <Download className="h-4 w-4 mr-2" />
                Backup
              </TabsTrigger>
              <TabsTrigger value="restore">
                <Upload className="h-4 w-4 mr-2" />
                Restauração
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="h-4 w-4 mr-2" />
                Configurações
              </TabsTrigger>
              <TabsTrigger value="export">
                <FileText className="h-4 w-4 mr-2" />
                Exportação
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="backup">
              <Card>
                <CardHeader>
                  <CardTitle>Criar Backup Manual</CardTitle>
                  <CardDescription>
                    Faça um backup completo do sistema agora
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 mb-4">
                    O processo irá exportar todos os dados do sistema em um arquivo que pode ser usado para 
                    restaurar o sistema em caso de falhas ou migração.
                  </p>
                  <Button className="w-full" onClick={createBackup}>
                    <Download className="h-4 w-4 mr-2" />
                    Iniciar Backup
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="restore">
              <Card>
                <CardHeader>
                  <CardTitle>Restaurar Backup</CardTitle>
                  <CardDescription>
                    Restaure o sistema a partir de um arquivo de backup
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 mb-4">
                    A restauração substituirá todos os dados atuais. Certifique-se de que deseja continuar.
                  </p>
                  <Button className="w-full" onClick={restoreBackup}>
                    <Upload className="h-4 w-4 mr-2" />
                    Selecionar Arquivo de Backup
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Configurações de Backup</CardTitle>
                  <CardDescription>
                    Configure o comportamento do sistema de backup
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 mb-4">
                    Ative backups automáticos e configure a frequência e local de armazenamento.
                  </p>
                  <Button className="w-full" onClick={saveBackupSettings}>
                    <Settings className="h-4 w-4 mr-2" />
                    Salvar Configurações
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="export">
              <Card>
                <CardHeader>
                  <CardTitle>Exportar Dados</CardTitle>
                  <CardDescription>
                    Exporte dados em diferentes formatos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 mb-4">
                    Exporte seus dados para CSV, Excel ou JSON para análise em outras ferramentas.
                  </p>
                  <Button className="w-full" onClick={() => exportCSV("recomendacoes")}>
                    <FileText className="h-4 w-4 mr-2" />
                    Exportar Dados
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default BackupManager;
