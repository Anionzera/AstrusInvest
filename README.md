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
- **Machine Learning** para predição de retornos (modelos estatísticos)
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
- **Modelos estatísticos** para predição de retornos (Ridge, Random Forest)
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
- **Scikit-learn 1.6.1** - Machine Learning
- **pandas-ta 0.3.14b0** - Análise técnica
- **yfinance 0.2.64** - Dados financeiros
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

### **1. Configuração do Backend**

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

### **2. Configuração do Frontend**
```bash
npm install
# ou
yarn install
```

### **3. Configuração do Banco de Dados (Opcional)**
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
```
## 📄 **Licença**

Este projeto está licenciado sob a **MIT License** - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 👥 **Autores**

- **Christian Santana ** - [https://www.linkedin.com/in/christian-santana1/]

- **Email**: cfsandrade5@gmail.com
---

**⭐ Se este projeto foi útil para você, considere dar uma estrela no GitHub!**
