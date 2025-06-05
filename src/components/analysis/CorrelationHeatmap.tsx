import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { AlertTriangle } from "lucide-react";

interface CorrelationHeatmapProps {
  correlationMatrix: Record<string, Record<string, number>>;
  assets: string[];
}

const CorrelationHeatmap: React.FC<CorrelationHeatmapProps> = ({ 
  correlationMatrix,
  assets
}) => {
  // Função para determinar cor baseada no valor de correlação
  const getCorrelationColor = (value: number): string => {
    // Criar um esquema de cores: 
    // -1.0 a -0.5: tons de azul (correlação negativa forte)
    // -0.5 a 0.0: tons de azul claro (correlação negativa fraca)
    // 0.0 a 0.5: tons de verde claro (correlação positiva fraca)
    // 0.5 a 1.0: tons de verde (correlação positiva forte)
    
    if (value >= 0.9) return "bg-green-900 text-white";
    if (value >= 0.7) return "bg-green-700 text-white";
    if (value >= 0.5) return "bg-green-500 text-white";
    if (value >= 0.3) return "bg-green-300";
    if (value >= 0.0) return "bg-green-100";
    if (value >= -0.3) return "bg-blue-100";
    if (value >= -0.5) return "bg-blue-300";
    if (value >= -0.7) return "bg-blue-500 text-white";
    return "bg-blue-700 text-white";
  };
  
  // Função para descrever a correlação
  const getCorrelationDescription = (value: number): string => {
    if (value > 0.9) return "Muito alta positiva";
    if (value > 0.7) return "Alta positiva";
    if (value > 0.5) return "Moderada positiva";
    if (value > 0.3) return "Baixa positiva";
    if (value > -0.3) return "Fraca ou nenhuma";
    if (value > -0.5) return "Baixa negativa";
    if (value > -0.7) return "Moderada negativa";
    if (value > -0.9) return "Alta negativa";
    return "Muito alta negativa";
  };
  
  // Função para interpretar a matriz de correlação
  const getMatrixInterpretation = (): { 
    diversificationOpportunities: string[]; 
    highCorrelations: string[]; 
    negativeCorrelations: string[];
  } => {
    const diversificationOpportunities: string[] = [];
    const highCorrelations: string[] = [];
    const negativeCorrelations: string[] = [];
    
    // Analisar a matriz para encontrar padrões interessantes
    for (let i = 0; i < assets.length; i++) {
      for (let j = i + 1; j < assets.length; j++) {
        const asset1 = assets[i];
        const asset2 = assets[j];
        
        // Verificar se as chaves existem
        if (correlationMatrix[asset1] && correlationMatrix[asset1][asset2] !== undefined) {
          const correlation = correlationMatrix[asset1][asset2];
          
          if (correlation <= -0.3) {
            negativeCorrelations.push(`${asset1} e ${asset2} (${correlation.toFixed(2)})`);
            diversificationOpportunities.push(`${asset1} e ${asset2} (${correlation.toFixed(2)})`);
          } else if (correlation >= 0.7) {
            highCorrelations.push(`${asset1} e ${asset2} (${correlation.toFixed(2)})`);
          } else if (correlation < 0.3) {
            diversificationOpportunities.push(`${asset1} e ${asset2} (${correlation.toFixed(2)})`);
          }
        }
      }
    }
    
    return { 
      diversificationOpportunities, 
      highCorrelations, 
      negativeCorrelations 
    };
  };
  
  const interpretation = getMatrixInterpretation();
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Matriz de Correlação</CardTitle>
          <CardDescription>
            Correlação entre diferentes classes de ativos na carteira
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th className="border p-2 bg-muted/50"></th>
                  {assets.map((asset, index) => (
                    <th key={index} className="border p-2 bg-muted/50 font-medium text-sm">
                      {asset}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assets.map((assetRow, rowIndex) => (
                  <tr key={rowIndex}>
                    <th className="border p-2 bg-muted/50 font-medium text-sm text-left">
                      {assetRow}
                    </th>
                    {assets.map((assetCol, colIndex) => {
                      const correlation = correlationMatrix[assetRow]?.[assetCol] ?? 0;
                      const isHighlight = rowIndex === colIndex;
                      
                      return (
                        <td 
                          key={colIndex} 
                          className={`border p-2 text-center ${isHighlight ? 'bg-muted/30' : getCorrelationColor(correlation)}`}
                          title={`${assetRow} x ${assetCol}: ${getCorrelationDescription(correlation)}`}
                        >
                          {correlation.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Interpretação e Oportunidades</CardTitle>
          <CardDescription>
            Análise das correlações e sugestões para diversificação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Oportunidades de Diversificação</h3>
            {interpretation.diversificationOpportunities.length > 0 ? (
              <ul className="list-disc pl-5 space-y-1">
                {interpretation.diversificationOpportunities.slice(0, 5).map((item, index) => (
                  <li key={index} className="text-sm">{item}</li>
                ))}
                {interpretation.diversificationOpportunities.length > 5 && (
                  <li className="text-sm text-muted-foreground">
                    E mais {interpretation.diversificationOpportunities.length - 5} pares...
                  </li>
                )}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Não foram identificadas oportunidades significativas de diversificação.
              </p>
            )}
          </div>
          
          {interpretation.highCorrelations.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Correlações Altas</h3>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Atenção para potencial redundância</AlertTitle>
                <AlertDescription>
                  Os seguintes pares de ativos têm alta correlação, o que pode reduzir os benefícios da diversificação:
                </AlertDescription>
              </Alert>
              <ul className="list-disc pl-5 space-y-1">
                {interpretation.highCorrelations.map((item, index) => (
                  <li key={index} className="text-sm">{item}</li>
                ))}
              </ul>
            </div>
          )}
          
          {interpretation.negativeCorrelations.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Correlações Negativas</h3>
              <p className="text-sm text-muted-foreground">
                Os seguintes pares de ativos têm correlação negativa, o que pode ser excelente para diversificação:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                {interpretation.negativeCorrelations.map((item, index) => (
                  <li key={index} className="text-sm">{item}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="mt-6 space-y-2">
            <h3 className="text-lg font-medium">Como Interpretar</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  <strong>Correlação positiva:</strong> Os ativos tendem a se mover na mesma direção.
                  <br />
                  <strong>Correlação negativa:</strong> Os ativos tendem a se mover em direções opostas.
                  <br />
                  <strong>Correlação próxima de zero:</strong> Os ativos se movem de forma independente.
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Para uma diversificação eficiente, é desejável combinar ativos com baixa ou
                  negativa correlação entre si. Isso ajuda a reduzir a volatilidade geral da carteira,
                  pois quando alguns ativos perdem valor, outros podem estar ganhando.
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-2">
              <div className="bg-blue-700 text-white px-2 py-1 text-xs rounded">
                Muito neg. (&lt; -0.7)
              </div>
              <div className="bg-blue-500 text-white px-2 py-1 text-xs rounded">
                Neg. (-0.7 a -0.5)
              </div>
              <div className="bg-blue-300 px-2 py-1 text-xs rounded">
                Baixa neg. (-0.5 a -0.3)
              </div>
              <div className="bg-blue-100 px-2 py-1 text-xs rounded">
                Fraca neg. (-0.3 a 0)
              </div>
              <div className="bg-green-100 px-2 py-1 text-xs rounded">
                Fraca pos. (0 a 0.3)
              </div>
              <div className="bg-green-300 px-2 py-1 text-xs rounded">
                Baixa pos. (0.3 a 0.5)
              </div>
              <div className="bg-green-500 text-white px-2 py-1 text-xs rounded">
                Pos. (0.5 a 0.7)
              </div>
              <div className="bg-green-700 text-white px-2 py-1 text-xs rounded">
                Muito pos. (0.7 a 0.9)
              </div>
              <div className="bg-green-900 text-white px-2 py-1 text-xs rounded">
                Extrema pos. (&gt; 0.9)
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CorrelationHeatmap; 