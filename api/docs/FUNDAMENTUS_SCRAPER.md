# 📊 Webscraper do Fundamentus - Documentação Completa

## 🎯 Visão Geral

O **Fundamentus Scraper** é uma solução completa para extrair dados fundamentalistas de ações brasileiras diretamente do site [Fundamentus.com.br](https://www.fundamentus.com.br). Esta implementação oferece tanto acesso direto via Python quanto uma API REST completa para integração com aplicações web.

### 🚀 Características Principais

- ✅ **Extração Completa**: Todos os indicadores fundamentalistas disponíveis
- ✅ **API REST**: Endpoints organizados e documentados
- ✅ **Análise Setorial**: Estatísticas por setor de atuação
- ✅ **Busca por Critérios**: Filtros avançados para screening de ações
- ✅ **Comparação de Ações**: Análise comparativa entre múltiplas empresas
- ✅ **Rankings**: Classificação por indicadores específicos
- ✅ **Cache Inteligente**: Otimização de performance
- ✅ **Tratamento de Erros**: Robustez e confiabilidade
- ✅ **Logs Detalhados**: Monitoramento e debugging

## 📋 Dados Extraídos

### 📈 Informações Básicas
- **Papel**: Código da ação
- **Tipo**: Tipo de papel (PN, ON, etc.)
- **Empresa**: Nome da empresa
- **Setor**: Setor de atuação
- **Subsetor**: Subsetor específico

### 💰 Cotação e Mercado
- **Cotação**: Preço atual da ação
- **Data da Última Cotação**: Data da última atualização
- **Mínima 52 semanas**: Menor preço em 52 semanas
- **Máxima 52 semanas**: Maior preço em 52 semanas
- **Volume Médio (2m)**: Volume médio de negociação
- **Valor de Mercado**: Capitalização de mercado
- **Valor da Firma**: Enterprise Value
- **Número de Ações**: Quantidade de ações em circulação

### 📊 Oscilações
- **Dia**: Variação no dia (%)
- **Mês**: Variação no mês (%)
- **30 dias**: Variação em 30 dias (%)
- **12 meses**: Variação em 12 meses (%)
- **Anos anteriores**: Variação anual (2020-2025)

### 🔍 Indicadores Fundamentalistas
- **P/L**: Preço/Lucro
- **P/VP**: Preço/Valor Patrimonial
- **P/EBIT**: Preço/EBIT
- **PSR**: Price-to-Sales Ratio
- **P/Ativos**: Preço/Ativos
- **P/Cap. Giro**: Preço/Capital de Giro
- **P/Ativ Circ Liq**: Preço/Ativo Circulante Líquido
- **Div. Yield**: Dividend Yield (%)
- **EV/EBITDA**: Enterprise Value/EBITDA
- **EV/EBIT**: Enterprise Value/EBIT
- **Cres. Rec (5a)**: Crescimento da Receita em 5 anos (%)

### 💼 Indicadores de Eficiência
- **LPA**: Lucro Por Ação
- **VPA**: Valor Patrimonial por Ação
- **Marg. Bruta**: Margem Bruta (%)
- **Marg. EBIT**: Margem EBIT (%)
- **Marg. Líquida**: Margem Líquida (%)
- **EBIT/Ativo**: EBIT sobre Ativo (%)
- **ROIC**: Return on Invested Capital (%)
- **ROE**: Return on Equity (%)
- **Liquidez Corr**: Liquidez Corrente
- **Div Br/Patrim**: Dívida Bruta sobre Patrimônio
- **Giro Ativos**: Giro dos Ativos

### 🏦 Balanço Patrimonial
- **Ativo**: Ativo Total
- **Disponibilidades**: Caixa e Equivalentes
- **Ativo Circulante**: Ativo Circulante
- **Dívida Bruta**: Dívida Bruta Total
- **Dívida Líquida**: Dívida Líquida
- **Patrimônio Líquido**: Patrimônio Líquido

### 📈 Demonstrativos de Resultados
#### Últimos 12 Meses
- **Receita Líquida**: Receita Líquida
- **EBIT**: Earnings Before Interest and Taxes
- **Lucro Líquido**: Lucro Líquido

#### Últimos 3 Meses
- **Receita Líquida (3m)**: Receita Líquida Trimestral
- **EBIT (3m)**: EBIT Trimestral
- **Lucro Líquido (3m)**: Lucro Líquido Trimestral

## 🛠️ Instalação e Configuração

### 📦 Dependências

```bash
pip install beautifulsoup4==4.12.3
pip install lxml==5.1.0
pip install html5lib==1.1
pip install pandas==2.2.3
pip install requests==2.31.0
pip install flask==2.3.3
pip install flask-cors==5.0.1
```

### 🔧 Configuração

1. **Instalar dependências**:
```bash
cd api
pip install -r requirements.txt
```

2. **Iniciar o servidor**:
```bash
python app.py
```

3. **Verificar funcionamento**:
```bash
curl http://localhost:5000/api/fundamentus/health
```

## 🔌 API REST - Endpoints

### 🏥 Health Check

**GET** `/api/fundamentus/health`

Verifica se o serviço está funcionando.

```bash
curl http://localhost:5000/api/fundamentus/health
```

**Resposta**:
```json
{
  "status": "healthy",
  "message": "Serviço do Fundamentus está funcionando normalmente",
  "timestamp": "2025-01-27T10:30:00",
  "service": "Fundamentus Scraper"
}
```

### 📊 Dados de Ação Específica

**GET** `/api/fundamentus/stock/{symbol}`

Obtém dados fundamentalistas completos de uma ação.

```bash
curl http://localhost:5000/api/fundamentus/stock/PETR4
```

**Resposta**:
```json
{
  "success": true,
  "symbol": "PETR4",
  "timestamp": "2025-01-27T10:30:00",
  "source": "Fundamentus",
  "data": {
    "papel": "PETR4",
    "tipo": "PN",
    "empresa": "PETROBRAS PN",
    "setor": "Petróleo, Gás e Biocombustíveis",
    "subsetor": "Exploração, Refino e Distribuição",
    "cotacao": 31.40,
    "data_ult_cot": "2025-01-23",
    "min_52_sem": 29.66,
    "max_52_sem": 37.60,
    "vol_med_2m": 1488160000,
    "valor_mercado": 404706000000,
    "valor_firma": 730982000000,
    "ult_balanco": "2025-03-31",
    "nro_acoes": 12888700000,
    "oscilacoes": {
      "dia": 0.22,
      "mes": 2.76,
      "dias_30": 1.66,
      "meses_12": -5.01,
      "ano_2025": -11.16,
      "ano_2024": 18.02,
      "ano_2023": 84.43,
      "ano_2022": 46.00,
      "ano_2021": 22.76,
      "ano_2020": -7.68
    },
    "indicadores_fundamentalistas": {
      "pl": 8.41,
      "pvp": 1.02,
      "pebit": 1.92,
      "psr": 0.82,
      "p_ativos": 0.35,
      "p_cap_giro": -8.26,
      "p_ativ_circ_liq": 18.3,
      "div_yield": 3.73,
      "ev_ebitda": 2.61,
      "ev_ebit": 3.48,
      "cres_rec_5a": 11.5,
      "lpa": 3.73,
      "vpa": 30.71,
      "marg_bruta": 49.7,
      "marg_ebit": 42.4,
      "marg_liquida": 9.8,
      "ebit_ativo": 18.3,
      "roic": 19.6,
      "roe": 12.2,
      "liquidez_corr": 0.72,
      "div_br_patrim": 0.94,
      "giro_ativos": 0.43
    },
    "dados_balanco_patrimonial": {
      "ativo": 1147720000000,
      "disponibilidades": 44038000000,
      "ativo_circulante": 124853000000,
      "div_bruta": 370314000000,
      "div_liquida": 326276000000,
      "patrim_liq": 395841000000
    },
    "dados_demonstrativos_resultados": {
      "ultimos_12_meses": {
        "receita_liquida": 496252000000,
        "ebit": 210259000000,
        "lucro_liquido": 48115000000
      },
      "ultimos_3_meses": {
        "receita_liquida": 123144000000,
        "ebit": 51741000000,
        "lucro_liquido": 35209000000
      }
    }
  }
}
```

### 📊 Múltiplas Ações

**POST** `/api/fundamentus/stocks/multiple`

Obtém dados de múltiplas ações em uma única requisição.

```bash
curl -X POST http://localhost:5000/api/fundamentus/stocks/multiple \
  -H "Content-Type: application/json" \
  -d '{
    "symbols": ["PETR4", "VALE3", "ITUB4"],
    "delay": 1.0
  }'
```

**Resposta**:
```json
{
  "success": true,
  "timestamp": "2025-01-27T10:30:00",
  "source": "Fundamentus",
  "summary": {
    "total_requested": 3,
    "successful": 3,
    "failed": 0,
    "success_rate": "100.0%"
  },
  "data": {
    "PETR4": { /* dados completos */ },
    "VALE3": { /* dados completos */ },
    "ITUB4": { /* dados completos */ }
  }
}
```

### 📋 Todas as Ações

**GET** `/api/fundamentus/stocks/all`

Obtém resumo de todas as ações disponíveis.

```bash
curl http://localhost:5000/api/fundamentus/stocks/all
```

**Parâmetros**:
- `format`: `json` ou `csv` (padrão: json)

```bash
# Baixar como CSV
curl "http://localhost:5000/api/fundamentus/stocks/all?format=csv" -o fundamentus_all.csv
```

### 🔍 Busca por Critérios

**POST** `/api/fundamentus/stocks/search`

Busca ações que atendem a critérios específicos.

```bash
curl -X POST http://localhost:5000/api/fundamentus/stocks/search \
  -H "Content-Type: application/json" \
  -d '{
    "criteria": {
      "pl_max": 15,
      "roe_min": 15,
      "div_yield_min": 5,
      "pvp_max": 2,
      "roic_min": 10,
      "marg_liquida_min": 5,
      "ev_ebit_max": 10,
      "liquidez_min": 1000000
    }
  }'
```

**Critérios Disponíveis**:
- `pl_max/pl_min`: P/L máximo/mínimo
- `pvp_max/pvp_min`: P/VP máximo/mínimo
- `roe_max/roe_min`: ROE máximo/mínimo
- `roic_max/roic_min`: ROIC máximo/mínimo
- `div_yield_max/div_yield_min`: Dividend Yield máximo/mínimo
- `marg_liquida_max/marg_liquida_min`: Margem Líquida máxima/mínima
- `ev_ebit_max/ev_ebit_min`: EV/EBIT máximo/mínimo
- `liquidez_min`: Liquidez mínima

**Resposta**:
```json
{
  "success": true,
  "timestamp": "2025-01-27T10:30:00",
  "source": "Fundamentus",
  "criteria": { /* critérios utilizados */ },
  "total_matches": 25,
  "stocks": ["PETR4", "VALE3", "ITUB4", "..."]
}
```

### 🏭 Análise Setorial

**GET** `/api/fundamentus/analysis/sector`

Análise estatística por setor.

```bash
# Análise geral
curl http://localhost:5000/api/fundamentus/analysis/sector

# Análise de setor específico
curl "http://localhost:5000/api/fundamentus/analysis/sector?sector=Bancos"
```

**Resposta**:
```json
{
  "success": true,
  "timestamp": "2025-01-27T10:30:00",
  "source": "Fundamentus",
  "sector": "Todos os setores",
  "analysis": {
    "total_empresas": 450,
    "setores": {
      "Bancos": 25,
      "Petróleo, Gás e Biocombustíveis": 15,
      "Mineração": 12
    },
    "estatisticas": {
      "P/L": {
        "media": 12.5,
        "mediana": 10.2,
        "min": 2.1,
        "max": 45.8,
        "std": 8.3
      }
    }
  }
}
```

### 🏆 Rankings

**GET** `/api/fundamentus/stocks/ranking`

Ranking de ações por indicador específico.

```bash
curl "http://localhost:5000/api/fundamentus/stocks/ranking?indicator=roe&order=desc&limit=10"
```

**Parâmetros**:
- `indicator`: `pl`, `pvp`, `roe`, `roic`, `div_yield`, `marg_liquida`, `ev_ebit`, `liquidez`
- `order`: `asc`, `desc`, `auto` (padrão: auto)
- `limit`: Número máximo de resultados (padrão: 50, máximo: 200)

**Resposta**:
```json
{
  "success": true,
  "timestamp": "2025-01-27T10:30:00",
  "source": "Fundamentus",
  "ranking": {
    "indicator": "roe",
    "indicator_name": "ROE",
    "order": "desc",
    "total_results": 10,
    "data": [
      {
        "rank": 1,
        "papel": "PETR4",
        "empresa": "PETROBRAS PN",
        "setor": "Petróleo, Gás e Biocombustíveis",
        "valor_indicador": 25.8,
        "cotacao": 31.40
      }
    ]
  }
}
```

### ⚖️ Comparação de Ações

**POST** `/api/fundamentus/stocks/compare`

Compara indicadores entre múltiplas ações.

```bash
curl -X POST http://localhost:5000/api/fundamentus/stocks/compare \
  -H "Content-Type: application/json" \
  -d '{
    "symbols": ["PETR4", "VALE3", "ITUB4"],
    "indicators": ["pl", "roe", "roic", "div_yield"]
  }'
```

**Resposta**:
```json
{
  "success": true,
  "timestamp": "2025-01-27T10:30:00",
  "source": "Fundamentus",
  "comparison": {
    "symbols": ["PETR4", "VALE3", "ITUB4"],
    "indicators": ["pl", "roe", "roic", "div_yield"],
    "data": { /* dados completos de cada ação */ },
    "comparison_table": [
      {
        "indicator": "pl",
        "values": {
          "PETR4": 8.41,
          "VALE3": 12.5,
          "ITUB4": 9.8
        }
      }
    ],
    "statistics": {
      "pl": {
        "min": 8.41,
        "max": 12.5,
        "avg": 10.24,
        "count": 3
      }
    }
  }
}
```

## 🐍 Uso Direto em Python

### 📦 Importação

```python
from services.fundamentus_scraper import (
    FundamentusScraper, 
    get_fundamentus_data, 
    get_multiple_fundamentus_data
)
```

### 🔍 Exemplos de Uso

#### Dados de uma ação específica

```python
# Método simples
data = get_fundamentus_data("PETR4")
if data:
    print(f"Empresa: {data['empresa']}")
    print(f"P/L: {data['indicadores_fundamentalistas']['pl']}")
    print(f"ROE: {data['indicadores_fundamentalistas']['roe']}%")

# Método com classe
scraper = FundamentusScraper()
stock_data = scraper.get_stock_details("PETR4")
if stock_data:
    print(f"Cotação: R$ {stock_data.cotacao}")
    print(f"Dividend Yield: {stock_data.div_yield}%")
```

#### Múltiplas ações

```python
symbols = ["PETR4", "VALE3", "ITUB4", "BBDC4"]
results = get_multiple_fundamentus_data(symbols, delay=1.5)

for symbol, data in results.items():
    if data:
        print(f"{symbol}: ROE = {data['indicadores_fundamentalistas']['roe']}%")
    else:
        print(f"{symbol}: Dados não disponíveis")
```

#### Resumo de todas as ações

```python
scraper = FundamentusScraper()
df = scraper.get_all_stocks_summary()

if df is not None:
    print(f"Total de ações: {len(df)}")
    
    # Top 10 por ROE
    top_roe = df.nlargest(10, 'ROE')
    print("\nTop 10 ROE:")
    print(top_roe[['Papel', 'Empresa', 'ROE']])
    
    # Salvar em CSV
    df.to_csv('fundamentus_all_stocks.csv', index=False)
```

#### Busca por critérios

```python
scraper = FundamentusScraper()

# Critérios para ações de valor
criteria = {
    'pl_max': 12,
    'pvp_max': 1.5,
    'roe_min': 15,
    'div_yield_min': 4,
    'liquidez_min': 1000000
}

matching_stocks = scraper.search_stocks(criteria)
if matching_stocks:
    print(f"Encontradas {len(matching_stocks)} ações:")
    for stock in matching_stocks:
        print(f"  - {stock}")
```

#### Análise setorial

```python
scraper = FundamentusScraper()

# Análise geral
analysis = scraper.get_sector_analysis()
if analysis:
    print(f"Total de empresas: {analysis['total_empresas']}")
    print("\nSetores:")
    for setor, count in analysis['setores'].items():
        print(f"  {setor}: {count} empresas")

# Análise de setor específico
banking_analysis = scraper.get_sector_analysis("Bancos")
if banking_analysis:
    stats = banking_analysis['estatisticas']
    print(f"\nBancos - ROE médio: {stats['ROE']['media']:.2f}%")
```

## 🧪 Testes

### 🚀 Executar Testes

```bash
# Todos os testes
python test_fundamentus.py

# Apenas testes diretos (sem API)
python test_fundamentus.py --test direct

# Apenas testes da API
python test_fundamentus.py --test api

# Especificar URL diferente
python test_fundamentus.py --url http://localhost:8000
```

### 📊 Relatório de Testes

Os testes geram um relatório detalhado em JSON:

```json
{
  "timestamp": "2025-01-27T10:30:00",
  "duration_seconds": 45.2,
  "success_rate": 95.5,
  "total_tests": 22,
  "successful_tests": 21,
  "failed_tests": 1,
  "test_details": { /* detalhes de cada teste */ }
}
```

## ⚠️ Considerações Importantes

### 🚦 Rate Limiting

- **Delay recomendado**: 1-2 segundos entre requisições
- **Limite de ações simultâneas**: Máximo 50 por requisição
- **Timeout**: 30-60 segundos para requisições

### 🛡️ Tratamento de Erros

```python
try:
    data = get_fundamentus_data("PETR4")
    if data is None:
        print("Ação não encontrada ou dados indisponíveis")
except Exception as e:
    print(f"Erro ao obter dados: {str(e)}")
```

### 📝 Logs

```python
import logging

# Configurar nível de log
logging.getLogger('fundamentus-scraper').setLevel(logging.DEBUG)

# Os logs incluem:
# - Requisições realizadas
# - Dados extraídos
# - Erros e warnings
# - Performance
```

### 🔄 Cache

A API implementa cache automático:
- **Health check**: Sem cache
- **Ação específica**: 5 minutos
- **Múltiplas ações**: Sem cache (dados únicos)
- **Todas as ações**: 10 minutos
- **Busca/Análise**: 15 minutos

## 🚀 Casos de Uso Práticos

### 📈 Screening de Ações

```python
# Encontrar ações baratas com bons fundamentos
criteria = {
    'pl_max': 10,
    'pvp_max': 1.2,
    'roe_min': 20,
    'roic_min': 15,
    'div_yield_min': 6,
    'marg_liquida_min': 10
}

scraper = FundamentusScraper()
candidates = scraper.search_stocks(criteria)

# Obter dados detalhados dos candidatos
if candidates:
    detailed_data = get_multiple_fundamentus_data(candidates[:10])
    
    for symbol, data in detailed_data.items():
        if data:
            print(f"\n{symbol} - {data['empresa']}")
            print(f"  P/L: {data['indicadores_fundamentalistas']['pl']}")
            print(f"  ROE: {data['indicadores_fundamentalistas']['roe']}%")
            print(f"  Div. Yield: {data['indicadores_fundamentalistas']['div_yield']}%")
```

### 📊 Análise Comparativa

```python
# Comparar bancos
banks = ["ITUB4", "BBDC4", "SANB11", "BPAC11"]
comparison_data = get_multiple_fundamentus_data(banks)

print("Comparação de Bancos:")
print("Papel\t\tROE\tP/L\tDiv.Yield")
print("-" * 40)

for symbol, data in comparison_data.items():
    if data:
        roe = data['indicadores_fundamentalistas']['roe']
        pl = data['indicadores_fundamentalistas']['pl']
        dy = data['indicadores_fundamentalistas']['div_yield']
        print(f"{symbol}\t\t{roe:.1f}%\t{pl:.1f}\t{dy:.1f}%")
```

### 📈 Monitoramento de Carteira

```python
# Monitorar carteira
portfolio = ["PETR4", "VALE3", "ITUB4", "BBDC4", "WEGE3"]

def monitor_portfolio(symbols):
    data = get_multiple_fundamentus_data(symbols)
    
    print("Status da Carteira:")
    print("=" * 50)
    
    for symbol, stock_data in data.items():
        if stock_data:
            cotacao = stock_data['cotacao']
            var_dia = stock_data['oscilacoes']['dia']
            pl = stock_data['indicadores_fundamentalistas']['pl']
            
            status = "📈" if var_dia > 0 else "📉" if var_dia < 0 else "➡️"
            
            print(f"{status} {symbol}: R$ {cotacao:.2f} ({var_dia:+.2f}%) - P/L: {pl:.1f}")

monitor_portfolio(portfolio)
```

## 🔧 Personalização e Extensão

### 🎯 Adicionando Novos Indicadores

```python
# Estender a classe FundamentusData
@dataclass
class ExtendedFundamentusData(FundamentusData):
    custom_indicator: float = 0.0
    
# Estender o scraper
class ExtendedFundamentusScraper(FundamentusScraper):
    def _extract_custom_data(self, soup, data):
        # Implementar extração de dados customizados
        pass
```

### 🔄 Integração com Banco de Dados

```python
import sqlite3
import json

def save_to_database(symbol, data):
    conn = sqlite3.connect('fundamentus.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT OR REPLACE INTO stocks 
        (symbol, data, updated_at) 
        VALUES (?, ?, datetime('now'))
    ''', (symbol, json.dumps(data)))
    
    conn.commit()
    conn.close()

# Uso
data = get_fundamentus_data("PETR4")
if data:
    save_to_database("PETR4", data)
```

## 📞 Suporte e Contribuição

### 🐛 Reportar Problemas

1. Verificar logs detalhados
2. Testar com diferentes ações
3. Verificar conectividade com Fundamentus
4. Reportar com dados específicos

### 🤝 Contribuir

1. Fork do repositório
2. Implementar melhorias
3. Adicionar testes
4. Documentar mudanças
5. Submeter Pull Request

### 📧 Contato

Para dúvidas técnicas ou sugestões, consulte a documentação do projeto principal.

---

**📊 Fundamentus Scraper** - Análise fundamentalista profissional para o mercado brasileiro de ações. 