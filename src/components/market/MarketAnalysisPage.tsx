import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronUp, BarChart, LineChart, PieChart, TrendingUp, TrendingDown, Search, Globe, Bitcoin } from 'lucide-react';
import MarketDataComponent from './MarketData';
import StockChart from './StockChart';
import MacroeconomicScenario from './MacroeconomicScenario';
import CryptoMarketData from '../CryptoMarketData';
import TechnicalAnalysis from './TechnicalAnalysis';

const MarketAnalysisPage: React.FC = () => {
  const [activeMarketTab, setActiveMarketTab] = useState('market-data');

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Análise de Mercado</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Acompanhe o mercado financeiro e análise de ativos em tempo real
        </p>
      </div>

      <Tabs value={activeMarketTab} onValueChange={setActiveMarketTab} className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="market-data" className="gap-2">
              <BarChart className="h-4 w-4" />
              <span>Dados de Mercado</span>
            </TabsTrigger>
            <TabsTrigger value="cryptocurrencies" className="gap-2">
              <Bitcoin className="h-4 w-4" />
              <span>Criptomoedas</span>
            </TabsTrigger>
            <TabsTrigger value="technical-analysis" className="gap-2">
              <LineChart className="h-4 w-4" />
              <span>Análise Técnica</span>
            </TabsTrigger>
            <TabsTrigger value="fundamental-analysis" className="gap-2">
              <PieChart className="h-4 w-4" />
              <span>Análise Fundamentalista</span>
            </TabsTrigger>
            <TabsTrigger value="macroeconomic" className="gap-2">
              <Globe className="h-4 w-4" />
              <span>Cenário Macroeconômico</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="market-data" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MarketIndexCard 
              symbol="^BVSP" 
              name="Ibovespa" 
              icon={<TrendingUp className="h-8 w-8 text-blue-500" />} 
              primaryColor="blue"
            />
            <MarketIndexCard 
              symbol="^IFIX" 
              name="Índice Fundos Imobiliários" 
              icon={<BarChart className="h-8 w-8 text-green-500" />} 
              primaryColor="green"
            />
            <MarketIndexCard 
              symbol="BRL=X" 
              name="Real / Dólar" 
              icon={<TrendingDown className="h-8 w-8 text-purple-500" />} 
              primaryColor="purple"
            />
          </div>
          
          <MarketDataComponent />
        </TabsContent>

        <TabsContent value="cryptocurrencies" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MarketIndexCard 
              symbol="BTCUSDT" 
              name="Bitcoin / USD" 
              icon={<Bitcoin className="h-8 w-8 text-orange-500" />} 
              primaryColor="orange"
            />
            <MarketIndexCard 
              symbol="ETHUSDT" 
              name="Ethereum / USD" 
              icon={<Bitcoin className="h-8 w-8 text-blue-500" />} 
              primaryColor="blue"
            />
            <MarketIndexCard 
              symbol="BTCBRL=X" 
              name="Bitcoin / Real" 
              icon={<Bitcoin className="h-8 w-8 text-green-500" />} 
              primaryColor="green"
            />
          </div>
          
          <CryptoMarketData />
        </TabsContent>

        <TabsContent value="technical-analysis" className="space-y-4">
          <TechnicalAnalysis />
        </TabsContent>

        <TabsContent value="fundamental-analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Análise Fundamentalista</CardTitle>
              <CardDescription>
                Explore os dados fundamentalistas das empresas para tomada de decisão de investimento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <PieChart className="mx-auto h-12 w-12 mb-4 opacity-40" />
                <p className="text-lg font-medium">Módulo de Análise Fundamentalista em desenvolvimento</p>
                <p className="max-w-lg mx-auto mt-2">
                  Em breve você poderá analisar indicadores fundamentalistas como P/L, P/VP, 
                  Dividend Yield, ROE e outros.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="macroeconomic" className="space-y-4">
          <MacroeconomicScenario />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Componente de cartão para índices de mercado
interface MarketIndexCardProps {
  symbol: string;
  name: string;
  icon: React.ReactNode;
  primaryColor: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}

const MarketIndexCard: React.FC<MarketIndexCardProps> = ({ 
  symbol, 
  name, 
  icon,
  primaryColor = 'blue' 
}) => {
  // Mapear cores para classes Tailwind
  const colorMap = {
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-700 dark:text-blue-300',
      positive: 'text-green-600 dark:text-green-400',
      negative: 'text-red-600 dark:text-red-400'
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-700 dark:text-green-300',
      positive: 'text-green-600 dark:text-green-400',
      negative: 'text-red-600 dark:text-red-400'
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      border: 'border-purple-200 dark:border-purple-800',
      text: 'text-purple-700 dark:text-purple-300',
      positive: 'text-green-600 dark:text-green-400',
      negative: 'text-red-600 dark:text-red-400'
    },
    orange: {
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      border: 'border-orange-200 dark:border-orange-800',
      text: 'text-orange-700 dark:text-orange-300',
      positive: 'text-green-600 dark:text-green-400',
      negative: 'text-red-600 dark:text-red-400'
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-700 dark:text-red-300',
      positive: 'text-green-600 dark:text-green-400',
      negative: 'text-red-600 dark:text-red-400'
    }
  };
  
  const colorClasses = colorMap[primaryColor];
  
  return (
    <Card className={`${colorClasses.bg} border ${colorClasses.border}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className={`text-lg ${colorClasses.text}`}>{name}</CardTitle>
            <CardDescription>{symbol}</CardDescription>
          </div>
          <div className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm">
            {icon}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <StockChart symbol={symbol} name={name} />
      </CardContent>
    </Card>
  );
};

export default MarketAnalysisPage; 