const API_BASE_URL = (() => {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin || '';
  if (/(localhost|127\.0\.0\.1):(5173|5174)\b/.test(origin)) return 'http://127.0.0.1:5000';
  return origin;
})();

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export const apiFetch = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const url = `${API_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    ...(options.headers as Record<string, string> | undefined),
  };
  const resp = await fetch(url, { ...options, headers });
  let body: any = null;
  const text = await resp.text();
  try { body = text ? JSON.parse(text) : null; } catch (_) { body = text; }
  if (!resp.ok) {
    const message = (body && (body.error || body.message)) || `HTTP ${resp.status}`;
    throw new ApiError(message, resp.status, body);
  }
  return body as T;
};

export const api = {
  get: <T>(path: string) => apiFetch<T>(path, { method: 'GET' }),
  post: <T>(path: string, data?: any) => apiFetch<T>(path, { method: 'POST', body: JSON.stringify(data ?? {}) }),
  put: <T>(path: string, data?: any) => apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(data ?? {}) }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
  health: () => apiFetch<{ ok: boolean; db: boolean }>(`/api/health`),
};


