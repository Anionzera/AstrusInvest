import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  PieChart, 
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Share2,
  Calculator,
  Activity,
  Zap
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { getStockValuation, ValuationData as ServiceValuationData } from '../../services/valuationService';

interface ValuationData {
  symbol: string;
  current_price: number;
  target_price: number;
  upside_potential: number;
  recommendation: string;
  confidence_level: string;
  valuation_methods: {
    dcf: number;
    multiples: number;
    asset_based: number;
  };
  risk_metrics: {
    volatility: number;
    beta: number;
    sharpe_ratio: number;
  };
  fundamentals: {
    pe_ratio: number;
    pb_ratio: number;
    roe: number;
    roic: number;
    debt_to_equity: number;
    current_ratio: number;
  };
  market_data: {
    market_cap: number;
    volume: number;
    avg_volume: number;
    week_52_high: number;
    week_52_low: number;
  };
}

const ValuationPage: React.FC = () => {
  const [symbol, setSymbol] = useState('');
  const [loading, setLoading] = useState(false);
  const [valuationData, setValuationData] = useState<ValuationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // Dados para gráficos
  const [priceHistory, setPriceHistory] = useState([
    { date: '2024-01', price: 28.50 },
    { date: '2024-02', price: 30.20 },
    { date: '2024-03', price: 29.80 },
    { date: '2024-04', price: 31.40 },
    { date: '2024-05', price: 31.40 },
  ]);

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation.toLowerCase()) {
      case 'compra forte':
      case 'strong buy':
        return 'bg-green-500';
      case 'compra':
      case 'buy':
        return 'bg-green-400';
      case 'manter':
      case 'hold':
        return 'bg-yellow-500';
      case 'venda':
      case 'sell':
        return 'bg-red-400';
      case 'venda forte':
      case 'strong sell':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getRecommendationIcon = (recommendation: string) => {
    switch (recommendation.toLowerCase()) {
      case 'compra forte':
      case 'strong buy':
      case 'compra':
      case 'buy':
        return <TrendingUp className="h-4 w-4" />;
      case 'venda':
      case 'sell':
      case 'venda forte':
      case 'strong sell':
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence.toLowerCase()) {
      case 'alta':
      case 'high':
        return 'text-green-600 bg-green-50';
      case 'média':
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'baixa':
      case 'low':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const performValuation = async () => {
    if (!symbol.trim()) {
      toast.error('Por favor, digite um código de ação válido');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Chamar a API de valuation usando o serviço
      const data = await getStockValuation(symbol.toUpperCase());
      
      setValuationData(data);
      
      // Adicionar ao histórico
      if (!searchHistory.includes(symbol.toUpperCase())) {
        setSearchHistory(prev => [symbol.toUpperCase(), ...prev.slice(0, 4)]);
      }

      toast.success(`Análise de valuation concluída para ${symbol.toUpperCase()}`);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      toast.error(`Erro ao realizar valuation: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      performValuation();
    }
  };

  const exportResults = () => {
    if (!valuationData) return;
    
    const dataStr = JSON.stringify(valuationData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `valuation_${valuationData.symbol}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('Relatório exportado com sucesso!');
  };

  const shareResults = () => {
    if (!valuationData) return;
    
    const shareText = `Análise de Valuation - ${valuationData.symbol}
Preço Atual: R$ ${valuationData.current_price.toFixed(2)}
Preço Alvo: R$ ${valuationData.target_price.toFixed(2)}
Potencial: ${valuationData.upside_potential.toFixed(1)}%
Recomendação: ${valuationData.recommendation}`;

    if (navigator.share) {
      navigator.share({
        title: `Valuation ${valuationData.symbol}`,
        text: shareText,
      });
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success('Dados copiados para a área de transferência!');
    }
  };

  // Dados para gráfico de pizza dos métodos de valuation
  const valuationMethodsData = valuationData?.valuation_methods ? [
    { name: 'DCF', value: valuationData.valuation_methods.dcf || 0, color: '#8884d8' },
    { name: 'Múltiplos', value: valuationData.valuation_methods.multiples || 0, color: '#82ca9d' },
    { name: 'Patrimonial', value: valuationData.valuation_methods.asset_based || 0, color: '#ffc658' },
  ] : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="flex items-center justify-center space-x-3">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full">
              <Calculator className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Módulo de Valuation
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Análise fundamentalista avançada com dados do Fundamentus. 
            Obtenha recomendações precisas baseadas em múltiplos métodos de valuation.
          </p>
        </motion.div>

        {/* Search Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="h-5 w-5" />
                <span>Análise de Ação</span>
              </CardTitle>
              <CardDescription>
                Digite o código da ação para realizar a análise de valuation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-4">
                <div className="flex-1">
                  <Input
                    placeholder="Ex: PETR4, VALE3, ITUB4..."
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    onKeyPress={handleKeyPress}
                    className="text-lg h-12"
                    disabled={loading}
                  />
                </div>
                <Button
                  onClick={performValuation}
                  disabled={loading || !symbol.trim()}
                  className="h-12 px-8 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Analisar
                    </>
                  )}
                </Button>
              </div>

              {/* Histórico de pesquisas */}
              {searchHistory.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">Pesquisas recentes:</p>
                  <div className="flex flex-wrap gap-2">
                    {searchHistory.map((item, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="cursor-pointer hover:bg-blue-100"
                        onClick={() => setSymbol(item)}
                      >
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {error}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading State */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card className="shadow-lg">
                <CardContent className="p-8">
                  <div className="text-center space-y-4">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Realizando Análise de Valuation</h3>
                      <p className="text-gray-600">Extraindo dados fundamentalistas e calculando preço justo...</p>
                    </div>
                    <Progress value={75} className="w-full max-w-md mx-auto" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {valuationData && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-6"
            >
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100">Preço Atual</p>
                        <p className="text-2xl font-bold">R$ {valuationData.current_price.toFixed(2)}</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-blue-200" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-lg border-0 bg-gradient-to-br from-green-500 to-green-600 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100">Preço Alvo</p>
                        <p className="text-2xl font-bold">R$ {valuationData.target_price.toFixed(2)}</p>
                      </div>
                      <Target className="h-8 w-8 text-green-200" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100">Potencial</p>
                        <p className="text-2xl font-bold">{valuationData.upside_potential.toFixed(1)}%</p>
                      </div>
                      {valuationData.upside_potential >= 0 ? (
                        <TrendingUp className="h-8 w-8 text-purple-200" />
                      ) : (
                        <TrendingDown className="h-8 w-8 text-purple-200" />
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-lg border-0">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600">Recomendação</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={`${getRecommendationColor(valuationData.recommendation)} text-white`}>
                            {getRecommendationIcon(valuationData.recommendation)}
                            <span className="ml-1">{valuationData.recommendation}</span>
                          </Badge>
                        </div>
                        <Badge className={`mt-2 ${getConfidenceColor(valuationData.confidence_level)}`}>
                          Confiança: {valuationData.confidence_level}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center space-x-4">
                <Button onClick={exportResults} variant="outline" className="flex items-center space-x-2">
                  <Download className="h-4 w-4" />
                  <span>Exportar</span>
                </Button>
                <Button onClick={shareResults} variant="outline" className="flex items-center space-x-2">
                  <Share2 className="h-4 w-4" />
                  <span>Compartilhar</span>
                </Button>
              </div>

              {/* Detailed Analysis */}
              <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                  <TabsTrigger value="methods">Métodos</TabsTrigger>
                  <TabsTrigger value="fundamentals">Fundamentos</TabsTrigger>
                  <TabsTrigger value="risk">Risco</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Price Chart */}
                    <Card className="shadow-lg">
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Activity className="h-5 w-5" />
                          <span>Histórico de Preços</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={priceHistory}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Line 
                              type="monotone" 
                              dataKey="price" 
                              stroke="#3b82f6" 
                              strokeWidth={3}
                              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Market Data */}
                    <Card className="shadow-lg">
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <BarChart3 className="h-5 w-5" />
                          <span>Dados de Mercado</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Valor de Mercado</p>
                            <p className="text-lg font-semibold">
                              R$ {valuationData?.market_data?.market_cap ? (valuationData.market_data.market_cap / 1000000000).toFixed(1) : 'N/A'}B
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Volume Médio</p>
                            <p className="text-lg font-semibold">
                              {valuationData?.market_data?.avg_volume ? (valuationData.market_data.avg_volume / 1000000).toFixed(1) : 'N/A'}M
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Máxima 52s</p>
                            <p className="text-lg font-semibold">
                              R$ {valuationData?.market_data?.week_52_high ? valuationData.market_data.week_52_high.toFixed(2) : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Mínima 52s</p>
                            <p className="text-lg font-semibold">
                              R$ {valuationData?.market_data?.week_52_low ? valuationData.market_data.week_52_low.toFixed(2) : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="methods" className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Valuation Methods Chart */}
                    <Card className="shadow-lg">
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <PieChart className="h-5 w-5" />
                          <span>Métodos de Valuation</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <RechartsPieChart>
                            <Pie
                              data={valuationMethodsData}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ name, value }: { name: string; value: number }) => `${name}: R$ ${value.toFixed(2)}`}
                            >
                              {valuationMethodsData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Methods Breakdown */}
                    <Card className="shadow-lg">
                      <CardHeader>
                        <CardTitle>Detalhamento dos Métodos</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                            <span className="font-medium">DCF (Fluxo de Caixa Descontado)</span>
                            <span className="font-bold text-blue-600">
                              R$ {valuationData?.valuation_methods?.dcf ? valuationData.valuation_methods.dcf.toFixed(2) : 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                            <span className="font-medium">Múltiplos de Mercado</span>
                            <span className="font-bold text-green-600">
                              R$ {valuationData?.valuation_methods?.multiples ? valuationData.valuation_methods.multiples.toFixed(2) : 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                            <span className="font-medium">Valor Patrimonial</span>
                            <span className="font-bold text-yellow-600">
                              R$ {valuationData?.valuation_methods?.asset_based ? valuationData.valuation_methods.asset_based.toFixed(2) : 'N/A'}
                            </span>
                          </div>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                          <span className="font-bold">Preço Alvo (Média Ponderada)</span>
                          <span className="font-bold text-purple-600 text-lg">
                            R$ {valuationData.target_price.toFixed(2)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="fundamentals" className="space-y-6">
                  <Card className="shadow-lg">
                    <CardHeader>
                      <CardTitle>Indicadores Fundamentalistas</CardTitle>
                      <CardDescription>
                        Principais métricas financeiras da empresa
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <p className="text-sm text-gray-600">P/L</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {valuationData?.fundamentals?.pe_ratio ? valuationData.fundamentals.pe_ratio.toFixed(2) : 'N/A'}
                          </p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <p className="text-sm text-gray-600">P/VP</p>
                          <p className="text-2xl font-bold text-green-600">
                            {valuationData?.fundamentals?.pb_ratio ? valuationData.fundamentals.pb_ratio.toFixed(2) : 'N/A'}
                          </p>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                          <p className="text-sm text-gray-600">ROE</p>
                          <p className="text-2xl font-bold text-purple-600">
                            {valuationData?.fundamentals?.roe ? valuationData.fundamentals.roe.toFixed(1) : 'N/A'}%
                          </p>
                        </div>
                        <div className="text-center p-4 bg-yellow-50 rounded-lg">
                          <p className="text-sm text-gray-600">ROIC</p>
                          <p className="text-2xl font-bold text-yellow-600">
                            {valuationData?.fundamentals?.roic ? valuationData.fundamentals.roic.toFixed(1) : 'N/A'}%
                          </p>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg">
                          <p className="text-sm text-gray-600">Dív/PL</p>
                          <p className="text-2xl font-bold text-red-600">
                            {valuationData?.fundamentals?.debt_to_equity ? valuationData.fundamentals.debt_to_equity.toFixed(2) : 'N/A'}
                          </p>
                        </div>
                        <div className="text-center p-4 bg-indigo-50 rounded-lg">
                          <p className="text-sm text-gray-600">Liquidez</p>
                          <p className="text-2xl font-bold text-indigo-600">
                            {valuationData?.fundamentals?.current_ratio ? valuationData.fundamentals.current_ratio.toFixed(2) : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="risk" className="space-y-6">
                  <Card className="shadow-lg">
                    <CardHeader>
                      <CardTitle>Métricas de Risco</CardTitle>
                      <CardDescription>
                        Análise de risco e volatilidade do investimento
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center p-6 bg-gradient-to-br from-red-50 to-red-100 rounded-lg">
                          <p className="text-sm text-gray-600 mb-2">Volatilidade</p>
                          <p className="text-3xl font-bold text-red-600">
                            {valuationData?.risk_metrics?.volatility ? (valuationData.risk_metrics.volatility * 100).toFixed(1) : 'N/A'}%
                          </p>
                          <p className="text-xs text-gray-500 mt-1">Anualizada</p>
                        </div>
                        <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                          <p className="text-sm text-gray-600 mb-2">Beta</p>
                          <p className="text-3xl font-bold text-blue-600">
                            {valuationData?.risk_metrics?.beta ? valuationData.risk_metrics.beta.toFixed(2) : 'N/A'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">vs. Ibovespa</p>
                        </div>
                        <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                          <p className="text-sm text-gray-600 mb-2">Sharpe Ratio</p>
                          <p className="text-3xl font-bold text-green-600">
                            {valuationData?.risk_metrics?.sharpe_ratio ? valuationData.risk_metrics.sharpe_ratio.toFixed(2) : 'N/A'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">Retorno/Risco</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ValuationPage; 