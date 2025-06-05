import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { useToast } from "../ui/use-toast";
import { Badge } from "../ui/badge";
import { useAuth } from "../auth/AuthContext";
import { Users, UserPlus, UserX, ArrowLeft } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Switch } from "../ui/switch";

interface User {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  hasRealAdminAccess: boolean;
  lastLogin: string;
  status: string;
}

const mockUsers: User[] = [
  {
    id: "1",
    name: "Administrador",
    email: "admin@example.com",
    isAdmin: true,
    hasRealAdminAccess: true,
    lastLogin: "2023-12-01T08:30:00",
    status: "active"
  },
  {
    id: "2",
    name: "João Silva",
    email: "joao@example.com",
    isAdmin: false,
    hasRealAdminAccess: false,
    lastLogin: "2023-12-05T14:20:00",
    status: "active"
  },
  {
    id: "3",
    name: "Maria Santos",
    email: "maria@example.com",
    isAdmin: true,
    hasRealAdminAccess: false,
    lastLogin: "2023-12-03T09:15:00",
    status: "active"
  }
];

const UserManager = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
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

  const handleToggleAdmin = (userId: string) => {
    if (!user?.hasRealAdminAccess) {
      toast({
        variant: "destructive", 
        title: "Permissão negada",
        description: "Apenas administradores com acesso completo podem alterar permissões."
      });
      return;
    }
    
    setUsers(users.map(u => 
      u.id === userId ? { ...u, isAdmin: !u.isAdmin } : u
    ));
    
    toast({
      title: "Permissão atualizada",
      description: `Status de administrador alterado com sucesso.`
    });
  };

  const handleToggleStatus = (userId: string) => {
    setUsers(users.map(u => 
      u.id === userId ? { ...u, status: u.status === "active" ? "inactive" : "active" } : u
    ));
    
    const targetUser = users.find(u => u.id === userId);
    const newStatus = targetUser?.status === "active" ? "inativo" : "ativo";
    
    toast({
      title: "Status atualizado",
      description: `Usuário agora está ${newStatus}.`
    });
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Usuários</h1>
          <p className="text-muted-foreground">
            Gerencie contas de usuários e permissões
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Painel
          </Button>
          <Badge variant={user?.hasRealAdminAccess ? "default" : "outline"} className="ml-2">
            {user?.hasRealAdminAccess ? "Admin Completo" : "Acesso Limitado"}
          </Badge>
        </div>
      </div>
      
      <Card className="shadow-lg mb-6">
        <CardHeader>
          <CardTitle>Usuários do Sistema</CardTitle>
          <CardDescription>
            Visualize e gerencia os usuários cadastrados no sistema
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="flex justify-end mb-4">
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Adicionar Usuário
            </Button>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Último Acesso</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(user => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{new Date(user.lastLogin).toLocaleString('pt-BR')}</TableCell>
                  <TableCell>
                    <Switch 
                      checked={user.isAdmin}
                      onCheckedChange={() => handleToggleAdmin(user.id)}
                      disabled={user.hasRealAdminAccess || !user?.hasRealAdminAccess}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.status === "active" ? "default" : "destructive"}>
                      {user.status === "active" ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => setSelectedUser(user)}>
                        <Users className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant={user.status === "active" ? "destructive" : "outline"} 
                        size="sm"
                        onClick={() => handleToggleStatus(user.id)}
                        disabled={user.hasRealAdminAccess}
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManager; 