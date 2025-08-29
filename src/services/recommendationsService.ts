import { api } from './api';

export interface ServerRecommendation {
  id: string;
  client_id: string;
  title: string;
  description?: string;
  status: string;
  risk_profile?: string;
  investment_horizon?: string;
  investment_amount?: number;
  content?: any;
  allocation?: Record<string, number>;
  created_at?: string | null;
  updated_at?: string | null;
}

export const recommendationsApi = {
  list: async (): Promise<ServerRecommendation[]> => {
    const res = await api.get<{ success: boolean; data: ServerRecommendation[] }>(`/api/recommendations`);
    return res.data;
  },
  create: async (payload: Partial<ServerRecommendation>): Promise<string> => {
    const res = await api.post<{ success: boolean; id: string }>(`/api/recommendations`, payload);
    return res.id;
  },
  update: async (id: string, payload: Partial<ServerRecommendation>): Promise<void> => {
    await api.put<{ success: boolean }>(`/api/recommendations/${id}`, payload);
  },
  delete: async (id: string): Promise<void> => {
    await api.delete<{ success: boolean }>(`/api/recommendations/${id}`);
  },
};


