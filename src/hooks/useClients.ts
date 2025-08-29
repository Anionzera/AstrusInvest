import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db, Cliente } from '../lib/db';
import { syncClientsDown, createClientSmart, updateClientSmart, deleteClientSmart } from '@/services/clientsService';

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
      const allClients = await syncClientsDown();
      if (filter) {
        const lowerFilter = filter.toLowerCase();
        return allClients.filter(
          client => 
            client.nome?.toLowerCase().includes(lowerFilter) ||
            client.email?.toLowerCase().includes(lowerFilter) ||
            client.telefone?.includes(filter)
        );
      }
      return allClients;
    }
  });

  // Mutação para adicionar um novo cliente
  const addClientMutation = useMutation({
    mutationFn: async (newClient: Omit<Cliente, 'id'>) => {
      if (!newClient.dataCadastro) newClient.dataCadastro = new Date();
      const created = await createClientSmart(newClient);
      return created;
    },
    // Invalidar cache para recarregar dados
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    }
  });

  // Mutação para atualizar um cliente existente
  const updateClientMutation = useMutation({
    mutationFn: async (updatedClient: Cliente) => {
      updatedClient.ultimaAtualizacao = new Date();
      return await updateClientSmart(updatedClient);
    },
    // Invalidar cache para recarregar dados
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    }
  });

  // Mutação para excluir um cliente
  const deleteClientMutation = useMutation({
    mutationFn: async (clientRef: number | string | Cliente) => {
      let ref: number | string = clientRef as any;
      if (typeof clientRef === 'object' && clientRef !== null) {
        ref = clientRef.email || (clientRef as any).id;
      }
      await deleteClientSmart(ref);
      return ref;
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