import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MarketDataService, PriceHistory } from '@/lib/marketDataService';
import { BinanceProvider, BinanceHistoricalData } from '@/lib/binanceProvider';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StockChartProps {
  symbol: string;
  name?: string;
  color?: string;
}

type PeriodOption = '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' | 'max';
// Mapeamento de períodos para intervalos da Binance
const binancePeriodMap: Record<PeriodOption, string> = {
  '1d': '15m',   // 15 minutos para 1 dia
  '5d': '1h',    // 1 hora para 5 dias
  '1mo': '4h',   // 4 horas para 1 mês
  '3mo': '1d',   // 1 dia para 3 meses
  '6mo': '1d',   // 1 dia para 6 meses
  '1y': '1d',    // 1 dia para 1 ano
  '2y': '1d',    // 1 dia para 2 anos
  '5y': '1w',    // 1 semana para 5 anos
  'max': '1M'    // 1 mês para máximo
};

// Mapeamento de períodos para limites da Binance
const binanceLimitMap: Record<PeriodOption, number> = {
  '1d': 96,      // 24h / 15min = 96
  '5d': 120,     // 5d = 120h
  '1mo': 180,    // ~30d / 4h = ~180
  '3mo': 90,     // ~90d
  '6mo': 180,    // ~180d
  '1y': 365,     // 365d
  '2y': 500,     // Limitado
  '5y': 260,     // ~5y em semanas
  'max': 60      // 5y em meses
};

const StockChart: React.FC<StockChartProps> = ({ 
  symbol, 
  name, 
  color = '#3b82f6' 
}) => {
  const [period, setPeriod] = useState<PeriodOption>('3mo');
  const [priceData, setPriceData] = useState<PriceHistory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isCrypto = symbol.endsWith('USDT');

  useEffect(() => {
    const fetchPriceData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        if (isCrypto) {
          // Obter histórico de preços da Binance para criptomoedas
          const binanceProvider = new BinanceProvider();
          const interval = binancePeriodMap[period];
          const limit = binanceLimitMap[period];
          
          const cryptoHistory = await binanceProvider.getCryptoHistory(
            symbol,
            interval,
            limit
          );
          
          if (cryptoHistory.length === 0) {
            setError('Sem dados disponíveis para este período. Por favor, verifique se a API está funcionando.');
          } else {
            // Converter dados da Binance para o formato esperado pelo gráfico
            const formattedData: PriceHistory[] = cryptoHistory.map(item => ({
              date: new Date(item.time),
              open: item.open,
              high: item.high,
              low: item.low,
              close: item.close,
              volume: item.volume,
              adjustedClose: item.close
            }));
            
            setPriceData(formattedData);
          }
        } else {
          // Obter histórico de preços para ativos normais
          const history = await MarketDataService.getPriceHistory(symbol, period);
          
          if (history.length === 0) {
            setError('Sem dados disponíveis para este ativo. Por favor, verifique se a API está funcionando.');
          } else {
            setPriceData(history);
          }
        }
      } catch (err) {
        console.error('Erro ao buscar dados reais:', err);
        setError('Não foi possível obter dados reais. Verifique a conexão com a API ou tente novamente mais tarde.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPriceData();
  }, [symbol, period, isCrypto]);

  const formatDate = (date: Date) => {
    // Formatar data de acordo com o período selecionado
    if (period === '1d' || period === '5d') {
      return format(date, 'HH:mm', { locale: ptBR });
    } else if (period === '1mo' || period === '3mo') {
      return format(date, 'dd/MM', { locale: ptBR });
    }
    return format(date, 'dd/MM/yyyy', { locale: ptBR });
  };

  const formatTooltipValue = (value: number) => {
    if (isCrypto) {
      // Formatação para criptomoedas (USD)
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      }).format(value);
    } else {
      // Formatação para ativos normais (BRL)
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
      }).format(value);
    }
  };

  // Encontrar valores mínimos e máximos para o eixo Y
  const minPrice = Math.min(...priceData.map(item => item.low));
  const maxPrice = Math.max(...priceData.map(item => item.high));
  const yAxisDomain = [minPrice * 0.98, maxPrice * 1.02]; // Adiciona margem

  return (
    <Card className="w-full h-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl">
            {name || symbol} {!isLoading && priceData.length > 0 && (
              <span className="text-sm font-normal ml-2">
                Último: {formatTooltipValue(priceData[priceData.length - 1]?.close)}
              </span>
            )}
          </CardTitle>
          <Tabs defaultValue={period} onValueChange={(value) => setPeriod(value as PeriodOption)}>
            <TabsList className="grid grid-cols-5 h-8">
              <TabsTrigger value="5d" className="text-xs px-2">5D</TabsTrigger>
              <TabsTrigger value="1mo" className="text-xs px-2">1M</TabsTrigger>
              <TabsTrigger value="3mo" className="text-xs px-2">3M</TabsTrigger>
              <TabsTrigger value="1y" className="text-xs px-2">1A</TabsTrigger>
              <TabsTrigger value="5y" className="text-xs px-2">5A</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="w-full h-[300px] flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
          </div>
        ) : error ? (
          <div className="w-full h-[300px] flex items-center justify-center">
            <div className="text-red-500">{error}</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={priceData}
              margin={{ top: 10, right: 5, left: 5, bottom: 0 }}
            >
              <defs>
                <linearGradient id={`colorPrice-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={(date) => formatDate(new Date(date))}
                minTickGap={30}
              />
              <YAxis 
                domain={yAxisDomain}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => isCrypto ? `$${value.toFixed(2)}` : `R$${value.toFixed(2)}`}
                width={65}
              />
              <Tooltip
                formatter={(value: number) => [formatTooltipValue(value), 'Preço']}
                labelFormatter={(label) => {
                  return format(new Date(label), 'dd/MM/yyyy HH:mm', { locale: ptBR });
                }}
              />
              <Area
                type="monotone"
                dataKey="close"
                stroke={color}
                fillOpacity={1}
                fill={`url(#colorPrice-${symbol})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default StockChart; 