import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, BarChart3, Percent, Wallet, Info, TrendingUp, CreditCard, AlertCircle, RefreshCw } from "lucide-react";
import { BinanceProvider, BinanceCryptoData, CryptoMarketCapData } from '../lib/binanceProvider';
import { marketDataCache } from '../lib/marketDataCache';
import { formatCurrency, formatNumber, formatPercent } from '../utils/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Interface compatível com BinanceCryptoData
interface CryptoData extends Omit<BinanceCryptoData, 'timestamp'> {
  name: string;
}

const CryptoMarketData: React.FC = () => {
  const [cryptoData, setCryptoData] = useState<Record<string, CryptoData>>({});
  const [marketCapData, setMarketCapData] = useState<CryptoMarketCapData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("capitalização");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  useEffect(() => {
    // Função para carregar dados das criptomoedas
    const loadCryptoData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Instanciar o provedor da Binance
        const binanceProvider = new BinanceProvider();
        
        // Obter dados de criptomoedas por market cap
        const marketCapCoins = await binanceProvider.getCryptosByMarketCap(10);
        setMarketCapData(marketCapCoins);
        
        // Obter dados detalhados de preços de todas as criptomoedas
        const data = await binanceProvider.getMultipleCryptos();
        
        // Converter dados para o formato compatível com nossa interface
        const formattedData: Record<string, CryptoData> = {};
        Object.entries(data).forEach(([symbol, cryptoData]) => {
          formattedData[symbol] = {
            ...cryptoData,
            name: getCryptoName(symbol)
          };
        });
        
        setCryptoData(formattedData);
        setLastUpdated(new Date());
      } catch (err) {
        console.error("Erro ao carregar dados de criptomoedas:", err);
        setError("Não foi possível obter dados reais de criptomoedas. Verifique se a API está funcionando ou tente novamente mais tarde.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    // Carregar dados iniciais
    loadCryptoData();

    // Configurar atualização periódica a cada 60 segundos
    const interval = setInterval(loadCryptoData, 60000);

    // Limpar intervalo quando o componente for desmontado
    return () => clearInterval(interval);
  }, []);

  // Obter o nome amigável da criptomoeda a partir do símbolo
  const getCryptoName = (symbol: string): string => {
    const cryptoNames: Record<string, string> = {
      'BTCUSDT': 'Bitcoin',
      'ETHUSDT': 'Ethereum',
      'BNBUSDT': 'Binance Coin',
      'ADAUSDT': 'Cardano',
      'SOLUSDT': 'Solana',
      'DOTUSDT': 'Polkadot',
      'XRPUSDT': 'Ripple',
      'DOGEUSDT': 'Dogecoin',
      'AVAXUSDT': 'Avalanche',
      'MATICUSDT': 'Polygon'
    };
    
    return cryptoNames[symbol] || symbol.replace('USDT', '');
  };

  // Filtrar as principais criptomoedas
  const topCryptos = Object.entries(cryptoData)
    .sort((a, b) => {
      // Ordenar por volume de negociação
      return (b[1].quoteVolume || 0) - (a[1].quoteVolume || 0);
    })
    .slice(0, 10); // Top 10

  // Função para formatar valores de capitalização de mercado
  const formatMarketCap = (value: number): string => {
    if (value >= 1_000_000_000_000) {
      return `$${(value / 1_000_000_000_000).toFixed(2)} T`;
    }
    if (value >= 1_000_000_000) {
      return `$${(value / 1_000_000_000).toFixed(2)} B`;
    }
    if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(2)} M`;
    }
    return `$${(value / 1_000).toFixed(2)} K`;
  };

  // Função para atualizar manualmente os dados
  const handleRefresh = async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    try {
      const binanceProvider = new BinanceProvider();
      
      // Atualizar os principais símbolos
      const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
      const refreshPromises = symbols.map(symbol => binanceProvider.forceRefreshSymbol(symbol));
      
      await Promise.all(refreshPromises);
      
      // Atualizar market cap
      await binanceProvider.forceRefreshSymbol('market-cap');
      
      // Recarregar os dados
      const marketCapCoins = await binanceProvider.getCryptosByMarketCap(10);
      setMarketCapData(marketCapCoins);
      
      const data = await binanceProvider.getMultipleCryptos();
      
      // Converter dados para o formato compatível com nossa interface
      const formattedData: Record<string, CryptoData> = {};
      Object.entries(data).forEach(([symbol, cryptoData]) => {
        formattedData[symbol] = {
          ...cryptoData,
          name: getCryptoName(symbol)
        };
      });
      
      setCryptoData(formattedData);
      setLastUpdated(new Date());
      toast.success("Dados de criptomoedas atualizados com sucesso");
    } catch (err) {
      console.error("Erro ao atualizar dados de criptomoedas:", err);
      toast.error("Erro ao atualizar dados. Tente novamente.");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Card className="w-full h-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-xl font-bold">Mercado de Criptomoedas</CardTitle>
            <CardDescription>
              Dados em tempo real via Binance e CoinGecko
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <Badge variant="outline" className="text-xs">
                Atualizado: {lastUpdated.toLocaleTimeString()}
              </Badge>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh} 
              disabled={refreshing || loading}
              className="flex items-center gap-1"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}
      
        <Tabs defaultValue="capitalização" onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="capitalização">Capitalização</TabsTrigger>
            <TabsTrigger value="preços">Preços</TabsTrigger>
            <TabsTrigger value="desempenho">Desempenho</TabsTrigger>
          </TabsList>

          <TabsContent value="capitalização">
            {loading ? (
              // Skeleton para carregamento
              <div className="space-y-2">
                {Array(5).fill(null).map((_, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-4 text-red-500">
                <Info className="w-8 h-8 mx-auto mb-2" />
                <p>{error}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ranking</TableHead>
                    <TableHead>Criptomoeda</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead className="text-right">24h %</TableHead>
                    <TableHead className="text-right">Capitalização</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {marketCapData.map((coin) => (
                    <TableRow key={coin.symbol}>
                      <TableCell className="font-medium w-20">
                        <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                          {coin.market_cap_rank}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={coin.image} alt={coin.name} />
                            <AvatarFallback>
                              {coin.symbol.replace('USDT', '').substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{coin.name}</div>
                            <div className="text-xs text-muted-foreground">{coin.symbol.replace('USDT', '')}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        ${formatNumber(coin.price, 2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className={`flex items-center justify-end ${coin.price_change_percentage_24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {coin.price_change_percentage_24h >= 0 ? (
                            <ArrowUp className="h-4 w-4 mr-1" />
                          ) : (
                            <ArrowDown className="h-4 w-4 mr-1" />
                          )}
                          {formatPercent(Math.abs(coin.price_change_percentage_24h), 2)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end">
                          <CreditCard className="h-4 w-4 mr-1 text-muted-foreground" />
                          {formatMarketCap(coin.market_cap)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="preços">
            {loading ? (
              // Skeleton para carregamento
              <div className="space-y-2">
                {Array(5).fill(null).map((_, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-4 text-red-500">
                <Info className="w-8 h-8 mx-auto mb-2" />
                <p>{error}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Criptomoeda</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead className="text-right">24h %</TableHead>
                    <TableHead className="text-right">Volume 24h</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topCryptos.map(([symbol, data]) => (
                    <TableRow key={symbol}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Wallet className="h-5 w-5 text-muted-foreground" />
                          <span>{getCryptoName(symbol)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(data.price, 2)} $
                      </TableCell>
                      <TableCell className="text-right">
                        <div className={`flex items-center justify-end ${data.priceChangePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {data.priceChangePercent >= 0 ? (
                            <ArrowUp className="h-4 w-4 mr-1" />
                          ) : (
                            <ArrowDown className="h-4 w-4 mr-1" />
                          )}
                          {formatPercent(Math.abs(data.priceChangePercent), 2)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(data.quoteVolume, 0)} $
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="desempenho">
            {loading ? (
              // Skeleton para carregamento
              <div className="space-y-2">
                {Array(5).fill(null).map((_, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-4 text-red-500">
                <Info className="w-8 h-8 mx-auto mb-2" />
                <p>{error}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Criptomoeda</TableHead>
                    <TableHead className="text-right">Máxima 24h</TableHead>
                    <TableHead className="text-right">Mínima 24h</TableHead>
                    <TableHead className="text-right">Amplitude %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topCryptos.map(([symbol, data]) => {
                    // Calcular amplitude (max-min)/min como porcentagem
                    const amplitude = ((data.highPrice - data.lowPrice) / data.lowPrice) * 100;
                    
                    return (
                      <TableRow key={symbol}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-muted-foreground" />
                            <span>{getCryptoName(symbol)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(data.highPrice, 2)} $
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(data.lowPrice, 2)} $
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end">
                            <Percent className="h-4 w-4 mr-1 text-muted-foreground" />
                            {formatNumber(amplitude, 2)}%
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CryptoMarketData; 