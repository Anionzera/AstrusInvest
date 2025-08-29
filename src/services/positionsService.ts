import { api } from './api';

export interface ServerPosition {
  id: string;
  portfolio_id: string;
  symbol: string;
  asset_class?: string;
  quantity: number;
  avg_price?: number;
  purchase_date?: string; // ISO (YYYY-MM-DD)
  created_at?: string | null;
  updated_at?: string | null;
}

export const positionsApi = {
  list: async (): Promise<ServerPosition[]> => {
    const res = await api.get<{ success: boolean; data: ServerPosition[] }>(`/api/positions`);
    return res.data;
  },
  create: async (payload: Partial<ServerPosition>): Promise<string> => {
    const res = await api.post<{ success: boolean; id: string }>(`/api/positions`, payload);
    return res.id;
  },
  update: async (id: string, payload: Partial<ServerPosition>): Promise<void> => {
    await api.put<{ success: boolean }>(`/api/positions/${id}`, payload);
  },
  delete: async (id: string): Promise<void> => {
    await api.delete<{ success: boolean }>(`/api/positions/${id}`);
  },
};


