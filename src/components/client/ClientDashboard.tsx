import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { db, Cliente, Posicao, PortfolioAnalysis } from "@/lib/db";
import { useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import { clientsApi } from "@/services/clientsService";
import { portfoliosApi } from "@/services/portfoliosService";
import { positionsApi } from "@/services/positionsService";
import { MarketDataService } from "@/lib/marketDataService";
import { fiApi } from "@/services/fixedIncomeService";
// (removido) seletor de modo TWR/Cost
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, DollarSign, PieChart as PieChartIcon, AlertTriangle, Calendar, ChevronRight, LineChart as LineChartIcon } from "lucide-react";

interface ClientDashboardProps {
  clienteId: number | string;
}

const COLORS = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042", 
  "#8884d8", "#82ca9d", "#ffc658", "#FF6B6B"
];

const ClientDashboard: React.FC<ClientDashboardProps> = ({ clienteId }) => {
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [posicoes, setPosicoes] = useState<Posicao[]>([]);
  const [analise] = useState<PortfolioAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [totalBRL, setTotalBRL] = useState(0);
  const [totalUSD, setTotalUSD] = useState(0);
  const [fxRate, setFxRate] = useState<number | null>(null);
  const [retTotal, setRetTotal] = useState<number | null>(null);
  const [retBRL, setRetBRL] = useState<number | null>(null);
  const [retUSD, setRetUSD] = useState<number | null>(null);
  const [performance, setPerformance] = useState<any[]>([]);
  const [perfCost, setPerfCost] = useState<any[]>([]);
  const [perfLoading, setPerfLoading] = useState<boolean>(false);
  const [cdiAnual, setCdiAnual] = useState<number | null>(null);
  const [alocacao, setAlocacao] = useState<any[]>([]);
  const [alocacaoAtivos, setAlocacaoAtivos] = useState<any[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Utilitários
  const normalizeTicker = (input?: string) => {
    const v = (input || "").trim().toUpperCase();
    if (!v) return v;
    if (v.includes(".")) return v;
    if (/^[A-Z]{4}[0-9]{1,2}$/.test(v)) return `${v}.SA`;
    return v;
  };

  // Data key no fuso local (YYYY-MM-DD)
  const toKeyLocal = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Formata chave YYYY-MM-DD para dd/MM/YYYY sem usar Date (evita shift de timezone)
  const formatKeyBR = (key: string) => {
    if (!key) return '';
    const parts = String(key).split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return String(key);
  };

  // Extrai substring YYYY-MM-DD de uma string (ISO-like), sem conversões
  const extractISODate = (s?: string | null): string | undefined => {
    if (!s) return undefined;
    const m = String(s).match(/\d{4}-\d{2}-\d{2}/);
    return m ? m[0] : undefined;
  };

  // Extrai chave de compra (YYYY-MM-DD) de Date ou string, sem deslocar timezone
  const getPurchaseKey = (value: any): string | undefined => {
    if (!value) return undefined;
    if (typeof value === 'string') {
      const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
      if (m) return m[1];
      // fallback para outros formatos
      try { const d = new Date(value); if (!isNaN(d.getTime())) return d.toISOString().slice(0,10); } catch {}
      return undefined;
    }
    if (value instanceof Date) {
      try { return value.toISOString().slice(0,10); } catch {}
      return toKeyLocal(value);
    }
    try {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0,10);
    } catch {}
    return undefined;
  };

  // (removido) ensureDefaultAtivoForSymbol

  // Carregar dados do cliente e portfólio
  useEffect(() => {
    const carregarDados = async () => {
      setIsLoading(true);
      try {
        const key = typeof clienteId === 'string' && /^\d+$/.test(clienteId) ? Number(clienteId) : (clienteId as any);

        // Buscar cliente (local por id numérico, serverId ou e-mail)
        let clienteData: Cliente | null = null;
        if (typeof key === 'number') {
          clienteData = await db.clientes.get(key) as any;
        } else {
          const all = await db.clientes.toArray();
          clienteData = all.find((c: any) => String((c as any).serverId || '').toLowerCase() === String(key).toLowerCase()) as any;
          if (!clienteData) {
            clienteData = all.find((c: any) => (c.email || '').toLowerCase() === String(key).toLowerCase()) as any;
          }
        }

        // Se não achou local, tentar servidor e hidratar cache
        if (!clienteData) {
          const online = await api.health().then(h => h.ok && h.db).catch(() => false);
          if (online) {
            const remoteClients = await clientsApi.list();
            const rc = remoteClients.find(r => r.id === clienteId) || remoteClients.find(r => (r.email || '').toLowerCase() === String(clienteId).toLowerCase());
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
              const existing = (await db.clientes.toArray()).find((c: any) => (c.email || '').toLowerCase() === (local.email || '').toLowerCase());
              if (existing) {
                await db.clientes.update((existing as any).id, local);
                clienteData = await db.clientes.get((existing as any).id) as any;
              } else {
                const id = await db.clientes.add(local);
                clienteData = await db.clientes.get(id) as any;
              }
            }
          }
        }

        if (!clienteData) throw new Error("Cliente não encontrado");
        setCliente(clienteData);

        // Buscar posições direto do servidor (server-first)
        let posicoesData: any[] = [];
        const online = await api.health().then(h => h.ok && h.db).catch(() => false);
        if (online && typeof key === 'string') {
          const [allPortfolios, allPositions] = await Promise.all([
            portfoliosApi.list().catch(() => []),
            positionsApi.list().catch(() => []),
          ]);
          const portfoliosDoCliente = allPortfolios.filter(p => p.client_id === String(key));
          const alvo = new Set(portfoliosDoCliente.map(p => p.id));
          const list = allPositions.filter(p => alvo.has(p.portfolio_id));
          const uniqueSymbols = Array.from(new Set(list.map(r => normalizeTicker(r.symbol)))).filter(Boolean) as string[];
          const quotesMap = new Map<string, number>();
          await Promise.all(uniqueSymbols.map(async s => { try { const q = await MarketDataService.getQuote(s); const px = Number(q?.currentPrice || 0); if (px > 0) quotesMap.set(s.toUpperCase(), px); } catch {} }));
          const norm = await Promise.all(list.map(async (r) => {
            const sym = normalizeTicker(r.symbol);
            const priceNow = quotesMap.get((sym || '').toUpperCase()) ?? Number(r.avg_price || 0);
            return { clienteId: key, quantidade: Number(r.quantity||0), precoMedio: Number(r.avg_price||0), precoAtual: Number(priceNow||0), symbol: sym, dataCompra: r.purchase_date ? new Date(r.purchase_date) : undefined } as any;
          }));
          posicoesData.push(...norm);
          // Renda fixa
          try {
            const rf = await fiApi.listPositions(String(key));
            if ((rf as any)?.success && Array.isArray((rf as any).data)) {
              const today = new Date();
              const asof = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
              for (const r of (rf as any).data) {
                let priceNow = Number(r.price || 0);
                let rfClean: number | undefined; let rfDirty: number | undefined; let rfAccrued: number | undefined; let rfYtm: number | undefined; let rfDuration: number | undefined; let rfConvexity: number | undefined;
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
                const rfKind = (r as any)?.instrument?.kind || undefined;
                const rfLabel = (r as any)?.instrument?.display_name || (rfKind ? `${rfKind}` : 'Renda Fixa');
                posicoesData.push({ clienteId: key, quantidade: Number(r.quantity||0), precoMedio: Number(r.price||0), precoAtual: priceNow, symbol: undefined, dataCompra: r.trade_date ? new Date(r.trade_date) : undefined, rfClean, rfDirty, rfAccrued, rfYtm, rfDuration, rfConvexity, rfKind, rfLabel, rfPositionId: r.id } as any);
              }
            }
          } catch {}
        }

        setPosicoes(posicoesData);

        // Calcular totais por moeda
        const accInit = { marketBRL: 0, marketUSD: 0, costBRL: 0, costUSD: 0 };
        const { marketBRL, marketUSD, costBRL, costUSD } = posicoesData.reduce(
          (acc, pos) => {
            const hasSymbol = Boolean(pos.symbol);
            const isBR = !hasSymbol || (pos.symbol || '').toUpperCase().endsWith('.SA');
            const market = pos.quantidade * (pos.precoAtual ?? pos.precoMedio);
            const cost = pos.quantidade * pos.precoMedio;
            if (isBR) {
              acc.marketBRL += market;
              acc.costBRL += cost;
            } else {
              acc.marketUSD += market;
              acc.costUSD += cost;
            }
            return acc;
          },
          accInit
        );
        setTotalBRL(marketBRL);
        setTotalUSD(marketUSD);

        // Conversão para BRL e retorno total agregado
        let usdbrl = 5.0;
        try {
          const q = await MarketDataService.getQuote('BRL=X');
          const v = Number(q?.currentPrice || 0);
          if (v && isFinite(v)) usdbrl = v;
        } catch {}

        // Somar RF (já embutida em marketBRL/costBRL na sincronização server-first)
        const totalMarketBRLConv = marketBRL + marketUSD * usdbrl;
        const totalCostBRLConv = costBRL + costUSD * usdbrl;
        const totalRet = totalCostBRLConv > 0 ? ((totalMarketBRLConv - totalCostBRLConv) / totalCostBRLConv) * 100 : null;
        setRetTotal(totalRet);
        setFxRate(usdbrl);

        // Benchmark CDI a.a. efetivo: anualizar o último CDI diário (SGS 12)
        try {
          const today = new Date();
          const start = new Date();
          start.setDate(today.getDate() - 15);
          const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          const res = await fetch(`/api/timeseries/indexer?code=CDI&start=${fmt(start)}&end=${fmt(today)}`);
          if (res.ok) {
            const body = await res.json();
            const arr = Array.isArray(body?.data) ? body.data : [];
            const last = arr.length ? arr[arr.length - 1] : null;
            const d = last ? parseFloat(String(last.valor).replace(',', '.')) : NaN;
            if (!isNaN(d) && isFinite(d) && d > 0) {
              const anual = (Math.pow(1 + d / 100, 252) - 1) * 100;
              setCdiAnual(Number(anual));
            }
          }
        } catch {}

        // Buscar análise mais recente
        await db.portfolioAnalyses
          .where("clienteId")
          .equals(key)
          .reverse()
          .sortBy("data");
          
        // Rentabilidade por moeda: (valorMercado - custo) / custo * 100
        setRetBRL(costBRL > 0 ? ((marketBRL - costBRL) / costBRL) * 100 : null);
        setRetUSD(costUSD > 0 ? ((marketUSD - costUSD) / costUSD) * 100 : null);
        
        // Gerar dados de alocação
        gerarDadosAlocacao(posicoesData);
        // Liberar a UI enquanto geramos a performance em background
        setIsLoading(false);
        setPerfLoading(true);
        gerarPerformanceCost(posicoesData).finally(() => setPerfLoading(false));
      } catch (error) {
        console.error("Erro ao carregar dados do cliente:", error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar os dados do cliente."
        });
      } finally {
        // já liberamos acima, manter aqui como fallback
        setIsLoading(false);
      }
    };

    carregarDados();
  }, [clienteId, toast]);

  // (removido) gerarPerformanceTotal (TWR)

  // Série baseada em retorno sobre custo total (base fixa em BRL)
  const gerarPerformanceCost = async (posicoes: Posicao[]) => {
    try {
      const ativosValidos = posicoes.filter(p => p.quantidade && (p.precoMedio || p.precoAtual));
      if (ativosValidos.length === 0) { setPerfCost([]); setPerformance([]); return; }

      const period = '1y';
      const interval = '1d';

      // Série de câmbio para conversão e calendário diário
      const fxHistRaw = await MarketDataService.getPriceHistory('BRL=X', period, interval);
      const fxHist = (fxHistRaw || []).map((h: any) => {
        const dk = extractISODate(h.date) || toKeyLocal(new Date(h.date));
        return { key: dk, fx: Number(h.adjustedClose ?? h.close ?? h.price ?? h.value) };
      });
      const fxByKey = new Map(fxHist.map((x: any) => [x.key, Number(x.fx || 0)]));
      const usdbrlFallback = fxHist.length > 0 ? fxHist[fxHist.length - 1].fx : (fxRate || 5.0);
      let dateKeys: string[] = fxHist.map((x: any) => x.key).sort();

      // Garantir que o calendário contenha o dia útil mais atual (yfinance pode não ter fechado o candle diário ainda)
      const isBusinessDay = (d: Date) => {
        const wd = d.getDay();
        return wd >= 1 && wd <= 5; // seg-sex
      };
      const appendMissingBusinessDaysUntilToday = () => {
        if (dateKeys.length === 0) return;
        const today = new Date();
        const todayKey = toKeyLocal(today);
        // Só força inclusão se hoje for dia útil
        if (!isBusinessDay(today)) return;
        let lastKey = dateKeys[dateKeys.length - 1];
        if (lastKey >= todayKey) return;
        let cur = new Date(`${lastKey}T00:00:00`);
        const end = new Date(`${todayKey}T00:00:00`);
        while (cur < end) {
          cur.setDate(cur.getDate() + 1);
          if (!isBusinessDay(cur)) continue;
          const k = toKeyLocal(cur);
          if (!fxByKey.has(k)) {
            const prev = fxByKey.get(lastKey) ?? usdbrlFallback;
            fxByKey.set(k, Number(prev)); // carry‑forward do último FX
          }
          dateKeys.push(k);
          lastKey = k;
        }
        dateKeys = Array.from(new Set(dateKeys)).sort();
      };
      appendMissingBusinessDaysUntilToday();

      // Garantir inclusão do dia atual como último ponto se hoje for dia útil (chave ISO)
      const today = new Date();
      const todayKey = today.toISOString().slice(0,10);
      if (isBusinessDay(today) && (dateKeys[dateKeys.length - 1] !== todayKey)) {
        const lastKey = dateKeys[dateKeys.length - 1];
        const prevFx = fxByKey.get(lastKey) ?? usdbrlFallback;
        fxByKey.set(todayKey, Number(prevFx));
        dateKeys.push(todayKey);
      }

      // Início será determinado mais abaixo pelo primeiro dia com capital > 0
      if (dateKeys.length === 0) { setPerfCost([]); setPerformance([]); return; }

      // utilitário: limitar concorrência para evitar saturar rede/servidor
      const runWithPool = async <T,>(tasks: Array<() => Promise<T>>, poolSize = 4): Promise<T[]> => {
        const results: T[] = [];
        let i = 0;
        const workers = new Array(Math.min(poolSize, tasks.length)).fill(null).map(async () => {
          while (i < tasks.length) {
            const cur = i++;
            try { results[cur] = await tasks[cur](); } catch (e) { results[cur] = undefined as any; }
          }
        });
        await Promise.all(workers);
        return results;
      };

      // Mapas de preços por símbolo (RV) — buscar com concorrência limitada e reutilizar entre posições iguais
      const rvPositions = ativosValidos.filter(p => !!p.symbol);
      const uniqueRV = Array.from(new Set(rvPositions.map(p => normalizeTicker(p.symbol)))).filter(Boolean) as string[];
      const priceMap: Record<string, Map<string, number>> = {};
      const rvTasks = uniqueRV.map((s) => async () => {
        const map = new Map<string, number>();
        try {
          const hist = await MarketDataService.getPriceHistory(s, period, interval);
          (hist || []).forEach((h: any) => {
            const dk = extractISODate(h.date) || toKeyLocal(new Date(h.date));
            const adj = (h.adjustedClose ?? h.adjClose ?? h.adjclose ?? h.close ?? h.price ?? h.value);
            map.set(dk, Number(adj || 0));
          });
        } catch {
          // Se houver falha na série, não travar: mapa fica vazio e cairá nos fallbacks
        }
        priceMap[s] = map;
        return null as any;
      });
      await runWithPool(rvTasks, 4);

      // Determinar a menor data de compra conhecida (para posições sem dataCompra)
      const allPurchaseKeys = ativosValidos
        .map(p => getPurchaseKey((p as any).dataCompra))
        .filter((k: any) => typeof k === 'string') as string[];
      const earliestKnownBuyKey = allPurchaseKeys.length ? allPurchaseKeys.sort()[0] : undefined;

      // Série de RF (dirty price em BRL) por posição - busca em lote
      const rfPositions = ativosValidos.filter(p => !p.symbol);
      const rfSeries: Record<string, Map<string, number>> = {};
      const rfTasks = (rfPositions as any[]).map((p) => {
        return async () => {
          const id = String(p.rfPositionId || '');
          if (!id) return null;
          const buyKey = getPurchaseKey(p.dataCompra) || earliestKnownBuyKey || dateKeys[0];
          const startKey = buyKey < dateKeys[0] ? dateKeys[0] : buyKey; // limitar à janela do gráfico
          try {
            const res = await api.get<{ success: boolean; data: Array<{ date: string; dirty_price: number }> }>(`/api/fixed-income/valuation/timeseries?position_id=${encodeURIComponent(id)}&start=${startKey}&end=${dateKeys[dateKeys.length - 1]}`);
            if ((res as any)?.success && Array.isArray((res as any).data)) {
              const m = new Map<string, number>();
              for (const row of (res as any).data) {
                const dk = String(row.date);
                const unit = Number(row.dirty_price || 0);
                if (unit > 0) m.set(dk, unit);
              }
              rfSeries[id] = m;
            }
          } catch {
            // fallback: nenhum dado — a data de compra usará preço de compra e carry-forward já cobre o resto
          }
          return null as any;
        };
      });
      // Limitar concorrência da série RF (peso no backend)
      await runWithPool(rfTasks, 3);

      // Data efetiva de início por posição
      const flowKeyByIndex: Array<string | undefined> = ativosValidos.map(p => {
        // Se não houver data de compra, considerar earliestKnownBuyKey ou início da janela
        const buyKey = getPurchaseKey((p as any).dataCompra) || earliestKnownBuyKey || dateKeys[0];
        const eff = dateKeys.find(k => k >= buyKey) || dateKeys[0];
        return eff;
      });

      // Garantir que a série comece exatamente no primeiro dia efetivo com posição (min(flowKeyByIndex))
      const firstEffKey = (() => {
        const ks = flowKeyByIndex.filter((k): k is string => typeof k === 'string');
        if (!ks.length) return undefined;
        const minKey = ks.slice().sort()[0];
        const startKey = dateKeys.find(k => k >= minKey) || minKey;
        return startKey;
      })();
      if (firstEffKey) {
        dateKeys = dateKeys.filter(k => k >= firstEffKey);
      }

      // Reescalar séries ajustadas (adjClose) para coincidir com o preço de compra em RV
      const rvScaleByIndex: Array<number | undefined> = ativosValidos.map((p, i) => {
        if (!p.symbol) return undefined;
        const s = normalizeTicker(p.symbol);
        const map = priceMap[s];
        const fk = flowKeyByIndex[i];
        if (!map || !fk) return undefined;
        let baseKey = fk;
        if (map.get(baseKey) == null) {
          const startIdx = Math.max(0, dateKeys.indexOf(fk));
          for (let k = startIdx; k < dateKeys.length; k++) {
            const dk = dateKeys[k];
            const v = map.get(dk);
            if (v != null) { baseKey = dk; break; }
          }
        }
        const base = map.get(baseKey);
        const purchaseUnit = Number((p.precoCompra ?? p.precoMedio) || 0);
        if (base && purchaseUnit > 0) return purchaseUnit / Number(base);
        return undefined;
      });

      // Base de custo (em BRL) ancorada no câmbio ATUAL para ativos em USD, aplicada a partir da data de compra
      let usdbrlForCost = usdbrlFallback;
      try {
        const q = await MarketDataService.getQuote('BRL=X');
        const v = Number(q?.currentPrice || 0);
        if (v && isFinite(v)) usdbrlForCost = v;
      } catch {}
      const addCostNowByDate: Record<string, number> = {};
      ativosValidos.forEach((p: any, i: number) => {
        const eff = flowKeyByIndex[i];
        if (!eff) return;
        const isBR = (p.symbol || '').toUpperCase().endsWith('.SA') || !p.symbol;
        const qty = Number(p.quantidade || 0);
        const unitCostLocal = Number((p.precoCompra ?? p.precoMedio ?? p.precoAtual) || 0);
        const costBRLNow = qty * (isBR ? unitCostLocal : unitCostLocal * usdbrlForCost);
        addCostNowByDate[eff] = (addCostNowByDate[eff] || 0) + costBRLNow;
      });

      // Valor de mercado consolidado por dia em BRL
      const valueByDate: Map<string, number> = new Map();
      const capitalByDate: Map<string, number> = new Map();
      // manter último PU conhecido por posição RF para carry-forward
      let runningCapNow = 0;
      const lastRfUnitById: Record<string, number | undefined> = {};
      for (const dk of dateKeys) {
        let total = 0;
        const usdx = fxByKey.get(dk) ?? usdbrlFallback;
        if (addCostNowByDate[dk]) runningCapNow += addCostNowByDate[dk];
        for (let i = 0; i < ativosValidos.length; i++) {
          const p: any = ativosValidos[i];
          const fk = flowKeyByIndex[i];
          if (fk && dk < fk) continue;
          if (p.symbol) {
            const s = normalizeTicker(p.symbol);
            const map = priceMap[s];
            let pt = map?.get(dk);
            const scale = rvScaleByIndex[i];
            if (pt != null && scale != null) pt = pt * scale;
            if (pt == null) {
              // retroceder até encontrar último preço conhecido (limite 15 dias úteis)
              let backIdx = dateKeys.indexOf(dk) - 1;
              let hops = 0;
              while (backIdx >= 0 && hops < 20 && (pt == null)) {
                const backKey = dateKeys[backIdx];
                const candidate = map?.get(backKey);
                if (candidate != null) {
                  pt = candidate;
                if (pt != null && scale != null) pt = pt * scale;
                  break;
                }
                backIdx -= 1;
                hops += 1;
              }
              // fallback final no dia da compra
              const fkBuy = flowKeyByIndex[i];
              if (pt == null && fkBuy && dk === fkBuy) {
                // Em último caso, ancorar no custo conhecido (compra ou médio)
                pt = Number((p.precoCompra ?? p.precoMedio ?? p.precoAtual) || 0);
              }
            }
            if (pt == null) continue;
            const isBR = s.toUpperCase().endsWith('.SA');
            const prBRL = isBR ? pt : pt * usdx;
            const qty = Number(p.quantidade || 0);
            total += qty * prBRL;
          } else {
            const id = String(p.rfPositionId || '');
            let unit = rfSeries[id]?.get(dk);
            if (unit == null) {
              const fkBuy = flowKeyByIndex[i];
              // no dia da compra, usar PU de compra caso a série ainda não tenha valor
              if (fkBuy && dk === fkBuy) unit = Number((p.precoCompra ?? p.precoMedio) || 0);
            }
            if (unit == null) unit = lastRfUnitById[id];
            if (unit != null) {
              const qty = Number(p.quantidade || 0);
              total += qty * Number(unit);
              lastRfUnitById[id] = unit;
            }
          }
        }
        valueByDate.set(dk, total);
        capitalByDate.set(dk, runningCapNow);
      }

      // Remover quaisquer datas anteriores ao primeiro dia com capital alocado (> 0)
      const firstIdxWithCapital = dateKeys.findIndex(k => (capitalByDate.get(k) ?? 0) > 0);
      if (firstIdxWithCapital > 0) {
        dateKeys = dateKeys.slice(firstIdxWithCapital);
      }

      // Garantir data de fim correta (se hoje é dia útil): manter último ponto como hoje
      const lastKeyExisting = dateKeys[dateKeys.length - 1];
      const now = new Date();
      const nowKey = now.toISOString().slice(0,10);
      if (fxByKey.has(nowKey) && lastKeyExisting !== nowKey) {
        dateKeys.push(nowKey);
      }

      // Série TWR diária (corrige trajetória intermediária independente de fluxos)
      // Definições: V_t = valor de mercado no fim do dia t; F_t = fluxo líquido (entradas no dia t)
      // r_t = (V_t - F_t) / V_{t-1} - 1; I_0 = 1; I_t = I_{t-1} * (1 + r_t)
      // Fluxos por data usando FX do dia (não o atual) para ativos em USD
      const flowByDate: Record<string, number> = {};
      ativosValidos.forEach((p: any, i: number) => {
        const eff = flowKeyByIndex[i];
        if (!eff) return;
        const isBR = (p.symbol || '').toUpperCase().endsWith('.SA') || !p.symbol;
        const qty = Number(p.quantidade || 0);
        const unitCostLocal = Number((p.precoCompra ?? p.precoMedio ?? p.precoAtual) || 0);
        const usdxEff = fxByKey.get(eff) ?? usdbrlFallback;
        const flowBRL = isBR ? (qty * unitCostLocal) : (qty * unitCostLocal * usdxEff);
        flowByDate[eff] = (flowByDate[eff] || 0) + flowBRL;
      });

      const keys = [...dateKeys];
      const twrIndex: number[] = [];
      if (keys.length) {
        twrIndex.push(1);
        for (let i = 1; i < keys.length; i++) {
          const cur = keys[i];
          const prev = keys[i - 1];
          const Vt = valueByDate.get(cur) ?? 0;
          const Vprev = valueByDate.get(prev) ?? 0;
          const Ft = flowByDate[cur] || 0; // fluxo líquido no dia atual
          // Dietz Modificado diário: r = (Vt - Vprev - Ft) / (Vprev + Ft/2)
          const denom = (Vprev + (Ft / 2));
          const rt = denom > 0 ? ((Vt - Vprev - Ft) / denom) : 0;
          const lastIdx = twrIndex[twrIndex.length - 1] || 1;
          twrIndex.push(lastIdx * (1 + rt));
        }
      }
      let seriesPct = keys.map((dk, i) => ({
        name: formatKeyBR(dk),
        portfolioPct: Number(((((twrIndex[i] ?? 1) - 1) * 100)).toFixed(2))
      }));

      // Ajustar último ponto para casar com o retorno atual consolidado (BRL + USD), convertendo USD pelo FX atual
      const accInit = { marketBRL: 0, marketUSD: 0, costBRL: 0, costUSD: 0 } as any;
      const agg = posicoes.reduce((acc: any, p: any) => {
        const isBR = (p.symbol || '').toUpperCase().endsWith('.SA') || !p.symbol;
        const market = Number(p.quantidade || 0) * Number((p.precoAtual ?? p.precoMedio) || 0);
        const cost = Number(p.quantidade || 0) * Number(p.precoMedio || 0);
        if (isBR) { acc.marketBRL += market; acc.costBRL += cost; }
        else { acc.marketUSD += market; acc.costUSD += cost; }
        return acc;
      }, accInit);
      let usdbrlNow = usdbrlFallback;
      try {
        const q = await MarketDataService.getQuote('BRL=X');
        const v = Number(q?.currentPrice || 0);
        if (v && isFinite(v)) usdbrlNow = v;
      } catch {}
      const totalMarketBRLConv = agg.marketBRL + (agg.marketUSD * usdbrlNow);
      const totalCostBRLConv = agg.costBRL + (agg.costUSD * usdbrlNow);
      const retCostNow = totalCostBRLConv > 0 ? ((totalMarketBRLConv - totalCostBRLConv) / totalCostBRLConv) * 100 : null;

      // Calibrar TWR para que o último ponto case com retCostNow
      if (seriesPct.length && retCostNow != null) {
        const lastIdx = (twrIndex[twrIndex.length - 1] ?? 1);
        const targetIdx = 1 + (retCostNow / 100);
        // Evitar escala inválida
        const scale = lastIdx > 0 ? (targetIdx / lastIdx) : 1;
        const recalibrated = keys.map((dk, i) => ({
          name: formatKeyBR(dk),
          portfolioPct: Number(((((twrIndex[i] ?? 1) * scale - 1) * 100)).toFixed(2))
        }));
        // Fallback: se último ponto ficou muito fora (-100% ou NaN), usar série sobre custo simples
        const lastVal = recalibrated[recalibrated.length - 1]?.portfolioPct;
        if (isFinite(lastVal) && Math.abs(lastVal - (retCostNow ?? 0)) <= 0.5 && lastVal > -99.9) {
          seriesPct = recalibrated;
        } else {
          // Série simples sobre custo, preservando último ponto correto
          const simpleSeries = keys.map(dk => {
            const vt = valueByDate.get(dk) ?? 0;
            const cap = capitalByDate.get(dk) ?? 0;
            const pct = cap > 0 ? ((vt - cap) / cap) * 100 : 0;
            return { name: formatKeyBR(dk), portfolioPct: Number(pct.toFixed(2)) };
          });
          if (simpleSeries.length) simpleSeries[simpleSeries.length - 1].portfolioPct = Number((retCostNow ?? 0).toFixed(2));
          seriesPct = simpleSeries;
        }
      }

      setPerfCost(seriesPct);
      setPerformance(seriesPct);
    } catch (e) {
      console.error('Falha ao gerar performance custo', e);
      setPerformance([]);
    }
  };

  // Exibir apenas série Sobre Custo, sem sobrescrever retTotal calculado
  useEffect(() => {
    setPerformance(perfCost);
  }, [perfCost]);
  
  // Gerar dados de alocação por classe de ativo
  const gerarDadosAlocacao = async (posicoes: Posicao[]) => {
    try {
      const ativosMap: Record<string, any> = {};
      const todosAtivos = await db.ativos.toArray();
      todosAtivos.forEach(ativo => {
        if ((ativo as any).id !== undefined && (ativo as any).id !== null) {
          ativosMap[(ativo as any).id] = ativo;
        }
      });
      // Cotação USD/BRL para conversão de valores
      let usdbrl = 5.0;
      try {
        const fx = await MarketDataService.getQuote('BRL=X');
        const v = Number(fx?.currentPrice || 0);
        if (v && isFinite(v)) usdbrl = v;
      } catch {}

      // Totais de mercado (em BRL) por categoria e por ativo
      const categorias: Record<string, number> = {};
      const ativos: Record<string, { name: string; value: number; valueBRL: number; currency: 'BRL' | 'USD' } > = {} as any;
      // Heurística para ETFs conhecidos
      const KNOWN_ETF_US = new Set(['GLD','SPY','QQQ','IVV','VOO','VTI','IWM','DIA','EEM','EFA','VNQ','TLT','LQD','HYG','XLK','XLF','XLE','XLV','XLY','XLP','XLI','XLB','XLU','ARKK']);
      const KNOWN_ETF_BR = new Set(['IVVB11.SA','BOVA11.SA','SMAL11.SA','SPXI11.SA','XFIX11.SA','DIVO11.SA','GOLD11.SA','BOVX11.SA','NASD11.SA','EURP11.SA','ASIA11.SA','HASH11.SA']);
      const isEtf = (sym?: string): boolean => {
        const s = (sym || '').toUpperCase();
        return KNOWN_ETF_US.has(s) || KNOWN_ETF_BR.has(s) || /11\.SA$/.test(s);
      };
      posicoes.forEach(posicao => {
        const ativo = ativosMap[(posicao as any).ativoId];
        const marketValue = posicao.quantidade * (posicao.precoAtual ?? posicao.precoMedio);
        const hasSymbol = Boolean(posicao.symbol);
        // RF (sem símbolo) é sempre BRL
        const currency = !hasSymbol ? 'BRL' : ((posicao.symbol || '').toUpperCase().endsWith('.SA') ? 'BRL' : 'USD');
        let display = ativo?.nome ? `${ativo.nome}${posicao.symbol ? ` (${posicao.symbol})` : ''}` : (posicao.symbol || 'Ativo');
        if (!hasSymbol) {
          display = `${(posicao as any).rfLabel || (posicao as any).rfKind || 'Renda Fixa'}`;
        }
        const valueBRL = currency === 'BRL' ? marketValue : marketValue * usdbrl;

        // Categoria
        let categoria = ativo?.categoria || undefined;
        // Priorizar heurísticas quando não houver categoria
        if (!hasSymbol) {
          // Renda Fixa
          categoria = 'Renda Fixa';
        } else if (isEtf(posicao.symbol)) {
          categoria = currency === 'BRL' ? 'ETFs Nacionais' : 'ETFs Internacionais';
        } else {
          // Assumir ação se não for ETF
          categoria = currency === 'BRL' ? 'Ações Nacionais' : 'Ações Internacionais';
        }
        if (!categoria) categoria = 'Outros';
        categorias[categoria] = (categorias[categoria] || 0) + valueBRL;
        // Somar por moeda
        const keyName = `${display} [${currency}]`;
        const prev = ativos[keyName];
        ativos[keyName] = {
          name: keyName,
          value: (prev?.value || 0) + marketValue, // valor na moeda local do ativo (para exibição)
          valueBRL: (prev?.valueBRL || 0) + valueBRL, // valor convertido para BRL (para percentuais)
          currency,
        } as any;
      });
      const alocacaoData = Object.entries(categorias).map(([name, value], index) => ({
        name,
        value: value as number,
        color: COLORS[index % COLORS.length]
      }));
      setAlocacao(alocacaoData);
      const totalBRLAloc = Object.values(ativos as any).reduce((s: number, a: any) => s + (a.valueBRL || 0), 0) || 1;
      const ativosList = Object.values(ativos as any)
        .sort((a: any, b: any) => (b.valueBRL || 0) - (a.valueBRL || 0))
        .map((a: any) => ({ ...a, percent: ((a.valueBRL || 0) / totalBRLAloc) * 100 }));
      setAlocacaoAtivos(ativosList);
    } catch (error) {
      console.error("Erro ao gerar dados de alocação:", error);
      setAlocacao([
        { name: "Renda Fixa", value: 40, color: COLORS[0] },
        { name: "Ações", value: 30, color: COLORS[1] },
        { name: "Fundos Imobiliários", value: 15, color: COLORS[2] },
        { name: "Internacional", value: 10, color: COLORS[3] },
        { name: "Outros", value: 5, color: COLORS[4] }
      ]);
      setAlocacaoAtivos([]);
    }
  };

  // Formatar valor monetário
  const formatarBRL = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatarUSD = (valor: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(valor);
  };

  // (removido: formatarPercentual não utilizado)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="w-full h-20" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="w-full h-40" />
          <Skeleton className="w-full h-40" />
          <Skeleton className="w-full h-40" />
        </div>
        <Skeleton className="w-full h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho com informações do cliente */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h2 className="text-2xl font-bold">{cliente?.nome}</h2>
            <p className="text-blue-100">
              {cliente?.email} • {cliente?.telefone}
            </p>
            <div className="flex items-center mt-1">
              <Badge variant="outline" className="bg-blue-500/20 border-blue-300 text-white">
                {cliente?.perfilRisco || "Perfil não definido"}
              </Badge>
              <span className="mx-2">•</span>
              <span className="text-sm text-blue-100">
                Cliente desde {cliente?.dataCadastro ? new Date(cliente.dataCadastro).toLocaleDateString('pt-BR') : "N/A"}
              </span>
            </div>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-2">
            <Button variant="outline" 
              className="border-white text-white hover:bg-white hover:text-blue-700"
              onClick={() => navigate(`/risk-analysis/${clienteId}`)}>
              Análise de Risco
            </Button>
            <Button 
              className="bg-white text-blue-700 hover:bg-blue-50"
              onClick={() => navigate(`/clients/${clienteId}/portfolio`)}>
              Gerenciar Portfólio
            </Button>
          </div>
        </div>
      </div>

      {/* Cards com métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Patrimônio Total */}
        <Card className="overflow-hidden border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <DollarSign className="h-5 w-5 mr-1 text-blue-500" />
              Patrimônio Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Total em BRL (conversão USD->BRL) */}
            <div className="text-2xl font-semibold">
              {formatarBRL(totalBRL + totalUSD * (fxRate || 0))}
            </div>
            {/* Detalhe BRL e USD pequeno */}
            <div className="text-xs text-muted-foreground mt-1">
              <span>BRL: {formatarBRL(totalBRL)}</span>
              <span className="mx-2">•</span>
              <span>USD: {formatarUSD(totalUSD)}</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{posicoes.length} posições ativas</p>
          </CardContent>
        </Card>

        {/* Rentabilidade */}
        <Card className="overflow-hidden border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="h-5 w-5 mr-1 text-green-500" />
              Rentabilidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="flex flex-col gap-1">
                {/* Total do Portfólio (em BRL) */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">TOTAL (BRL):</span>
                  <span className={`text-2xl font-bold ${ (retTotal ?? 0) >= 0 ? 'text-green-600' : 'text-red-600' }`}>
                    {retTotal === null ? '—' : `${retTotal >= 0 ? '+' : ''}${retTotal.toFixed(2)}%`}
                  </span>
                </div>
                {cdiAnual !== null && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Benchmark (CDI a.a.):</span>
                    <Badge variant="outline" className="text-xs">{cdiAnual.toFixed(2)}%</Badge>
                    {retTotal !== null && (
                      <Badge variant={retTotal - cdiAnual >= 0 ? 'outline' : 'destructive'} className="text-xs">
                        {retTotal - cdiAnual >= 0 ? '+' : ''}{(retTotal - cdiAnual).toFixed(2)} p.p.
                      </Badge>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">BRL:</span>
                  <span className={`text-sm font-semibold ${ (retBRL ?? 0) >= 0 ? 'text-green-600' : 'text-red-600' }`}>
                    {retBRL === null ? '—' : `${retBRL >= 0 ? '+' : ''}${retBRL.toFixed(2)}%`}
              </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">USD:</span>
                  <span className={`text-sm font-semibold ${ (retUSD ?? 0) >= 0 ? 'text-green-600' : 'text-red-600' }`}>
                    {retUSD === null ? '—' : `${retUSD >= 0 ? '+' : ''}${retUSD.toFixed(2)}%`}
              </span>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              
            </p>
          </CardContent>
        </Card>

        {/* Risco ocultado a pedido: manter espaço futuro, mas não renderizar */}
        {false && (
        <Card className="overflow-hidden border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <AlertTriangle className="h-5 w-5 mr-1 text-amber-500" />
              Nível de Risco
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-1">
                <span className="text-2xl font-bold">
                  {analise?.riskScore || 50}/100
                </span>
                  <Badge variant={(analise && (analise!.riskScore ?? 0) > 70) ? "destructive" : 
                                  (analise && (analise!.riskScore ?? 0) > 40) ? "default" : "outline"}>
                    {(analise && (analise!.riskScore ?? 0) > 70) ? "Alto" : 
                     (analise && (analise!.riskScore ?? 0) > 40) ? "Médio" : "Baixo"}
                </Badge>
              </div>
              <Progress value={analise?.riskScore || 50} className="h-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Volatilidade: {analise?.volatilidade?.toFixed(2) || "N/A"}%
              </p>
            </div>
          </CardContent>
        </Card>
        )}
      </div>

      {/* Tabs para diferentes visualizações */}
      <Tabs defaultValue="alocacao" className="w-full">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="performance" className="flex items-center">
            <LineChartIcon className="h-4 w-4 mr-2" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="alocacao" className="flex items-center">
            <PieChartIcon className="h-4 w-4 mr-2" />
            Alocação
          </TabsTrigger>
          {/* Metas Financeiras removido */}
        </TabsList>

        {/* Conteúdo das Tabs */}
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance do Portfólio (Rentabilidade Acumulada)</CardTitle>
              <CardDescription>Retorno total do portfólio em BRL (Sobre Custo)</CardDescription>
            </CardHeader>
            <CardContent className="p-1">
              {perfLoading ? (
              <div className="h-80 flex items-center justify-center text-muted-foreground">Carregando performance...</div>
              ) : performance.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={performance} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(v) => `${Number(v).toFixed(0)}%`} />
                    <Tooltip formatter={(v: any) => [`${Number(v).toFixed(2)}%`, 'Rentabilidade']} />
                    <Area type="monotone" dataKey="portfolioPct" stroke="#2563eb" fillOpacity={0.2} fill="#93c5fd" name="Portfólio" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-muted-foreground">
                  Sem dados de performance disponíveis.
                </div>
              )}
              {/* seletor de modo removido */}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Mudar Período
              </Button>
              <Button variant="outline" className="flex items-center" onClick={() => navigate(`/analysis`)}>
                Análise Avançada
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="alocacao">
          <Card>
            <CardHeader>
              <CardTitle>Alocação por Classe de Ativos</CardTitle>
              <CardDescription>
                Distribuição atual do portfólio por classe de ativos e por ativos individuais
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row items-start justify-around p-6 gap-6">
              <div className="w-full md:w-1/2 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={alocacao}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({name, percent}) => `${name}: ${(percent * 100).toFixed(2)}%`}
                    >
                      {alocacao.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [formatarBRL(Number(value)), '']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full md:w-1/2 mt-6 md:mt-0 space-y-2">
                <div className="text-sm font-semibold mb-2">Ativos Individuais</div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-3 py-2">Ativo</th>
                        <th className="text-right px-3 py-2">%</th>
                        <th className="text-right px-3 py-2">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alocacaoAtivos.map((a: any, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="px-3 py-2">{a.name}</td>
                          <td className="px-3 py-2 text-right">{a.percent.toFixed(2)}%</td>
                          <td className="px-3 py-2 text-right">{a.currency === 'USD' ? formatarUSD(a.value) : formatarBRL(a.value)}</td>
                        </tr>
                      ))}
                      {alocacaoAtivos.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">Sem posições</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end"></CardFooter>
          </Card>
        </TabsContent>

        {/* Metas Financeiras removido */}
      </Tabs>

      {/* Seção de alertas removida */}
    </div>
  );
};

export default ClientDashboard; 