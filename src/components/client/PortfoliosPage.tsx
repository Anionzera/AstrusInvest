import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
// seletor removido (TWR vs Cost)
import { db, Cliente, Posicao } from "@/lib/db";
import { Search, BarChart3, PieChart, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { MarketDataService } from "@/lib/marketDataService";
import { api } from "@/services/api";
import { clientsApi } from "@/services/clientsService";
import { portfoliosApi } from "@/services/portfoliosService";
import { positionsApi } from "@/services/positionsService";
import { fiApi } from "@/services/fixedIncomeService";

type ClienteComPortfolio = Cliente & {
  valorTotal: number;
  valorTotalBRL: number;
  valorTotalUSD: number;
  numAtivos: number;
  retCost?: number | null;
  retTwr?: number | null;
  scoreDiversificacao?: number;
};

const PortfoliosPage: React.FC = () => {
  const { toast } = useToast();
  const [clientesComPortfolio, setClientesComPortfolio] = useState<ClienteComPortfolio[]>([]);
  const [clientesSemPortfolio, setClientesSemPortfolio] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const [fxRate, setFxRate] = useState<number | null>(null); // USD->BRL (BRL=X)
  // const [isFxLoading, setIsFxLoading] = useState(false); // não usado
  // modo único: Sobre Custo

  // Normalizador simples de tickers (igual ao usado em PositionManager)
  const normalizeTicker = (input?: string) => {
    const v = (input || "").trim().toUpperCase();
    if (!v) return v;
    if (v.includes(".")) return v;
    if (/^[A-Z]{4}[0-9]{1,2}$/.test(v)) return `${v}.SA`;
    return v;
  };

  // Chave de data local AAAA-MM-DD
  const toKeyLocal = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // (removido) computeTwrFinal

  useEffect(() => {
    const carregarDados = async () => {
      setIsLoading(true);
      try {
        const online = await api.health().then(h => h.ok && h.db).catch(() => false);
        if (online) {
          // Buscar do servidor (fonte de verdade), mas exibir SOMENTE clientes existentes no Dexie (seus clientes locais)
          const [remoteClients, remotePortfolios, remotePositions, clientesLocal] = await Promise.all([
            clientsApi.list(),
            portfoliosApi.list(),
            positionsApi.list(),
            db.clientes.toArray(),
          ]);

          // Mapas auxiliares
          const byEmailLocal = new Map<string, Cliente>();
          for (const c of clientesLocal) byEmailLocal.set((c.email || '').toLowerCase(), c);

          const portfolioToClient = new Map<string, string>();
          for (const p of remotePortfolios) portfolioToClient.set(p.id, p.client_id);

          const positionsByClient = new Map<string, any[]>();
          for (const r of remotePositions) {
            const clientId = portfolioToClient.get(r.portfolio_id);
            if (!clientId) continue;
            if (!positionsByClient.has(clientId)) positionsByClient.set(clientId, []);
            positionsByClient.get(clientId)!.push(r);
          }

        const comPortfolio: ClienteComPortfolio[] = [];
        const semPortfolio: Cliente[] = [];
        
          // Percorrer APENAS clientes locais
          for (const local of clientesLocal) {
            const rc = remoteClients.find(x => (x.email || '').toLowerCase() === (local.email || '').toLowerCase());
            if (!rc) { semPortfolio.push(local); continue; }
            const positions = positionsByClient.get(rc.id) || [];
            // Renda Fixa do cliente (server)
            let rfList: any[] = [];
            try {
              const rfRes = await fiApi.listPositions(rc.id);
              if ((rfRes as any)?.success && Array.isArray((rfRes as any).data)) {
                rfList = (rfRes as any).data;
              }
            } catch {}
            if (positions.length === 0) { semPortfolio.push(local); continue; }

            // Buscar cotações para calcular valor de mercado
            const uniqueSymbols = Array.from(new Set(positions.map(p => normalizeTicker(p.symbol)))).filter(Boolean) as string[];
            const quotesMap = new Map<string, number>();
            try {
              await Promise.all(uniqueSymbols.map(async (s) => {
                try {
                  const q = await MarketDataService.getQuote(s);
                  const price = Number(q?.currentPrice || 0);
                  if (price > 0) quotesMap.set(s.toUpperCase(), price);
                } catch {}
              }));
            } catch {}

            // Cotações RV e valuation RF
            const totals = await (async () => {
              const acc = { brl: 0, usd: 0 } as { brl: number; usd: number };
              // RV
              for (const p of positions) {
                const sym = normalizeTicker(p.symbol);
                const isBR = (sym || '').toUpperCase().endsWith('.SA');
                const price = quotesMap.get((sym || '').toUpperCase()) ?? Number(p.avg_price || 0);
                const mv = Number(p.quantity || 0) * price;
                if (isBR) acc.brl += mv; else acc.usd += mv;
              }
              // RF (usar valuation dirty como PU atual)
              if (rfList.length) {
                const today = new Date();
                const asof = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
                for (const r of rfList) {
                  let unit = Number(r.price || 0);
                  try { const v = await fiApi.valuation(r.id, asof); if (v?.success) unit = Number(v.dirty_price || v.clean_price || unit); } catch {}
                  acc.brl += unit * Number(r.quantity || 0);
                }
              }
              return acc;
            })();

            // Retorno Sobre Custo (agregado) com dados do servidor
            const costs = await (async () => {
              const acc = { costBRL: 0, costUSD: 0, marketBRL: 0, marketUSD: 0 } as any;
              // RV
              for (const p of positions) {
                const sym = normalizeTicker(p.symbol);
                const isBR = (sym || '').toUpperCase().endsWith('.SA');
                const qty = Number(p.quantity || 0);
                const cost = qty * Number(p.avg_price || 0);
                const price = quotesMap.get((sym || '').toUpperCase()) ?? Number(p.avg_price || 0);
                const mv = qty * price;
                if (isBR) { acc.costBRL += cost; acc.marketBRL += mv; }
                else { acc.costUSD += cost; acc.marketUSD += mv; }
              }
              // RF: custo = price (PU compra) * qty; market = valuation dirty * qty
              if (rfList.length) {
                const today = new Date();
                const asof = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
                for (const r of rfList) {
                  const qty = Number(r.quantity || 0);
                  const cost = qty * Number(r.price || 0);
                  let unit = Number(r.price || 0);
                  try { const v = await fiApi.valuation(r.id, asof); if (v?.success) unit = Number(v.dirty_price || v.clean_price || unit); } catch {}
                  const mv = qty * unit;
                  acc.costBRL += cost; acc.marketBRL += mv;
                }
              }
              return acc;
            })();
            let usdbrlR = fxRate || null;
            if (!usdbrlR) {
              try { const q = await MarketDataService.getQuote('BRL=X'); const v = Number(q?.currentPrice || 0); if (v && isFinite(v)) usdbrlR = v; } catch {}
            }
            const retCost = (usdbrlR ? ((costs.marketBRL + costs.marketUSD * (usdbrlR as number)) - (costs.costBRL + costs.costUSD * (usdbrlR as number))) / (costs.costBRL + costs.costUSD * (usdbrlR as number)) * 100 : (costs.costBRL > 0 ? ((costs.marketBRL - costs.costBRL) / costs.costBRL) * 100 : null));

            comPortfolio.push({
              ...local,
              valorTotal: totals.brl + totals.usd,
              valorTotalBRL: totals.brl,
              valorTotalUSD: totals.usd,
              numAtivos: positions.length,
              retCost: retCost ?? null,
            } as any);
          }

          comPortfolio.sort((a, b) => (b.valorTotalBRL + b.valorTotalUSD) - (a.valorTotalBRL + a.valorTotalUSD));
          setClientesComPortfolio(comPortfolio);
          setClientesSemPortfolio(semPortfolio);
        } else {
          // Fallback: Dexie
          const clientes = await db.clientes.toArray();
          const todasPosicoes = await db.posicoes.toArray();
          const posicoesPorCliente: Record<string, Posicao[]> = {} as any;
          for (const pos of todasPosicoes) {
            const key = String(pos.clienteId);
            (posicoesPorCliente[key] ||= []).push(pos);
          }
          const analises = await db.portfolioAnalyses.toArray();
          const analisesPorCliente: Record<string, any> = {};
          analises.forEach(a => { analisesPorCliente[String(a.clienteId)] = a; });

          const comPortfolio: ClienteComPortfolio[] = [];
          const semPortfolio: Cliente[] = [];
          for (const cliente of clientes) {
            const key = String(cliente.id);
            const posicoesCliente = posicoesPorCliente[key] || [];
            if (posicoesCliente.length === 0) { semPortfolio.push(cliente); continue; }
            const totals = posicoesCliente.reduce((acc, p) => {
              const isBR = (p.symbol || '').toUpperCase().endsWith('.SA');
                const mv = p.quantidade * (p.precoAtual ?? p.precoMedio);
                if (isBR) acc.brl += mv; else acc.usd += mv;
                return acc;
            }, { brl: 0, usd: 0 });
            // Retorno Sobre Custo (offline)
            const costs = posicoesCliente.reduce((acc, p) => {
              const isBR = (p.symbol || '').toUpperCase().endsWith('.SA');
              const qty = Number(p.quantidade || 0);
              const cost = qty * Number(p.precoMedio || 0);
              const mv = qty * Number((p.precoAtual ?? p.precoMedio) || 0);
              if (isBR) { acc.costBRL += cost; acc.marketBRL += mv; }
              else { acc.costUSD += cost; acc.marketUSD += mv; }
              return acc;
            }, { costBRL: 0, costUSD: 0, marketBRL: 0, marketUSD: 0 } as any);
            let usdbrlR = fxRate || null;
            if (!usdbrlR) {
              try { const q = await MarketDataService.getQuote('BRL=X'); const v = Number(q?.currentPrice || 0); if (v && isFinite(v)) usdbrlR = v; } catch {}
            }
            const retCost = (usdbrlR ? ((costs.marketBRL + costs.marketUSD * (usdbrlR as number)) - (costs.costBRL + costs.costUSD * (usdbrlR as number))) / (costs.costBRL + costs.costUSD * (usdbrlR as number)) * 100 : (costs.costBRL > 0 ? ((costs.marketBRL - costs.costBRL) / costs.costBRL) * 100 : null));

            const item: ClienteComPortfolio = {
              ...cliente,
              valorTotal: totals.brl + totals.usd,
              valorTotalBRL: totals.brl,
              valorTotalUSD: totals.usd,
              numAtivos: posicoesCliente.length,
              retCost: retCost ?? null,
            } as any;
            const analiseCliente = analisesPorCliente[key];
            if (analiseCliente) {
              item.scoreDiversificacao = analiseCliente.diversificacaoScore;
            }
            comPortfolio.push(item);
          }
        comPortfolio.sort((a, b) => (b.valorTotalBRL + b.valorTotalUSD) - (a.valorTotalBRL + a.valorTotalUSD));
        setClientesComPortfolio(comPortfolio);
        setClientesSemPortfolio(semPortfolio);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar portfólios",
          description: "Não foi possível carregar os dados dos portfólios. Tente novamente mais tarde.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    carregarDados();

    // Sincronização rápida com o servidor (melhor esforço)
    const syncRemoto = async () => {
      try {
        const online = await api.health().then(h => h.ok && h.db).catch(() => false);
        if (!online) return;

        const [remoteClients, remotePortfolios, remotePositions] = await Promise.all([
          clientsApi.list(),
          portfoliosApi.list(),
          positionsApi.list(),
        ]);

        const clientesLocal = await db.clientes.toArray();
        for (const cliente of clientesLocal) {
          const serverClient = remoteClients.find(rc => rc.email?.toLowerCase() === (cliente.email || '').toLowerCase());
          if (!serverClient) continue;
          const p = remotePortfolios.find(rp => rp.client_id === serverClient.id) || null;
          if (!p) continue;
          const posList = remotePositions.filter(r => r.portfolio_id === p.id);
          for (const r of posList) {
            const symbol = (r.symbol || '').toUpperCase();
            // garantir ativo (classe) mínimamente
            const isBR = symbol.endsWith('.SA');
            const nomePreferido = isBR ? 'Ações Nacionais' : 'Ações Internacionais';
            let ativo = await db.ativos.where('nome').equals(nomePreferido).first();
            if (!ativo) {
              const novoId = await db.ativos.add({ nome: nomePreferido, tipo: 'Renda Variável', categoria: 'Ações', descricao: 'Criado automaticamente (sync)' });
              ativo = await db.ativos.get(novoId);
            }
            const existing = await db.posicoes
              .where('clienteId').equals((cliente.id as unknown as number) || (cliente as any).id)
              .and(pv => (pv.symbol || '').toUpperCase() === symbol)
              .first();
            const item: any = {
              clienteId: (cliente.id as unknown as number) || (cliente as any).id,
              ativoId: ativo?.id,
              quantidade: Number(r.quantity || 0),
              precoMedio: Number(r.avg_price || 0),
              dataAtualizacao: new Date(),
              symbol,
              serverPortfolioId: p.id,
              serverPositionId: r.id,
            };
            if (existing) {
              await db.posicoes.update((existing as any).id, item);
            } else {
              await db.posicoes.add(item);
            }
          }
        }
        // Recarregar visão após sync
        await carregarDados();
      } catch (e) {
        // silencioso
      }
    };

    syncRemoto();
  }, [toast]);

  // Buscar automaticamente o câmbio para consolidado em BRL
  useEffect(() => {
    const autoFx = async () => {
      try {
        const quote = await MarketDataService.getQuote("BRL=X");
        const rate = Number(quote?.currentPrice || 0);
        if (rate && isFinite(rate)) setFxRate(rate);
      } catch {}
    };
    autoFx();
  }, []);

  // Navegar para o gerenciador de portfólio de um cliente específico
  const navegarParaPortfolio = (cliente: Cliente | (Cliente & { serverId?: string })) => {
    const serverId = (cliente as any).serverId as string | undefined;
    const target = serverId || String(cliente.id);
    navigate(`/clients/${target}/portfolio`);
  };

  // Formatadores de moeda
  const formatarBRL = (valor: number): string => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
  const formatarUSD = (valor: number): string => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD" }).format(valor);

  // Filtrar clientes com base na busca
  const clientesFiltrados = clientesComPortfolio.filter(cliente => {
    if (!searchTerm) return true;
    
    const termoLowerCase = searchTerm.toLowerCase();
    return (
      cliente.nome?.toLowerCase().includes(termoLowerCase) ||
      cliente.email?.toLowerCase().includes(termoLowerCase)
    );
  });

  // Renderizar cores baseadas no score
  const getScoreColor = (score: number | undefined, tipo: "risco" | "diversificacao") => {
    if (score === undefined) return "bg-gray-300";
    
    if (tipo === "risco") {
      if (score < 30) return "bg-green-500";
      if (score < 60) return "bg-yellow-500";
      return "bg-red-500";
    } else {
      // diversificação
      if (score > 70) return "bg-green-500";
      if (score > 40) return "bg-yellow-500";
      return "bg-red-500";
    }
  };

  // Agregados globais por moeda
  const totalBRL = clientesComPortfolio.reduce((s, c) => s + c.valorTotalBRL, 0);
  const totalUSD = clientesComPortfolio.reduce((s, c) => s + c.valorTotalUSD, 0);
  const maiorBRL = clientesComPortfolio.length ? Math.max(...clientesComPortfolio.map(c => c.valorTotalBRL)) : 0;
  const maiorUSD = clientesComPortfolio.length ? Math.max(...clientesComPortfolio.map(c => c.valorTotalUSD)) : 0;
  const medioBRL = clientesComPortfolio.length ? totalBRL / clientesComPortfolio.length : 0;
  const medioUSD = clientesComPortfolio.length ? totalUSD / clientesComPortfolio.length : 0;

  // Buscar câmbio USD->BRL
  // (função obterCambio não utilizada removida)

  // Consolidados em BRL (Total / Maior / Médio)
  const consolidadoTotalBRL = fxRate ? totalBRL + totalUSD * fxRate : totalBRL;
  const consolidadoMaiorBRL = clientesComPortfolio.length
    ? (fxRate ? Math.max(...clientesComPortfolio.map(c => c.valorTotalBRL + c.valorTotalUSD * fxRate)) : maiorBRL)
    : 0;
  const consolidadoMedioBRL = clientesComPortfolio.length
    ? (fxRate ? (clientesComPortfolio.reduce((s, c) => s + c.valorTotalBRL + c.valorTotalUSD * fxRate, 0) / clientesComPortfolio.length) : medioBRL)
    : 0;

  return (
    <div className="p-6 space-y-6 bg-background">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Portfólios</h1>
          <p className="text-muted-foreground">
            Visão geral de todos os portfólios de clientes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/clients")}> 
            <Users className="mr-2 h-4 w-4" />
            Gerenciar Clientes
          </Button>
        </div>
      </div>

      {/* Barra de pesquisa */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Estatísticas por moeda */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Portfólios
            </CardTitle>
            <CardDescription className="text-2xl font-bold text-foreground">
              {clientesComPortfolio.length}
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor Total
            </CardTitle>
            <CardDescription className="text-foreground">
              {/* Total consolidado em BRL (grande) */}
              <div className="text-2xl font-bold">{formatarBRL(consolidadoTotalBRL || 0)}</div>
              {/* Subtotais pequenos BRL e USD */}
              <div className="text-xs text-muted-foreground mt-1">
                BRL: {formatarBRL(totalBRL)} <span className="mx-1">•</span> USD: {formatarUSD(totalUSD)}
              </div>
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Maior Portfólio
            </CardTitle>
            <CardDescription className="text-foreground">
              <div className="text-2xl font-bold">{formatarBRL(consolidadoMaiorBRL || 0)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                BRL: {formatarBRL(maiorBRL)} <span className="mx-1">•</span> USD: {formatarUSD(maiorUSD)}
              </div>
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Portfólio Médio
            </CardTitle>
            <CardDescription className="text-foreground">
              <div className="text-2xl font-bold">{formatarBRL(consolidadoMedioBRL || 0)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                BRL: {formatarBRL(medioBRL)} <span className="mx-1">•</span> USD: {formatarUSD(medioUSD)}
              </div>
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Consolidado detalhado removido conforme solicitado */}

      {/* Lista de Portfólios */}
      {isLoading ? (
        <div className="py-20 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-4 text-muted-foreground">Carregando portfólios...</p>
        </div>
      ) : clientesFiltrados.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-10 text-center">
            <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
            <h3 className="mt-4 text-lg font-medium text-foreground">Nenhum portfólio encontrado</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {searchTerm
                ? "Nenhum portfólio corresponde aos termos da busca."
                : "Nenhum cliente possui portfólio. Vá para a página de clientes para começar."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-muted-foreground">Cliente</TableHead>
                  <TableHead className="text-muted-foreground">Ativos</TableHead>
                  <TableHead className="text-muted-foreground">Valor Total</TableHead>
                  <TableHead className="text-muted-foreground">Rentabilidade</TableHead>
                  <TableHead className="text-muted-foreground">Diversificação</TableHead>
                  <TableHead className="text-right text-muted-foreground">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientesFiltrados.map((cliente) => (
                  <TableRow key={cliente.id}>
                    <TableCell className="font-medium text-foreground">
                      <div>
                        <div className="text-foreground">{cliente.nome}</div>
                        <div className="text-sm text-muted-foreground">{cliente.email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground">{cliente.numAtivos}</TableCell>
                    <TableCell className="text-foreground">
                      {/* Consolidado em BRL como principal */}
                      <div className="font-semibold">
                        {formatarBRL((fxRate ? (cliente.valorTotalBRL + cliente.valorTotalUSD * fxRate) : cliente.valorTotalBRL) || 0)}
                      </div>
                      {/* Subtotais pequenos BRL e USD */}
                      <div className="text-xs text-muted-foreground mt-0.5">
                        BRL: {formatarBRL(cliente.valorTotalBRL)} <span className="mx-1">•</span> USD: {formatarUSD(cliente.valorTotalUSD)}
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground">
                      <span className={`${((cliente.retCost ?? 0) >= 0) ? 'text-green-600' : 'text-red-600'} font-semibold`}>
                        {cliente.retCost == null ? '-' : `${(cliente.retCost >= 0 ? '+' : '')}${(cliente.retCost).toFixed(2)}%`}
                      </span>
                    </TableCell>
                    <TableCell className="text-foreground">
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={cliente.scoreDiversificacao || 0} 
                          className={`h-2 w-16 ${getScoreColor(cliente.scoreDiversificacao, "diversificacao")}`} 
                        />
                        <span>{cliente.scoreDiversificacao || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navegarParaPortfolio(cliente as any)}
                      >
                        <BarChart3 className="h-5 w-5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Clientes sem Portfólio */}
      {clientesSemPortfolio.length > 0 && !searchTerm && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Clientes sem Portfólio</h2>
          <Card className="bg-card border-border">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-muted-foreground">Cliente</TableHead>
                    <TableHead className="text-muted-foreground">Email</TableHead>
                    <TableHead className="text-muted-foreground">Telefone</TableHead>
                    <TableHead className="text-right text-muted-foreground">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientesSemPortfolio.map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell className="font-medium text-foreground">{cliente.nome}</TableCell>
                      <TableCell className="text-foreground">{cliente.email}</TableCell>
                      <TableCell className="text-foreground">{cliente.telefone}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navegarParaPortfolio(cliente as any)}
                        >
                          <PieChart className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PortfoliosPage; 