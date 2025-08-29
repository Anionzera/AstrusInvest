import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { ScrollArea } from "../ui/scroll-area";
import { Textarea } from "../ui/textarea";
import { useToast } from "../ui/use-toast";
import { db, Cliente, inicializarDB } from "../../lib/db";
import { PlusCircle, Search, Edit, Trash2, FileText, User, BarChart, BarChart2, Briefcase, ChevronLeft, Grid, List, Calendar, Mail, Phone, UserPlus, UserX, X, AlertCircle, MoreVertical, Pencil, Trash } from "lucide-react";
import { useNavigate, Link, useParams } from "react-router-dom";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../ui/dropdown-menu";
import ClientDashboard from "./ClientDashboard";
import { Badge } from "../ui/badge";
import { useClients } from '../../hooks/useClients';
import { ClienteForm } from '../cliente/ClienteForm';
import { addHistoryEntry } from '@/lib/historyUtils';
import { format } from 'date-fns';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { LayoutGrid, LayoutList, RefreshCw } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

// Versão simplificada para garantir que o componente renderize
const ClientManager = () => {
  const { toast } = useToast();
  const { id: clientIdFromUrl } = useParams<{ id: string }>();
  const { clients: clientes, addClient: addCliente, updateClient: updateCliente, deleteClient: deleteCliente } = useClients();
  const [isEditing, setIsEditing] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("todos");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentClient, setCurrentClient] = useState<Cliente | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(clientIdFromUrl || null);
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
    dataNascimento: "",
    cpf: "",
    endereco: "",
    observacoes: "",
  });
  const navigate = useNavigate();

  // Helper: localizar cliente por id local (numérico), serverId (UUID) ou email
  const findClientByParam = useCallback((param: string) => {
    const p = (param || '').toLowerCase();
    // serverId (uuid)
    const byServerId = clientes.find((c: any) => (c as any).serverId && String((c as any).serverId).toLowerCase() === p);
    if (byServerId) return byServerId;
    // id numérico/local (Dexie) ou string
    if (/^\d+$/.test(param)) {
      const byNumeric = clientes.find((c: any) => String((c as any).id) === param);
      if (byNumeric) return byNumeric;
    }
    // id como string
    const byIdString = clientes.find((c: any) => String((c as any).id) === param);
    if (byIdString) return byIdString;
    // fallback por email
    return clientes.find(c => (c.email || '').toLowerCase() === p);
  }, [clientes]);

  // Efeito para definir o cliente selecionado quando o ID da URL muda
  useEffect(() => {
    if (clientIdFromUrl && clientes.length > 0) {
      const c = findClientByParam(clientIdFromUrl);
      if (c) {
        setSelectedClientId(clientIdFromUrl);
        setError(null);
      } else {
        // evitar banner permanente; apenas limpar seleção e ir para listagem
        setSelectedClientId(null);
        setError(`Cliente com ID ${clientIdFromUrl} não encontrado.`);
        setTimeout(() => navigate('/clients', { replace: true }), 1500);
      }
    }
  }, [clientIdFromUrl, clientes, navigate, findClientByParam]);

  const filteredClientes = useMemo(() => {
    if (!searchTerm.trim()) return clientes;
    
    return clientes.filter((cliente) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        cliente.nome.toLowerCase().includes(searchLower) ||
        cliente.email.toLowerCase().includes(searchLower) ||
        cliente.telefone?.toLowerCase().includes(searchLower) ||
        cliente.empresa?.toLowerCase().includes(searchLower)
      );
    });
  }, [clientes, searchTerm]);

  const loadClientes = useCallback(async () => {
    setIsLoading(true);
    try {
      // Simulando carregamento de dados
      await new Promise(resolve => setTimeout(resolve, 800));
      setError(null);
    } catch (error) {
      setError('Falha ao carregar clientes. Tente novamente.');
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClientes();
  }, [loadClientes]);

  const handleAddCliente = () => {
    setEditingCliente({
      id: '',
      nome: '',
      email: '',
      telefone: '',
      empresa: '',
      dataCadastro: new Date(),
      dataUltimoContato: null,
      observacoes: '',
      ativo: true,
    });
    setIsEditing(true);
  };

  const handleEditCliente = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditingCliente(null);
    setIsEditing(false);
  };

  const handleSave = async (cliente: Cliente) => {
    if (!cliente.nome.trim() || !cliente.email.trim()) {
      setError('Nome e email são campos obrigatórios.');
      return;
    }

    // Validação básica de e-mail
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(cliente.email)) {
      setError('Formato de e-mail inválido.');
      return;
    }

    setIsSaving(true);
    setError(null);
    
    try {
      let savedCliente;
      
      if (cliente.id) {
        savedCliente = await updateCliente(cliente);
        await addHistoryEntry({
          entityType: 'cliente',
          entityId: cliente.id,
          entityName: cliente.nome,
          action: 'update',
          details: `Cliente ${cliente.nome} foi atualizado`,
          metadata: { clienteId: cliente.id }
        });
        toast({
          title: "Cliente atualizado com sucesso!"
        });
      } else {
        const newClienteNoId: any = { ...cliente };
        delete newClienteNoId.id;
        newClienteNoId.dataCadastro = new Date();
        savedCliente = await addCliente(newClienteNoId);
        await addHistoryEntry({
          entityType: 'cliente',
          entityId: savedCliente?.id as any,
          entityName: newClienteNoId.nome,
          action: 'create',
          details: `Novo cliente ${newClienteNoId.nome} foi cadastrado`,
          metadata: { clienteId: (savedCliente as any)?.id }
        });
        toast({
          title: "Cliente adicionado com sucesso!"
        });
      }
      
      setIsEditing(false);
      setEditingCliente(null);
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      setError('Ocorreu um erro ao salvar o cliente. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCliente = async (id: string) => {
    const clienteToDelete = clientes.find(c => String((c as any).id) === String(id) || (c as any).serverId === id);
    if (!clienteToDelete) return;
    
    const confirmed = window.confirm(`Tem certeza que deseja excluir o cliente ${clienteToDelete.nome}?`);
    if (confirmed) {
      try {
        await deleteCliente(clienteToDelete as any);
        await addHistoryEntry({
          entityType: 'cliente',
          entityId: id,
          entityName: clienteToDelete.nome,
          action: 'delete',
          details: `Cliente ${clienteToDelete.nome} foi excluído`,
          metadata: { clienteId: id }
        });
        toast({
          title: "Cliente excluído com sucesso!"
        });
      } catch (error) {
        console.error('Erro ao excluir cliente:', error);
        setError('Ocorreu um erro ao excluir o cliente. Tente novamente.');
      }
    }
  };

  // Manipular mudanças no formulário
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Resetar formulário
  const resetForm = () => {
    setFormData({
      nome: "",
      email: "",
      telefone: "",
      dataNascimento: "",
      cpf: "",
      endereco: "",
      observacoes: "",
    });
    setCurrentClient(null);
  };

  // Função para visualizar o dashboard do cliente
  const viewClientDashboard = (cliente: Cliente) => {
    const idToUse = ((cliente as any).serverId) || String((cliente as any).id || '');
    if (!idToUse) return;
    setSelectedClientId(idToUse);
    navigate(`/clients/${idToUse}`, { replace: true });
  };

  // Voltar para a listagem de clientes
  const backToClientList = () => {
    setSelectedClientId(null);
    // Remover o ID da URL ao voltar para a listagem
    navigate('/clients', { replace: true });
  };

  // Função para formatar data
  const formatarData = (data: Date | string | undefined) => {
    if (!data) return "N/A";
    const dataObj = typeof data === "string" ? new Date(data) : data;
    return dataObj.toLocaleDateString('pt-BR');
  };

  // Função para obter a inicial do nome
  const getInitials = (name: string) => {
    if (!name) return "?";
    return name.charAt(0).toUpperCase();
  };

  // Função para determinar a cor de fundo do avatar baseado no nome do cliente
  const getAvatarColor = (name: string) => {
    if (!name) return "bg-gray-400";
    
    // Lista de cores para avatares
    const colors = [
      "bg-red-500",
      "bg-blue-500",
      "bg-green-500",
      "bg-yellow-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-teal-500"
    ];
    
    // Usar a soma dos códigos ASCII das letras do nome para escolher uma cor
    const sum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[sum % colors.length];
  };

  // Renderizar o componente
  if (selectedClientId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={backToClientList} className="mr-2">
            <ChevronLeft className="h-5 w-5 mr-1" />
            Voltar para a lista
          </Button>
          <h2 className="text-2xl font-bold">Dashboard do Cliente</h2>
        </div>
        <ClientDashboard clienteId={selectedClientId} />
      </div>
    );
  }

  return (
    <div className="w-full h-full p-4 md:p-6">
      <Card className="w-full shadow-md border border-border/40">
        <CardHeader className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-950/30 dark:to-indigo-950/30 border-b border-border/40 pb-4">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <CardTitle className="text-2xl font-bold text-blue-800 dark:text-blue-300 tracking-tight">
                Gerenciamento de Clientes
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300 mt-1 max-w-2xl">
                Cadastre e gerencie seus clientes para criar recomendações de investimentos personalizadas
              </CardDescription>
            </div>
            <Button 
              onClick={handleAddCliente}
              className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-600 self-start transition-colors"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Novo Cliente
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-4 md:p-6">
          {error && (
            <Alert variant="destructive" className="mb-4 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertTitle className="text-red-800 dark:text-red-300 ml-2">Erro</AlertTitle>
              <AlertDescription className="text-red-700 dark:text-red-300 ml-2">
                {error}
              </AlertDescription>
            </Alert>
          )}
          
          {isEditing ? (
            <ClienteForm 
              cliente={editingCliente} 
              onSave={handleSave} 
              onCancel={handleCancelEdit} 
              isSaving={isSaving}
            />
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    className="pl-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    placeholder="Buscar clientes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400 hidden md:inline">Visualização:</span>
                  <div className="border rounded-md bg-white dark:bg-gray-800 p-1 flex">
                    <Button
                      variant={viewMode === 'table' ? 'default' : 'ghost'}
                      size="sm"
                      className={`rounded-sm ${viewMode === 'table' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                      onClick={() => setViewMode('table')}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'cards' ? 'default' : 'ghost'}
                      size="sm"
                      className={`rounded-sm ${viewMode === 'cards' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                      onClick={() => setViewMode('cards')}
                    >
                      <LayoutList className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/30"
                    onClick={loadClientes}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Atualizar
                  </Button>
                </div>
              </div>
              
              {isLoading ? (
                <div className="flex justify-center items-center h-64 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                    <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                      Carregando clientes...
                    </p>
                  </div>
                </div>
              ) : filteredClientes.length === 0 ? (
                <div className="text-center py-12 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  <UserX className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
                  <h3 className="mt-4 text-lg font-medium text-gray-800 dark:text-gray-200">
                    {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
                  </h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                    {searchTerm 
                      ? 'Nenhum cliente corresponde aos critérios de busca. Tente modificar sua pesquisa.' 
                      : 'Você ainda não possui clientes cadastrados. Clique no botão abaixo para adicionar seu primeiro cliente.'}
                  </p>
                  {!searchTerm && (
                    <Button 
                      onClick={handleAddCliente}
                      variant="outline"
                      size="sm"
                      className="mt-4 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/30"
                    >
                      <UserPlus className="h-4 w-4 mr-1.5" />
                      Adicionar Cliente
                    </Button>
                  )}
                </div>
              ) : viewMode === 'table' ? (
                <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <Table>
                    <TableHeader className="bg-gray-50 dark:bg-gray-800/50">
                      <TableRow>
                        <TableHead className="font-medium">Nome</TableHead>
                        <TableHead className="font-medium">Email</TableHead>
                        <TableHead className="font-medium">Telefone</TableHead>
                        <TableHead className="font-medium">Empresa</TableHead>
                        <TableHead className="font-medium">Data de Cadastro</TableHead>
                        <TableHead className="font-medium w-[100px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClientes.map((cliente) => (
                        <TableRow 
                          key={cliente.id}
                          className="hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors"
                        >
                          <TableCell className="font-medium">{cliente.nome}</TableCell>
                          <TableCell>{cliente.email}</TableCell>
                          <TableCell>{cliente.telefone || '-'}</TableCell>
                          <TableCell>{cliente.empresa || '-'}</TableCell>
                          <TableCell className="whitespace-nowrap">{format(cliente.dataCadastro, 'dd/MM/yyyy')}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20"
                                onClick={() => viewClientDashboard(cliente)}
                              >
                                <BarChart2 className="h-4 w-4" />
                                <span className="sr-only">Dashboard</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20"
                                onClick={() => handleEditCliente(cliente)}
                              >
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">Editar</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                                onClick={() => handleDeleteCliente(cliente.id)}
                              >
                                <Trash className="h-4 w-4" />
                                <span className="sr-only">Excluir</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredClientes.map((cliente) => (
                    <Card 
                      key={cliente.id} 
                      className="overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all duration-200"
                    >
                      <CardHeader className="pb-3 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-blue-800 dark:text-blue-300 font-semibold">{cliente.nome}</CardTitle>
                            <CardDescription className="mt-1 text-gray-600 dark:text-gray-400">
                              {cliente.empresa || 'Sem empresa'}
                            </CardDescription>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => viewClientDashboard(cliente)}>
                                <BarChart2 className="h-4 w-4 mr-2" />
                                Dashboard
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditCliente(cliente)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteCliente(cliente.id)} className="text-red-600 dark:text-red-400">
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
                            <Mail className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                            <span className="text-gray-800 dark:text-gray-200">{cliente.email}</span>
                          </div>
                          {cliente.telefone && (
                            <div className="flex items-center text-sm">
                              <Phone className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                              <span className="text-gray-800 dark:text-gray-200">{cliente.telefone}</span>
                            </div>
                          )}
                          <div className="flex items-center text-sm">
                            <Calendar className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">
                              Cliente desde {format(cliente.dataCadastro, 'dd/MM/yyyy')}
                            </span>
                          </div>
                          {cliente.observacoes && (
                            <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-700">
                              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{cliente.observacoes}</p>
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
                            onClick={() => viewClientDashboard(cliente)}
                          >
                            <BarChart2 className="h-3.5 w-3.5 mr-1" />
                            Dashboard
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/30"
                            onClick={() => handleEditCliente(cliente)}
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            Editar
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
              
              {filteredClientes.length > 0 && (
                <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 flex justify-between items-center">
                  <span>
                    Exibindo {filteredClientes.length} {filteredClientes.length === 1 ? 'cliente' : 'clientes'}
                    {searchTerm && ' para a busca '}
                    {searchTerm && <span className="font-medium text-gray-700 dark:text-gray-300">"{searchTerm}"</span>}
                  </span>
                  
                  {searchTerm && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSearchTerm('')}
                      className="text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      Limpar busca
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientManager;
