import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "../ui/tooltip";
import { Info, AlertTriangle, TrendingUp, TrendingDown, BarChart2 } from "lucide-react";

interface RiskMetricsCardProps {
  sharpeRatio: number;
  sortinoRatio: number;
  volatility: number;
  maxDrawdown: number;
  var95: number;
  var99: number;
}

const RiskMetricsCard: React.FC<RiskMetricsCardProps> = ({
  sharpeRatio,
  sortinoRatio,
  volatility,
  maxDrawdown,
  var95,
  var99
}) => {
  // Função para classificar e colorir métricas com base em thresholds
  // higherIsBetter determina se valores mais altos são melhores (ex: Sharpe) ou piores (ex: Volatility)
  const getMetricRating = (
    value: number, 
    lowThreshold: number, 
    mediumThreshold: number, 
    highThreshold: number, 
    higherIsBetter: boolean
  ): { color: string; rating: string; progress: number } => {
    // Converter o valor para uma porcentagem para a barra de progresso
    // 0% = pior, 100% = melhor
    let progressNormalized: number;
    
    if (higherIsBetter) {
      if (value >= highThreshold) {
        return { 
          color: "bg-green-500", 
          rating: "Excelente", 
          progress: 90 
        };
      } else if (value >= mediumThreshold) {
        progressNormalized = ((value - mediumThreshold) / (highThreshold - mediumThreshold) * 30) + 60;
        return { 
          color: "bg-green-400", 
          rating: "Bom", 
          progress: progressNormalized 
        };
      } else if (value >= lowThreshold) {
        progressNormalized = ((value - lowThreshold) / (mediumThreshold - lowThreshold) * 30) + 30;
        return { 
          color: "bg-yellow-500", 
          rating: "Moderado", 
          progress: progressNormalized
        };
      } else {
        progressNormalized = (value / lowThreshold) * 30;
        return { 
          color: "bg-red-500", 
          rating: "Baixo", 
          progress: progressNormalized
        };
      }
    } else {
      // Para métricas onde valores menores são melhores (volatilidade, drawdown, VaR)
      if (value <= lowThreshold) {
        return { 
          color: "bg-green-500", 
          rating: "Excelente", 
          progress: 90 
        };
      } else if (value <= mediumThreshold) {
        progressNormalized = ((mediumThreshold - value) / (mediumThreshold - lowThreshold) * 30) + 60;
        return { 
          color: "bg-green-400", 
          rating: "Bom", 
          progress: progressNormalized 
        };
      } else if (value <= highThreshold) {
        progressNormalized = ((highThreshold - value) / (highThreshold - mediumThreshold) * 30) + 30;
        return { 
          color: "bg-yellow-500", 
          rating: "Moderado", 
          progress: progressNormalized 
        };
      } else {
        // Calcular o valor inverso para a barra de progresso
        progressNormalized = Math.max(0, (1 - ((value - highThreshold) / highThreshold)) * 30);
        return { 
          color: "bg-red-500", 
          rating: "Alto", 
          progress: progressNormalized 
        };
      }
    }
  };
  
  // Calcular ratings específicos para cada métrica
  const sharpeRating = getMetricRating(sharpeRatio, 0.5, 1.0, 1.5, true);
  const sortinoRating = getMetricRating(sortinoRatio, 0.7, 1.3, 2.0, true);
  const volatilityRating = getMetricRating(volatility, 0.10, 0.15, 0.25, false);
  const maxDrawdownRating = getMetricRating(maxDrawdown, 0.10, 0.20, 0.30, false);
  const var95Rating = getMetricRating(var95, 0.05, 0.10, 0.15, false);
  const var99Rating = getMetricRating(var99, 0.08, 0.15, 0.25, false);
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Métricas de Retorno Ajustado ao Risco
            </CardTitle>
            <CardDescription>
              Avaliação de retorno considerando o risco assumido
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <span className="font-medium">Índice de Sharpe</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 ml-2 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="max-w-xs p-2">
                          <p className="text-sm">O Índice de Sharpe mede o retorno excedente por unidade de risco (volatilidade). Um valor maior indica melhor relação risco-retorno.</p>
                          <ul className="text-xs mt-2 list-disc pl-4">
                            <li>&lt; 0.5: Baixo</li>
                            <li>0.5 - 1.0: Moderado</li>
                            <li>1.0 - 1.5: Bom</li>
                            <li>&gt; 1.5: Excelente</li>
                          </ul>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{sharpeRatio.toFixed(2)}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${sharpeRating.color === 'bg-green-500' || sharpeRating.color === 'bg-green-400' ? 'text-white' : 'text-gray-900'} ${sharpeRating.color}`}>
                    {sharpeRating.rating}
                  </span>
                </div>
              </div>
              <Progress value={sharpeRating.progress} className={sharpeRating.color} />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <span className="font-medium">Índice de Sortino</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 ml-2 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="max-w-xs p-2">
                          <p className="text-sm">O Índice de Sortino mede o retorno excedente por unidade de risco negativo (downside risk). Foca apenas nas variações negativas, ignorando a volatilidade positiva.</p>
                          <ul className="text-xs mt-2 list-disc pl-4">
                            <li>&lt; 0.7: Baixo</li>
                            <li>0.7 - 1.3: Moderado</li>
                            <li>1.3 - 2.0: Bom</li>
                            <li>&gt; 2.0: Excelente</li>
                          </ul>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{sortinoRatio.toFixed(2)}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${sortinoRating.color === 'bg-green-500' || sortinoRating.color === 'bg-green-400' ? 'text-white' : 'text-gray-900'} ${sortinoRating.color}`}>
                    {sortinoRating.rating}
                  </span>
                </div>
              </div>
              <Progress value={sortinoRating.progress} className={sortinoRating.color} />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart2 className="h-5 w-5 mr-2" />
              Métricas de Risco
            </CardTitle>
            <CardDescription>
              Avaliação dos riscos da carteira
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <span className="font-medium">Volatilidade</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 ml-2 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="max-w-xs p-2">
                          <p className="text-sm">Volatilidade anualizada, medida pelo desvio padrão dos retornos. Indica o quão dispersos estão os retornos em relação à média.</p>
                          <ul className="text-xs mt-2 list-disc pl-4">
                            <li>&lt; 10%: Baixa</li>
                            <li>10% - 15%: Moderada</li>
                            <li>15% - 25%: Alta</li>
                            <li>&gt; 25%: Muito alta</li>
                          </ul>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{(volatility * 100).toFixed(1)}%</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${volatilityRating.color === 'bg-green-500' || volatilityRating.color === 'bg-green-400' ? 'text-white' : 'text-gray-900'} ${volatilityRating.color}`}>
                    {volatilityRating.rating}
                  </span>
                </div>
              </div>
              <Progress value={volatilityRating.progress} className={volatilityRating.color} />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <span className="font-medium">Máximo Drawdown</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 ml-2 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="max-w-xs p-2">
                          <p className="text-sm">A maior perda percentual observada do pico ao vale. Indica o pior cenário histórico de queda.</p>
                          <ul className="text-xs mt-2 list-disc pl-4">
                            <li>&lt; 10%: Baixo</li>
                            <li>10% - 20%: Moderado</li>
                            <li>20% - 30%: Alto</li>
                            <li>&gt; 30%: Muito alto</li>
                          </ul>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{(maxDrawdown * 100).toFixed(1)}%</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${maxDrawdownRating.color === 'bg-green-500' || maxDrawdownRating.color === 'bg-green-400' ? 'text-white' : 'text-gray-900'} ${maxDrawdownRating.color}`}>
                    {maxDrawdownRating.rating}
                  </span>
                </div>
              </div>
              <Progress value={maxDrawdownRating.progress} className={maxDrawdownRating.color} />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <span className="font-medium">VaR (95%)</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 ml-2 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="max-w-xs p-2">
                          <p className="text-sm">Value at Risk com 95% de confiança. Indica a perda máxima esperada em condições normais de mercado.</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{(var95 * 100).toFixed(1)}%</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${var95Rating.color === 'bg-green-500' || var95Rating.color === 'bg-green-400' ? 'text-white' : 'text-gray-900'} ${var95Rating.color}`}>
                    {var95Rating.rating}
                  </span>
                </div>
              </div>
              <Progress value={var95Rating.progress} className={var95Rating.color} />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <span className="font-medium">VaR (99%)</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 ml-2 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="max-w-xs p-2">
                          <p className="text-sm">Value at Risk com 99% de confiança. Indica a perda máxima esperada em condições extremas de mercado.</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{(var99 * 100).toFixed(1)}%</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${var99Rating.color === 'bg-green-500' || var99Rating.color === 'bg-green-400' ? 'text-white' : 'text-gray-900'} ${var99Rating.color}`}>
                    {var99Rating.rating}
                  </span>
                </div>
              </div>
              <Progress value={var99Rating.progress} className={var99Rating.color} />
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Interpretação das Métricas</CardTitle>
          <CardDescription>
            Como entender e utilizar estas métricas para tomada de decisão
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Métricas de Retorno Ajustado ao Risco</h3>
              <p className="text-sm text-muted-foreground">
                As métricas de retorno ajustado ao risco permitem comparar diferentes investimentos 
                considerando não apenas o retorno absoluto, mas a qualidade desse retorno em relação 
                ao risco assumido.
              </p>
              
              <div className="space-y-2">
                <h4 className="font-medium">Índice de Sharpe</h4>
                <p className="text-sm text-muted-foreground">
                  Um Índice de Sharpe de {sharpeRatio.toFixed(2)} indica que para cada unidade de risco 
                  assumida (volatilidade), a carteira está gerando {sharpeRatio.toFixed(2)} unidades de 
                  retorno acima do ativo livre de risco. Valores acima de 1 geralmente são considerados bons.
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Índice de Sortino</h4>
                <p className="text-sm text-muted-foreground">
                  O Índice de Sortino de {sortinoRatio.toFixed(2)} considera apenas a volatilidade 
                  negativa (desvios abaixo do retorno alvo). Um valor maior que o Índice de Sharpe 
                  indica uma boa proteção contra perdas significativas.
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Métricas de Risco</h3>
              <p className="text-sm text-muted-foreground">
                As métricas de risco ajudam a entender os potenciais cenários negativos e 
                a magnitude das perdas possíveis em diferentes condições de mercado.
              </p>
              
              <div className="space-y-2">
                <h4 className="font-medium">Volatilidade e Drawdown</h4>
                <p className="text-sm text-muted-foreground">
                  Com volatilidade de {(volatility * 100).toFixed(1)}% e máximo drawdown de {(maxDrawdown * 100).toFixed(1)}%, 
                  esta carteira apresenta {volatilityRating.rating.toLowerCase()} oscilação e 
                  teve quedas históricas {maxDrawdownRating.rating === "Alto" || maxDrawdownRating.rating === "Muito alto" ? "significativas" : "moderadas"}.
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Value at Risk (VaR)</h4>
                <p className="text-sm text-muted-foreground">
                  O VaR indica que, com 95% de confiança, a perda máxima esperada em um dia não 
                  ultrapassará {(var95 * 100).toFixed(1)}% do valor da carteira. Em condições extremas 
                  (99% de confiança), a perda pode chegar a {(var99 * 100).toFixed(1)}%.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RiskMetricsCard; 