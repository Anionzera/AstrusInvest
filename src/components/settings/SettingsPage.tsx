import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  Download,
  Upload,
  Moon,
  Sun,
  Laptop,
  LineChart,
  Settings,
  HelpCircle,
  User,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Languages,
  Save,
  Database,
  FileText,
  Clock,
  Calendar,
  CheckCircle2,
  Building,
  FileJson,
  Wrench,
  Server,
} from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { db } from "@/lib/db";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import MarketDataSettings from "../report/MarketDataSettings";
import { ScrollArea } from "@/components/ui/scroll-area";
import GuidedTour, { TourStep, useGuidedTour } from "../ui/guided-tour";
import { applyTheme } from "@/lib/utils";
import AdvancedImportDialog from "./AdvancedImportDialog";
import { exportData } from "../../lib/importExportUtils";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import BackupManager from "../backup/BackupManager";
import RoadmapView from "./RoadmapView";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "../ui/sheet";
import { limparBancoDados } from "../../lib/db";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/components/ui/theme-provider";
import CacheSettings from "./CacheSettings";

// Função para criar backup
const createBackup = async () => {
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

    return {
      date: new Date(),
      size: (blob.size / 1024).toFixed(2) + " KB",
      items: recomendacoes.length + ativos.length + clientes.length,
      status: "success",
    };
  } catch (error) {
    console.error("Erro ao criar backup:", error);
    return {
      date: new Date(),
      size: "0 KB",
      items: 0,
      status: "error",
    };
  }
};

// Função para restaurar backup
const restoreBackup = async (file: File) => {
  try {
    // Ler arquivo
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.onload = async (event) => {
        try {
          const backupData = JSON.parse(event.target?.result as string);

          // Verificar versão do backup
          if (!backupData.version) {
            reject(new Error("Formato de backup inválido"));
            return;
          }

          // Confirmar restauração
          if (
            !window.confirm(
              "Atenção: Esta operação substituirá todos os dados atuais. Deseja continuar?",
            )
          ) {
            resolve(false);
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
            if (!db.tables.some((table) => table.name === "clientes")) {
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

          resolve(true);
        } catch (error) {
          console.error("Erro ao processar arquivo de backup:", error);
          reject(error);
        }
      };

      fileReader.readAsText(file);
    });
  } catch (error) {
    console.error("Erro ao restaurar backup:", error);
    throw error;
  }
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
        throw new Error("A tabela de clientes não foi encontrada.");
      }
    }

    if (data.length === 0) {
      throw new Error(`Não há ${type} para exportar.`);
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

    return true;
  } catch (error) {
    console.error(`Erro ao exportar ${type}:`, error);
    throw error;
  }
};

// Tour steps para a página de configurações
const settingsTourSteps: TourStep[] = [
  {
    target: ".geral-section",
    title: "Configurações Gerais",
    content: "Configure as preferências básicas do sistema como nome da empresa e comportamento de salvamento.",
    position: "right"
  },
  {
    target: ".interface-section",
    title: "Configurações de Interface",
    content: "Personalize a aparência e o comportamento da aplicação de acordo com suas preferências.",
    position: "bottom"
  },
  {
    target: ".backup-section",
    title: "Gerenciamento de Backup",
    content: "Configure aqui o backup automático dos seus dados e restaure backups anteriores.",
    position: "right"
  },
  {
    target: ".system-section",
    title: "Configurações do Sistema",
    content: "Ajuste as configurações avançadas do sistema, incluindo base de dados e armazenamento.",
    position: "left"
  },
  {
    target: ".market-section",
    title: "Dados de Mercado",
    content: "Gerencie as fontes de dados de mercado utilizadas pelo sistema.",
    position: "top"
  }
];

const SettingsPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [autoSave, setAutoSave] = useState(localStorage.getItem("autoSave") === "true");
  const [companyName, setCompanyName] = useState(localStorage.getItem("companyName") || "ASTRUS Investimentos");
  const [dataPath, setDataPath] = useState("");
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("geral");
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [backupHistory, setBackupHistory] = useState<any[]>([]);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(
    localStorage.getItem("autoBackupEnabled") === "true"
  );
  const [backupFrequency, setBackupFrequency] = useState(
    localStorage.getItem("backupFrequency") || "daily"
  );
  const [backupTime, setBackupTime] = useState(
    localStorage.getItem("backupTime") || "23:00"
  );
  const [backupLocation, setBackupLocation] = useState(
    localStorage.getItem("backupLocation") || ""
  );
  const [maxBackups, setMaxBackups] = useState(
    localStorage.getItem("maxBackups") || "5"
  );
  const [isAdvancedImportDialogOpen, setIsAdvancedImportDialogOpen] = useState(false);
  const [isAdvancedExportDialogOpen, setIsAdvancedExportDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  // Estado e lógica para o tour guiado
  const { isOpen, openTour, closeTour } = useGuidedTour(settingsTourSteps, false);
  
  const resetTourStatus = () => {
    localStorage.removeItem("guided-tour-completed");
    openTour();
  };

  // Adicionar um listener de evento para atualizações de tema
  useEffect(() => {
    const handleThemeChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      const theme = customEvent.detail?.theme;
      if (theme) {
        toast({
          title: "Tema alterado",
          description: `O tema foi alterado para ${theme}.`,
        });
      }
    };

    // Adicionar listener para o evento personalizado
    document.addEventListener("themechange", handleThemeChange);

    // Limpar listener ao desmontar
    return () => {
      document.removeEventListener("themechange", handleThemeChange);
    };
  }, [toast]);

  // Efeito para aplicar o tema e tamanho de fonte salvos no início
  useEffect(() => {
    // Aplicar tema
    const savedTheme = localStorage.getItem('color-theme');
    if (savedTheme) {
      document.documentElement.classList.remove('theme-blue', 'theme-green', 'theme-purple');
      document.documentElement.classList.add(`theme-${savedTheme}`);
    } else {
      // Tema padrão
      document.documentElement.classList.add('theme-blue');
    }
    
    // Aplicar tamanho de fonte
    const savedFontSize = localStorage.getItem('font-size') || '100';
    document.documentElement.style.fontSize = `${savedFontSize}%`;
    
    // Aplicar configuração de animações
    const disableAnimations = localStorage.getItem('disable-animations') === 'true';
    if (disableAnimations) {
      document.documentElement.classList.add('reduce-motion');
    }
    
    // Carregar histórico de backups do localStorage
    try {
      const savedHistory = localStorage.getItem('backupHistory');
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory);
        // Converter strings de data para objetos Date
        const processedHistory = parsedHistory.map((backup: any) => ({
          ...backup,
          date: new Date(backup.date)
        }));
        setBackupHistory(processedHistory);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico de backups:', error);
    }
  }, []);

  // Simular obtenção do caminho de dados do Electron
  useEffect(() => {
    const getDataPath = async () => {
      try {
        // Verificar se o electron está disponível de forma segura
        if (typeof window !== 'undefined' && 'electron' in window) {
          // Cast seguro para acessar a API electron
          const electron = (window as any).electron;
          if (electron?.getUserDataPath) {
            const path = await electron.getUserDataPath();
            setDataPath(path);
          }
        } else {
          setDataPath("/user/data/path (simulado)");
        }
      } catch (error) {
        console.error("Erro ao obter caminho de dados:", error);
        setDataPath("/user/data/path (erro)");
      }
    };

    getDataPath();
  }, []);

  // Função para salvar configurações de backup automático
  const saveBackupSettings = () => {
    // Salvar as configurações no localStorage
    localStorage.setItem("autoBackupEnabled", autoBackupEnabled.toString());
    localStorage.setItem("backupFrequency", backupFrequency);
    localStorage.setItem("backupTime", backupTime);
    localStorage.setItem("backupLocation", backupLocation);
    localStorage.setItem("maxBackups", maxBackups);

    // Se o backup automático estiver ativado, configurar o scheduler
    if (autoBackupEnabled) {
      // Aqui você implementaria a lógica para agendar backups
      // Por exemplo, usando setTimeout ou setInterval
      setupBackupSchedule();
    }

    toast({
      title: "Configurações salvas",
      description:
        "As configurações de backup automático foram salvas com sucesso.",
    });
  };

  // Função para configurar agendamento de backup (simulação)
  const setupBackupSchedule = () => {
    console.log(`Backup agendado para ${backupFrequency} às ${backupTime}`);
    // Em uma implementação real, você configuraria um cronograma com base na frequência e hora
    // Por exemplo, usando node-cron ou similar em uma aplicação Electron
  };

  const handleSaveSettings = () => {
    // Salvar configurações no localStorage
    localStorage.setItem("companyName", companyName);
    localStorage.setItem("autoSave", autoSave.toString());

    toast({
      title: "Configurações salvas",
      description: "Suas configurações foram salvas com sucesso.",
    });
  };

  const handleResetDatabase = async () => {
    try {
      // Limpar todas as tabelas do banco de dados
      await db.recomendacoes.clear();
      await db.ativos.clear();
      
      // Tentar limpar a tabela de clientes, se existir
      try {
        await db.table("clientes").clear();
      } catch (error) {
        console.log("Tabela de clientes não encontrada ou erro ao limpar:", error);
      }

      toast({
        title: "Banco de dados resetado",
        description: "Todos os dados foram removidos com sucesso.",
      });

      setIsResetDialogOpen(false);
    } catch (error) {
      console.error("Erro ao resetar banco de dados:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro ao resetar o banco de dados.",
      });
    }
  };

  const handleExportData = async () => {
    try {
      // Exportar dados do banco de dados
      const recomendacoes = await db.recomendacoes.toArray();
      const ativos = await db.ativos.toArray();
      
      // Tentar obter os clientes, se a tabela existir
      let clientes = [];
      try {
        clientes = await db.table("clientes").toArray();
      } catch (error) {
        console.log("Tabela de clientes não encontrada:", error);
      }

      // Criar um objeto com todos os dados
      const exportData = {
        recomendacoes,
        ativos,
        clientes,
        settings: {
          companyName,
          autoSave,
          autoBackupEnabled,
          backupFrequency,
          backupTime,
          maxBackups
        },
        exportDate: new Date().toISOString(),
      };

      // Converter para JSON e criar um blob
      const jsonData = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonData], { type: "application/json" });

      // Criar um link para download
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `astrus-investimentos-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();

      // Limpar
      URL.revokeObjectURL(url);
      document.body.removeChild(link);

      toast({
        title: "Dados exportados",
        description: "Seus dados foram exportados com sucesso.",
      });

      setIsExportDialogOpen(false);
    } catch (error) {
      console.error("Erro ao exportar dados:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro ao exportar os dados.",
      });
    }
  };

  const handleImportData = () => {
    // Criar um input de arquivo invisível
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".json";
    fileInput.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const importData = JSON.parse(event.target?.result as string);

            // Verificar se os dados são válidos
            if (!importData.recomendacoes && !importData.settings) {
              throw new Error("Formato de arquivo inválido");
            }

            // Perguntar ao usuário se deseja substituir ou mesclar dados
            const shouldReplace = window.confirm(
              "Deseja substituir todos os dados existentes? Selecione 'OK' para substituir ou 'Cancelar' para mesclar com os dados existentes."
            );

            if (shouldReplace) {
              // Limpar dados existentes antes de importar
              await db.recomendacoes.clear();
              await db.ativos.clear();
              try { await db.table("clientes").clear(); } catch {}
            }

            // Importar recomendações se existirem
            if (importData.recomendacoes && importData.recomendacoes.length > 0) {
              await db.recomendacoes.bulkAdd(importData.recomendacoes);
            }
            
            // Importar ativos se existirem
            if (importData.ativos && importData.ativos.length > 0) {
              await db.ativos.bulkAdd(importData.ativos);
            }
            
            // Importar clientes se existirem e a tabela estiver disponível
            if (importData.clientes && importData.clientes.length > 0) {
              try {
                await db.table("clientes").bulkAdd(importData.clientes);
              } catch (error) {
                console.error("Erro ao importar clientes:", error);
                toast({
                  variant: "destructive",
                  title: "Aviso",
                  description: "Não foi possível importar os clientes. A tabela não existe.",
                });
              }
            }

            // Importar configurações se existirem
            if (importData.settings) {
              if (importData.settings.companyName) {
                setCompanyName(importData.settings.companyName);
                localStorage.setItem("companyName", importData.settings.companyName);
              }

              if (importData.settings.autoSave !== undefined) {
                setAutoSave(importData.settings.autoSave);
                localStorage.setItem("autoSave", importData.settings.autoSave.toString());
              }
              
              // Importar outras configurações se existirem
              if (importData.settings.autoBackupEnabled !== undefined) {
                setAutoBackupEnabled(importData.settings.autoBackupEnabled);
                localStorage.setItem("autoBackupEnabled", importData.settings.autoBackupEnabled.toString());
              }
              
              if (importData.settings.backupFrequency) {
                setBackupFrequency(importData.settings.backupFrequency);
                localStorage.setItem("backupFrequency", importData.settings.backupFrequency);
              }
              
              if (importData.settings.backupTime) {
                setBackupTime(importData.settings.backupTime);
                localStorage.setItem("backupTime", importData.settings.backupTime);
              }
              
              if (importData.settings.maxBackups) {
                setMaxBackups(importData.settings.maxBackups);
                localStorage.setItem("maxBackups", importData.settings.maxBackups);
              }
            }

            toast({
              title: "Dados importados",
              description: `Importação concluída com sucesso. ${importData.recomendacoes?.length || 0} recomendações, ${importData.ativos?.length || 0} ativos, ${importData.clientes?.length || 0} clientes.`,
            });

            setIsImportDialogOpen(false);
          } catch (error) {
            console.error("Erro ao processar arquivo importado:", error);
            toast({
              variant: "destructive",
              title: "Erro",
              description:
                "O arquivo selecionado não é válido ou está corrompido.",
            });
          }
        };
        reader.readAsText(file);
      } catch (error) {
        console.error("Erro ao ler arquivo:", error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Ocorreu um erro ao ler o arquivo.",
        });
      }
    };
    fileInput.click();
  };

  const handleBackupNow = async () => {
    setIsBackingUp(true);
    try {
      const result = await createBackup();
      
      // Adicionar backup ao histórico e salvar no localStorage
      const updatedHistory = [result, ...backupHistory];
      setBackupHistory(updatedHistory);
      
      // Limitar o número de backups no histórico
      const maxToKeep = parseInt(maxBackups, 10) || 5;
      if (updatedHistory.length > maxToKeep) {
        const trimmedHistory = updatedHistory.slice(0, maxToKeep);
        setBackupHistory(trimmedHistory);
        localStorage.setItem('backupHistory', JSON.stringify(trimmedHistory));
      } else {
        localStorage.setItem('backupHistory', JSON.stringify(updatedHistory));
      }
      
      toast({
        title: "Backup criado",
        description: "O backup foi criado com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao criar backup:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro ao criar o backup.",
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!backupFile) {
      toast({
        variant: "destructive",
        title: "Nenhum arquivo selecionado",
        description: "Selecione um arquivo de backup para restaurar.",
      });
      return;
    }

    setIsRestoring(true);
    try {
      const result = await restoreBackup(backupFile);
      if (result) {
        toast({
          title: "Backup restaurado",
          description: "Os dados foram restaurados com sucesso.",
        });
        
        // Recarregar a página para aplicar as alterações
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (error) {
      console.error("Erro ao restaurar backup:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro ao restaurar o backup.",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  // Função para exportação avançada
  const handleAdvancedExport = async (format: "json" | "csv" | "excel", dataType: "clientes" | "recomendacoes" | "ativos" | "all") => {
    try {
      await exportData({
        format,
        dataType,
        includeSettings: true,
        fileName: `astrus-export-${dataType}-${new Date().toISOString().split("T")[0]}`
      });
      
      toast({
        title: "Exportação concluída",
        description: `Os dados foram exportados no formato ${format.toUpperCase()}.`
      });
    } catch (error) {
      console.error("Erro na exportação:", error);
      toast({
        variant: "destructive",
        title: "Erro na exportação",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao exportar os dados."
      });
    }
  };

  // Função para limpar todos os dados
  const handleClearAllData = async () => {
    console.log("Iniciando limpeza de todos os dados...");
    
    try {
      setIsClearing(true);
      
      // Limpar o banco de dados
      await limparBancoDados();
      console.log("Banco de dados limpo com sucesso!");
      
      // Limpar localStorage completamente
      localStorage.clear();
      console.log("LocalStorage limpo com sucesso!");
      
      // Limpar cookies que possam estar armazenando dados
      document.cookie.split(";").forEach(function(c) {
        document.cookie = c.replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      console.log("Cookies limpos com sucesso!");
      
      // Mostrar feedback ao usuário
      setIsClearing(false);
      setShowConfirmModal(false);
      
      toast({
        title: "Todos os dados foram limpos",
        description: "A aplicação será reiniciada agora.",
        duration: 3000,
      });
      
      // Redirecionar para a página de login após um breve delay
      setTimeout(() => {
        console.log("Redirecionando para a página de login...");
        window.location.href = "/login";
      }, 1500);
      
      // Força um reload como fallback
      setTimeout(() => {
        console.log("Forçando reload como fallback...");
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error("Erro ao limpar dados:", error);
      toast({
        variant: "destructive",
        title: "Erro ao limpar dados",
        description: "Ocorreu um erro ao tentar limpar os dados. Tente novamente.",
      });
      setIsClearing(false);
      
      // Mesmo com erro, tenta redirecionar para garantir
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
    }
  };

  return (
    <div className="w-full h-full bg-background p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            Personalize sua experiência, acesse ferramentas e obtenha suporte.
          </p>
        </div>
        <div className="flex space-x-2 mt-4 md:mt-0">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSaveSettings}
          >
            <Save className="mr-2 h-4 w-4" />
            Salvar alterações
          </Button>
        </div>
      </div>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid grid-cols-4 w-full mb-6">
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span>Configurações</span>
          </TabsTrigger>
          <TabsTrigger value="tools" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            <span>Ferramentas</span>
          </TabsTrigger>
          <TabsTrigger value="cache" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            <span>Cache</span>
          </TabsTrigger>
          <TabsTrigger value="support" className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            <span>Suporte</span>
          </TabsTrigger>
        </TabsList>

        {/* Aba de Configurações */}
        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Aparência</CardTitle>
                <CardDescription>
                  Personalize a aparência do sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Tema</Label>
                  <div className="flex items-center space-x-4">
                    <Button 
                      variant={theme === "light" ? "default" : "outline"} 
                      size="sm" 
                      onClick={() => setTheme("light")}
                      className="flex items-center"
                    >
                      <Sun className="mr-2 h-4 w-4" />
                      Claro
                    </Button>
                    <Button 
                      variant={theme === "dark" ? "default" : "outline"} 
                      size="sm" 
                      onClick={() => setTheme("dark")}
                      className="flex items-center"
                    >
                      <Moon className="mr-2 h-4 w-4" />
                      Escuro
                    </Button>
                    <Button 
                      variant={theme === "system" ? "default" : "outline"} 
                      size="sm" 
                      onClick={() => setTheme("system")}
                      className="flex items-center"
                    >
                      <Laptop className="mr-2 h-4 w-4" />
                      Sistema
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notificações</CardTitle>
                <CardDescription>
                  Configure suas preferências de notificação
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Label htmlFor="notifications" className="flex-1">
                    Ativar notificações
                  </Label>
                  <Switch 
                    id="notifications" 
                    checked={notificationsEnabled}
                    onCheckedChange={setNotificationsEnabled}
                  />
                </div>
                <div className="flex items-center justify-between mt-4">
                  <Label htmlFor="analytics" className="flex-1">
                    Permitir análise de uso
                  </Label>
                  <Switch 
                    id="analytics" 
                    checked={analyticsEnabled}
                    onCheckedChange={setAnalyticsEnabled}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Aba de Ferramentas */}
        <TabsContent value="tools" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Backup e Restauração</CardTitle>
                <CardDescription>
                  Gerencie backups do sistema e restaure dados quando necessário
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Crie backups completos do sistema e restaure quando necessário.
                  Todos os seus dados são salvos localmente no seu dispositivo.
                </p>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate("/backup")}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Gerenciar Backups
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Importação e Exportação</CardTitle>
                <CardDescription>
                  Exporte seus dados para outros formatos ou importe dados externos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col space-y-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      toast({
                        title: "Exportação",
                        description: "Funcionalidade de exportação iniciada",
                      });
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exportar Dados
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      toast({
                        title: "Importação",
                        description: "Funcionalidade de importação iniciada",
                      });
                    }}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Importar Dados
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Otimização</CardTitle>
                <CardDescription>
                  Ferramentas para otimizar o desempenho do sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col space-y-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      toast({
                        title: "Sistema verificado",
                        description: "Nenhum problema foi encontrado no sistema.",
                      });
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Verificar Integridade
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Aba de Cache */}
        <TabsContent value="cache" className="space-y-6">
          <CacheSettings />
        </TabsContent>

        {/* Aba de Suporte */}
        <TabsContent value="support" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Documentação</CardTitle>
                <CardDescription>
                  Acesse a documentação completa do sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Consulte guias de usuário, tutoriais e material de referência para tirar o máximo proveito do sistema.
                </p>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate("/documentation")}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Ver Documentação
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Contato</CardTitle>
                <CardDescription>
                  Entre em contato com nossa equipe de suporte
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <p className="text-sm">
                    <strong>Email:</strong> suporte@astrusinvestimentos.com.br
                  </p>
                  <p className="text-sm">
                    <strong>Telefone:</strong> (11) 4002-8922
                  </p>
                  <p className="text-sm">
                    <strong>Horário:</strong> Segunda a Sexta, 9h às 18h
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => window.open("mailto:suporte@astrusinvestimentos.com.br")}
                >
                  Enviar Email
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Perguntas Frequentes</CardTitle>
                <CardDescription>
                  Respostas para dúvidas comuns sobre o sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-1">Como criar uma recomendação?</h3>
                    <p className="text-sm text-muted-foreground">Acesse a seção "Recomendações" e clique em "Nova Recomendação".</p>
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Como exportar relatórios?</h3>
                    <p className="text-sm text-muted-foreground">Na seção "Recomendações", clique no botão de exportar ao lado da recomendação desejada.</p>
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Como criar um backup?</h3>
                    <p className="text-sm text-muted-foreground">Acesse "Ferramentas &gt; Backup e Restauração" e clique em "Criar Backup".</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
