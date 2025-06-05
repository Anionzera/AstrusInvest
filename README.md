# 🚀 Astrus Valuation - Plataforma de Análise de Investimentos

[![Python](https://img.shields.io/badge/Python-3.8%2B-blue.svg)](https://python.org)
[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org)
[![Flask](https://img.shields.io/badge/Flask-2.3.3-green.svg)](https://flask.palletsprojects.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue.svg)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Uma plataforma completa e profissional para análise quantitativa de investimentos, valuation de ações e otimização de portfólios, desenvolvida com tecnologias modernas e algoritmos avançados de machine learning.

## 📊 **Funcionalidades Principais**

### 🎯 **Análise de Valuation**
- **7 métodos diferentes** de valuation (DCF, P/E, P/B, EV/EBITDA, DDM, Graham, Asset-Based)
- **Sistema de ponderação** inteligente entre métodos
- **Múltiplos setoriais** dinâmicos baseados em dados reais
- **Análise de saúde financeira** automatizada
- **Recomendações** com níveis de confiança

### 📈 **Análise de Performance**
- **30+ métricas** profissionais (Sharpe, Sortino, Calmar, VaR, CVaR)
- **Tearsheets** visuais completos usando pyfolio
- **Análise de fatores** (Fama-French)
- **Comparação** entre estratégias
- **Attribution analysis** detalhada

### 🔧 **Otimização de Portfólios**
- **8 algoritmos** de otimização (Markowitz, Black-Litterman, HRP, CLA)
- **Machine Learning** para predição de retornos (LSTM)
- **Restrições por categoria** de ativos
- **Fronteira eficiente** interativa
- **Alocação discreta** (número inteiro de ações)

### 📊 **Dados em Tempo Real**
- **Múltiplas fontes**: Yahoo Finance, Binance, Fundamentus, Banco Central
- **Cache inteligente** multicamadas
- **Roteamento automático** por tipo de ativo
- **Fallback robusto** entre fontes
- **Dados macroeconômicos** brasileiros

### 🤖 **Machine Learning**
- **Redes LSTM** para predição de retornos
- **Análise de sentimento** (planejado)
- **Detecção de anomalias** em dados
- **Validação cruzada** temporal

## 🏗️ **Arquitetura Técnica**

### **Backend (Python)**
```
api/
├── routes/              # Endpoints da API REST
├── services/            # Lógica de negócio
├── utils/               # Utilitários e migrações
├── astrus_db/          # Banco de dados ArcticDB
├── app.py              # Aplicação Flask principal
└── requirements.txt    # Dependências Python
```

### **Frontend (React + TypeScript)**
```
src/
├── components/         # Componentes React reutilizáveis
├── pages/             # Páginas da aplicação
├── services/          # Cliente API e estado
├── utils/             # Utilitários frontend
├── types/             # Definições TypeScript
└── styles/            # Estilos e temas
```

### **Tecnologias Utilizadas**

#### **Backend**
- **Flask 2.3.3** - Framework web principal
- **ArcticDB 5.5.1** - Banco de dados de séries temporais
- **TensorFlow 2.19.0** - Machine Learning
- **PyPortfolioOpt 1.5.6** - Otimização de portfólios
- **pandas-ta 0.3.14b0** - Análise técnica
- **pyfolio-reloaded 0.9.8** - Análise de performance
- **yfinance 0.2.59** - Dados financeiros
- **BeautifulSoup 4.12.3** - Web scraping

#### **Frontend**
- **React 18.2.0** - Interface de usuário
- **TypeScript 5.0+** - Tipagem estática
- **Vite** - Build tool moderna
- **TailwindCSS** - Framework CSS
- **shadcn/ui** - Componentes UI
- **Recharts** - Gráficos e visualizações
- **React Query** - Gerenciamento de estado

## 🚀 **Instalação e Configuração**

### **Pré-requisitos**
- Python 3.8+ 
- Node.js 18+
- MongoDB (opcional, para ArcticDB)
- Git

### **1. Clone o Repositório**
```bash
git clone https://github.com/seu-usuario/astrus-valuation.git
cd astrus-valuation
```

### **2. Configuração do Backend**

#### **Windows**
```bash
cd api
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

#### **Linux/Mac**
```bash
cd api
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### **3. Configuração do Frontend**
```bash
npm install
# ou
yarn install
```

### **4. Configuração do Banco de Dados (Opcional)**
```bash
# Instalar MongoDB (se desejar usar ArcticDB)
# Windows: https://docs.mongodb.com/manual/tutorial/install-mongodb-on-windows/
# Linux: https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/
# Mac: brew install mongodb/brew/mongodb-community

# Configurar ArcticDB
cd api
python setup_arcticdb.py
```

## 🏃‍♂️ **Executando a Aplicação**

### **Desenvolvimento**

#### **Backend**
```bash
cd api
# Windows
run.bat

# Linux/Mac
./run.sh
```

#### **Frontend**
```bash
npm run dev
# ou
yarn dev
```

### **URLs de Acesso**
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Documentação API**: http://localhost:5000/docs (planejado)

## 📚 **Documentação da API**

### **Endpoints Principais**

#### **Dados de Mercado**
```http
GET /api/market-data/quote?symbol=PETR4.SA
GET /api/market-data/history?symbol=PETR4.SA&period=1y
GET /api/market-data/technical-analysis?symbol=PETR4.SA
```

#### **Análise de Valuation**
```http
GET /api/valuation/stock/PETR4
POST /api/valuation/stocks/multiple
GET /api/valuation/ranking?symbols=PETR4,VALE3,ITUB4
```

#### **Otimização de Portfólios**
```http
POST /api/portfolio/optimize
POST /api/portfolio/efficient-frontier
POST /api/portfolio/discrete-allocation
```

#### **Análise de Performance**
```http
POST /api/performance/analyze
POST /api/performance/compare-strategies
POST /api/performance/tearsheet
```

### **Exemplo de Requisição**
```javascript
// Otimização de portfólio
const response = await fetch('/api/portfolio/optimize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tickers: ['PETR4.SA', 'VALE3.SA', 'ITUB4.SA'],
    method: 'max_sharpe',
    risk_free_rate: 0.1075,
    use_ml_predictions: true
  })
});
```

## 🧪 **Testes**

### **Backend**
```bash
cd api
python -m pytest tests/
python test_valuation_integration.py
python test_frontend_integration.py
```

### **Frontend**
```bash
npm test
# ou
yarn test
```

## 📊 **Exemplos de Uso**

### **1. Análise de Valuation Completa**
```python
from services.valuation_engine import get_stock_valuation

# Analisar PETR4
result = get_stock_valuation('PETR4')
print(f"Preço atual: R$ {result['current_price']:.2f}")
print(f"Preço-alvo: R$ {result['target_price']:.2f}")
print(f"Potencial: {result['upside_potential']:.1f}%")
print(f"Recomendação: {result['recommendation']}")
```

### **2. Otimização de Portfólio com ML**
```python
from portfolio_optimizer import PortfolioOptimizer

optimizer = PortfolioOptimizer()
optimizer.load_data(['PETR4.SA', 'VALE3.SA', 'ITUB4.SA'])

# Otimizar com Machine Learning
result = optimizer.optimize_portfolio(
    method='max_sharpe',
    use_ml_predictions=True
)
```

### **3. Análise de Performance**
```python
from services.performance_analyzer import PerformanceAnalyzer

analyzer = PerformanceAnalyzer()
metrics = analyzer.calculate_performance_metrics(
    portfolio_returns,
    risk_free_rate=0.1075
)
```

## 🛠️ **Configuração Avançada**

### **Variáveis de Ambiente**
```bash
# .env (opcional)
FLASK_ENV=development
MONGODB_URI=mongodb://localhost:27017
CACHE_TIMEOUT=300
ML_ENABLED=true
```

### **Cache Redis (Produção)**
```python
# Substituir SimpleCache por Redis
CACHE_TYPE = "RedisCache"
CACHE_REDIS_URL = "redis://localhost:6379"
```

## 🚀 **Deploy em Produção**

### **Docker** (Recomendado)
```dockerfile
# Dockerfile.backend
FROM python:3.11-slim
WORKDIR /app
COPY api/requirements.txt .
RUN pip install -r requirements.txt
COPY api/ .
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]
```

### **Vercel/Netlify** (Frontend)
```bash
npm run build
# Deploy automático via Git integration
```

## 🤝 **Contribuição**

1. **Fork** o projeto
2. Crie uma **branch** para sua feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. **Push** para a branch (`git push origin feature/AmazingFeature`)
5. Abra um **Pull Request**

### **Guidelines**
- Siga os padrões de código existentes
- Adicione testes para novas funcionalidades
- Atualize a documentação quando necessário
- Use **commits semânticos** (feat, fix, docs, etc.)

## 📄 **Licença**

Este projeto está licenciado sob a **MIT License** - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 👥 **Autores**

- **Equipe Astrus** - *Desenvolvimento inicial* - [AstrusTeam](https://github.com/astrus-team)

## 🙏 **Agradecimentos**

- **PyPortfolioOpt** pela excelente biblioteca de otimização
- **pyfolio** pela análise de performance profissional
- **yfinance** pelos dados financeiros gratuitos
- **shadcn/ui** pelos componentes UI elegantes
- **Fundamentus** pelos dados fundamentalistas brasileiros

## 📞 **Suporte**

- **Issues**: [GitHub Issues](https://github.com/seu-usuario/astrus-valuation/issues)
- **Discussions**: [GitHub Discussions](https://github.com/seu-usuario/astrus-valuation/discussions)
- **Email**: astrus@exemplo.com

---

**⭐ Se este projeto foi útil para você, considere dar uma estrela no GitHub!**
