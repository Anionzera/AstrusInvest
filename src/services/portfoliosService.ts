import { api } from './api';

export interface ServerPortfolio {
  id: string;
  client_id: string;
  name: string;
  description?: string;
  strategy?: string;
  status: string;
  allocation?: any;
  metrics?: any;
  created_at?: string | null;
  updated_at?: string | null;
}

export const portfoliosApi = {
  list: async (): Promise<ServerPortfolio[]> => {
    const res = await api.get<{ success: boolean; data: ServerPortfolio[] }>(`/api/portfolios`);
    return res.data;
  },
  create: async (payload: Partial<ServerPortfolio>): Promise<string> => {
    const res = await api.post<{ success: boolean; id: string }>(`/api/portfolios`, payload);
    return res.id;
  },
  update: async (id: string, payload: Partial<ServerPortfolio>): Promise<void> => {
    await api.put<{ success: boolean }>(`/api/portfolios/${id}`, payload);
  },
  delete: async (id: string): Promise<void> => {
    await api.delete<{ success: boolean }>(`/api/portfolios/${id}`);
  },
};


