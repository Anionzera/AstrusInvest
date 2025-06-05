import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

/**
 * Componente para gerenciar o cache da aplicação
 */
const CacheSettings: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [symbol, setSymbol] = useState<string>('');

  // Função para limpar todo o cache
  const handleClearAllCache = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/cache/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        toast.success("Cache limpo com sucesso");
      } else {
        toast.error(result.message || "Erro ao limpar cache");
      }
    } catch (error) {
      console.error("Erro ao limpar cache:", error);
      toast.error("Erro ao limpar cache. Verifique se a API está funcionando.");
    } finally {
      setLoading(false);
    }
  };

  // Função para atualizar dados de um símbolo específico
  const handleRefreshSymbol = async () => {
    if (loading || !symbol.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/cache/refresh/symbol/${symbol.trim()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(`Cache para ${symbol} atualizado com sucesso`);
      } else {
        toast.warning(result.message || `Sem dados em cache para ${symbol}`);
      }
    } catch (error) {
      console.error(`Erro ao atualizar cache para ${symbol}:`, error);
      toast.error(`Erro ao atualizar ${symbol}. Verifique se a API está funcionando.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Gerenciamento de Cache</CardTitle>
        <CardDescription>
          Administre o cache de dados da aplicação para melhorar a performance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-2">Cache Completo</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Limpe todo o cache da aplicação para garantir dados atualizados em todos os endpoints.
            Esta ação fará com que a próxima solicitação de cada endpoint busque dados frescos das APIs externas.
          </p>
          <Button 
            variant="destructive" 
            onClick={handleClearAllCache}
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Limpar Todo o Cache
          </Button>
        </div>
        
        <Separator />
        
        <div>
          <h3 className="text-lg font-medium mb-2">Atualizar Símbolo Específico</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Atualize os dados em cache para um símbolo específico (ex: BTCUSDT, PETR4.SA, ^BVSP).
            Esta ação limpará o cache apenas para o símbolo especificado.
          </p>
          <div className="flex items-center gap-2">
            <Input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="Digite o símbolo (ex: BTCUSDT, PETR4, ^BVSP)"
              className="max-w-md"
              disabled={loading}
            />
            <Button 
              variant="secondary"
              onClick={handleRefreshSymbol}
              disabled={loading || !symbol.trim()}
              className="flex items-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Atualizar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Dica: Use "market-cap" para atualizar os dados de capitalização de mercado.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CacheSettings; 