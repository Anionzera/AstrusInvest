import React, { useState, useEffect } from "react";
import { 
  Search, 
  UserPlus, 
  Users, 
  RefreshCw,
  User,
  Calendar,
  Mail,
  Phone,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  X,
  Filter,
  Sparkles,
  Shield,
  TrendingUp,
  BarChart3,
  Rocket,
  Info,
  PieChart,
  Clock,
  Target,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter 
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Cliente, db } from "@/lib/db";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ClientSelectorProps {
  onClientSelect: (client: Cliente | null) => void;
  initialClientId?: string;
  selectedClientId?: string;
  required?: boolean;
  label?: string;
}

const ClientSelector: React.FC<ClientSelectorProps> = ({ 
  onClientSelect,
  initialClientId,
  selectedClientId,
  required = false,
  label
}) => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  const [filter, setFilter] = useState<"todos" | "ativos" | "inativos">("ativos");
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Carregar clientes do banco de dados
  useEffect(() => {
    const loadClientes = async () => {
      try {
        setIsLoading(true);
        const allClientes = await db.clientes.toArray();

        // Ordenar por nome (ordem alfabética)
        allClientes.sort((a, b) => a.nome.localeCompare(b.nome));
        
        setClientes(allClientes);
        setFilteredClientes(allClientes.filter(cliente => cliente.ativo));
        
        // Se tiver um initialClientId ou selectedClientId, selecionar o cliente correspondente
        const clientIdToSelect = selectedClientId || initialClientId;
        if (clientIdToSelect) {
          const initialClient = allClientes.find(c => c.id === clientIdToSelect);
          if (initialClient) {
            setSelectedClient(initialClient);
            onClientSelect(initialClient);
          }
        }
        
        setError(null);
      } catch (err) {
        console.error("Erro ao carregar clientes:", err);
        setError("Não foi possível carregar a lista de clientes.");
      } finally {
        setIsLoading(false);
      }
    };

    loadClientes();
  }, [initialClientId, selectedClientId, onClientSelect]);

  // Filtrar clientes com base na busca e no filtro de status
  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();
    
    let filtered = clientes;
    
    // Aplicar filtro de status
    if (filter === "ativos") {
      filtered = filtered.filter(cliente => cliente.ativo);
    } else if (filter === "inativos") {
      filtered = filtered.filter(cliente => !cliente.ativo);
    }
    
    // Aplicar filtro de busca
    if (query) {
      filtered = filtered.filter(
        cliente => 
          cliente.nome.toLowerCase().includes(query) ||
          cliente.email.toLowerCase().includes(query) ||
          (cliente.telefone && cliente.telefone.includes(query))
      );
    }
    
    setFilteredClientes(filtered);
  }, [clientes, searchQuery, filter]);

  // Quando um cliente é selecionado
  const handleClientSelect = (client: Cliente) => {
    // Apenas atualiza o estado interno do componente, sem chamar o callback
    setSelectedClient(client);
  };

  // Confirmar a seleção do cliente apenas quando o botão for clicado
  const confirmClientSelection = () => {
    if (selectedClient) {
      // Chamar a função de callback com o cliente selecionado
      onClientSelect(selectedClient);
      
      // Feedback visual para o usuário
      toast.success(`${selectedClient.nome} selecionado com sucesso!`);
    }
  };

  // Formatar data de nascimento
  const formatBirthDate = (date: Date | string | undefined) => {
    if (!date) return "Não informada";
    
    try {
      return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
    } catch (err) {
      return "Data inválida";
    }
  };

  // Renovar busca
  const refreshClientes = async () => {
    try {
      setIsLoading(true);
      const allClientes = await db.clientes.toArray();
      allClientes.sort((a, b) => a.nome.localeCompare(b.nome));
      setClientes(allClientes);
      setError(null);
    } catch (err) {
      console.error("Erro ao atualizar lista de clientes:", err);
      setError("Erro ao atualizar lista de clientes.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Gerar iniciais para avatar
  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };
  
  // Gerar cor de fundo para avatar baseado no nome
  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-blue-500", "bg-green-500", "bg-purple-500", 
      "bg-pink-500", "bg-yellow-500", "bg-red-500",
      "bg-indigo-500", "bg-orange-500", "bg-teal-500"
    ];
    
    // Hash simples do nome para escolher cor
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };
  
  // Renderizar badge de perfil de risco
  const renderRiskProfileBadge = (profile?: string) => {
    if (!profile) return <Badge variant="outline">Não definido</Badge>;
    
    const profileColors: Record<string, string> = {
      "conservador": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 border-blue-200",
      "moderado": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 border-green-200",
      "arrojado": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300 border-orange-200",
      "agressivo": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 border-red-200"
    };
    
    const profileIcons: Record<string, React.ReactNode> = {
      "conservador": <Shield className="h-3 w-3 mr-1" />,
      "moderado": <TrendingUp className="h-3 w-3 mr-1" />,
      "arrojado": <BarChart3 className="h-3 w-3 mr-1" />,
      "agressivo": <Rocket className="h-3 w-3 mr-1" />
    };
    
    return (
      <Badge className={cn("font-medium flex items-center", profileColors[profile.toLowerCase()] || "bg-gray-100 text-gray-800")}>
        {profileIcons[profile.toLowerCase()] || <User className="h-3 w-3 mr-1" />}
        {profile}
      </Badge>
    );
  };
  
  // Obter descritivo do perfil de risco
  const getProfileDescription = (profile?: string): string => {
    if (!profile) return "Perfil de risco ainda não definido para este cliente.";
    
    const descriptions: Record<string, string> = {
      "conservador": "Investidor com baixa tolerância a risco que prioriza a preservação do capital e segurança.",
      "moderado": "Investidor com média tolerância a risco que busca crescimento moderado com alguma segurança.",
      "arrojado": "Investidor com alta tolerância a risco que busca crescimento significativo aceitando maior volatilidade.",
      "agressivo": "Investidor com muito alta tolerância a risco que busca máximo retorno aceitando perdas significativas."
    };
    
    return descriptions[profile.toLowerCase()] || "Perfil personalizado do investidor.";
  };
  
  // Obter estimativa de alocação recomendada por perfil
  const getProfileAllocation = (profile?: string) => {
    if (!profile) return null;
    
    const allocations: Record<string, Array<{name: string, value: number, color: string}>> = {
      "conservador": [
        { name: "Renda Fixa", value: 70, color: "bg-blue-500" },
        { name: "Renda Variável", value: 15, color: "bg-green-500" },
        { name: "Alternativos", value: 15, color: "bg-purple-500" }
      ],
      "moderado": [
        { name: "Renda Fixa", value: 50, color: "bg-blue-500" },
        { name: "Renda Variável", value: 35, color: "bg-green-500" },
        { name: "Alternativos", value: 15, color: "bg-purple-500" }
      ],
      "arrojado": [
        { name: "Renda Fixa", value: 30, color: "bg-blue-500" },
        { name: "Renda Variável", value: 50, color: "bg-green-500" },
        { name: "Alternativos", value: 20, color: "bg-purple-500" }
      ],
      "agressivo": [
        { name: "Renda Fixa", value: 10, color: "bg-blue-500" },
        { name: "Renda Variável", value: 70, color: "bg-green-500" },
        { name: "Alternativos", value: 20, color: "bg-purple-500" }
      ]
    };
    
    return allocations[profile.toLowerCase()];
  };

  return (
    <Card className="overflow-hidden border-border/50 shadow-sm">
      <CardHeader className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 pb-4">
        <div className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2 text-blue-900 dark:text-blue-100">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              {label || "Selecionar Cliente"}
              {required && <span className="text-red-500">*</span>}
            </CardTitle>
            <CardDescription>
              Selecione um cliente para criar uma recomendação personalizada
            </CardDescription>
          </div>
          
          <div className="flex space-x-2">
            <Tabs defaultValue="card" className="w-[140px]">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="card" onClick={() => setViewMode("card")}>
                  <Sparkles className="h-4 w-4 mr-1" />
                </TabsTrigger>
                <TabsTrigger value="list" onClick={() => setViewMode("list")}>
                  <Users className="h-4 w-4 mr-1" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <div className="relative flex-grow">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou telefone..."
              className="pl-8 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex space-x-2">
            <Select
              value={filter}
              onValueChange={(value) => setFilter(value as "todos" | "ativos" | "inativos")}
            >
              <SelectTrigger className="w-[130px] bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativos">Ativos</SelectItem>
                <SelectItem value="inativos">Inativos</SelectItem>
              </SelectContent>
            </Select>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={refreshClientes}
                    className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Atualizar lista</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Estado de carregamento */}
        {isLoading && (
          <div className="flex flex-col justify-center items-center py-16 text-blue-600 dark:text-blue-400">
            <RefreshCw className="h-12 w-12 animate-spin mb-4" />
            <p className="text-lg font-medium">Carregando clientes...</p>
          </div>
        )}
        
        {/* Mensagem de erro */}
        {error && (
          <div className="m-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Erro</h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-200">{error}</div>
                <div className="mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={refreshClientes}
                    className="text-red-600 dark:text-red-400 border-red-300 dark:border-red-700"
                  >
                    Tentar novamente
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Lista de clientes */}
        {!isLoading && !error && (
          <>
            {filteredClientes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <Users className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Nenhum cliente encontrado
                </h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">
                  {searchQuery 
                    ? "Tente ajustar os critérios de busca para encontrar o cliente desejado."
                    : "Cadastre um cliente para começar a criar recomendações personalizadas."}
                </p>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    // Aqui poderia navegar para a página de cadastro de clientes
                    // navigate('/clients/new')
                  }}
                >
                  <UserPlus size={16} />
                  <span>Cadastrar Novo Cliente</span>
                </Button>
              </div>
            ) : (
              <div className="p-4">
                <AnimatePresence mode="wait">
                  {viewMode === "card" ? (
                    <motion.div
                      key="card-view"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                    >
                      {filteredClientes.map((cliente) => (
                        <motion.div
                          key={cliente.id}
                          whileHover={{ y: -4 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Card 
                            className={cn(
                              "cursor-pointer h-full transition-all duration-200 overflow-hidden",
                              selectedClient?.id === cliente.id 
                                ? "border-2 border-blue-400 dark:border-blue-600 shadow-md shadow-blue-100 dark:shadow-blue-900/20"
                                : "border border-border/50 hover:border-blue-200 dark:hover:border-blue-800"
                            )}
                            onClick={() => handleClientSelect(cliente)}
                          >
                            <CardContent className="p-0">
                              <div className="relative">
                                {/* Barra superior colorida */}
                                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-400 to-indigo-500" />
                                
                                {/* Conteúdo principal */}
                                <div className="pt-6 px-4 pb-4 flex flex-col items-center">
                                  <Avatar className={cn("h-16 w-16 mb-3", getAvatarColor(cliente.nome))}>
                                    <AvatarFallback className="text-white text-lg font-semibold">
                                      {getInitials(cliente.nome)}
                                    </AvatarFallback>
                                  </Avatar>
                                  
                                  <h3 className="text-lg font-semibold text-center text-gray-900 dark:text-gray-100 mb-1 line-clamp-1">
                                    {cliente.nome}
                                  </h3>
                                  
                                  <div className="flex flex-col items-center mb-3">
                                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                                      {cliente.email}
                                    </p>
                                    {cliente.telefone && (
                                      <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {cliente.telefone}
                                      </p>
                                    )}
                                  </div>
                                  
                                  <div className="flex flex-wrap gap-2 justify-center my-2">
                                    {renderRiskProfileBadge(cliente.perfilRisco)}
                                    <Badge 
                                      variant={cliente.ativo ? "default" : "destructive"}
                                      className={cliente.ativo 
                                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" 
                                        : ""
                                      }
                                    >
                                      {cliente.ativo ? "Ativo" : "Inativo"}
                                    </Badge>
                                  </div>
                                </div>
                                
                                {/* Rodapé */}
                                <div className="border-t border-border/40 bg-gray-50/80 dark:bg-gray-900/30 flex justify-between items-center px-4 py-2">
                                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    {formatBirthDate(cliente.dataNascimento)}
                                  </div>
                                  
                                  {selectedClient?.id === cliente.id && (
                                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Selecionado
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="list-view"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className="rounded-lg border border-border/50 overflow-hidden">
                        <ScrollArea className="h-[400px]">
                          <div className="divide-y divide-border/40">
                            {filteredClientes.map((cliente) => (
                              <div
                                key={cliente.id}
                                className={cn(
                                  "flex items-center p-3 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/30",
                                  selectedClient?.id === cliente.id ? "bg-blue-50 dark:bg-blue-950/30" : ""
                                )}
                                onClick={() => handleClientSelect(cliente)}
                              >
                                <div className="flex-shrink-0 mr-3">
                                  <Avatar className={cn("h-10 w-10", getAvatarColor(cliente.nome))}>
                                    <AvatarFallback className="text-white text-sm">
                                      {getInitials(cliente.nome)}
                                    </AvatarFallback>
                                  </Avatar>
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                      {cliente.nome}
                                    </h4>
                                    
                                    <div className="flex space-x-2 flex-shrink-0">
                                      {renderRiskProfileBadge(cliente.perfilRisco)}
                                      <Badge 
                                        variant={cliente.ativo ? "default" : "destructive"}
                                        className={cliente.ativo 
                                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" 
                                          : ""
                                        }
                                      >
                                        {cliente.ativo ? "Ativo" : "Inativo"}
                                      </Badge>
                                    </div>
                                  </div>
                                  
                                  <div className="flex flex-col sm:flex-row sm:items-center text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    <div className="flex items-center mr-4">
                                      <Mail className="h-3 w-3 mr-1 flex-shrink-0" />
                                      <span className="truncate">{cliente.email}</span>
                                    </div>
                                    
                                    {cliente.telefone && (
                                      <div className="flex items-center mr-4">
                                        <Phone className="h-3 w-3 mr-1 flex-shrink-0" />
                                        <span>{cliente.telefone}</span>
                                      </div>
                                    )}
                                    
                                    <div className="flex items-center">
                                      <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                                      <span>{formatBirthDate(cliente.dataNascimento)}</span>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="ml-3 flex-shrink-0">
                                  {selectedClient?.id === cliente.id ? (
                                    <CheckCircle className="h-5 w-5 text-blue-500" />
                                  ) : (
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <span className="sr-only">Selecionar</span>
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            
            {/* Informações do cliente selecionado */}
            {selectedClient && (
              <div className="px-4 pb-4">
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 flex items-center">
                      <CheckCircle className="mr-2 h-5 w-5 text-blue-600 dark:text-blue-400" />
                      Cliente Selecionado
                    </h3>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setSelectedClient(null);
                        onClientSelect(null);
                      }}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Limpar seleção
                    </Button>
                  </div>
                  
                  {/* Seção de informações pessoais */}
                  <div className="mb-5">
                    <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 flex items-center mb-3">
                      <User className="mr-2 h-4 w-4" />
                      Informações Pessoais
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-blue-700 dark:text-blue-300">Nome:</p>
                        <p className="font-medium text-blue-900 dark:text-blue-100">{selectedClient.nome}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-blue-700 dark:text-blue-300">Email:</p>
                        <p className="font-medium text-blue-900 dark:text-blue-100">{selectedClient.email}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-blue-700 dark:text-blue-300">Telefone:</p>
                        <p className="font-medium text-blue-900 dark:text-blue-100">{selectedClient.telefone || "Não informado"}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-blue-700 dark:text-blue-300">Data de Nascimento:</p>
                        <p className="font-medium text-blue-900 dark:text-blue-100">{formatBirthDate(selectedClient.dataNascimento)}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Perfil de investidor */}
                  <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border border-blue-100 dark:border-blue-900/50 mb-5">
                    <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 flex items-center mb-3">
                      <Target className="mr-2 h-4 w-4" />
                      Perfil de Investidor
                    </h4>
                    
                    <div className="flex items-center mb-3">
                      <div className="mr-3">
                        <Avatar className={cn("h-12 w-12", getAvatarColor(selectedClient.nome))}>
                          <AvatarFallback className="text-white text-base font-semibold">
                            {getInitials(selectedClient.nome)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      
                      <div>
                        <div className="mb-1">
                          {renderRiskProfileBadge(selectedClient.perfilRisco)}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {getProfileDescription(selectedClient.perfilRisco)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Representação visual do perfil */}
                    {selectedClient.perfilRisco ? (
                      <div>
                        <div className="mt-4">
                          <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                            <PieChart className="h-3 w-3 mr-1" />
                            Alocação Típica Recomendada
                          </h5>
                          
                          {getProfileAllocation(selectedClient.perfilRisco) && (
                            <div className="space-y-2">
                              {getProfileAllocation(selectedClient.perfilRisco)?.map((item, index) => (
                                <div key={index} className="space-y-1">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-600 dark:text-gray-400">{item.name}</span>
                                    <span className="font-medium text-gray-800 dark:text-gray-200">{item.value}%</span>
                                  </div>
                                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full ${item.color}`} 
                                      style={{ width: `${item.value}%` }}
                                    ></div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mt-4">
                          <div className="rounded border border-gray-200 dark:border-gray-700 p-2">
                            <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              Horizonte Sugerido
                            </h5>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {selectedClient.perfilRisco === "conservador" && "Curto a médio prazo"}
                              {selectedClient.perfilRisco === "moderado" && "Médio prazo"}
                              {selectedClient.perfilRisco === "arrojado" && "Médio a longo prazo"}
                              {selectedClient.perfilRisco === "agressivo" && "Longo prazo"}
                              {!selectedClient.perfilRisco && "Não definido"}
                            </p>
                          </div>
                          
                          <div className="rounded border border-gray-200 dark:border-gray-700 p-2">
                            <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Volatilidade Aceitável
                            </h5>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {selectedClient.perfilRisco === "conservador" && "Muito baixa"}
                              {selectedClient.perfilRisco === "moderado" && "Baixa a média"}
                              {selectedClient.perfilRisco === "arrojado" && "Média a alta"}
                              {selectedClient.perfilRisco === "agressivo" && "Alta"}
                              {!selectedClient.perfilRisco && "Não definido"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md">
                        <Info className="h-4 w-4 text-gray-400 mr-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Perfil de investidor ainda não definido
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Status do cliente */}
                  <div className="mb-3">
                    <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 flex items-center mb-2">
                      <Info className="mr-2 h-4 w-4" />
                      Status
                    </h4>
                    <Badge 
                      variant={selectedClient.ativo ? "default" : "destructive"}
                      className={cn(
                        "text-sm py-1 px-3",
                        selectedClient.ativo 
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" 
                          : ""
                      )}
                    >
                      {selectedClient.ativo ? "Cliente Ativo" : "Cliente Inativo"}
                    </Badge>
                  </div>
                  
                  <div className="mt-5">
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2"
                      onClick={confirmClientSelection}
                    >
                      Confirmar Seleção
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ClientSelector; 