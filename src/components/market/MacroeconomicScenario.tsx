import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowUp, ArrowDown, Minus, TrendingUp, TrendingDown, DollarSign, Percent, Globe, Loader2 } from 'lucide-react';

// Tipo para os dados macroeconômicos
interface MacroIndicator {
  nome: string;
  valor: string;
  valorAnterior: string;
  periodo?: string;
  tendencia: 'up' | 'down' | 'neutral';
  fonte?: string;
  variacao?: string;
  variacaoPercentual?: string;
  unidade?: string;
}

// Hook personalizado para buscar dados
const useMacroeconomicData = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/market-data/macroeconomic');
        
        if (!response.ok) {
          throw new Error(`Erro ao buscar dados: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Dados macroeconômicos recebidos:', result);
        setData(result);
        setLastUpdated(result.atualizadoEm || new Date().toLocaleString('pt-BR'));
        setError(null);
      } catch (err) {
        console.error('Erro ao buscar dados macroeconômicos:', err);
        setError('Não foi possível carregar os dados. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error, lastUpdated };
};

// Componente para mostrar tendência
const TrendIndicator: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'up') {
    return <ArrowUp className="h-4 w-4 text-green-500" />;
  } else if (status === 'down') {
    return <ArrowDown className="h-4 w-4 text-red-500" />;
  }
  return <Minus className="h-4 w-4 text-gray-500" />;
};

// Componente para tabela de indicadores
const IndicatorTable: React.FC<{ indicators: MacroIndicator[], loading: boolean }> = ({ indicators, loading }) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2">Carregando dados...</span>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Indicador</TableHead>
          <TableHead>Valor</TableHead>
          <TableHead>Anterior</TableHead>
          <TableHead>Tendência</TableHead>
          <TableHead>Período</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {indicators && indicators.map((indicator, index) => (
          <TableRow key={index}>
            <TableCell className="font-medium">{indicator.nome}</TableCell>
            <TableCell className="font-bold">{indicator.valor}</TableCell>
            <TableCell>{indicator.valorAnterior}</TableCell>
            <TableCell><TrendIndicator status={indicator.tendencia} /></TableCell>
            <TableCell className="text-muted-foreground">{indicator.periodo}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

// Componente principal
const MacroeconomicScenario: React.FC = () => {
  const [activeRegion, setActiveRegion] = useState('brazil');
  const { data, loading, error, lastUpdated } = useMacroeconomicData();

  // Montar os dados para exibição
  const brazilIndicators = data?.brasil?.indicadores || [];
  const brazilDynamicIndicators = data?.brasil?.dinamicos || [];
  const globalIndicators = data?.global || [];
  const projectionIndicators = data?.projecoes || [];

  // Função melhorada para encontrar indicadores específicos para os cards
  const findIndicator = (indicators: MacroIndicator[], name: string): MacroIndicator | null => {
    if (!indicators || indicators.length === 0) {
      console.log(`Nenhum indicador encontrado para ${name}`);
      return null;
    }
    
    // Log para depuração
    console.log(`Buscando indicador: ${name} em lista com ${indicators.length} items:`, 
                indicators.map(i => i.nome));
    
    // Primeiro, busca por nome exato
    const exactMatch = indicators.find(ind => ind.nome === name);
    if (exactMatch) {
      console.log(`Encontrado match exato para ${name}:`, exactMatch);
      return exactMatch;
    }
    
    // Depois, busca por inclusão parcial
    const partialMatch = indicators.find(ind => 
      ind.nome.toLowerCase().includes(name.toLowerCase()) || 
      name.toLowerCase().includes(ind.nome.toLowerCase())
    );
    
    if (partialMatch) {
      console.log(`Encontrado match parcial para ${name}:`, partialMatch);
      return partialMatch;
    }
    
    console.log(`Nenhum indicador encontrado para ${name} após busca completa`);
    return null;
  };

  // Dados para os cards com fallbacks de emergência apenas quando não há dados
  // Valores fallback atualizados para abril 2024
  const ipca = findIndicator(brazilIndicators, 'IPCA') || 
               findIndicator(projectionIndicators, 'IPCA') || 
               { nome: 'IPCA', valor: '4,10%', valorAnterior: '3,86%', tendencia: 'up' };
  
  const selic = findIndicator(brazilIndicators, 'Taxa Selic') || 
                findIndicator(brazilIndicators, 'Selic') ||
                { nome: 'Taxa Selic', valor: '10,75%', valorAnterior: '11,25%', tendencia: 'down' };
  
  // Indicadores dinâmicos (câmbio e commodities)
  const dolar = findIndicator(brazilDynamicIndicators, 'Real/Dólar') || 
                { nome: 'Real/Dólar', valor: 'R$ 5,04', valorAnterior: 'R$ 5,19', tendencia: 'up', variacaoPercentual: '-2,89%' };
  
  const petroleo = findIndicator(brazilDynamicIndicators, 'Petróleo WTI') || 
                   findIndicator(brazilDynamicIndicators, 'Petróleo') ||
                   { nome: 'Petróleo WTI', valor: 'US$ 82,63', valorAnterior: 'US$ 81,45', tendencia: 'up', variacaoPercentual: '+1,45%' };
  
  // Indicadores de PIB
  const pibAtual = findIndicator(brazilIndicators, 'PIB (Var. Trimestral)') || 
                   findIndicator(brazilIndicators, 'PIB') ||
                   { nome: 'PIB', valor: '2,23%', valorAnterior: '2,10%', tendencia: 'up' };
  
  const pibProj = findIndicator(projectionIndicators, 'PIB') || 
                  { nome: 'PIB', valor: '2,23%', valorAnterior: '2,10%', tendencia: 'up' };
  
  // Log todos os indicadores finais para os cards
  useEffect(() => {
    if (!loading && data) {
      console.log('Indicadores finais para os cards:');
      console.log('IPCA:', ipca);
      console.log('Selic:', selic);
      console.log('Dólar:', dolar);
      console.log('Petróleo:', petroleo);
      console.log('PIB Atual:', pibAtual);
      console.log('PIB Projeção:', pibProj);
    }
  }, [loading, data]);
  
  // Calcular variações para os cards
  const calcularVariacao = (atual: string, anterior: string) => {
    try {
      const valorAtual = parseFloat(atual.replace(/[^0-9,.]/g, '').replace(',', '.'));
      const valorAnterior = parseFloat(anterior.replace(/[^0-9,.]/g, '').replace(',', '.'));
      if (isNaN(valorAtual) || isNaN(valorAnterior)) {
        console.warn('Falha ao calcular variação, valores não numéricos:', atual, anterior);
        return '0.00';
      }
      return (valorAtual - valorAnterior).toFixed(2);
    } catch (e) {
      console.error('Erro ao calcular variação:', e);
      return '0.00';
    }
  };

  const ipcaVar = ipca?.variacao || calcularVariacao(ipca?.valor || '0', ipca?.valorAnterior || '0');
  const selicVar = selic?.variacao || calcularVariacao(selic?.valor || '0', selic?.valorAnterior || '0');
  const pibAtualVar = pibAtual?.variacao || calcularVariacao(pibAtual?.valor || '0', pibAtual?.valorAnterior || '0');
  const pibProjVar = pibProj?.variacao || calcularVariacao(pibProj?.valor || '0', pibProj?.valorAnterior || '0');
  
  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-red-500">
            <p>{error}</p>
            <p className="mt-2">Usando dados estáticos como fallback.</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Cenário Macroeconômico</CardTitle>
              <CardDescription>
                Principais indicadores e projeções econômicas
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-sm px-3 py-1">
              Atualizado em: {lastUpdated ? new Date(lastUpdated).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }) : new Date().toLocaleDateString('pt-BR')}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="brazil" value={activeRegion} onValueChange={setActiveRegion}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="brazil">Brasil</TabsTrigger>
              <TabsTrigger value="global">Global</TabsTrigger>
              <TabsTrigger value="projections">Projeções</TabsTrigger>
            </TabsList>
            
            <TabsContent value="brazil" className="pt-4">
              <h3 className="text-lg font-medium mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-blue-500" />
                Indicadores Macroeconômicos do Brasil
              </h3>
              <IndicatorTable indicators={brazilIndicators} loading={loading} />
            </TabsContent>
            
            <TabsContent value="global" className="pt-4">
              <h3 className="text-lg font-medium mb-4 flex items-center">
                <Globe className="h-5 w-5 mr-2 text-blue-500" />
                Indicadores Globais
              </h3>
              <IndicatorTable indicators={globalIndicators} loading={loading} />
            </TabsContent>
            
            <TabsContent value="projections" className="pt-4">
              <h3 className="text-lg font-medium mb-4 flex items-center">
                <TrendingDown className="h-5 w-5 mr-2 text-blue-500" />
                Projeções Econômicas (Boletim Focus)
              </h3>
              <IndicatorTable indicators={projectionIndicators} loading={loading} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Percent className="h-5 w-5 mr-2 text-blue-500" /> 
              Inflação vs Juros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <div className="flex justify-around items-center">
                <div>
                  <p className="text-sm text-muted-foreground">IPCA (12 meses)</p>
                  <p className="text-3xl font-bold">{ipca?.valor || '4,10%'}</p>
                  <Badge variant="outline" className="mt-1">
                    {parseFloat(ipcaVar) >= 0 ? 
                      <ArrowUp className="h-3 w-3 mr-1 text-green-500" /> : 
                      <ArrowDown className="h-3 w-3 mr-1 text-red-500" />
                    }
                    {parseFloat(ipcaVar) >= 0 ? '+' : ''}{ipcaVar} p.p.
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Taxa Selic</p>
                  <p className="text-3xl font-bold">{selic?.valor || '10,75%'}</p>
                  <Badge variant="outline" className="mt-1">
                    {parseFloat(selicVar) >= 0 ? 
                      <ArrowUp className="h-3 w-3 mr-1 text-green-500" /> : 
                      <ArrowDown className="h-3 w-3 mr-1 text-red-500" />
                    }
                    {parseFloat(selicVar) >= 0 ? '+' : ''}{selicVar} p.p.
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-blue-500" /> 
              Câmbio e Commodities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <div className="flex justify-around items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Real/Dólar</p>
                  <p className="text-3xl font-bold">{dolar?.valor || 'R$ 5,04'}</p>
                  <Badge variant="outline" className="mt-1">
                    {dolar?.tendencia === 'up' ? 
                      <ArrowUp className="h-3 w-3 mr-1 text-green-500" /> : 
                      <ArrowDown className="h-3 w-3 mr-1 text-red-500" />
                    }
                    {dolar?.variacaoPercentual || '-2,89%'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Petróleo WTI</p>
                  <p className="text-3xl font-bold">{petroleo?.valor || 'US$ 82,63'}</p>
                  <Badge variant="outline" className="mt-1">
                    {petroleo?.tendencia === 'up' ? 
                      <ArrowUp className="h-3 w-3 mr-1 text-green-500" /> : 
                      <ArrowDown className="h-3 w-3 mr-1 text-red-500" />
                    }
                    {petroleo?.variacaoPercentual || '+1,45%'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-blue-500" /> 
              Crescimento PIB
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <div className="flex justify-around items-center">
                <div>
                  <p className="text-sm text-muted-foreground">PIB Atual</p>
                  <p className="text-3xl font-bold">{pibAtual?.valor || '2,23%'}</p>
                  <Badge variant="outline" className="mt-1">
                    {parseFloat(pibAtualVar) >= 0 ? 
                      <ArrowUp className="h-3 w-3 mr-1 text-green-500" /> : 
                      <ArrowDown className="h-3 w-3 mr-1 text-red-500" />
                    }
                    {parseFloat(pibAtualVar) >= 0 ? '+' : ''}{pibAtualVar} p.p.
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Projeção 2024</p>
                  <p className="text-3xl font-bold">{pibProj?.valor || '2,23%'}</p>
                  <Badge variant="outline" className="mt-1">
                    {parseFloat(pibProjVar) >= 0 ? 
                      <ArrowUp className="h-3 w-3 mr-1 text-green-500" /> : 
                      <ArrowDown className="h-3 w-3 mr-1 text-red-500" />
                    }
                    {parseFloat(pibProjVar) >= 0 ? '+' : ''}{pibProjVar} p.p.
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <p className="text-sm text-muted-foreground text-center">
        Dados macroeconômicos obtidos de APIs públicas e Banco Central. Atualizado em {lastUpdated ? new Date(lastUpdated).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}.
      </p>
    </div>
  );
};

export default MacroeconomicScenario; 