import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { db, Ativo, Posicao, Cliente } from "@/lib/db";
import { clientsApi } from "@/services/clientsService";
import { portfoliosApi } from "@/services/portfoliosService";
import { positionsApi } from "@/services/positionsService";
import { api } from "@/services/api";
import { MarketDataService } from "@/lib/marketDataService";
import { fiApi } from "@/services/fixedIncomeService";
import {
  PlusCircle,
  Edit,
  Trash2,
  BarChart3,
  TrendingUp,
  DollarSign,
  Search,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import FixedIncomeManager from "./FixedIncomeManager";

interface PositionManagerProps {
  clienteId: number | string;
  onAnalyzePortfolio?: () => void;
}

const PositionManager: React.FC<PositionManagerProps> = ({
  clienteId,
  onAnalyzePortfolio,
}) => {
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [ativos, setAtivos] = useState<Ativo[]>([]);
  const [posicoes, setPosicoes] = useState<(Posicao & { ativoNome?: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showFixedIncome, setShowFixedIncome] = useState(false);
  const [valorTotal, setValorTotal] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Estado para o formulário
  const [formData, setFormData] = useState<Partial<Posicao>>({
    clienteId,
    quantidade: 0,
    precoMedio: 0,
    dataAtualizacao: new Date(),
    symbol: "",
    dataCompra: undefined,
  });

  // Estado de busca de ticker (UX moderna)
  const [tickerOpen, setTickerOpen] = useState(false);
  const [tickerQuery, setTickerQuery] = useState("");
  const [tickerResults, setTickerResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [quotePreview, setQuotePreview] = useState<any | null>(null);
  const [fxRate, setFxRate] = useState<number | null>(null); // USD->BRL
  // Controle de edição para evitar duplicação no servidor
  const [editingLocalId, setEditingLocalId] = useState<number | null>(null);
  const [editingServerPositionId, setEditingServerPositionId] = useState<string | null>(null);
  // Normaliza a chave do cliente uma vez (número quando possível)
  const clientKey = React.useMemo(() => {
    if (typeof clienteId === 'string' && /^\d+$/.test(clienteId)) return Number(clienteId);
    return clienteId as any;
  }, [clienteId]);

  // Carregar dados iniciais
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        // Buscar cliente (aceita id string numérica)
        let clienteData = await db.clientes.get(clientKey as any);
        if (!clienteData && typeof clienteId === 'string' && !/^\d+$/.test(clienteId)) {
          // tentar localizar por serverId no cache local
          const all = await db.clientes.toArray();
          clienteData = all.find((c: any) => c.serverId === clienteId) as any;
        }
        if (!clienteData) {
          // hidratar do servidor se online
          const online = await api.health().then(h => h.ok && h.db).catch(() => false);
          if (online) {
            try {
              const remoteClients = await clientsApi.list();
              const rc = remoteClients.find(r => r.id === clienteId) ||
                        remoteClients.find(r => (r.email || '').toLowerCase() === String(clienteId).toLowerCase());
              if (rc) {
                const local: any = {
                  serverId: rc.id,
                  nome: rc.name || rc.email || 'Cliente',
                  email: rc.email || '',
                  telefone: rc.phone,
                  empresa: rc.company,
                  perfilRisco: rc.risk_profile,
                  observacoes: rc.notes,
                  ativo: rc.active,
                  dataCadastro: rc.created_at ? new Date(rc.created_at) : new Date(),
                  dataUltimoContato: rc.updated_at ? new Date(rc.updated_at) : null,
                };
                // se já existir por email, atualiza; senão cria
                const existing = (await db.clientes.toArray()).find((c: any) => (c.email || '').toLowerCase() === (local.email || '').toLowerCase());
                if (existing) {
                  await db.clientes.update((existing as any).id, local);
                  clienteData = await db.clientes.get((existing as any).id) as any;
                } else {
                  const id = await db.clientes.add(local);
                  clienteData = await db.clientes.get(id) as any;
                }
              }
            } catch {}
          }
        }
        if (!clienteData) {
          throw new Error("Cliente não encontrado");
        }
        setCliente(clienteData);

        // Buscar todos os ativos
        const ativosData = await db.ativos.toArray();
        setAtivos(ativosData);

        // Buscar posições do cliente
        await carregarPosicoes((clienteData as any)?.id ?? clientKey);

        // Sincronizar posições do servidor (fallback offline)
        try {
          const online = await api.health().then(h => h.ok && h.db).catch(() => false);
          if (online) {
            await syncDownRemotePositions(clienteData);
          }
        } catch (e) {
          // ignorar erros de sync
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar os dados. Tente novamente mais tarde.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [clienteId, toast]);

  // Carregar câmbio USD->BRL para consolidação de totais
  useEffect(() => {
    const fetchFx = async () => {
      try {
        const q = await MarketDataService.getQuote("BRL=X");
        const v = Number(q?.currentPrice || 0);
        setFxRate(isFinite(v) && v > 0 ? v : null);
      } catch {
        setFxRate(null);
      }
    };
    fetchFx();
  }, []);

  // Busca de ticker com debounce ultra-rápido
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (!tickerOpen) return;
      const q = tickerQuery.trim();
      if (!q) {
        setTickerResults([]);
        return;
      }
      try {
        setIsSearching(true);
        const results = await MarketDataService.searchSecurities(q);
        setTickerResults(results || []);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    }, 250);
    return () => clearTimeout(handler);
  }, [tickerQuery, tickerOpen]);

  // Normaliza ticker: adiciona .SA automaticamente para códigos da B3
  const normalizeTicker = (input?: string) => {
    const v = (input || "").trim().toUpperCase();
    if (!v) return v;
    if (v.includes(".")) return v;
    if (/^[A-Z]{4}[0-9]{1,2}$/.test(v)) return `${v}.SA`;
    return v;
  };

  // Garante um ativo padrão de acordo com o ticker
  const ensureDefaultAtivoForSymbol = async (symbol: string): Promise<number | undefined> => {
    try {
      const upper = symbol.toUpperCase();
      const isBR = upper.endsWith(".SA");
      const KNOWN_ETF_US = new Set(['GLD','SPY','QQQ','IVV','VOO','VTI','IWM','DIA','EEM','EFA','VNQ','TLT','LQD','HYG','XLK','XLF','XLE','XLV','XLY','XLP','XLI','XLB','XLU','ARKK']);
      const KNOWN_ETF_BR = new Set(['IVVB11.SA','BOVA11.SA','SMAL11.SA','SPXI11.SA','XFIX11.SA','DIVO11.SA','GOLD11.SA','BOVX11.SA','NASD11.SA','EURP11.SA','ASIA11.SA','HASH11.SA']);
      const isETF = KNOWN_ETF_US.has(upper) || KNOWN_ETF_BR.has(upper) || /11\.SA$/.test(upper);
      const nomePreferido = isETF ? (isBR ? 'ETFs Nacionais' : 'ETFs Internacionais') : (isBR ? 'Ações Nacionais' : 'Ações Internacionais');
      const nomeFallback = isETF ? 'ETFs de Ações' : 'Ações';
      let ativo = await db.ativos.where("nome").equals(nomePreferido).first();
      if (!ativo) ativo = await db.ativos.where("nome").equals(nomeFallback).first();
      if (!ativo) {
        const novoId = await db.ativos.add({
          nome: nomePreferido,
          tipo: "Renda Variável",
          categoria: isETF ? 'ETF' : 'Ações',
          descricao: "Criado automaticamente para posições via ticker",
        });
        return novoId;
      }
      return ativo.id;
    } catch (e) {
      console.warn("Falha ao garantir ativo padrão", e);
      return undefined;
    }
  };

  // Auto selecionar ativo ao informar ticker
  const autoSelectAtivoBySymbol = async (symbol?: string) => {
    if (!symbol || formData.ativoId) return;
    const id = await ensureDefaultAtivoForSymbol(symbol);
    if (id) setFormData(prev => ({ ...prev, ativoId: id }));
  };

  // Atualiza o preview da cotação ao mudar symbol
  useEffect(() => {
    const run = async () => {
      const s = normalizeTicker(formData.symbol);
      if (!s) {
        setQuotePreview(null);
        return;
      }
      const q = await MarketDataService.getQuote(s);
      setQuotePreview(q);
    };
    const timer = setTimeout(run, 300);
    return () => clearTimeout(timer);
  }, [formData.symbol]);

  // Função para carregar as posições do cliente (server-first: Postgres)
  const carregarPosicoes = async (_overrideKey?: any) => {
    try {
      const online = await api.health().then(h => h.ok && h.db).catch(() => false);
      if (!online) { setPosicoes([]); return; }

      // Resolver UUID do cliente no servidor
      let serverId: string | null = null;
      if (typeof clienteId === 'string' && !/^\d+$/.test(clienteId)) serverId = String(clienteId);
      if (!serverId) serverId = await getServerClientId(cliente as any);
      if (!serverId) { setPosicoes([]); return; }

      // Posições RV (Postgres)
      const [allPortfolios, allPositions] = await Promise.all([
        portfoliosApi.list().catch(() => []),
        positionsApi.list().catch(() => []),
      ]);
      const portfoliosDoCliente = allPortfolios.filter(p => p.client_id === serverId);
      const alvo = new Set(portfoliosDoCliente.map(p => p.id));
      const listRV = allPositions.filter(p => alvo.has(p.portfolio_id));

      // Cotações atuais
      const uniqueSymbols = Array.from(new Set(listRV.map(r => (r.symbol || '').toUpperCase()).filter(Boolean)));
      const quotesMap = new Map<string, number>();
      await Promise.all(uniqueSymbols.map(async s => { try { const q = await MarketDataService.getQuote(s); const px = Number(q?.currentPrice || 0); if (px > 0) quotesMap.set(s, px); } catch {} }));

      const rowsRV = listRV.map(r => {
        const sym = (r.symbol || '').toUpperCase();
        const priceNow = quotesMap.get(sym) ?? Number(r.avg_price || 0);
        const qty = Number(r.quantity || 0);
        const avg = Number(r.avg_price || 0);
        const market = qty * priceNow;
        const pnl = market - qty * avg;
        const pnlPct = avg > 0 ? (pnl / (qty * avg)) * 100 : 0;
        const isBR = sym.endsWith('.SA');
          return {
          clienteId: serverId,
          ativoId: 0,
          ativoNome: isBR ? 'Ações Nacionais' : 'Ações Internacionais',
          quantidade: qty,
          precoMedio: avg,
          precoAtual: priceNow,
          valorTotal: market,
          symbol: sym,
          dataCompra: r.purchase_date ? fromYMD(r.purchase_date as any) : undefined,
          rendimento: pnl,
          rendimentoPercent: pnlPct,
          lastQuoteUpdate: new Date(),
          serverPortfolioId: r.portfolio_id,
          serverPositionId: r.id,
        } as any;
      });

      // Posições RF (microserviço)
      const rfRes = await fiApi.listPositions(serverId).catch(() => ({ success: true, data: [] as any[] }));
      const today = new Date();
      const asof = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
      const rowsRF: any[] = [];
      if ((rfRes as any)?.success && Array.isArray((rfRes as any).data)) {
        // preparer bulk items
        const items = (rfRes as any).data.map((r: any) => ({ id: r.id, asof }));
        let bulk: any = null;
        try {
          const resBulk = await fiApi.valuationBulk(items);
          if ((resBulk as any)?.success) bulk = (resBulk as any).data || {};
        } catch {}
        for (const r of (rfRes as any).data) {
          let priceNow = Number(r.price || 0);
          let rfClean: number | undefined; let rfDirty: number | undefined; let rfAccrued: number | undefined; let rfYtm: number | undefined; let rfDuration: number | undefined; let rfConvexity: number | undefined;
          const pack = bulk ? bulk[r.id] : null;
          if (pack && pack.success) {
            rfDirty = Number(pack.dirty_price);
            rfClean = Number(pack.clean_price);
            rfAccrued = Number(pack.accrued);
            rfYtm = typeof pack.ytm === 'number' ? Number(pack.ytm) : undefined;
            rfDuration = typeof pack.duration === 'number' ? Number(pack.duration) : undefined;
            rfConvexity = typeof pack.convexity === 'number' ? Number(pack.convexity) : undefined;
            priceNow = Number(rfDirty || rfClean || priceNow);
          } else {
            // fallback single call apenas se necessário
            try {
              const val = await fiApi.valuation(r.id, asof);
              if (val?.success) {
                rfDirty = Number(val.dirty_price);
                rfClean = Number(val.clean_price);
                rfAccrued = Number(val.accrued);
                rfYtm = typeof val.ytm === 'number' ? Number(val.ytm) : undefined;
                rfDuration = typeof val.duration === 'number' ? Number(val.duration) : undefined;
                rfConvexity = typeof val.convexity === 'number' ? Number(val.convexity) : undefined;
                priceNow = Number(rfDirty || rfClean || priceNow);
              }
            } catch {}
          }
          // Fallback para pré-fixado caso valuation não altere o preço
          try {
            const idx = String(r.instrument?.indexer || '').toUpperCase();
            if ((priceNow === Number(r.price || 0) || !isFinite(priceNow) || priceNow <= 0) && (idx === 'PRE' || idx === 'PREFIX')) {
              const issue = r.instrument?.issue_date ? new Date(r.instrument.issue_date) : null;
              const end = new Date(asof);
              if (issue && !isNaN(issue.getTime())) {
                const days = Math.max(0, Math.floor((end.getTime() - issue.getTime()) / 86400000));
                const t = days / 365.0;
                const rate = Number(r.instrument?.rate || 0); // decimal (0.22)
                const base = Number(r.instrument?.face_value || r.price || 0);
                const calc = base * Math.pow(1 + (rate || 0), t);
                if (isFinite(calc) && calc > 0) priceNow = calc;
              }
            }
          } catch {}
          const qty = Number(r.quantity || 0);
          const avg = Number(r.price || 0);
          const market = qty * priceNow;
          const pnl = market - qty * avg;
          const pnlPct = avg > 0 ? (pnl / (qty * avg)) * 100 : 0;
          rowsRF.push({
            clienteId: serverId,
            ativoId: 0,
            ativoNome: String(r.instrument?.display_name || 'Renda Fixa'),
            quantidade: qty,
            precoMedio: avg,
            precoAtual: priceNow,
            valorTotal: market,
            symbol: undefined,
            dataCompra: r.trade_date ? fromYMD(r.trade_date as any) : undefined,
            rendimento: pnl,
            rendimentoPercent: pnlPct,
            lastQuoteUpdate: new Date(),
            serverPositionId: r.id,
            rfClean,
            rfDirty,
            rfAccrued,
            rfYtm,
            rfDuration,
            rfConvexity,
          } as any);
        }
      }

      const rows = [...rowsRV, ...rowsRF];
      setValorTotal(rows.reduce((s, p) => s + p.quantidade * p.precoMedio, 0));
      setPosicoes(rows);
    } catch (error) {
      console.error('Erro ao carregar posições (server-first):', error);
      setPosicoes([]);
      toast({ variant: 'destructive', title: 'Erro ao carregar posições', description: 'Falha ao consultar o servidor.' });
    }
  };

  // Helpers de sincronização com API (server UUIDs)
  const getServerClientId = async (c: Cliente | null): Promise<string | null> => {
    if (!c) return null;
    const cached = (c as any).serverId as string | undefined;
    if (cached) return cached;
    try {
      const list = await clientsApi.list();
      const found = list.find(x => x.email?.toLowerCase() === (c.email || '').toLowerCase());
      return found?.id || null;
    } catch {
      return null;
    }
  };

  const getClientPortfolioIds = async (serverClientId: string): Promise<string[]> => {
    try {
      const all = await portfoliosApi.list();
      const clientPortfolios = all.filter(p => p.client_id === serverClientId);
      if (clientPortfolios.length > 0) return clientPortfolios.map(p => p.id);
      // nenhum portfolio? cria um Default
      const created = await portfoliosApi.create({ client_id: serverClientId, name: 'Default', status: 'draft' });
      return created ? [created] : [];
    } catch {
      return [];
    }
  };

  // Compat: garantir um portfolio alvo (preferir "Default"; senão o primeiro; senão cria Default)
  const getOrCreateDefaultPortfolioId = async (serverClientId: string): Promise<string | null> => {
    try {
      const all = await portfoliosApi.list();
      const list = all.filter(p => p.client_id === serverClientId);
      const preferred = list.find(p => (p.name || '').toLowerCase() === 'default') || list[0];
      if (preferred) return preferred.id;
      const created = await portfoliosApi.create({ client_id: serverClientId, name: 'Default', status: 'draft' });
      return created || null;
    } catch {
      return null;
    }
  };

  const syncDownRemotePositions = async (c: Cliente) => {
    try {
      const serverClientId = await getServerClientId(c);
      if (!serverClientId) return;
      const portfolioIds = await getClientPortfolioIds(serverClientId);
      if (!portfolioIds.length) return;
      const localClientPk = (c as any).id as number | undefined;
      const clienteKey = typeof clienteId === 'string' && /^\d+$/.test(clienteId) ? Number(clienteId) : (localClientPk ?? (clienteId as any));
      const remote = await positionsApi.list();
      const setIds = new Set(portfolioIds);
      const list = remote.filter(r => setIds.has(r.portfolio_id));
      for (const r of list) {
        const symbol = r.symbol?.toUpperCase();
        const ativoId = symbol ? await ensureDefaultAtivoForSymbol(symbol) : undefined;
        const existing = await db.posicoes.where('clienteId').equals(clienteKey as any).and(p => (p.symbol || '').toUpperCase() === (symbol || '')).first();
        const item: any = {
          clienteId: clienteKey,
          ativoId,
          quantidade: Number(r.quantity || 0),
          precoMedio: Number(r.avg_price || 0),
          dataAtualizacao: new Date(),
          symbol: symbol,
          serverPortfolioId: r.portfolio_id,
          serverPositionId: r.id,
          dataCompra: r.purchase_date ? fromYMD(r.purchase_date as any) : undefined,
        };
        if (existing) {
          await db.posicoes.update((existing as any).id, item);
        } else {
          await db.posicoes.add(item);
        }
      }
      await carregarPosicoes(clienteKey);
    } catch (e) {
      // silencioso
    }
  };

  // Manipulador para mudanças nos campos do formulário
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      if (name === "ativoId") return { ...prev, ativoId: Number(value) };
      if (name === "quantidade") return { ...prev, quantidade: parseFloat(value) };
      if (name === "precoMedio") return { ...prev, precoMedio: parseFloat(value) };
      if (name === "symbol") return { ...prev, symbol: value.toUpperCase() };
      if (name === "dataCompra") {
        if (!value) return { ...prev, dataCompra: undefined };
        const [yy, mm, dd] = value.split("-").map(Number);
        const localDate = new Date(yy, (mm || 1) - 1, dd || 1);
        localDate.setHours(0, 0, 0, 0);
        return { ...prev, dataCompra: localDate };
      }
      return { ...prev, [name]: value } as Partial<Posicao>;
    });
  };

  // Utilitário para formatar data YYYY-MM-DD
  const toYMD = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // yyyy-mm-dd -> Date local (evita UTC deslocar para dia anterior)
  const fromYMD = (s: string | undefined): Date | undefined => {
    if (!s) return undefined;
    try {
      const [yy, mm, dd] = s.split("-").map(Number);
      const d = new Date(yy, (mm || 1) - 1, dd || 1);
      d.setHours(0, 0, 0, 0);
      return d;
    } catch {
      return undefined;
    }
  };

  const safeFormatDate = (value: any): string => {
    try {
      if (!value) return '-';
      const dt = value instanceof Date ? value : new Date(value);
      if (isNaN(dt.getTime())) return '-';
      return format(dt, "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return '-';
    }
  };

  // Buscar preço de compra pelo histórico do dia (ou dia útil anterior)
  const fetchPurchasePriceForForm = async () => {
    try {
      if (!formData.symbol || !formData.dataCompra) {
        toast({ variant: "destructive", title: "Informe ticker e data", description: "Preencha o símbolo (ticker) e a data de compra." });
        return;
      }

      const history = await MarketDataService.getPriceHistory(normalizeTicker(formData.symbol), 'max', '1d');
      if (!history || history.length === 0) {
        toast({ variant: "destructive", title: "Histórico indisponível", description: "Não foi possível obter histórico de preços." });
        return;
      }

      const target = toYMD(formData.dataCompra);
      const sorted = [...history].sort((a, b) => a.date.getTime() - b.date.getTime());
      let chosen = sorted.find(h => toYMD(h.date) === target);
      if (!chosen) {
        chosen = [...sorted].reverse().find(h => toYMD(h.date) < target);
      }
      if (!chosen) {
        toast({ variant: "destructive", title: "Data fora do histórico", description: "Não há preço disponível na data informada." });
        return;
      }

      const price = chosen.adjustedClose ?? chosen.close;
      setFormData(prev => ({ ...prev, precoMedio: price, precoCompra: price }));
      toast({ title: "Preço preenchido", description: `Preço em ${toYMD(chosen.date)}: R$ ${price.toFixed(2)}` });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Erro ao obter preço", description: "Verifique o ticker e tente novamente." });
    }
  };

  // Atualiza preço atual e rendimentos de uma posição (RV: Yahoo; RF: valuation API)
  const refreshPositionQuote = async (pos: Posicao & { id?: number; rfPositionId?: string }) => {
    try {
      // Renda Fixa (sem ticker): usar valuation do backend
      if (!pos.symbol) {
        const rfId = (pos as any).rfPositionId || (pos as any).serverPositionId;
        if (!rfId) return;
        const today = new Date();
        const asof = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
        const val = await fiApi.valuation(rfId, asof).catch(() => null);
        if (!val || !(val as any).success) return;
        const rfDirty = Number((val as any).dirty_price ?? 0);
        const rfClean = Number((val as any).clean_price ?? 0);
        const rfAccrued = Number((val as any).accrued ?? 0);
        const rfYtm = typeof (val as any).ytm === 'number' ? Number((val as any).ytm) : undefined;
        const rfDuration = typeof (val as any).duration === 'number' ? Number((val as any).duration) : undefined;
        const rfConvexity = typeof (val as any).convexity === 'number' ? Number((val as any).convexity) : undefined;
        const precoAtual = (rfDirty || rfClean) ? (rfDirty || rfClean) : (pos.precoAtual ?? pos.precoMedio);

        if (pos.id) {
          await db.posicoes.update(pos.id!, {
            precoAtual,
            lastQuoteUpdate: new Date(),
          } as any);
        } else {
          // Atualizar estado local (linhas vindas do servidor)
          setPosicoes(prev => prev.map(p => {
            const match = (!p.symbol) && (((p as any).rfPositionId || (p as any).serverPositionId) === rfId);
            if (!match) return p;
            return { ...p, precoAtual, rfDirty, rfClean, rfAccrued, rfYtm, rfDuration, rfConvexity } as any;
          }));
        }
        return;
      }

      // Renda Variável: Yahoo/Binance
      const quote = await MarketDataService.getQuote(normalizeTicker(pos.symbol));
      if (!quote?.currentPrice) return;
      const precoAtual = quote.currentPrice;
      const custoMedio = pos.precoMedio;
      const rendimento = (precoAtual - custoMedio) * pos.quantidade;
      const rendimentoPercent = custoMedio > 0 ? ((precoAtual - custoMedio) / custoMedio) * 100 : 0;
      if (pos.id) {
      await db.posicoes.update(pos.id!, {
        precoAtual,
        rendimento,
        rendimentoPercent,
        lastQuoteUpdate: new Date(),
      });
      } else {
        setPosicoes(prev => prev.map(p => {
          const match = (p.symbol || '').toUpperCase() === (pos.symbol || '').toUpperCase() && p.precoMedio === pos.precoMedio && p.quantidade === pos.quantidade;
          if (!match) return p;
          return { ...p, precoAtual } as any;
        }));
      }
    } catch (e) {
      console.warn("Falha ao atualizar cotação/valuation para posição", e);
    }
  };

  const refreshAllQuotes = async () => {
    for (const p of posicoes) {
      await refreshPositionQuote(p as any);
    }
    await carregarPosicoes();
    toast({ title: "Cotações atualizadas" });
  };

  // Recarrega posições quando o diálogo fecha (após salvar)
  useEffect(() => {
    if (!isDialogOpen) {
      // pequeno debounce para garantir que Dexie concluiu
      const t = setTimeout(() => {
        carregarPosicoes();
      }, 100);
      return () => clearTimeout(t);
    }
  }, [isDialogOpen]);

  // Manipulador para seleção de ativo
  const handleAtivoSelect = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      ativoId: Number(value),
    }));
  };

  // Manipulador para adicionar/editar posição
  const handleSavePosition = async () => {
    try {
      // Resolver ativo automaticamente se necessário
      let resolvedAtivoId = formData.ativoId;
      if (!resolvedAtivoId && formData.symbol) {
        const ensured = await ensureDefaultAtivoForSymbol(normalizeTicker(formData.symbol));
        if (ensured) resolvedAtivoId = ensured;
      }

      if (!resolvedAtivoId) {
        toast({
          variant: "destructive",
          title: "Ativo obrigatório",
          description: "Selecione um ativo ou informe um ticker válido.",
        });
        return;
      }

      if (!formData.quantidade || formData.quantidade <= 0) {
        toast({
          variant: "destructive",
          title: "Quantidade inválida",
          description: "A quantidade deve ser maior que zero.",
        });
        return;
      }

      if (!formData.precoMedio || formData.precoMedio <= 0) {
        toast({
          variant: "destructive",
          title: "Preço médio inválido",
          description: "O preço médio deve ser maior que zero.",
        });
        return;
      }

      // Calcular valor total
      const valorTotal = formData.quantidade! * formData.precoMedio!;

      // Preparar objeto para salvar
      const posicaoData: Posicao = {
        clienteId: clientKey as any,
        ativoId: resolvedAtivoId!,
        quantidade: formData.quantidade!,
        precoMedio: formData.precoMedio!,
        dataAtualizacao: new Date(),
        valorTotal,
        symbol: formData.symbol ? normalizeTicker(formData.symbol) : undefined,
        dataCompra: formData.dataCompra,
        precoCompra: formData.precoCompra ?? formData.precoMedio,
      };

      // Se tiver ID, atualiza a posição existente
      if (formData.id) {
        await db.posicoes.update(formData.id, posicaoData);
        await refreshPositionQuote({ ...posicaoData, id: formData.id });
        toast({
          title: "Posição atualizada",
          description: "A posição foi atualizada com sucesso.",
        });
        // Sync remoto (melhor esforço) — preferir atualizar, sem duplicar
        try {
          const serverClientId = await getServerClientId(cliente!);
          if (serverClientId) {
            const current = await db.posicoes.get(formData.id);
            const explicitPortfolioId = (current as any)?.serverPortfolioId as string | undefined;
            const serverPositionId = editingServerPositionId || ((current as any)?.serverPositionId as string | undefined);
            const clientPortfolioIds = await getClientPortfolioIds(serverClientId);
            const allowed = new Set(clientPortfolioIds);
            const normalizedSymbol = (posicaoData.symbol || '').toUpperCase();

            if (serverPositionId) {
              // Atualiza diretamente pelo ID conhecido (enviar apenas campos aceitos pelo backend)
              await positionsApi.update(serverPositionId, {
                symbol: posicaoData.symbol,
                quantity: posicaoData.quantidade,
                avg_price: posicaoData.precoMedio,
                purchase_date: posicaoData.dataCompra ? toYMD(posicaoData.dataCompra) : undefined,
              });
              // Atualizar cache local com o id para evitar toasts enganosos
              await db.posicoes.update(formData.id as any, { serverPositionId } as any);
      } else {
              // Tentar localizar a posição existente em QUALQUER portfolio do cliente pelo símbolo
              const remote = await positionsApi.list();
              const matches = remote.filter(r => allowed.has(r.portfolio_id) && (r.symbol || '').toUpperCase() === normalizedSymbol);
              const target = (explicitPortfolioId ? matches.find(r => r.portfolio_id === explicitPortfolioId) : null) || matches[0];
              if (target) {
                await positionsApi.update(target.id, {
                  symbol: posicaoData.symbol,
                  quantity: posicaoData.quantidade,
                  avg_price: posicaoData.precoMedio,
                  purchase_date: posicaoData.dataCompra ? toYMD(posicaoData.dataCompra) : undefined,
                });
                await db.posicoes.update(formData.id, { serverPositionId: target.id, serverPortfolioId: target.portfolio_id } as any);
                setEditingServerPositionId(target.id);
              } else {
                // Como último recurso, cria — mas evita duplicar ao máximo
                const portfolioId = explicitPortfolioId || clientPortfolioIds[0] || (await getOrCreateDefaultPortfolioId(serverClientId));
                if (portfolioId) {
                  const newId = await positionsApi.create({
                    portfolio_id: portfolioId,
                    symbol: posicaoData.symbol!,
                    quantity: posicaoData.quantidade!,
                    avg_price: posicaoData.precoMedio!,
                    purchase_date: posicaoData.dataCompra ? toYMD(posicaoData.dataCompra) : undefined,
                  });
                  await db.posicoes.update(formData.id, { serverPositionId: newId, serverPortfolioId: portfolioId } as any);
                  setEditingServerPositionId(newId);
                }
              }
            }
          }
        } catch (e) {
          console.warn('Sync remoto falhou (update posição). Alterações locais mantidas.', e);
          // segue o fluxo; a UI já foi atualizada localmente e será recarregada
        }
      } else {
        // Sem id local. Se estivermos editando uma linha vinda do servidor, atualizar lá (não criar)
        const serverIdForEdit = editingServerPositionId || undefined;
        if (serverIdForEdit) {
          try {
            const serverClientId = await getServerClientId(cliente!);
            const clientPortfolioIds = serverClientId ? await getClientPortfolioIds(serverClientId) : [];
            const explicitPortfolioId = undefined;
            await positionsApi.update(serverIdForEdit, {
              symbol: posicaoData.symbol,
              quantity: posicaoData.quantidade,
              avg_price: posicaoData.precoMedio,
              purchase_date: posicaoData.dataCompra ? toYMD(posicaoData.dataCompra) : undefined,
            });
            // Upsert local por serverPositionId
            const foundLocal = await db.posicoes.where('serverPositionId').equals(serverIdForEdit).first();
            if (foundLocal && (foundLocal as any).id != null) {
              await db.posicoes.update((foundLocal as any).id, posicaoData as any);
            } else {
              const newIdLocal = await db.posicoes.add({ ...posicaoData, serverPositionId: serverIdForEdit } as any);
              await refreshPositionQuote({ ...posicaoData, id: newIdLocal });
            }
            toast({ title: 'Posição atualizada', description: 'Registro do servidor atualizado sem duplicar.' });
          } catch (e) {
            console.warn('Sync remoto falhou (editar sem id local). Alterações locais mantidas.', e);
          }
          // não retornar: permitir reset/fechamento e recarga
        }

        // Fluxo original: criar/mesclar local e sincronizar criando somente se não existir remotamente
        const normalizedSymbol = (posicaoData.symbol || "").toUpperCase();
        const posicaoExistente = posicoes.find((p) => {
          const sameAtivo = p.ativoId === resolvedAtivoId;
          if (normalizedSymbol) {
            return sameAtivo && (p.symbol || "").toUpperCase() === normalizedSymbol;
          }
          return sameAtivo && !p.symbol;
        });

        if (posicaoExistente && posicaoExistente.id != null) {
          const novaQuantidade = posicaoExistente.quantidade + formData.quantidade!;
          const novoPrecoMedio = (posicaoExistente.quantidade * posicaoExistente.precoMedio + formData.quantidade! * formData.precoMedio!) / novaQuantidade;
          await db.posicoes.update(posicaoExistente.id!, {
            quantidade: novaQuantidade,
            precoMedio: novoPrecoMedio,
            dataAtualizacao: new Date(),
            valorTotal: novaQuantidade * novoPrecoMedio,
            symbol: posicaoExistente.symbol || posicaoData.symbol,
            dataCompra: posicaoExistente.dataCompra || posicaoData.dataCompra,
            precoCompra: posicaoExistente.precoCompra || posicaoData.precoCompra,
          });
          await refreshPositionQuote({ ...posicaoExistente, quantidade: novaQuantidade, precoMedio: novoPrecoMedio, symbol: posicaoExistente.symbol || posicaoData.symbol });
          toast({ title: 'Posição atualizada', description: 'A posição existente foi atualizada com preço médio recalculado.' });
        } else {
          const newId = await db.posicoes.add(posicaoData);
          await refreshPositionQuote({ ...posicaoData, id: newId });
          toast({ title: 'Posição adicionada', description: 'A posição foi adicionada com sucesso.' });
          try {
            const serverClientId = await getServerClientId(cliente!);
            const portfolioId = serverClientId ? await getOrCreateDefaultPortfolioId(serverClientId) : null;
            if (portfolioId) {
              const remote = await positionsApi.list().catch(() => [] as any[]);
              const exists = remote.find(r => r.portfolio_id === portfolioId && (r.symbol || '').toUpperCase() === (posicaoData.symbol || '').toUpperCase());
              if (exists) {
                await positionsApi.update(exists.id, {
                  symbol: posicaoData.symbol,
                  quantity: posicaoData.quantidade,
                  avg_price: posicaoData.precoMedio,
                  purchase_date: posicaoData.dataCompra ? toYMD(posicaoData.dataCompra) : undefined,
                });
                await db.posicoes.update(newId, { serverPositionId: exists.id, serverPortfolioId: portfolioId } as any);
              } else {
                const newServerId = await positionsApi.create({
                  portfolio_id: portfolioId,
                  symbol: posicaoData.symbol!,
                  quantity: posicaoData.quantidade!,
                  avg_price: posicaoData.precoMedio!,
                  purchase_date: posicaoData.dataCompra ? toYMD(posicaoData.dataCompra) : undefined,
                });
                await db.posicoes.update(newId, { serverPositionId: newServerId, serverPortfolioId: portfolioId } as any);
              }
            }
          } catch { /* ignore */ }
        }
      }

      // Resetar formulário e fechar diálogo, e recarregar imediatamente para refletir o servidor
      resetForm();
      setIsDialogOpen(false);
      await carregarPosicoes();
    } catch (error) {
      console.error("Erro ao salvar posição:", error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "Não foi possível salvar a posição. Tente novamente.",
      });
    }
  };

  // Manipulador para excluir posição
  const handleDeletePosition = async (row: any) => {
    try {
      if (confirm("Tem certeza que deseja excluir esta posição?")) {
        // tenta remover no servidor (RV e RF)
        try {
          const current = row?.id ? await db.posicoes.get(row.id) : row;
          const serverPositionId = (current as any)?.serverPositionId as string | undefined;
          const isRF = !current?.symbol;
          if (serverPositionId) {
            if (isRF) {
              await fiApi.deletePosition(serverPositionId);
            } else {
              await positionsApi.delete(serverPositionId);
            }
          } else if (current?.symbol) {
            const serverClientId = await getServerClientId(cliente!);
            const portfolioId = serverClientId ? await getOrCreateDefaultPortfolioId(serverClientId) : null;
            if (portfolioId) {
              const remote = await positionsApi.list();
              const found = remote.find(r => r.portfolio_id === portfolioId && (r.symbol || '').toUpperCase() === (current.symbol || '').toUpperCase());
              if (found) await positionsApi.delete(found.id);
            }
          }
        } catch { /* ignore */ }
        // remover local apenas se houver id em Dexie
        if (row?.id != null) {
          await db.posicoes.delete(row.id as any);
        }
        toast({
          title: "Posição excluída",
          description: "A posição foi excluída com sucesso.",
        });
        await carregarPosicoes();
      }
    } catch (error) {
      console.error("Erro ao excluir posição:", error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: "Não foi possível excluir a posição. Tente novamente.",
      });
    }
  };

  // Manipulador para editar posição
  const handleEditPosition = (posicao: Posicao) => {
    setEditingLocalId((posicao as any)?.id ?? null);
    setEditingServerPositionId(((posicao as any)?.serverPositionId as any) || null);
    setFormData({
      id: (posicao as any)?.id,
      clienteId: posicao.clienteId,
      ativoId: posicao.ativoId,
      quantidade: posicao.quantidade,
      precoMedio: posicao.precoMedio,
      dataAtualizacao: posicao.dataAtualizacao,
      symbol: posicao.symbol,
      dataCompra: posicao.dataCompra,
      precoCompra: posicao.precoCompra,
    });
    setIsDialogOpen(true);
  };

  // Resetar formulário
  const resetForm = () => {
    setFormData({
      clienteId: clientKey as any,
      quantidade: 0,
      precoMedio: 0,
      dataAtualizacao: new Date(),
      symbol: "",
      dataCompra: undefined,
    });
    setEditingLocalId(null);
    setEditingServerPositionId(null);
    setQuotePreview(null);
    setTickerQuery("");
    setTickerResults([]);
  };

  // Formatador de moeda
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Formatação por símbolo: BRL para .SA, USD caso contrário
  const formatCurrencyBySymbol = (value: number, symbol?: string): string => {
    const isBR = !symbol || (symbol || "").toUpperCase().endsWith(".SA");
    const currency = isBR ? "BRL" : "USD";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);
  };

  // Navegação para o otimizador de portfólio
  const navegarParaOtimizador = () => {
    navigate(`/clients/${clienteId}/portfolio/optimize`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-60">
        <div className="animate-spin w-8 h-8 border-t-2 border-primary rounded-full"></div>
      </div>
    );
  }

  // Renderização do cartão de sumário
  const renderSummaryCard = () => {
    // Agregados separados por moeda
    const totals = posicoes.reduce(
      (acc, p) => {
        // RF não tem símbolo -> tratar como BRL; RV BR é .SA
        const isBR = !p.symbol || (p.symbol || "").toUpperCase().endsWith(".SA");
        const key = isBR ? "BRL" : "USD" as "BRL" | "USD";
        const market = p.quantidade * (p.precoAtual ?? p.precoMedio);
        const cost = p.quantidade * p.precoMedio;
        acc[key].market += market;
        acc[key].cost += cost;
        acc[key].pl += market - cost;
        return acc;
      },
      { BRL: { market: 0, cost: 0, pl: 0 }, USD: { market: 0, cost: 0, pl: 0 } }
    );

    const fx = fxRate || 5.0;
    const totalMarketBRL = totals.BRL.market + totals.USD.market * fx;
    const totalCostBRL = totals.BRL.cost + totals.USD.cost * fx;
    const totalPLBRL = totalMarketBRL - totalCostBRL;
    const totalPct = totalCostBRL > 0 ? (totalPLBRL / totalCostBRL) * 100 : 0;

    const renderRow = (label: string, currency: "BRL" | "USD") => {
      const t = totals[currency];
      const percent = t.cost > 0 ? (t.pl / t.cost) * 100 : 0;
      return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Custo Total ({currency})</div>
            <div className="text-2xl font-bold">{new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(t.cost)}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Valor de Mercado ({currency})</div>
            <div className="text-2xl font-bold">{new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(t.market)}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Lucro/Prejuízo ({currency})</div>
            <div className={`text-2xl font-bold ${t.pl >= 0 ? 'text-green-600' : 'text-red-600'}`}>{new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(t.pl)}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Retorno (%)</div>
            <div className={`text-2xl font-bold ${percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>{percent.toFixed(2)}%</div>
          </div>
        </div>
      );
    };

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <div>Resumo do Portfólio</div>
            <div className="flex gap-2">
              {onAnalyzePortfolio && (
                <Button variant="outline" onClick={onAnalyzePortfolio}>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Analisar Portfólio
                </Button>
              )}
              <Button variant="outline" onClick={refreshAllQuotes}>
                Atualizar Preços
              </Button>
              <Button variant="default" onClick={navegarParaOtimizador}>
                <TrendingUp className="mr-2 h-4 w-4" />
                Otimizar Portfólio
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Visão geral por moeda (BRL e USD) com base no ticker
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Total consolidado (BRL) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Custo Total (Total em BRL)</div>
              <div className="text-2xl font-bold">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalCostBRL)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Valor de Mercado (Total em BRL)</div>
              <div className="text-2xl font-bold">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalMarketBRL)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Lucro/Prejuízo (Total em BRL)</div>
              <div className={`text-2xl font-bold ${totalPLBRL >= 0 ? 'text-green-600' : 'text-red-600'}`}>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalPLBRL)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Retorno (%) Total</div>
              <div className={`text-2xl font-bold ${totalPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>{totalPct.toFixed(2)}%</div>
            </div>
          </div>
          {renderRow("Reais", "BRL")}
          {renderRow("Dólares", "USD")}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Resumo do portfólio */}
      {renderSummaryCard()}

      {/* Lista de posições */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead className="text-right">Preço Médio</TableHead>
                <TableHead className="text-right">Preço Atual</TableHead>
                <TableHead className="text-right">Valor Mercado</TableHead>
                <TableHead className="text-right">PnL</TableHead>
                <TableHead className="text-right">PnL%</TableHead>
                <TableHead className="text-right">Data Compra</TableHead>
                <TableHead className="text-right">Última Atualização</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posicoes.map((posicao) => (
                <TableRow key={posicao.id}>
                  <TableCell className="font-medium">
                    {posicao.ativoNome}
                    {posicao.symbol ? (
                      <span className="ml-2 text-xs text-muted-foreground">({posicao.symbol})</span>
                    ) : null}
                    {!posicao.symbol && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {typeof (posicao as any).rfYtm === 'number' ? `YTM: ${((posicao as any).rfYtm * 100).toFixed(2)}%` : ''}
                        {typeof (posicao as any).rfDuration === 'number' ? ` • Dur: ${((posicao as any).rfDuration).toFixed(3)}` : ''}
                        {typeof (posicao as any).rfConvexity === 'number' ? ` • Conv: ${((posicao as any).rfConvexity).toFixed(3)}` : ''}
                        {typeof (posicao as any).rfAccrued === 'number' ? ` • Accrual: ${formatCurrency((posicao as any).rfAccrued)}` : ''}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {posicao.quantidade.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 6,
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    {posicao.symbol ? formatCurrencyBySymbol(posicao.precoMedio, posicao.symbol) : formatCurrency(posicao.precoMedio)}
                  </TableCell>
                  <TableCell className="text-right">
                    {posicao.symbol ? (posicao.precoAtual ? formatCurrencyBySymbol(posicao.precoAtual, posicao.symbol) : '-') : formatCurrency(((posicao as any).rfDirty ?? posicao.precoAtual ?? posicao.precoMedio))}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrencyBySymbol(posicao.quantidade * (posicao.precoAtual ?? posicao.precoMedio), posicao.symbol)}
                  </TableCell>
                  <TableCell className={`text-right ${((posicao.precoAtual ?? posicao.precoMedio) - posicao.precoMedio) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {posicao.precoAtual !== undefined
                      ? formatCurrencyBySymbol(((posicao.precoAtual - posicao.precoMedio) * posicao.quantidade), posicao.symbol)
                      : '-'}
                  </TableCell>
                  <TableCell className={`text-right ${((posicao.precoAtual ?? posicao.precoMedio) - posicao.precoMedio) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {posicao.precoAtual !== undefined
                      ? `${(((posicao.precoAtual - posicao.precoMedio) / posicao.precoMedio) * 100).toFixed(2)}%`
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {safeFormatDate(posicao.dataCompra)}
                  </TableCell>
                  <TableCell className="text-right">
                    {safeFormatDate(posicao.dataAtualizacao)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditPosition(posicao)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeletePosition(posicao)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {!showFixedIncome && (
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button onClick={() => resetForm()}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Posição
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-[720px] w-[92vw]">
          <DialogHeader>
            <DialogTitle>
              {formData.id ? "Editar Posição" : "Adicionar Nova Posição"}
            </DialogTitle>
            <DialogDescription>
              {formData.id
                ? "Atualize os dados da posição de ativo existente"
                : "Adicione um novo ativo à carteira do cliente"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid items-center gap-2">
              <Label htmlFor="ticker">Ticker (opcional)</Label>
              <div className="text-xs text-muted-foreground -mt-1">Informe o ticker e detectaremos a classe automaticamente.</div>
            </div>

            <div className="grid grid-cols-2 items-center gap-4">
              <div className="grid gap-2">
                <Label htmlFor="quantidade">Quantidade</Label>
                <div className="relative">
                  <Input
                    id="quantidade"
                    name="quantidade"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.quantidade || ""}
                    onChange={handleInputChange}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="precoMedio">Preço Médio</Label>
                <div className="relative">
                  <Input
                    id="precoMedio"
                    name="precoMedio"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.precoMedio || ""}
                    onChange={handleInputChange}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 items-start gap-4">
              <div className="grid gap-2">
                <Label>Ticker</Label>
                <Popover open={tickerOpen} onOpenChange={setTickerOpen}>
                  <PopoverTrigger asChild>
                    <div className="relative">
                      <Input
                        id="symbol"
                        name="symbol"
                        placeholder="Ex.: PETR4.SA"
                        value={formData.symbol || ""}
                        onChange={(e) => {
                          handleInputChange(e);
                          setTickerQuery(e.target.value);
                        }}
                        onBlur={() => {
                          const n = normalizeTicker(formData.symbol);
                          if (n !== formData.symbol) setFormData(prev => ({ ...prev, symbol: n }));
                          autoSelectAtivoBySymbol(n);
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2"
                        onClick={() => setTickerOpen((v) => !v)}
                        title="Pesquisar ticker"
                      >
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[420px]">
                    <Command>
                      <CommandInput
                        placeholder="Pesquisar por símbolo, empresa ou ETF"
                        value={tickerQuery}
                        onValueChange={setTickerQuery}
                      />
                      <CommandList>
                        <CommandEmpty>{isSearching ? "Buscando..." : "Nenhum resultado"}</CommandEmpty>
                        <CommandGroup heading="Resultados">
                          {tickerResults.map((r, idx) => (
                            <CommandItem
                              key={`${r.symbol || idx}`}
                              value={`${r.symbol}`}
                              onSelect={async (value) => {
                                const n = normalizeTicker(value);
                                setFormData(prev => ({ ...prev, symbol: n }));
                                setTickerOpen(false);
                                setTickerQuery("");
                                await autoSelectAtivoBySymbol(n);
                              }}
                            >
                              <div className="flex items-center justify-between w-full">
                                <div>
                                  <div className="text-sm font-medium">{r.shortname || r.longname || r.name || r.symbol}</div>
                                  <div className="text-xs text-muted-foreground">{r.symbol}{r.exchange ? ` • ${r.exchange}` : ""}</div>
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {quotePreview && (
                  <div className="text-xs text-muted-foreground">
                    {quotePreview.name ? `${quotePreview.name} • ` : ""}{normalizeTicker(formData.symbol)} — {formatCurrency(quotePreview.currentPrice || 0)}
                  </div>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dataCompra">Data da Compra</Label>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_minmax(160px,220px)] gap-2 items-stretch">
                  <Input
                    id="dataCompra"
                    name="dataCompra"
                    type="date"
                    value={formData.dataCompra ? toYMD(formData.dataCompra) : ""}
                    onChange={handleInputChange}
                  />
                  <Button className="w-full h-10" variant="outline" onClick={fetchPurchasePriceForForm} disabled={!formData.symbol || !formData.dataCompra}>
                    Buscar Preço do Dia
                  </Button>
                </div>
              </div>
            </div>

            {formData.quantidade && formData.precoMedio && (
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm font-medium">Valor Total:</p>
                <p className="text-lg font-bold">
                  {formatCurrencyBySymbol(formData.quantidade * formData.precoMedio, formData.symbol)}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePosition}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}

      {!showFixedIncome && (
        <div className="mt-3">
          <Button variant="secondary" onClick={() => setShowFixedIncome(true)}>Adicionar Renda Fixa</Button>
        </div>
      )}

      {showFixedIncome && (
        <div className="mt-6">
          <FixedIncomeManager
            clientServerId={String((cliente as any)?.serverId || '')}
            onBack={() => setShowFixedIncome(false)}
            onCreated={() => carregarPosicoes()}
          />
        </div>
      )}
    </div>
  );
};

export default PositionManager; 