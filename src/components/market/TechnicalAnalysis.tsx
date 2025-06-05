import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, AlertCircle, LineChart, BarChart, TrendingUp, TrendingDown } from 'lucide-react';
import { MarketDataService } from '@/lib/marketDataService';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Line,
  LineChart as RechartLineChart,
  Legend,
  Bar,
  BarChart as RechartBarChart,
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TechnicalAnalysisProps {
  initialSymbol?: string;
}

// Tipo para configuração de cada indicador
interface IndicatorConfig {
  enabled: boolean;
  params?: Record<string, any>;
}

const TechnicalAnalysis: React.FC<TechnicalAnalysisProps> = ({ initialSymbol }) => {
  const [symbol, setSymbol] = useState<string>(initialSymbol || 'PETR4');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [period, setPeriod] = useState<string>('1y');
  const [interval, setInterval] = useState<string>('1d');
  const [technicalData, setTechnicalData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('price');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Configuração dos indicadores que serão exibidos
  const [indicators, setIndicators] = useState<Record<string, IndicatorConfig>>({
    sma: { enabled: true },
    ema: { enabled: true },
    macd: { enabled: true },
    rsi: { enabled: true },
    bbands: { enabled: true },
    stoch: { enabled: false },
    adx: { enabled: false },
    atr: { enabled: false }
  });
  
  // Carregar dados técnicos quando o símbolo, período ou intervalo mudar
  useEffect(() => {
    if (!symbol) return;
    
    const loadTechnicalData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Obter apenas os indicadores habilitados
        const enabledIndicators = Object.entries(indicators)
          .filter(([_, config]) => config.enabled)
          .map(([name]) => name)
          .join(',');
        
        const data = await MarketDataService.getTechnicalAnalysis(
          symbol,
          period as any,
          interval as any,
          enabledIndicators
        );
        
        if (data) {
          setTechnicalData(data);
        } else {
          setError('Não foi possível carregar os dados técnicos');
        }
      } catch (err) {
        console.error('Erro ao carregar dados técnicos:', err);
        setError('Erro ao carregar dados técnicos. Verifique a conexão com a API.');
      } finally {
        setLoading(false);
      }
    };
    
    loadTechnicalData();
  }, [symbol, period, interval, indicators]);
  
  // Função para lidar com a busca
  const handleSearch = () => {
    if (searchTerm.trim()) {
      setSymbol(searchTerm.trim());
    }
  };
  
  // Função para alternar indicadores
  const toggleIndicator = (name: string) => {
    setIndicators(prev => ({
      ...prev,
      [name]: { ...prev[name], enabled: !prev[name].enabled }
    }));
  };
  
  // Converter dados para o formato esperado pelo Recharts
  const prepareChartData = () => {
    if (!technicalData) return [];
    
    const { dates, prices, indicators: technicalIndicators } = technicalData;
    
    return dates.map((date: string, index: number) => {
      const dataPoint: any = {
        date: new Date(date),
        close: prices.close[index],
        open: prices.open[index],
        high: prices.high[index],
        low: prices.low[index],
        volume: prices.volume[index]
      };
      
      // Adicionar cada indicador habilitado ao ponto de dados
      Object.entries(technicalIndicators).forEach(([indicator, data]: [string, any]) => {
        if (indicator === 'sma') {
          dataPoint.sma20 = data.sma_20[index - (dates.length - data.sma_20.length)];
          dataPoint.sma50 = data.sma_50[index - (dates.length - data.sma_50.length)];
          dataPoint.sma200 = data.sma_200[index - (dates.length - data.sma_200.length)];
        } else if (indicator === 'ema') {
          dataPoint.ema12 = data.ema_12[index - (dates.length - data.ema_12.length)];
          dataPoint.ema26 = data.ema_26[index - (dates.length - data.ema_26.length)];
          dataPoint.ema50 = data.ema_50[index - (dates.length - data.ema_50.length)];
        } else if (indicator === 'macd') {
          const offset = dates.length - data.macd.length;
          if (index >= offset) {
            dataPoint.macd = data.macd[index - offset];
            dataPoint.macdSignal = data.signal[index - offset];
            dataPoint.macdHistogram = data.histogram[index - offset];
          }
        } else if (indicator === 'rsi') {
          const offset = dates.length - data.rsi.length;
          if (index >= offset) {
            dataPoint.rsi = data.rsi[index - offset];
          }
        } else if (indicator === 'bbands') {
          const offset = dates.length - data.upper.length;
          if (index >= offset) {
            dataPoint.bbUpper = data.upper[index - offset];
            dataPoint.bbMiddle = data.middle[index - offset];
            dataPoint.bbLower = data.lower[index - offset];
          }
        } else if (indicator === 'stoch') {
          const offset = dates.length - data.k.length;
          if (index >= offset) {
            dataPoint.stochK = data.k[index - offset];
            dataPoint.stochD = data.d[index - offset];
          }
        } else if (indicator === 'adx') {
          const offset = dates.length - data.adx.length;
          if (index >= offset) {
            dataPoint.adx = data.adx[index - offset];
            dataPoint.dmp = data.dmp[index - offset];
            dataPoint.dmn = data.dmn[index - offset];
          }
        } else if (indicator === 'atr') {
          const offset = dates.length - data.atr.length;
          if (index >= offset) {
            dataPoint.atr = data.atr[index - offset];
          }
        }
      });
      
      return dataPoint;
    }).filter(point => point.date); // Filtrar pontos sem data
  };
  
  const chartData = prepareChartData();
  
  // Formatar valores para o tooltip
  const formatValue = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(value);
  };
  
  // Formatar data para o tooltip
  const formatTooltipDate = (date: Date) => {
    if (!date) return '';
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
  };
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Análise Técnica</CardTitle>
          <CardDescription>
            Utilize indicadores de análise técnica para identificar tendências e pontos de entrada/saída.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="col-span-2 flex gap-2">
              <Input
                type="text"
                placeholder="Buscar ativo (ex: PETR4)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={loading} variant="default">
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger>
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1mo">1 Mês</SelectItem>
                <SelectItem value="3mo">3 Meses</SelectItem>
                <SelectItem value="6mo">6 Meses</SelectItem>
                <SelectItem value="1y">1 Ano</SelectItem>
                <SelectItem value="2y">2 Anos</SelectItem>
                <SelectItem value="5y">5 Anos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={interval} onValueChange={setInterval}>
              <SelectTrigger>
                <SelectValue placeholder="Intervalo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">Diário</SelectItem>
                <SelectItem value="1wk">Semanal</SelectItem>
                <SelectItem value="1mo">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {loading ? (
            <div className="h-[500px] flex items-center justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
            </div>
          ) : technicalData ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">{symbol}</h3>
                  {technicalData.prices?.close && (
                    <p className="text-sm">
                      Último: {formatValue(technicalData.prices.close[technicalData.prices.close.length - 1])}
                    </p>
                  )}
                </div>
                <Badge variant="outline">
                  {technicalData.period} / {technicalData.interval}
                </Badge>
              </div>
              
              <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                  <TabsTrigger value="price">Preço</TabsTrigger>
                  <TabsTrigger value="volume">Volume</TabsTrigger>
                  <TabsTrigger value="indicators">Indicadores</TabsTrigger>
                  <TabsTrigger value="oscillators">Osciladores</TabsTrigger>
                </TabsList>
                
                <TabsContent value="price" className="space-y-4">
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartLineChart
                        data={chartData}
                        margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(date) => format(new Date(date), 'dd/MM', { locale: ptBR })}
                          minTickGap={30}
                        />
                        <YAxis
                          domain={['auto', 'auto']}
                          tickFormatter={(value) => value.toFixed(2)}
                        />
                        <Tooltip
                          labelFormatter={(label) => formatTooltipDate(new Date(label))}
                          formatter={(value: number) => [formatValue(value), 'Preço']}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="close" stroke="#3b82f6" name="Preço" dot={false} />
                        
                        {indicators.sma.enabled && (
                          <>
                            <Line type="monotone" dataKey="sma20" stroke="#10b981" name="SMA 20" dot={false} />
                            <Line type="monotone" dataKey="sma50" stroke="#f59e0b" name="SMA 50" dot={false} />
                            <Line type="monotone" dataKey="sma200" stroke="#ef4444" name="SMA 200" dot={false} />
                          </>
                        )}
                        
                        {indicators.ema.enabled && (
                          <>
                            <Line type="monotone" dataKey="ema12" stroke="#8b5cf6" name="EMA 12" dot={false} />
                            <Line type="monotone" dataKey="ema26" stroke="#ec4899" name="EMA 26" dot={false} />
                          </>
                        )}
                        
                        {indicators.bbands.enabled && (
                          <>
                            <Line type="monotone" dataKey="bbUpper" stroke="#9ca3af" name="BB Superior" dot={false} strokeDasharray="3 3" />
                            <Line type="monotone" dataKey="bbMiddle" stroke="#6b7280" name="BB Média" dot={false} strokeDasharray="3 3" />
                            <Line type="monotone" dataKey="bbLower" stroke="#9ca3af" name="BB Inferior" dot={false} strokeDasharray="3 3" />
                          </>
                        )}
                      </RechartLineChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
                
                <TabsContent value="volume" className="space-y-4">
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartBarChart
                        data={chartData}
                        margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(date) => format(new Date(date), 'dd/MM', { locale: ptBR })}
                          minTickGap={30}
                        />
                        <YAxis
                          domain={['auto', 'auto']}
                          tickFormatter={(value) => (value / 1000000).toFixed(1) + 'M'}
                        />
                        <Tooltip
                          labelFormatter={(label) => formatTooltipDate(new Date(label))}
                          formatter={(value: number) => [new Intl.NumberFormat('pt-BR').format(value), 'Volume']}
                        />
                        <Legend />
                        <Bar dataKey="volume" fill="#3b82f6" name="Volume" />
                      </RechartBarChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
                
                <TabsContent value="indicators" className="space-y-4">
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartLineChart
                        data={chartData}
                        margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(date) => format(new Date(date), 'dd/MM', { locale: ptBR })}
                          minTickGap={30}
                        />
                        <YAxis
                          yAxisId="price"
                          domain={['auto', 'auto']}
                          tickFormatter={(value) => value.toFixed(2)}
                        />
                        <Tooltip
                          labelFormatter={(label) => formatTooltipDate(new Date(label))}
                          formatter={(value: number, name) => [formatValue(value), name]}
                        />
                        <Legend />
                        <Line type="monotone" yAxisId="price" dataKey="close" stroke="#3b82f6" name="Preço" dot={false} />
                        
                        {indicators.macd.enabled && (
                          <>
                            <YAxis
                              yAxisId="macd"
                              orientation="right"
                              domain={['auto', 'auto']}
                              tickFormatter={(value) => value.toFixed(2)}
                            />
                            <Line type="monotone" yAxisId="macd" dataKey="macd" stroke="#ec4899" name="MACD" dot={false} />
                            <Line type="monotone" yAxisId="macd" dataKey="macdSignal" stroke="#8b5cf6" name="Sinal" dot={false} />
                          </>
                        )}
                      </RechartLineChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
                
                <TabsContent value="oscillators" className="space-y-4">
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartLineChart
                        data={chartData}
                        margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(date) => format(new Date(date), 'dd/MM', { locale: ptBR })}
                          minTickGap={30}
                        />
                        <YAxis
                          yAxisId="rsi"
                          domain={[0, 100]}
                          tickFormatter={(value) => value.toFixed(0)}
                        />
                        <Tooltip
                          labelFormatter={(label) => formatTooltipDate(new Date(label))}
                          formatter={(value: number, name) => [value.toFixed(2), name]}
                        />
                        <Legend />
                        {indicators.rsi.enabled && (
                          <Line type="monotone" yAxisId="rsi" dataKey="rsi" stroke="#f59e0b" name="RSI" dot={false} />
                        )}
                        {indicators.stoch.enabled && (
                          <>
                            <Line type="monotone" yAxisId="rsi" dataKey="stochK" stroke="#10b981" name="Estoc. %K" dot={false} />
                            <Line type="monotone" yAxisId="rsi" dataKey="stochD" stroke="#3b82f6" name="Estoc. %D" dot={false} />
                          </>
                        )}
                        {/* Linhas de referência para RSI */}
                        <Line
                          yAxisId="rsi"
                          type="monotone"
                          dataKey={() => 70}
                          stroke="#9ca3af"
                          strokeDasharray="3 3"
                          name="Sobrecomprado"
                          dot={false}
                        />
                        <Line
                          yAxisId="rsi"
                          type="monotone"
                          dataKey={() => 30}
                          stroke="#9ca3af"
                          strokeDasharray="3 3"
                          name="Sobrevendido"
                          dot={false}
                        />
                      </RechartLineChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
              </Tabs>
              
              <Separator className="my-4" />
              
              <div>
                <h4 className="text-lg font-medium mb-2">Indicadores</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="sma"
                      checked={indicators.sma.enabled}
                      onCheckedChange={() => toggleIndicator('sma')}
                    />
                    <Label htmlFor="sma">Médias Móveis (SMA)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="ema"
                      checked={indicators.ema.enabled}
                      onCheckedChange={() => toggleIndicator('ema')}
                    />
                    <Label htmlFor="ema">Médias Exp. (EMA)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="macd"
                      checked={indicators.macd.enabled}
                      onCheckedChange={() => toggleIndicator('macd')}
                    />
                    <Label htmlFor="macd">MACD</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="rsi"
                      checked={indicators.rsi.enabled}
                      onCheckedChange={() => toggleIndicator('rsi')}
                    />
                    <Label htmlFor="rsi">RSI</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="bbands"
                      checked={indicators.bbands.enabled}
                      onCheckedChange={() => toggleIndicator('bbands')}
                    />
                    <Label htmlFor="bbands">Bollinger Bands</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="stoch"
                      checked={indicators.stoch.enabled}
                      onCheckedChange={() => toggleIndicator('stoch')}
                    />
                    <Label htmlFor="stoch">Estocástico</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="adx"
                      checked={indicators.adx.enabled}
                      onCheckedChange={() => toggleIndicator('adx')}
                    />
                    <Label htmlFor="adx">ADX</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="atr"
                      checked={indicators.atr.enabled}
                      onCheckedChange={() => toggleIndicator('atr')}
                    />
                    <Label htmlFor="atr">ATR</Label>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Search className="mx-auto h-12 w-12 mb-4 opacity-40" />
              <p className="text-lg font-medium">Busque um ativo para iniciar a análise técnica</p>
              <p className="max-w-lg mx-auto mt-2">
                Digite o código de um ativo (ex: PETR4, VALE3) para visualizar os indicadores técnicos.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TechnicalAnalysis; 