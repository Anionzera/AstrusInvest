import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db, Cliente } from '../lib/db';

/**
 * Hook para carregar e gerenciar clientes
 */
export const useClients = (filter?: string) => {
  const queryClient = useQueryClient();
  const queryKey = ['clients'];

  // Consulta para carregar todos os clientes
  const { data: clients = [], isLoading, error } = useQuery<Cliente[]>({
    queryKey,
    queryFn: async () => {
      try {
        const allClients = await db.clientes.toArray();
        
        // Filtrar clientes se um filtro foi fornecido
        if (filter) {
          const lowerFilter = filter.toLowerCase();
          return allClients.filter(
            client => 
              client.nome?.toLowerCase().includes(lowerFilter) ||
              client.email?.toLowerCase().includes(lowerFilter) ||
              client.telefone?.includes(filter) ||
              client.cpf?.includes(filter)
          );
        }
        
        return allClients;
      } catch (error) {
        console.error('Erro ao carregar clientes:', error);
        throw error;
      }
    }
  });

  // Mutação para adicionar um novo cliente
  const addClientMutation = useMutation({
    mutationFn: async (newClient: Omit<Cliente, 'id'>) => {
      try {
        // Adicionar data de cadastro se não existir
        if (!newClient.dataCadastro) {
          newClient.dataCadastro = new Date();
        }
        
        // Adicionar cliente no banco
        const id = await db.clientes.add(newClient as Cliente);
        
        return { ...newClient, id } as Cliente;
      } catch (error) {
        console.error('Erro ao adicionar cliente:', error);
        throw error;
      }
    },
    // Invalidar cache para recarregar dados
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    }
  });

  // Mutação para atualizar um cliente existente
  const updateClientMutation = useMutation({
    mutationFn: async (updatedClient: Cliente) => {
      try {
        // Garantir que cliente tem ID
        if (!updatedClient.id) {
          throw new Error('Cliente precisa ter um ID para ser atualizado');
        }
        
        // Adicionar data de atualização
        updatedClient.ultimaAtualizacao = new Date();
        
        // Atualizar no banco
        await db.clientes.update(updatedClient.id, updatedClient);
        
        return updatedClient;
      } catch (error) {
        console.error('Erro ao atualizar cliente:', error);
        throw error;
      }
    },
    // Invalidar cache para recarregar dados
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    }
  });

  // Mutação para excluir um cliente
  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: number) => {
      try {
        await db.clientes.delete(clientId);
        return clientId;
      } catch (error) {
        console.error('Erro ao excluir cliente:', error);
        throw error;
      }
    },
    // Invalidar cache para recarregar dados
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    }
  });

  // Hook para buscar um cliente específico por ID
  const useClient = (clientId?: number) => {
    return useQuery<Cliente | undefined>({
      queryKey: ['client', clientId],
      queryFn: async () => {
        if (!clientId) return undefined;
        
        try {
          const client = await db.clientes.get(clientId);
          return client;
        } catch (error) {
          console.error(`Erro ao carregar cliente ID ${clientId}:`, error);
          throw error;
        }
      },
      // Desabilitar query se não tiver clientId
      enabled: !!clientId
    });
  };

  return {
    clients,
    isLoading,
    error,
    addClient: addClientMutation.mutate,
    updateClient: updateClientMutation.mutate,
    deleteClient: deleteClientMutation.mutate,
    useClient,
    // Status das mutações
    isAdding: addClientMutation.isPending,
    isUpdating: updateClientMutation.isPending,
    isDeleting: deleteClientMutation.isPending,
  };
}; 