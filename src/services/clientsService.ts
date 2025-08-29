import { api } from './api';
import { db, Cliente } from '@/lib/db';

export interface ServerClient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  risk_profile?: string;
  notes?: string;
  active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export const clientsApi = {
  list: async (): Promise<ServerClient[]> => {
    const res = await api.get<{ success: boolean; data: ServerClient[] }>(`/api/clients`);
    return res.data;
  },
  create: async (payload: Partial<ServerClient>): Promise<string> => {
    const res = await api.post<{ success: boolean; id: string }>(`/api/clients`, payload);
    return res.id;
  },
  update: async (id: string, payload: Partial<ServerClient>): Promise<void> => {
    await api.put<{ success: boolean }>(`/api/clients/${id}`, payload);
  },
  delete: async (id: string): Promise<void> => {
    await api.delete<{ success: boolean }>(`/api/clients/${id}`);
  },
};

// Mapear Cliente (Dexie) <-> ServerClient (API)
const toServer = (c: Cliente): Partial<ServerClient> => ({
  name: c.nome,
  email: c.email,
  phone: c.telefone,
  company: c.empresa,
  risk_profile: c.perfilRisco,
  notes: c.observacoes,
  active: c.ativo,
});

// NOTA: Dexie usa 'id' como PK numérico (++id). Não podemos sobrescrever com UUID.
// Guardaremos o UUID do servidor em 'serverId' (campo extra) e manteremos 'email' como chave de reconciliação.
const toLocal = (s: ServerClient): any => ({
  serverId: s.id,
  nome: s.name,
  email: s.email,
  telefone: s.phone,
  empresa: s.company,
  perfilRisco: s.risk_profile,
  observacoes: s.notes,
  ativo: s.active,
  dataCadastro: s.created_at ? new Date(s.created_at) : new Date(),
  dataUltimoContato: s.updated_at ? new Date(s.updated_at) : null,
});

// Sincronização básica: baixar do servidor e manter Dexie como cache
export const syncClientsDown = async (): Promise<Cliente[]> => {
  try {
    const online = await api.health().then(h => h.ok && h.db).catch(() => false);
    if (!online) {
      return await db.clientes.toArray();
    }
    const remote = await clientsApi.list();
    const mapped = remote.map(toLocal);
    await db.transaction('rw', db.clientes, async () => {
      for (const item of mapped) {
        const existing = await db.clientes.where('email').equals(item.email).first();
        if (existing) {
          await db.clientes.update((existing as any).id, item);
        } else {
          await db.clientes.add(item);
        }
      }
    });
    return await db.clientes.toArray();
  } catch (e) {
    return await db.clientes.toArray();
  }
};

// Cria online, cai para offline se falhar
export const createClientSmart = async (c: Omit<Cliente, 'id'>): Promise<Cliente> => {
  const payload = toServer({ ...c } as any);
  try {
    const id = await clientsApi.create(payload);
    const local = toLocal({ id, ...(payload as ServerClient), active: payload.active ?? true });
    const existing = await db.clientes.where('email').equals(local.email).first();
    if (existing) {
      await db.clientes.update((existing as any).id, local);
    } else {
      await db.clientes.add(local);
    }
    return (await db.clientes.where('email').equals(local.email).first()) as Cliente;
  } catch (_) {
    const local: any = { ...c };
    const pk = await db.clientes.add(local);
    return (await db.clientes.get(pk)) as Cliente;
  }
};

export const updateClientSmart = async (c: Cliente): Promise<Cliente> => {
  try {
    // tenta identificar o UUID pelo cache (serverId) ou busca por email
    let serverId: string | undefined = (c as any).serverId;
    if (!serverId) {
      const list = await clientsApi.list();
      const found = list.find(x => x.email?.toLowerCase() === c.email?.toLowerCase());
      serverId = found?.id;
      if (serverId) (c as any).serverId = serverId;
    }
    if (serverId) {
      await clientsApi.update(serverId, toServer(c));
    }
  } catch (_) {
    // offline: segue para cache
  }
  const existing = await db.clientes.where('email').equals(c.email).first();
  if (existing) {
    await db.clientes.update((existing as any).id, { ...(c as any) });
  } else {
    await db.clientes.add(c as any);
  }
  const updated = await db.clientes.where('email').equals(c.email).first();
  // persistir serverId encontrado
  if ((c as any).serverId) {
    await db.clientes.update((updated as any).id, { serverId: (c as any).serverId });
  }
  return updated as Cliente;
};

export const deleteClientSmart = async (idOrEmail: string | number): Promise<void> => {
  try {
    let serverId: string | undefined;
    let email: string | undefined;
    if (typeof idOrEmail === 'number') {
      const c = await db.clientes.get(idOrEmail);
      email = c?.email;
      serverId = (c as any)?.serverId;
    } else if (idOrEmail.includes('@')) {
      email = idOrEmail;
    } else {
      // tentar mapear via local cache
      const all = await db.clientes.toArray();
      const found = all.find(r => (String((r as any).id) === idOrEmail) || ((r as any).serverId === idOrEmail));
      email = found?.email;
      serverId = (found as any)?.serverId;
    }
    if (!serverId && email) {
      const list = await clientsApi.list();
      serverId = list.find(x => x.email?.toLowerCase() === email?.toLowerCase())?.id;
    }
    if (serverId) await clientsApi.delete(serverId);
  } catch (_) {
    // mantém offline
  }
  if (typeof idOrEmail === 'number') {
    await db.clientes.delete(idOrEmail);
    return;
  }
  if (idOrEmail.includes('@')) {
    const c = await db.clientes.where('email').equals(idOrEmail).first();
    if (c) await db.clientes.delete((c as any).id);
    return;
  }
  const all = await db.clientes.toArray();
  const found = all.find(r => (String((r as any).id) === idOrEmail) || ((r as any).serverId === idOrEmail));
  if (found) await db.clientes.delete((found as any).id);
};


