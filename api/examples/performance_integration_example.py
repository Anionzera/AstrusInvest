"""
Exemplo Prático de Integração: pyfolio-reloaded e empyrical-reloaded
Demonstra o uso completo das bibliotecas para análise avançada de performance
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import requests
import json

from services.performance_analyzer import PerformanceAnalyzer
from portfolio_optimizer import PortfolioOptimizer

def exemplo_analise_completa():
    """
    Exemplo completo de análise de performance usando as bibliotecas integradas
    """
    print("🚀 Exemplo de Integração: pyfolio-reloaded + empyrical-reloaded")
    print("=" * 70)
    
    # === 1. CONFIGURAÇÃO DO PORTFÓLIO ===
    print("\n📊 1. Configurando Portfólio de Teste...")
    
    tickers = ['PETR4.SA', 'VALE3.SA', 'ITUB4.SA', 'BBDC4.SA', 'ABEV3.SA']
    weights = [0.25, 0.25, 0.20, 0.15, 0.15]
    
    print(f"   Ativos: {tickers}")
    print(f"   Pesos: {weights}")
    print(f"   Soma dos pesos: {sum(weights):.2f}")
    
    # === 2. OBTER DADOS HISTÓRICOS ===
    print("\n📈 2. Obtendo Dados Históricos...")
    
    optimizer = PortfolioOptimizer()
    
    # Período de 2 anos
    end_date = datetime.now()
    start_date = end_date - timedelta(days=730)
    
    try:
        optimizer.load_data(
            tickers=tickers,
            start_date=start_date.strftime('%Y-%m-%d'),
            end_date=end_date.strftime('%Y-%m-%d')
        )
        
        print(f"   ✅ Dados carregados para {len(tickers)} ativos")
        print(f"   📅 Período: {start_date.strftime('%Y-%m-%d')} a {end_date.strftime('%Y-%m-%d')}")
        
    except Exception as e:
        print(f"   ❌ Erro ao carregar dados: {e}")
        return
    
    # === 3. ANÁLISE DE PERFORMANCE COMPLETA ===
    print("\n🔍 3. Executando Análise de Performance...")
    
    weights_dict = dict(zip(tickers, weights))
    
    try:
        # Análise usando métodos integrados
        performance_analysis = optimizer.calculate_portfolio_performance_analysis(
            weights=weights_dict,
            benchmark_ticker='^BVSP',
            risk_free_rate=0.0525,  # Selic atual
            analysis_period_months=24
        )
        
        if 'error' in performance_analysis:
            print(f"   ❌ Erro na análise: {performance_analysis['error']}")
            return
        
        print("   ✅ Análise concluída com sucesso!")
        
        # === 4. EXIBIR MÉTRICAS PRINCIPAIS ===
        print("\n📋 4. Métricas de Performance:")
        print("-" * 50)
        
        metrics = performance_analysis.get('portfolio_metrics', {})
        
        if metrics:
            # Métricas de retorno
            print(f"   📈 Retorno Anual: {metrics.get('annual_return', 0):.2%}")
            print(f"   📈 Retorno Cumulativo: {metrics.get('cumulative_return', 0):.2%}")
            print(f"   📊 Volatilidade Anual: {metrics.get('annual_volatility', 0):.2%}")
            
            # Métricas de risco
            print(f"   ⚡ Sharpe Ratio: {metrics.get('sharpe_ratio', 0):.3f}")
            print(f"   📉 Sortino Ratio: {metrics.get('sortino_ratio', 0):.3f}")
            print(f"   🎯 Calmar Ratio: {metrics.get('calmar_ratio', 0):.3f}")
            print(f"   💥 Max Drawdown: {metrics.get('max_drawdown', 0):.2%}")
            
            # Métricas estatísticas
            print(f"   📐 Skewness: {metrics.get('skewness', 0):.3f}")
            print(f"   📏 Kurtosis: {metrics.get('kurtosis', 0):.3f}")
            print(f"   💰 VaR (5%): {metrics.get('value_at_risk', 0):.2%}")
            print(f"   🚨 CVaR (5%): {metrics.get('conditional_value_at_risk', 0):.2%}")
            
            # Métricas vs benchmark se disponível
            if 'alpha' in metrics:
                print(f"\n   📊 Vs. Benchmark (Ibovespa):")
                print(f"   🎯 Alpha: {metrics.get('alpha', 0):.3f}")
                print(f"   📈 Beta: {metrics.get('beta', 0):.3f}")
                print(f"   📉 Tracking Error: {metrics.get('tracking_error', 0):.2%}")
                print(f"   💡 Information Ratio: {metrics.get('information_ratio', 0):.3f}")
        
        # === 5. INFORMAÇÕES DA ANÁLISE ===
        print("\n📋 5. Informações da Análise:")
        print("-" * 50)
        
        analysis_info = performance_analysis.get('analysis_info', {})
        if analysis_info:
            print(f"   📊 Períodos analisados: {analysis_info.get('portfolio_periods', 'N/A')}")
            print(f"   🎯 Benchmark: {analysis_info.get('benchmark_ticker', 'N/A')}")
            print(f"   💰 Taxa livre de risco: {analysis_info.get('risk_free_rate', 0):.2%}")
            print(f"   📅 Data inicial: {analysis_info.get('start_date', 'N/A')}")
            print(f"   📅 Data final: {analysis_info.get('end_date', 'N/A')}")
        
        # === 6. MÉTRICAS ROLLING (se disponível) ===
        rolling_metrics = performance_analysis.get('rolling_metrics')
        if rolling_metrics:
            print(f"\n📈 6. Métricas Rolling (últimas 10 observações):")
            print("-" * 50)
            
            rolling_df = pd.DataFrame(rolling_metrics[-10:])  # Últimas 10 observações
            for _, row in rolling_df.iterrows():
                print(f"   📊 Sharpe: {row.get('sharpe_ratio', 0):.3f} | "
                      f"Vol: {row.get('volatility', 0):.2%} | "
                      f"DD: {row.get('max_drawdown', 0):.2%}")
        
        # === 7. TEARSHEET GERADO ===
        if performance_analysis.get('tearsheet_image'):
            print(f"\n🎨 7. Tearsheet Visual:")
            print(f"   ✅ Tearsheet pyfolio gerado (base64)")
            print(f"   📊 Tamanho: {len(performance_analysis['tearsheet_image'])} caracteres")
        else:
            print(f"\n🎨 7. Tearsheet Visual:")
            print(f"   ⚠️  Tearsheet não gerado")
        
    except Exception as e:
        print(f"   ❌ Erro na análise: {e}")
        return
    
    # === 8. COMPARAÇÃO DE ESTRATÉGIAS ===
    print("\n🔄 8. Comparação de Estratégias...")
    
    strategies = {
        "Conservador": {"PETR4.SA": 0.15, "VALE3.SA": 0.15, "ITUB4.SA": 0.30, "BBDC4.SA": 0.25, "ABEV3.SA": 0.15},
        "Agressivo": {"PETR4.SA": 0.40, "VALE3.SA": 0.35, "ITUB4.SA": 0.10, "BBDC4.SA": 0.10, "ABEV3.SA": 0.05},
        "Balanceado": {"PETR4.SA": 0.25, "VALE3.SA": 0.25, "ITUB4.SA": 0.20, "BBDC4.SA": 0.15, "ABEV3.SA": 0.15}
    }
    
    try:
        comparison = optimizer.compare_portfolio_strategies(
            strategies=strategies,
            benchmark_ticker='^BVSP',
            risk_free_rate=0.0525
        )
        
        if 'error' not in comparison:
            print("   ✅ Comparação concluída!")
            
            # Exibir tabela comparativa
            comparative_table = comparison.get('comparative_table', {})
            if comparative_table:
                print("\n   📊 Tabela Comparativa:")
                print("   " + "-" * 60)
                
                # Headers
                print(f"   {'Estratégia':<15} {'Retorno':<10} {'Vol':<8} {'Sharpe':<8} {'DD':<10}")
                print("   " + "-" * 60)
                
                # Dados
                for strategy, metrics in comparative_table.items():
                    ret = metrics.get('annual_return', 0)
                    vol = metrics.get('annual_volatility', 0)
                    sharpe = metrics.get('sharpe_ratio', 0)
                    dd = metrics.get('max_drawdown', 0)
                    
                    print(f"   {strategy:<15} {ret:<10.2%} {vol:<8.2%} {sharpe:<8.3f} {dd:<10.2%}")
            
            # Melhor estratégia por critério
            best_strategy = comparison.get('best_strategy', {})
            if best_strategy:
                print(f"\n   🏆 Melhores Estratégias:")
                print(f"   📈 Por Sharpe: {best_strategy.get('by_sharpe', 'N/A')}")
                print(f"   💰 Por Retorno: {best_strategy.get('by_return', 'N/A')}")
                print(f"   🛡️  Por Menor Risco: {best_strategy.get('by_risk', 'N/A')}")
        
        else:
            print(f"   ❌ Erro na comparação: {comparison['error']}")
    
    except Exception as e:
        print(f"   ❌ Erro na comparação: {e}")
    
    print("\n✨ Análise Concluída!")
    print("=" * 70)

def exemplo_api_endpoints():
    """
    Exemplo de uso dos endpoints da API
    """
    print("\n🌐 Exemplo de Uso dos Endpoints da API")
    print("=" * 70)
    
    base_url = "http://localhost:5000"
    
    # === 1. TESTE DE SAÚDE ===
    print("\n🏥 1. Teste de Saúde do Serviço...")
    
    try:
        response = requests.get(f"{base_url}/api/performance/health")
        if response.status_code == 200:
            health_data = response.json()
            print(f"   ✅ Serviço saudável!")
            print(f"   📚 pyfolio versão: {health_data.get('libraries', {}).get('pyfolio_version', 'N/A')}")
        else:
            print(f"   ❌ Serviço indisponível: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Erro na conexão: {e}")
        return
    
    # === 2. ANÁLISE DE PORTFÓLIO ===
    print("\n📊 2. Análise de Portfólio via API...")
    
    payload = {
        "tickers": ["PETR4.SA", "VALE3.SA", "ITUB4.SA"],
        "weights": [0.4, 0.3, 0.3],
        "period_months": 12,
        "benchmark": "^BVSP",
        "risk_free_rate": 0.0525,
        "include_tearsheet": False  # Para acelerar o exemplo
    }
    
    try:
        response = requests.post(
            f"{base_url}/api/performance/analyze",
            json=payload,
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            result = response.json()
            
            if result.get('success'):
                print("   ✅ Análise via API concluída!")
                
                metrics = result.get('data', {}).get('portfolio_metrics', {})
                if metrics:
                    print(f"   📈 Retorno Anual: {metrics.get('annual_return', 0):.2%}")
                    print(f"   ⚡ Sharpe Ratio: {metrics.get('sharpe_ratio', 0):.3f}")
                    print(f"   💥 Max Drawdown: {metrics.get('max_drawdown', 0):.2%}")
            else:
                print(f"   ❌ Erro na análise: {result}")
        else:
            print(f"   ❌ Erro HTTP: {response.status_code}")
            print(f"   Resposta: {response.text}")
    
    except Exception as e:
        print(f"   ❌ Erro na requisição: {e}")
    
    print("\n✨ Teste da API Concluído!")

def main():
    """
    Função principal que executa todos os exemplos
    """
    print("🎯 EXEMPLOS DE INTEGRAÇÃO: pyfolio-reloaded + empyrical-reloaded")
    print("🚀 Sistema Astrus Valuation - Análise Avançada de Performance")
    print("=" * 80)
    
    # Executar exemplo completo
    exemplo_analise_completa()
    
    # Exemplo de uso da API (comentado para não depender do servidor)
    # exemplo_api_endpoints()
    
    print("\n🎉 Todos os exemplos foram executados!")
    print("📚 Para mais informações, consulte a documentação das bibliotecas:")
    print("   📖 pyfolio-reloaded: https://pyfolio.ml4trading.io/")
    print("   📖 empyrical-reloaded: https://github.com/stefan-jansen/empyrical-reloaded")

if __name__ == "__main__":
    main() 