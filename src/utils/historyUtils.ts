/**
 * Utilitários para gerenciamento de histórico de recomendações
 */
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db'; // Importação do cliente de banco de dados

/** 
 * Tipo para a entrada de histórico 
 */
export interface HistoryEntry {
  id: string;
  timestamp: number;
  userId: string;
  userName: string;
  action: string;
  details?: Record<string, any>;
  entityId?: string;
  entityType: string;
}

/**
 * Tipo para recomendação
 */
export interface Recommendation {
  id: string;
  title?: string;
  clientId?: string;
  clientName?: string;
  date: number;
  status: 'pending' | 'approved' | 'rejected' | 'implemented' | 'expired';
  riskProfile?: string;
  investmentAmount?: number;
  investmentHorizon?: string;
  investmentHorizonMonths?: number;
  expectedReturn?: number;
  objectives?: string[];
  assetAllocation?: Array<{ name: string; allocation: number; color?: string; }>;
  projections?: Array<any>;
  createdBy?: string;
  createdAt: number;
  updatedAt?: number;
  description?: string;
  notes?: string;
  tags?: string[];
  [key: string]: any;
}

/**
 * Gera um ID único para recomendações
 */
export const generateRecommendationId = (): string => {
  const timestamp = new Date().toISOString().replace(/[-:.]/g, '').substring(0, 14);
  const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `REC-${timestamp}-${randomPart}`;
};

/**
 * Adiciona uma entrada no histórico
 * @param entry Dados da entrada de histórico a ser adicionada
 */
export const addHistoryEntry = async (entry: Omit<HistoryEntry, 'id' | 'timestamp'>): Promise<HistoryEntry> => {
  try {
    const completeEntry: HistoryEntry = {
      ...entry,
      id: uuidv4(),
      timestamp: Date.now()
    };

    // Verificar se temos o banco de dados para salvar
    if (!db) {
      console.warn('Banco de dados não disponível. Salvando localmente.');
      
      // Fallback para localStorage
      const historyEntries = getLocalHistoryEntries();
      historyEntries.push(completeEntry);
      localStorage.setItem('historyEntries', JSON.stringify(historyEntries));
      
      return completeEntry;
    }

    // Salvar no banco de dados
    await db.historico.add(completeEntry);
    
    return completeEntry;
  } catch (error) {
    console.error('Erro ao adicionar entrada no histórico:', error);
    throw error;
  }
};

/**
 * Obter entradas de histórico do localStorage
 */
const getLocalHistoryEntries = (): HistoryEntry[] => {
  try {
    const entriesJson = localStorage.getItem('historyEntries');
    return entriesJson ? JSON.parse(entriesJson) : [];
  } catch (error) {
    console.error('Erro ao ler entradas de histórico locais:', error);
    return [];
  }
};

/**
 * Salva uma recomendação no histórico
 * @param recommendation Dados da recomendação a ser salva
 * @param action Ação realizada (create, update, etc)
 * @param userId ID do usuário que realizou a ação
 * @param userName Nome do usuário que realizou a ação
 */
export const saveRecommendationHistory = async (
  recommendation: Partial<Recommendation>,
  action: string,
  userId: string,
  userName: string
): Promise<Recommendation> => {
  try {
    // Garantir que a recomendação tem um ID
    const recId = recommendation.id || generateRecommendationId();
    const timestamp = Date.now();
    
    // Preparar objeto completo da recomendação
    const completeRecommendation: Recommendation = {
      ...recommendation,
      id: recId,
      createdAt: recommendation.createdAt || timestamp,
      updatedAt: action === 'create' ? undefined : timestamp,
      date: recommendation.date || timestamp,
      status: recommendation.status || 'pending'
    };
    
    // Verificar se temos o banco de dados para salvar
    if (!db) {
      console.warn('Banco de dados não disponível. Salvando localmente.');
      
      // Fallback para localStorage
      const recommendations = getLocalRecommendations();
      
      // Verificar se já existe essa recomendação
      const existingIndex = recommendations.findIndex(r => r.id === recId);
      
      if (existingIndex >= 0) {
        recommendations[existingIndex] = {
          ...recommendations[existingIndex],
          ...completeRecommendation,
          updatedAt: timestamp
        };
      } else {
        recommendations.push(completeRecommendation);
      }
      
      localStorage.setItem('recommendations', JSON.stringify(recommendations));
    } else {
      // Salvar no banco de dados
      if (action === 'create') {
        await db.recomendacoes.add(completeRecommendation);
      } else {
        await db.recomendacoes.update(recId, completeRecommendation);
      }
    }
    
    // Registrar entrada no histórico
    await addHistoryEntry({
      userId,
      userName,
      action: `recommendation_${action}`,
      details: { recommendation: completeRecommendation },
      entityId: recId,
      entityType: 'recommendation'
    });
    
    // Guardar toda a recomendação para acesso futuro
    await db.recommendations.add({
      id: id || uuidv4(),
      clientId: recommendation.clientId,
      clientName: recommendation.clientName,
      title: recommendation.title || `Recomendação para ${recommendation.clientName}`,
      date: recommendation.date || new Date(),
      status: recommendation.status || 'pending',
      riskProfile: recommendation.riskProfile,
      investmentAmount: recommendation.investmentAmount,
      investmentHorizon: recommendation.investmentHorizon,
      products: recommendation.products || [],
      allocation: recommendation.allocation || {},
      createdBy: recommendation.createdBy || 'sistema',
      updatedAt: new Date(),
      description: recommendation.description,
      objective: recommendation.objective,
      strategy: recommendation.strategy,
      justification: recommendation.justification,
      observations: recommendation.observations,
    });
    
    return completeRecommendation;
  } catch (error) {
    console.error('Erro ao salvar histórico de recomendação:', error);
    throw error;
  }
};

/**
 * Obter recomendações do localStorage
 */
const getLocalRecommendations = (): Recommendation[] => {
  try {
    const recommendationsJson = localStorage.getItem('recommendations');
    return recommendationsJson ? JSON.parse(recommendationsJson) : [];
  } catch (error) {
    console.error('Erro ao ler recomendações locais:', error);
    return [];
  }
};

/**
 * Obter todo o histórico de recomendações
 */
export const getRecommendationHistory = async (): Promise<Recommendation[]> => {
  try {
    // Verificar se temos o banco de dados
    if (!db) {
      console.warn('Banco de dados não disponível. Lendo localmente.');
      return getLocalRecommendations();
    }
    
    // Verificar se a tabela recomendacoes existe
    if (!db.recomendacoes) {
      console.warn('Tabela recomendacoes não disponível. Lendo localmente.');
      return getLocalRecommendations();
    }
    
    // Buscar do banco de dados
    const dbRecomendacoes = await db.recomendacoes.toArray();
    
    // Converter para o formato Recommendation
    return dbRecomendacoes.map(rec => {
      return {
        id: rec.id,
        title: rec.titulo,
        clientId: rec.clienteId,
        clientName: '', // A ser preenchido posteriormente se necessário
        date: rec.dataCriacao instanceof Date ? rec.dataCriacao.getTime() : new Date(rec.dataCriacao).getTime(),
        status: mapStatusToRecommendation(rec.status),
        createdAt: rec.dataCriacao instanceof Date ? rec.dataCriacao.getTime() : new Date(rec.dataCriacao).getTime(),
        updatedAt: rec.dataAtualizacao ? 
          (rec.dataAtualizacao instanceof Date ? rec.dataAtualizacao.getTime() : new Date(rec.dataAtualizacao).getTime()) 
          : undefined,
        description: rec.descricao,
        // Outros campos podem ser mapeados conforme necessário
        conteudo: rec.conteudo
      } as Recommendation;
    });
  } catch (error) {
    console.error('Erro ao obter histórico de recomendações:', error);
    
    // Fallback para localStorage
    return getLocalRecommendations();
  }
};

/**
 * Mapeia o status do banco de dados para o formato da Recommendation
 */
const mapStatusToRecommendation = (status: string): Recommendation['status'] => {
  const statusMap: Record<string, Recommendation['status']> = {
    'draft': 'pending',
    'sent': 'pending',
    'approved': 'approved',
    'rejected': 'rejected',
    'converted_to_report': 'implemented',
    'archived': 'expired'
  };
  
  return statusMap[status] || 'pending';
};

/**
 * Obter uma recomendação específica pelo ID
 * @param id ID da recomendação
 */
export const getRecommendationById = async (id: string): Promise<Recommendation | null> => {
  try {
    // Verificar se temos o banco de dados
    if (!db) {
      console.warn('Banco de dados não disponível. Lendo localmente.');
      const recommendations = getLocalRecommendations();
      return recommendations.find(r => r.id === id) || null;
    }
    
    // Verificar se a tabela recomendacoes existe
    if (!db.recomendacoes) {
      console.warn('Tabela recomendacoes não disponível. Lendo localmente.');
      const recommendations = getLocalRecommendations();
      return recommendations.find(r => r.id === id) || null;
    }
    
    // Buscar do banco de dados
    const dbRecomendacao = await db.recomendacoes.get(id);
    
    if (!dbRecomendacao) {
      return null;
    }
    
    // Converter para o formato Recommendation
    return {
      id: dbRecomendacao.id,
      title: dbRecomendacao.titulo,
      clientId: dbRecomendacao.clienteId,
      clientName: '', // A ser preenchido posteriormente se necessário
      date: dbRecomendacao.dataCriacao instanceof Date ? 
        dbRecomendacao.dataCriacao.getTime() : 
        new Date(dbRecomendacao.dataCriacao).getTime(),
      status: mapStatusToRecommendation(dbRecomendacao.status),
      createdAt: dbRecomendacao.dataCriacao instanceof Date ? 
        dbRecomendacao.dataCriacao.getTime() : 
        new Date(dbRecomendacao.dataCriacao).getTime(),
      updatedAt: dbRecomendacao.dataAtualizacao ? 
        (dbRecomendacao.dataAtualizacao instanceof Date ? 
          dbRecomendacao.dataAtualizacao.getTime() : 
          new Date(dbRecomendacao.dataAtualizacao).getTime()) 
        : undefined,
      description: dbRecomendacao.descricao,
      // Outros campos podem ser mapeados conforme necessário
      conteudo: dbRecomendacao.conteudo
    } as Recommendation;
  } catch (error) {
    console.error(`Erro ao buscar recomendação ${id}:`, error);
    
    // Fallback para localStorage
    const recommendations = getLocalRecommendations();
    return recommendations.find(r => r.id === id) || null;
  }
};

/**
 * Atualizar o status de uma recomendação
 * @param id ID da recomendação
 * @param status Novo status
 */
export const updateRecommendationStatus = async (
  id: string, 
  status: Recommendation['status'],
  userId?: string,
  userName?: string
): Promise<boolean> => {
  try {
    // Buscar a recomendação existente
    const recommendation = await getRecommendationById(id);
    
    if (!recommendation) {
      throw new Error(`Recomendação ${id} não encontrada`);
    }
    
    // Atualizar o status
    recommendation.status = status;
    recommendation.updatedAt = Date.now();
    
    // Salvar a atualização
    await saveRecommendationHistory(
      recommendation,
      'update_status',
      userId || 'system',
      userName || 'Sistema'
    );
    
    return true;
  } catch (error) {
    console.error(`Erro ao atualizar status da recomendação ${id}:`, error);
    throw error;
  }
};

/**
 * Excluir uma recomendação pelo ID
 * @param id ID da recomendação
 */
export const deleteRecommendationById = async (
  id: string,
  userId?: string,
  userName?: string
): Promise<boolean> => {
  try {
    // Verificar se temos o banco de dados
    if (!db) {
      console.warn('Banco de dados não disponível. Excluindo localmente.');
      
      // Fallback para localStorage
      const recommendations = getLocalRecommendations();
      const filteredRecommendations = recommendations.filter(r => r.id !== id);
      
      localStorage.setItem('recommendations', JSON.stringify(filteredRecommendations));
    } else {
      // Excluir do banco de dados
      await db.recomendacoes.delete(id);
    }
    
    // Registrar entrada no histórico
    await addHistoryEntry({
      userId: userId || 'system',
      userName: userName || 'Sistema',
      action: 'recommendation_delete',
      entityId: id,
      entityType: 'recommendation'
    });
    
    return true;
  } catch (error) {
    console.error(`Erro ao excluir recomendação ${id}:`, error);
    throw error;
  }
};

/**
 * Obter histórico de entradas relacionadas a uma entidade específica
 * @param entityId ID da entidade
 * @param entityType Tipo da entidade
 */
export const getHistoryForEntity = async (
  entityId: string,
  entityType: string
): Promise<HistoryEntry[]> => {
  try {
    // Verificar se temos o banco de dados
    if (!db) {
      console.warn('Banco de dados não disponível. Lendo localmente.');
      
      const historyEntries = getLocalHistoryEntries();
      return historyEntries.filter(
        entry => entry.entityId === entityId && entry.entityType === entityType
      );
    }
    
    // Verificar se a tabela historico existe
    if (!db.historico) {
      console.warn('Tabela historico não disponível. Lendo localmente.');
      const historyEntries = getLocalHistoryEntries();
      return historyEntries.filter(
        entry => entry.entityId === entityId && entry.entityType === entityType
      );
    }
    
    // Buscar do banco de dados
    const dbHistoricoItems = await db.historico
      .where('entityId')
      .equals(entityId)
      .and(item => item.entityType === entityType)
      .toArray();
      
    // Converter para o formato HistoryEntry
    return dbHistoricoItems.map(item => {
      return {
        id: item.id,
        timestamp: item.timestamp instanceof Date ? item.timestamp.getTime() : new Date(item.timestamp).getTime(),
        userId: item.userId || 'system',
        userName: item.userName || 'Sistema',
        action: item.action,
        details: item.metadata,
        entityId: item.entityId,
        entityType: item.entityType
      } as HistoryEntry;
    });
  } catch (error) {
    console.error(`Erro ao buscar histórico para ${entityType} ${entityId}:`, error);
    
    // Fallback para localStorage
    const historyEntries = getLocalHistoryEntries();
    return historyEntries.filter(
      entry => entry.entityId === entityId && entry.entityType === entityType
    );
  }
}; 