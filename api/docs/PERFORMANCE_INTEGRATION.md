# 📊 Integração Pyfolio-Reloaded e Empyrical-Reloaded

## 🎯 Visão Geral

Este documento descreve a integração completa e profissional das bibliotecas **pyfolio-reloaded** e **empyrical-reloaded** no sistema Astrus Valuation. Essas bibliotecas fornecem análises avançadas de performance e risco para portfólios financeiros.

## 📚 Bibliotecas Integradas

### Pyfolio-Reloaded v0.9.8
- **Funcionalidade**: Análise visual e quantitativa de performance de portfólios
- **Recursos**: Tearsheets visuais, análise de drawdown, comparação com benchmark
- **Documentação**: https://pyfolio.ml4trading.io/

### Empyrical-Reloaded v0.5.11
- **Funcionalidade**: Cálculos de métricas de risco e performance
- **Recursos**: Sharpe ratio, alpha, beta, VaR, métricas rolling
- **Repositório**: https://github.com/stefan-jansen/empyrical-reloaded

## 🏗️ Arquitetura da Integração

### Componentes Principais

```
api/
├── services/
│   └── performance_analyzer.py     # Serviço principal de análise
├── routes/
│   └── performance_routes.py       # Endpoints da API
├── portfolio_optimizer.py          # Integração com otimizador
├── examples/
│   └── performance_integration_example.py  # Exemplos práticos
└── docs/
    └── PERFORMANCE_INTEGRATION.md  # Esta documentação
```

## 🔧 Serviço Principal: PerformanceAnalyzer

### Classe PerformanceAnalyzer

A classe `PerformanceAnalyzer` é o coração da integração, fornecendo uma interface unificada para ambas as bibliotecas.

#### Métodos Principais

```python
from services.performance_analyzer import PerformanceAnalyzer

# Inicializar analisador
analyzer = PerformanceAnalyzer()

# Configurar dados do portfólio
analyzer.set_portfolio_data(
    returns=portfolio_returns,          # pd.Series
    benchmark_returns=benchmark_returns, # pd.Series (opcional)
    positions=positions,                # pd.DataFrame (opcional)
    transactions=transactions           # pd.DataFrame (opcional)
)

# Calcular métricas completas
metrics = analyzer.calculate_performance_metrics(
    risk_free_rate=0.0525  # Taxa Selic atual
)

# Gerar tearsheet visual
tearsheet_base64 = analyzer.generate_pyfolio_tearsheet(return_fig=True)

# Calcular métricas rolling
rolling_metrics = analyzer.calculate_rolling_metrics(
    window=252,  # 1 ano
    metrics=['sharpe_ratio', 'volatility', 'max_drawdown']
)
```

### Métricas Disponíveis

#### 📈 Métricas de Retorno
- `annual_return`: Retorno anualizado
- `cumulative_return`: Retorno cumulativo total
- `annual_volatility`: Volatilidade anualizada

#### ⚡ Métricas de Risco-Retorno
- `sharpe_ratio`: Índice de Sharpe
- `sortino_ratio`: Índice de Sortino (risco downside)
- `calmar_ratio`: Índice de Calmar
- `omega_ratio`: Índice Omega

#### 📉 Métricas de Drawdown
- `max_drawdown`: Maior queda histórica
- `avg_drawdown`: Drawdown médio
- `avg_drawdown_days`: Duração média de drawdown
- `max_drawdown_days`: Maior duração de drawdown

#### 📊 Métricas Estatísticas
- `skewness`: Assimetria da distribuição
- `kurtosis`: Curtose da distribuição
- `tail_ratio`: Relação entre caudas
- `common_sense_ratio`: Índice de senso comum

#### 🎯 Métricas de Risco
- `downside_risk`: Risco downside
- `value_at_risk`: Valor em Risco (VaR)
- `conditional_value_at_risk`: VaR Condicional (CVaR)
- `stability_of_timeseries`: Estabilidade da série temporal

#### 📊 Métricas vs. Benchmark (quando disponível)
- `alpha`: Alpha de Jensen
- `beta`: Beta do portfólio
- `tracking_error`: Erro de rastreamento
- `information_ratio`: Índice de informação
- `up_capture`: Captura de alta
- `down_capture`: Captura de baixa

## 🔗 Integração com Portfolio Optimizer

### Métodos Adicionados ao PortfolioOptimizer

```python
from portfolio_optimizer import PortfolioOptimizer

optimizer = PortfolioOptimizer()

# Carregar dados históricos
optimizer.load_data(
    tickers=['PETR4.SA', 'VALE3.SA', 'ITUB4.SA'],
    start_date='2022-01-01',
    end_date='2024-01-01'
)

# Análise completa de performance
weights = {'PETR4.SA': 0.4, 'VALE3.SA': 0.3, 'ITUB4.SA': 0.3}

performance_analysis = optimizer.calculate_portfolio_performance_analysis(
    weights=weights,
    benchmark_ticker='^BVSP',
    risk_free_rate=0.0525,
    analysis_period_months=12
)

# Comparar múltiplas estratégias
strategies = {
    "Conservador": {"PETR4.SA": 0.2, "VALE3.SA": 0.3, "ITUB4.SA": 0.5},
    "Agressivo": {"PETR4.SA": 0.6, "VALE3.SA": 0.3, "ITUB4.SA": 0.1},
}

comparison = optimizer.compare_portfolio_strategies(
    strategies=strategies,
    benchmark_ticker='^BVSP',
    risk_free_rate=0.0525
)
```

## 🌐 Endpoints da API

### Base URL: `/api/performance`

#### 1. Análise de Portfólio
```http
POST /api/performance/analyze
Content-Type: application/json

{
    "tickers": ["PETR4.SA", "VALE3.SA", "ITUB4.SA"],
    "weights": [0.4, 0.3, 0.3],
    "period_months": 12,
    "benchmark": "^BVSP",
    "risk_free_rate": 0.0525,
    "include_tearsheet": true
}
```

**Resposta:**
```json
{
    "success": true,
    "data": {
        "portfolio_metrics": {
            "annual_return": 0.1250,
            "annual_volatility": 0.2100,
            "sharpe_ratio": 0.5952,
            "max_drawdown": -0.1520,
            "alpha": 0.0230,
            "beta": 1.0500,
            "..."
        },
        "tearsheet_image": "data:image/png;base64,iVBORw0KGgoA...",
        "rolling_metrics": [...],
        "analysis_info": {
            "portfolio_periods": 252,
            "benchmark_ticker": "^BVSP",
            "risk_free_rate": 0.0525
        }
    }
}
```

#### 2. Comparação de Estratégias
```http
POST /api/performance/compare-strategies
Content-Type: application/json

{
    "strategies": {
        "Conservador": {"PETR4.SA": 0.2, "VALE3.SA": 0.3, "ITUB4.SA": 0.5},
        "Agressivo": {"PETR4.SA": 0.6, "VALE3.SA": 0.3, "ITUB4.SA": 0.1}
    },
    "period_months": 12,
    "benchmark": "^BVSP",
    "risk_free_rate": 0.0525
}
```

#### 3. Métricas Avançadas
```http
POST /api/performance/metrics
Content-Type: application/json

{
    "returns": [0.01, -0.02, 0.03, 0.01, -0.01],
    "benchmark_returns": [0.008, -0.015, 0.025, 0.012, -0.008],
    "risk_free_rate": 0.0525
}
```

#### 4. Tearsheet Visual
```http
POST /api/performance/tearsheet
Content-Type: application/json

{
    "returns": [0.01, -0.02, 0.03, 0.01, -0.01],
    "benchmark_returns": [0.008, -0.015, 0.025, 0.012, -0.008],
    "hide_positions": true
}
```

#### 5. Métricas Rolling
```http
POST /api/performance/rolling-metrics
Content-Type: application/json

{
    "returns": [lista de retornos],
    "window": 252,
    "metrics": ["sharpe_ratio", "volatility", "max_drawdown"]
}
```

#### 6. Health Check
```http
GET /api/performance/health
```

## 📝 Exemplo Prático

### Uso Básico
```python
# Exemplo básico de uso
from services.performance_analyzer import PerformanceAnalyzer
import pandas as pd
import numpy as np

# Simular retornos de portfólio
dates = pd.date_range('2023-01-01', periods=252, freq='D')
returns = pd.Series(np.random.normal(0.0008, 0.015, 252), index=dates)

# Criar analisador
analyzer = PerformanceAnalyzer()
analyzer.set_portfolio_data(returns=returns)

# Calcular métricas
metrics = analyzer.calculate_performance_metrics(risk_free_rate=0.0525)

print(f"Sharpe Ratio: {metrics['sharpe_ratio']:.3f}")
print(f"Retorno Anual: {metrics['annual_return']:.2%}")
print(f"Volatilidade: {metrics['annual_volatility']:.2%}")
print(f"Max Drawdown: {metrics['max_drawdown']:.2%}")
```

### Exemplo Completo com Benchmark
```python
# Exemplo com benchmark
import yfinance as yf

# Obter dados do Ibovespa como benchmark
ibov = yf.download('^BVSP', start='2023-01-01', end='2024-01-01')
benchmark_returns = ibov['Close'].pct_change().dropna()

# Configurar analisador com benchmark
analyzer = PerformanceAnalyzer()
analyzer.set_portfolio_data(
    returns=returns,
    benchmark_returns=benchmark_returns
)

# Calcular métricas com benchmark
metrics = analyzer.calculate_performance_metrics(risk_free_rate=0.0525)

print(f"Alpha: {metrics['alpha']:.4f}")
print(f"Beta: {metrics['beta']:.3f}")
print(f"Information Ratio: {metrics['information_ratio']:.3f}")
print(f"Tracking Error: {metrics['tracking_error']:.2%}")
```

## 🎨 Tearsheets Visuais

### Tipos de Tearsheet

1. **Simple Tearsheet**: Análise básica apenas com retornos
2. **Full Tearsheet**: Análise completa com posições e transações

### Configurações Disponíveis
- Retorno como imagem base64
- Ocultar análise de posições
- Configurar benchmark
- Definir cone de volatilidade

## 🔄 Métricas Rolling

### Janelas Disponíveis
- **Diária**: window=22 (~1 mês)
- **Mensal**: window=63 (~3 meses)
- **Trimestral**: window=126 (~6 meses)
- **Anual**: window=252 (~1 ano)

### Métricas Rolling Suportadas
- Sharpe Ratio
- Volatilidade
- Maximum Drawdown
- Sortino Ratio
- Calmar Ratio

## ⚙️ Configurações e Personalização

### Taxa Livre de Risco
```python
# Configurações regionais
RISK_FREE_RATES = {
    'BR': 0.0525,    # Selic Brasil
    'US': 0.0325,    # Fed Rate EUA
    'EU': 0.0000,    # ECB Rate Europa
}
```

### Benchmarks Padrão
```python
BENCHMARKS = {
    'brazilian_stocks': '^BVSP',      # Ibovespa
    'small_caps': '^SMLL',            # Small Caps
    'real_estate': '^IFIX',           # FII Index
    'us_stocks': '^GSPC',             # S&P 500
    'emerging_markets': 'EEM',        # Emerging Markets ETF
}
```

## 🚀 Performance e Otimização

### Cache e Performance
- Cache de resultados para análises repetitivas
- Cálculos assíncronos para tearsheets
- Otimização de memória para grandes séries temporais

### Tratamento de Erros
- Validação robusta de dados de entrada
- Fallbacks para dados faltantes
- Log detalhado de erros e warnings

## 📊 Casos de Uso

### 1. Análise de Performance Individual
```python
# Analisar performance de um portfólio específico
analyzer = PerformanceAnalyzer()
analyzer.set_portfolio_data(returns=portfolio_returns)
metrics = analyzer.calculate_performance_metrics()
```

### 2. Comparação de Estratégias
```python
# Comparar múltiplas estratégias de investimento
strategies = {
    "Growth": growth_weights,
    "Value": value_weights,
    "Momentum": momentum_weights
}
comparison = optimizer.compare_portfolio_strategies(strategies)
```

### 3. Análise Rolling
```python
# Analisar evolução temporal das métricas
rolling_df = analyzer.calculate_rolling_metrics(window=252)
# Visualizar tendências e padrões
```

### 4. Tearsheet Profissional
```python
# Gerar relatório visual completo
tearsheet = analyzer.generate_pyfolio_tearsheet(return_fig=True)
# Usar em apresentações e relatórios
```

## 🔧 Desenvolvimento e Extensões

### Adicionando Novas Métricas
```python
# Exemplo de extensão personalizada
class CustomPerformanceAnalyzer(PerformanceAnalyzer):
    def calculate_custom_metric(self, returns):
        # Implementar métrica personalizada
        return custom_calculation(returns)
```

### Integrando Novos Benchmarks
```python
# Adicionar novos benchmarks
def add_custom_benchmark(self, benchmark_name, benchmark_data):
    self.custom_benchmarks[benchmark_name] = benchmark_data
```

## 📈 Monitoramento e Logs

### Logging Estruturado
```python
import logging

logger = logging.getLogger('performance_analyzer')
logger.info(f"Métricas calculadas para {len(returns)} períodos")
logger.warning(f"Dados faltantes detectados: {missing_count}")
```

### Métricas de Sistema
- Tempo de execução de análises
- Uso de memória
- Cache hit/miss ratios
- Erros por tipo de análise

## 🎯 Próximos Passos

### Funcionalidades Planejadas
1. **Análise de Fatores Fama-French**
2. **Backtesting Integrado**
3. **Machine Learning para Previsão de Métricas**
4. **Dashboard Interativo**
5. **Alertas de Performance**

### Melhorias Técnicas
1. **Processamento Paralelo**
2. **Suporte a Streaming Data**
3. **Integração com Bases de Dados**
4. **API Rate Limiting**
5. **Caching Distribuído**

## 📚 Referências

- [Pyfolio-Reloaded Documentation](https://pyfolio.ml4trading.io/)
- [Empyrical-Reloaded GitHub](https://github.com/stefan-jansen/empyrical-reloaded)
- [Portfolio Performance Analysis](https://en.wikipedia.org/wiki/Modern_portfolio_theory)
- [Risk-Adjusted Returns](https://www.investopedia.com/terms/r/riskadjustedreturn.asp)

---

**Desenvolvido para o Sistema Astrus Valuation** 🚀  
*Análise profissional de performance com as melhores práticas da indústria* 