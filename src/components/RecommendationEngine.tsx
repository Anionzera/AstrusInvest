import React, { useEffect, useState } from 'react';
import { getMarketConditionsForRecommendation } from '../lib/macroeconomicService';
import { marketDataCache } from '../lib/marketDataCache';
import { generateRecommendations } from '../lib/recommendationAlgorithm';
import AssetAllocation from './AssetAllocation';
import LoadingIndicator from './common/LoadingIndicator';
import ErrorMessage from './common/ErrorMessage';

export interface Recommendation {
  assetClass: string;
  allocation: number;
  direction: 'increase' | 'decrease' | 'maintain';
  reasoning: string;
}

const RecommendationEngine: React.FC = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [marketConditions, setMarketConditions] = useState<any>(null);

  useEffect(() => {
    async function loadRecommendations() {
      setLoading(true);
      setError(null);
      
      try {
        // Obter condições de mercado atualizadas usando dados reais
        const conditions = await getMarketConditionsForRecommendation();
        setMarketConditions(conditions);
        
        // Registrar como observador para atualizações do cache de mercado
        marketDataCache.watchMarketData(handleMarketDataUpdate);
        
        // Gerar recomendações com base nas condições de mercado
        const recommendationResults = generateRecommendations(conditions);
        setRecommendations(recommendationResults);
        setLastUpdated(new Date());
      } catch (err) {
        console.error('Erro ao carregar recomendações:', err);
        setError('Não foi possível carregar as recomendações. Por favor, tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    }
    
    loadRecommendations();
    
    // Limpeza quando o componente for desmontado
    return () => {
      // Remover observador do cache de mercado
      marketDataCache.unwatchMarketData(handleMarketDataUpdate);
    };
  }, []);
  
  // Função para lidar com atualizações do cache de mercado
  const handleMarketDataUpdate = async (marketData: any) => {
    try {
      // Atualizar condições de mercado com novos dados
      const conditions = await getMarketConditionsForRecommendation();
      setMarketConditions(conditions);
      
      // Gerar novas recomendações
      const recommendationResults = generateRecommendations(conditions);
      setRecommendations(recommendationResults);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Erro ao atualizar recomendações:', err);
      // Não definimos erro aqui para não interromper a exibição de dados anteriores
    }
  };
  
  // Força uma atualização manual dos dados
  const refreshData = async () => {
    setLoading(true);
    try {
      // Forçar atualização do cache de dados
      await marketDataCache.forceRefresh();
      
      // Obter condições atualizadas
      const conditions = await getMarketConditionsForRecommendation();
      setMarketConditions(conditions);
      
      // Gerar novas recomendações
      const recommendationResults = generateRecommendations(conditions);
      setRecommendations(recommendationResults);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Erro ao atualizar dados:', err);
      setError('Falha ao atualizar os dados. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="recommendation-engine">
      <div className="recommendation-header">
        <h2>Recomendações de Alocação</h2>
        <div className="recommendation-controls">
          <button 
            onClick={refreshData} 
            disabled={loading}
            className="refresh-button"
          >
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
          {lastUpdated && (
            <span className="last-updated">
              Última atualização: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>
      
      {loading && <LoadingIndicator message="Carregando recomendações..." />}
      
      {error && <ErrorMessage message={error} />}
      
      {!loading && !error && (
        <>
          <div className="market-conditions-summary">
            <h3>Condições de Mercado</h3>
            {marketConditions && (
              <div className="conditions-grid">
                <div className="condition-item">
                  <span className="label">Taxa Selic:</span>
                  <span className="value">{marketConditions.interestRates.selic}%</span>
                </div>
                <div className="condition-item">
                  <span className="label">Inflação (IPCA):</span>
                  <span className="value">{marketConditions.inflation.current}%</span>
                </div>
                <div className="condition-item">
                  <span className="label">Câmbio (USD/BRL):</span>
                  <span className="value">R$ {marketConditions.currency.exchangeRate.toFixed(2)}</span>
                </div>
                <div className="condition-item">
                  <span className="label">PIB (último trimestre):</span>
                  <span className="value">{marketConditions.economicGrowth.gdpCurrentQuarter}%</span>
                </div>
                <div className="condition-item">
                  <span className="label">PIB (previsão anual):</span>
                  <span className="value">{marketConditions.economicGrowth.gdpForecast}%</span>
                </div>
                <div className="condition-item">
                  <span className="label">Volatilidade:</span>
                  <span className="value">{marketConditions.marketIndicators.volatilityIndex.toFixed(1)}</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="recommendations-container">
            <h3>Alocação Recomendada</h3>
            <AssetAllocation recommendations={recommendations} />
          </div>
          
          <div className="recommendation-details">
            <h3>Detalhes das Recomendações</h3>
            <div className="recommendation-list">
              {recommendations.map((rec, index) => (
                <div key={index} className="recommendation-item">
                  <h4>
                    {rec.assetClass}
                    {rec.direction === 'increase' && <span className="direction increase">↑</span>}
                    {rec.direction === 'decrease' && <span className="direction decrease">↓</span>}
                    {rec.direction === 'maintain' && <span className="direction maintain">→</span>}
                  </h4>
                  <div className="allocation">Alocação: {rec.allocation}%</div>
                  <p className="reasoning">{rec.reasoning}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RecommendationEngine; 