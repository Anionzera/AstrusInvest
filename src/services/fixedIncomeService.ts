import { api } from './api';

export interface FixedIncomeInstrumentPayload {
  kind: 'CDB' | 'LCI' | 'LCA' | 'CRI' | 'CRA';
  issuer: string;
  indexer: 'PRE' | 'CDI' | 'SELIC' | 'IPCA';
  rate: number; // real a.a. para PRE/IPCA; multiplicador p/ CDI/SELIC (ex.: 1.2)
  face_value: number; // VNA / PU base
  issue_date: string; // YYYY-MM-DD
  maturity_date?: string; // YYYY-MM-DD
  daycount?: string; // BUS/252 (default)
  business_convention?: string;
  ipca_lag_months?: number; // default 2
  grace_days?: number;
  amortization?: 'BULLET' | 'PRICE' | 'SAC';
  schedule?: any;
  tax_regime?: 'PF' | 'PJ';
}

export interface FixedIncomePositionPayload {
  instrument_id: string;
  client_id: string; // UUID
  trade_date: string; // YYYY-MM-DD
  quantity: number;
  price: number; // PU na data da compra
}

export const fiApi = {
  createInstrument: async (payload: FixedIncomeInstrumentPayload): Promise<string> => {
    const res = await api.post<{ success: boolean; id: string }>(`/api/fixed-income/instruments`, payload);
    return res.id;
  },
  createPosition: async (payload: FixedIncomePositionPayload): Promise<string> => {
    const res = await api.post<{ success: boolean; id: string }>(`/api/fixed-income/positions`, payload);
    return res.id;
  },
  listPositions: async (client_id?: string) => {
    const path = client_id ? `/api/fixed-income/positions?client_id=${encodeURIComponent(client_id)}` : `/api/fixed-income/positions`;
    return api.get<{ success: boolean; data: any[] }>(path);
  },
  valuation: async (position_id: string, asof?: string) => {
    const q = new URLSearchParams({ position_id, ...(asof ? { asof } : {}) });
    return api.get<{ success: boolean } & Record<string, any>>(`/api/fixed-income/valuation?${q.toString()}`);
  },
  valuationBulk: async (items: { id: string; asof?: string }[]) => {
    return api.post<{ success: boolean; data: Record<string, any> }>(`/api/fixed-income/valuation/bulk`, { positions: items });
  },
  deletePosition: async (position_id: string): Promise<void> => {
    await api.delete<{ success: boolean }>(`/api/fixed-income/positions/${position_id}`);
  },
};


