import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthContext";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Database, Users, HardDrive, Settings, Shield, FileText, BarChart, Activity } from "lucide-react";

/**
 * Painel de Administração centralizado
 * Este componente serve como um hub para todas as funcionalidades administrativas
 */
const AdminPanel = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Verificar se o usuário tem acesso de administrador real
  const isRealAdmin = user?.hasRealAdminAccess === true || (user?.role === "admin" && user?.username === "Anion");
  
  // Funções para navegação
  const navigateTo = (path: string) => () => {
    navigate(path);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Painel de Administração</h1>
          <p className="text-muted-foreground">
            Gerencie todos os aspectos do sistema de forma centralizada
          </p>
        </div>
        
        <Badge variant={isRealAdmin ? "default" : "outline"} className="ml-2">
          {isRealAdmin ? "Admin Completo" : "Acesso Limitado"}
        </Badge>
      </div>
      
      <Separator className="mb-6" />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="h-5 w-5 mr-2 text-blue-500" />
              Banco de Dados
            </CardTitle>
            <CardDescription>
              Acesse e gerencie o banco de dados do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Visualize, edite e exporte registros diretamente do banco de dados local.
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={navigateTo("/admin/database")}
              className="w-full"
              disabled={!isRealAdmin}
            >
              Acessar Banco de Dados
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <HardDrive className="h-5 w-5 mr-2 text-green-500" />
              Backup e Restauração
            </CardTitle>
            <CardDescription>
              Faça backup e restaure dados do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Crie backups do banco de dados e restaure a partir de arquivos anteriores.
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={navigateTo("/ferramentas/backup")}
              className="w-full"
            >
              Gerenciar Backups
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2 text-blue-500" />
              Gerenciar Usuários
            </CardTitle>
            <CardDescription>
              Gerencie contas de usuários do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Crie, edite e gerencie contas de usuários e suas permissões.
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={navigateTo("/admin/users")}
              className="w-full"
              disabled={!isRealAdmin}
            >
              Gerenciar Usuários
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2 text-amber-500" />
              Importação e Exportação
            </CardTitle>
            <CardDescription>
              Importe e exporte dados do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Transfira dados entre sistemas ou para análise em ferramentas externas.
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={navigateTo("/import-export")}
              className="w-full"
            >
              Acessar Ferramenta
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2 text-green-500" />
              Análise de Riscos
            </CardTitle>
            <CardDescription>
              Análise avançada de riscos de portfólios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Realize análises de risco avançadas nos portfólios de clientes.
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={navigateTo("/risk-analysis")}
              className="w-full"
            >
              Acessar Análise
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart className="h-5 w-5 mr-2 text-blue-500" />
              Relatórios Administrativos
            </CardTitle>
            <CardDescription>
              Gere relatórios administrativos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Crie relatórios detalhados sobre a utilização do sistema e dados.
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={navigateTo("/report/new")}
              className="w-full"
            >
              Gerar Relatórios
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <Separator className="my-6" />
      
      <div className="text-sm text-gray-500 dark:text-gray-400">
        <p className="mb-2">
          {isRealAdmin 
            ? "Você possui acesso completo a todas as funcionalidades administrativas." 
            : "Algumas funcionalidades administrativas podem estar limitadas com base no seu nível de acesso."}
        </p>
        <p>
          Versão do sistema: 1.0.0 | Último login: {new Date(user?.lastActivity || '').toLocaleString()}
        </p>
      </div>
    </div>
  );
};

export default AdminPanel; 