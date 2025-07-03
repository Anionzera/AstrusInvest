import React from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  Brain, 
  Shield,
  PieChart,
  Activity,
  Sparkles,
  Cpu,
  LineChart
} from 'lucide-react';

// Importar componentes de otimização
import SKFolioPortfolioOptimizer from '../components/skfolio/SKFolioPortfolioOptimizer';

const AdvancedOptimizationPage: React.FC = () => {

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-8">
        <div className="flex items-center justify-center gap-3">
          <div className="p-3 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-600 rounded-xl shadow-lg">
            <Brain className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Otimização Avançada com IA
          </h1>
        </div>
        
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Tecnologia de ponta para otimização de portfólios com algoritmos de inteligência artificial. 
          Análise quantitativa profissional com visualizações interativas em tempo real.
        </p>
        
        <div className="flex items-center justify-center gap-6 pt-4">
          <Badge variant="outline" className="text-sm px-4 py-2 bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200">
            <Sparkles className="h-4 w-4 mr-2" />
            IA Avançada
          </Badge>
          <Badge variant="outline" className="text-sm px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <Cpu className="h-4 w-4 mr-2" />
            Solver Clarabel
          </Badge>
          <Badge variant="outline" className="text-sm px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <LineChart className="h-4 w-4 mr-2" />
            Plotly Analytics
          </Badge>
        </div>
      </div>

      {/* Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="text-center hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-violet-50 to-purple-50">
          <CardContent className="p-6">
            <div className="w-12 h-12 bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-semibold mb-2 text-violet-900">17+ Algoritmos IA</h3>
            <p className="text-sm text-violet-700">
              Mean-Risk, HRP, NCO, Black-Litterman e mais
            </p>
          </CardContent>
        </Card>

        <Card className="text-center hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-emerald-50 to-green-50">
          <CardContent className="p-6">
            <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-semibold mb-2 text-emerald-900">19 Medidas de Risco</h3>
            <p className="text-sm text-emerald-700">
              CVaR, EVaR, CDaR, EDaR, Max Drawdown
            </p>
          </CardContent>
        </Card>

        <Card className="text-center hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-6">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-semibold mb-2 text-blue-900">18 Métricas Avançadas</h3>
            <p className="text-sm text-blue-700">
              Sharpe, Sortino, Calmar, VaR, CVaR
            </p>
          </CardContent>
        </Card>

        <Card className="text-center hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-orange-50 to-red-50">
          <CardContent className="p-6">
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <PieChart className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-semibold mb-2 text-orange-900">10+ Visualizações Avançadas</h3>
            <p className="text-sm text-orange-700">
              Plotly 3D: Alocação, Fronteira, Drawdown, Attribution, Rolling Metrics
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Otimizador Principal */}
      <SKFolioPortfolioOptimizer />
    </div>
  );
};

export default AdvancedOptimizationPage;