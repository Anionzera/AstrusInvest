import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { AlertCircle, Check, ChevronDown, Database, Eye, EyeOff, RotateCcw, Search, User, Users } from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import { db } from "@/lib/db";

// Lista mockada de usuários para demonstração
const MOCK_USERS = [
  { username: "usuario1", name: "João Silva", role: "user" },
  { username: "usuario2", name: "Maria Oliveira", role: "user" },
  { username: "vendedor1", name: "Carlos Pereira", role: "vendedor" },
  { username: "gerente1", name: "Ana Santos", role: "gerente" },
];

const AdminUserSelector = () => {
  const { user, adminAccessUserData, currentImpersonation } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<Array<{username: string, name?: string, role?: string}>>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // Verificação de permissões de admin
    if (!user?.isAdmin || !user?.hasRealAdminAccess) {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Você não tem permissões de administrador para acessar este recurso."
      });
      navigate("/");
      return;
    }

    // Carregar usuários do sistema
    const loadUsers = async () => {
      setIsLoading(true);
      try {
        // Em um sistema real, faríamos uma chamada para a API para obter a lista de usuários
        // Aqui vamos usar a lista mockada e adicionar o usuário atual
        const currentUser = {
          username: user.username,
          name: user.name || user.username,
          role: user.role
        };
        
        // Combinar o usuário atual com os usuários mockados, sem duplicar
        const allUsers = [
          currentUser, 
          ...MOCK_USERS.filter(u => u.username !== currentUser.username)
        ];
        
        setUsers(allUsers);
      } catch (error) {
        console.error("Erro ao carregar usuários:", error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível carregar a lista de usuários."
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadUsers();
  }, [user, navigate, toast]);

  // Função para impersonar um usuário
  const handleImpersonateUser = async (username: string) => {
    if (!username) return;
    
    setIsLoading(true);
    try {
      // Se o usuário selecionado for o mesmo que o impersonado atual, desativar impersonação
      if (currentImpersonation === username) {
        await adminAccessUserData(""); // Passar string vazia para reverter
        toast({
          title: "Impersonação desativada",
          description: "Você voltou ao seu usuário original."
        });
      } else {
        const success = await adminAccessUserData(username);
        
        if (success) {
          toast({
            title: "Impersonação ativada",
            description: `Você está agora visualizando o sistema como ${username}.`
          });
          
          // Fechar o popover
          setOpen(false);
          setValue(username);
          
          // Redirecionar para o dashboard com os dados do usuário
          navigate("/dashboard");
        } else {
          toast({
            variant: "destructive",
            title: "Erro",
            description: "Não foi possível acessar os dados deste usuário."
          });
        }
      }
    } catch (error) {
      console.error("Erro ao impersonar usuário:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro ao tentar impersonar este usuário."
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Função para voltar ao usuário admin original
  const handleRevertToAdmin = async () => {
    setIsLoading(true);
    try {
      await adminAccessUserData("");
      
      toast({
        title: "Acesso normal restaurado",
        description: "Você voltou ao seu perfil de administrador."
      });
      
      setValue("");
      navigate("/dashboard");
    } catch (error) {
      console.error("Erro ao reverter para admin:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível reverter para o perfil de administrador."
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar usuários baseado na pesquisa
  const filteredUsers = searchQuery 
    ? users.filter(user => 
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : users;

  if (!user?.isAdmin || !user?.hasRealAdminAccess) {
    return (
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader className="bg-red-50 dark:bg-red-900/30">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
            <CardTitle className="text-red-600 dark:text-red-400">Acesso Restrito</CardTitle>
          </div>
          <CardDescription className="text-red-600/80 dark:text-red-400/80">
            Este recurso é exclusivo para administradores.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Usuários</h1>
          <p className="text-muted-foreground">
            Acesse dados e permissões de usuários no sistema
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
              <CardTitle className="text-xl flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Seletor de Usuário Admin
              </CardTitle>
              <CardDescription>
                Acesse o sistema como outro usuário para visualizar seus dados
              </CardDescription>
            </div>
            {currentImpersonation && (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800">
                <Eye className="h-3 w-3 mr-1" />
                Impersonando: {currentImpersonation}
              </Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    role="combobox" 
                    aria-expanded={open} 
                    className="w-full justify-between"
                    disabled={isLoading}
                  >
                    {value
                      ? users.find((user) => user.username === value)?.name || value
                      : "Selecione um usuário"}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput 
                      placeholder="Buscar usuário..." 
                      value={searchQuery}
                      onValueChange={setSearchQuery}
                    />
                    <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
                    <CommandList>
                      <CommandGroup heading="Usuários disponíveis">
                        <ScrollArea className="h-[200px]">
                          {filteredUsers.map((user) => (
                            <CommandItem
                              key={user.username}
                              value={user.username}
                              onSelect={(currentValue) => {
                                handleImpersonateUser(currentValue);
                              }}
                            >
                              <div className="flex items-center">
                                <User className="mr-2 h-4 w-4" />
                                <span>{user.name || user.username}</span>
                                {user.role && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    {user.role}
                                  </Badge>
                                )}
                              </div>
                              <Check
                                className={`ml-auto h-4 w-4 ${
                                  value === user.username ? "opacity-100" : "opacity-0"
                                }`}
                              />
                            </CommandItem>
                          ))}
                        </ScrollArea>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              
              {currentImpersonation && (
                <Button 
                  onClick={handleRevertToAdmin}
                  variant="secondary"
                  disabled={isLoading}
                  className="whitespace-nowrap"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Voltar ao Admin
                </Button>
              )}
            </div>
            
            {isLoading && (
              <div className="flex justify-center py-2">
                <LoadingSpinner size="sm" />
                <span className="ml-2 text-sm text-gray-500">Processando...</span>
              </div>
            )}
            
            {currentImpersonation && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50 rounded-md p-3 text-yellow-800 dark:text-yellow-300 text-sm">
                <div className="flex items-start">
                  <AlertCircle className="h-4 w-4 mr-2 mt-0.5" />
                  <div>
                    <p className="font-medium">Modo de Visualização Ativo</p>
                    <p className="mt-1">
                      Você está visualizando o sistema como {currentImpersonation}. Todas as operações 
                      serão atribuídas a este usuário e você terá acesso a todos os dados associados a ele.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between border-t p-4 text-sm text-gray-500">
          <span>
            Acesso admin por: {user?.username} ({user?.role})
          </span>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate("/admin/database")} 
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <Database className="h-4 w-4 mr-1" />
            Ver Banco de Dados
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AdminUserSelector; 