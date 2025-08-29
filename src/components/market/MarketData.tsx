import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MarketDataService, MarketData } from '@/lib/marketDataService';
import { Search, TrendingUp, TrendingDown, BarChart2 } from 'lucide-react';
import StockChart from './StockChart';

// Componente de quadro de cotação
interface QuoteCardProps {
  symbol: string;
  onSelectSymbol: (symbol: string) => void;
}

const QuoteCard: React.FC<QuoteCardProps> = ({ symbol, onSelectSymbol }) => {
  const [quoteData, setQuoteData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuote = async () => {
      setLoading(true);
      try {
        const data = await MarketDataService.getQuote(symbol);
        setQuoteData(data);
        setError(null);
      } catch (err) {
        console.error(`Erro ao buscar dados para ${symbol}:`, err);
        setError(`Falha ao carregar ${symbol}`);
      } finally {
        setLoading(false);
      }
    };

    fetchQuote();
    // Atualizar a cada 60 segundos
    const interval = setInterval(fetchQuote, 60000);
    return () => clearInterval(interval);
  }, [symbol]);

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center p-6">
          <div className="animate-spin h-6 w-6 border-4 border-blue-500 rounded-full border-t-transparent"></div>
        </CardContent>
      </Card>
    );
  }

  if (error || !quoteData) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-red-500 text-center">{error || 'Dados indisponíveis'}</div>
        </CardContent>
      </Card>
    );
  }

  const isPositive = (quoteData.change || 0) >= 0;
  const changeColor = isPositive ? 'text-green-600' : 'text-red-600';
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <Card className="w-full cursor-pointer hover:shadow-md transition-shadow" 
          onClick={() => onSelectSymbol(symbol)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{quoteData.name || symbol}</CardTitle>
        <CardDescription>{symbol}</CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex justify-between items-baseline">
          <div className="text-2xl font-bold">
            {symbol === 'BRL=X' ? 
              // Formato especial para Real/Dólar (R$ X,XX)
              new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(quoteData.currentPrice || 0)
              : 
              // Formato padrão para outros ativos
              new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(quoteData.currentPrice || 0)
            }
          </div>
          <div className={`flex items-center gap-1 ${changeColor}`}>
            <TrendIcon className="h-4 w-4" />
            <span className="font-medium">
              {new Intl.NumberFormat('pt-BR', {
                signDisplay: 'always',
                minimumFractionDigits: 2
              }).format(quoteData.change || 0)}
            </span>
            <span className="text-sm">
              ({new Intl.NumberFormat('pt-BR', {
                signDisplay: 'always',
                minimumFractionDigits: 2
              }).format((quoteData.changePercent || 0) * 100)}%)
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <div className="w-full text-xs text-gray-500">
          Atualizado: {new Date(quoteData.timestamp).toLocaleTimeString('pt-BR')}
        </div>
      </CardFooter>
    </Card>
  );
};

// Componente principal de dados de mercado
const MarketDataComponent: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('indices');
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  // Lista de ações para mostrar por padrão
  const defaultStocks = ['PETR4', 'VALE3', 'ITUB4', 'BBDC4', 'ABEV3', 'MGLU3'];
  
  // Lista de índices para mostrar
  const indices = ['^BVSP', 'IFIX.SA', 'BRL=X'];

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setIsSearching(true);
    try {
      const results = await MarketDataService.searchSecurities(searchTerm);
      setSearchResults(results);
      setActiveTab('search');
    } catch (error) {
      console.error('Erro na pesquisa:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSymbol = (symbol: string) => {
    setSelectedSymbol(symbol);
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Buscar ativo (ex: PETR4)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button onClick={handleSearch} disabled={isSearching} variant="default">
          {isSearching ? (
            <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="indices">Índices</TabsTrigger>
              <TabsTrigger value="stocks">Ações</TabsTrigger>
              <TabsTrigger value="search">Pesquisa</TabsTrigger>
            </TabsList>

            <TabsContent value="indices" className="space-y-4">
              {indices.map(symbol => (
                <QuoteCard 
                  key={symbol} 
                  symbol={symbol} 
                  onSelectSymbol={handleSelectSymbol}
                />
              ))}
            </TabsContent>

            <TabsContent value="stocks" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {defaultStocks.map(symbol => (
                <QuoteCard 
                  key={symbol} 
                  symbol={symbol} 
                  onSelectSymbol={handleSelectSymbol}
                />
              ))}
            </TabsContent>

            <TabsContent value="search">
              {searchResults.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {isSearching ? 'Buscando...' : 'Faça uma pesquisa para ver resultados'}
                </div>
              ) : (
                <div className="space-y-4">
                  {searchResults.slice(0, 6).map((result, index) => (
                    <QuoteCard 
                      key={index} 
                      symbol={result.symbol} 
                      onSelectSymbol={handleSelectSymbol}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="w-full md:w-2/3">
          {selectedSymbol ? (
            <StockChart 
              symbol={selectedSymbol} 
              name={selectedSymbol}
            />
          ) : (
            <Card className="w-full h-full">
              <CardContent className="flex flex-col items-center justify-center h-[400px] text-gray-500">
                <BarChart2 className="h-16 w-16 mb-4 opacity-30" />
                <p>Selecione um ativo para visualizar o gráfico</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketDataComponent; 