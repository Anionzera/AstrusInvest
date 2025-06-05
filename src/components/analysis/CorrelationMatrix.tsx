import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { Button } from '../ui/button';
import { Ativo, Posicao } from '../../lib/db';
import { calcularMatrizCorrelacao, gerarSugestoesReducaoCorrelacao } from '../../lib/portfolioAnalysis';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { InfoIcon } from 'lucide-react';

interface CorrelationMatrixProps {
  posicoes: Posicao[];
  ativos: Ativo[];
}

const CorrelationMatrix: React.FC<CorrelationMatrixProps> = ({ posicoes, ativos }) => {
  const [matrizCorrelacao, setMatrizCorrelacao] = useState<Record<string, Record<string, number>>>({});
  const [sugestoes, setSugestoes] = useState<string[]>([]);
  const [nomesDosAtivos, setNomesDosAtivos] = useState<string[]>([]);
  const [view, setView] = useState<'matriz' | 'sugestoes'>('matriz');

  useEffect(() => {
    if (posicoes.length && ativos.length) {
      const matriz = calcularMatrizCorrelacao(posicoes, ativos);
      setMatrizCorrelacao(matriz);
      setNomesDosAtivos(Object.keys(matriz));
      
      const sugestoesGeradas = gerarSugestoesReducaoCorrelacao(posicoes, ativos, matriz);
      setSugestoes(sugestoesGeradas);
    }
  }, [posicoes, ativos]);

  // Função para determinar a cor da célula com base no valor da correlação
  const getCorrelationColor = (valor: number): string => {
    if (valor >= 0.7) return 'bg-red-500/20 dark:bg-red-900/30'; // Alta correlação positiva
    if (valor >= 0.3) return 'bg-orange-500/20 dark:bg-orange-900/30'; // Correlação positiva moderada
    if (valor >= -0.3) return 'bg-gray-200/50 dark:bg-gray-800/30'; // Correlação fraca
    if (valor >= -0.7) return 'bg-blue-500/20 dark:bg-blue-900/30'; // Correlação negativa moderada
    return 'bg-green-500/20 dark:bg-green-900/30'; // Alta correlação negativa (boa para diversificação)
  };

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Matriz de Correlação</CardTitle>
          <CardDescription>
            Visualize a correlação entre os ativos do portfólio
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={view === 'matriz' ? 'default' : 'outline'} 
            onClick={() => setView('matriz')}
            size="sm"
          >
            Matriz
          </Button>
          <Button 
            variant={view === 'sugestoes' ? 'default' : 'outline'} 
            onClick={() => setView('sugestoes')}
            size="sm"
          >
            Sugestões
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {view === 'matriz' ? (
          <>
            <div className="text-sm text-muted-foreground mb-4">
              <div className="flex items-center gap-2 mb-2">
                <InfoIcon size={16} />
                <span>Cores indicam o nível de correlação entre ativos</span>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm bg-red-500/20 dark:bg-red-900/30"></div>
                  <span>Alta correlação (ruim)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm bg-green-500/20 dark:bg-green-900/30"></div>
                  <span>Correlação negativa (boa)</span>
                </div>
              </div>
            </div>
            
            <div className="rounded-md border overflow-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="bg-muted/50 sticky left-0 z-10">Ativo</TableHead>
                    {nomesDosAtivos.map((nome) => (
                      <TableHead key={nome} className="min-w-[100px] text-center">
                        {nome.length > 10 ? `${nome.substring(0, 10)}...` : nome}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nomesDosAtivos.map((nomeAtivo) => (
                    <TableRow key={nomeAtivo}>
                      <TableCell className="font-medium bg-muted/50 sticky left-0">
                        {nomeAtivo.length > 12 ? `${nomeAtivo.substring(0, 12)}...` : nomeAtivo}
                      </TableCell>
                      {nomesDosAtivos.map((nomeColuna) => {
                        const valor = matrizCorrelacao[nomeAtivo]?.[nomeColuna] || 0;
                        return (
                          <TooltipProvider key={`${nomeAtivo}-${nomeColuna}`}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <TableCell 
                                  className={`text-center ${getCorrelationColor(valor)} hover:opacity-80 cursor-help`}
                                >
                                  {valor.toFixed(2)}
                                </TableCell>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Correlação entre {nomeAtivo} e {nomeColuna}</p>
                                <p className="font-semibold">{(valor * 100).toFixed(0)}%</p>
                                {valor > 0.7 && <p className="text-red-500">Diversificação baixa</p>}
                                {valor < -0.3 && <p className="text-green-500">Boa diversificação</p>}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              <p className="flex items-center gap-2">
                <InfoIcon size={16} />
                <span>Recomendações para melhorar a diversificação do portfólio</span>
              </p>
            </div>
            
            {sugestoes.length > 0 ? (
              sugestoes.map((sugestao, index) => (
                <Alert key={index} variant="default" className="border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30">
                  <AlertTitle className="flex items-center gap-2">
                    Sugestão {index + 1}
                  </AlertTitle>
                  <AlertDescription>
                    {sugestao}
                  </AlertDescription>
                </Alert>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">
                Não há sugestões disponíveis para este portfólio.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CorrelationMatrix; 