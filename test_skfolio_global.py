#!/usr/bin/env python3
"""
Teste das mudanças no SKFolio para suporte a mercados globais
"""

import requests
import json

def test_global_portfolio_optimization():
    """Testa otimização de portfólio global"""
    url = "http://localhost:5000/api/skfolio/global-portfolio/optimize"
    
    # Teste com mix de mercados
    test_cases = [
        {
            "name": "Portfólio Brasileiro",
            "symbols": ["PETR4.SA", "VALE3.SA", "ITUB4.SA"],
            "optimization_type": "mean_risk"
        },
        {
            "name": "Portfólio Americano", 
            "symbols": ["AAPL", "MSFT", "GOOGL"],
            "optimization_type": "mean_risk"
        },
        {
            "name": "Portfólio Crypto",
            "symbols": ["BTC-USD", "ETH-USD", "BNB-USD"],
            "optimization_type": "mean_risk"
        },
        {
            "name": "Portfólio Global Misto",
            "symbols": ["PETR4.SA", "AAPL", "BTC-USD", "TSLA"],
            "optimization_type": "mean_risk"
        }
    ]
    
    for test_case in test_cases:
        print(f"\n🧪 Testando: {test_case['name']}")
        print(f"📊 Símbolos: {test_case['symbols']}")
        
        payload = {
            "symbols": test_case["symbols"],
            "period": "1y",
            "optimization_type": test_case["optimization_type"],
            "include_benchmark": True,
            "include_charts": False
        }
        
        try:
            response = requests.post(url, json=payload, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                if "weights" in data:
                    print("✅ Sucesso!")
                    print(f"📈 Pesos do portfólio:")
                    for symbol, weight in data["weights"].items():
                        print(f"   {symbol}: {weight:.3f}")
                    
                    if "performance_metrics" in data:
                        metrics = data["performance_metrics"]
                        print(f"📊 Sharpe Ratio: {metrics.get('sharpe_ratio', 'N/A'):.3f}")
                        print(f"📊 Retorno Anualizado: {metrics.get('annualized_return', 'N/A'):.3f}")
                else:
                    print("⚠️ Resposta sem pesos")
            else:
                print(f"❌ Erro HTTP {response.status_code}")
                print(f"📝 Resposta: {response.text[:200]}")
                
        except Exception as e:
            print(f"❌ Erro na requisição: {str(e)}")

def test_available_symbols():
    """Testa endpoint de símbolos disponíveis"""
    url = "http://localhost:5000/api/skfolio/global-portfolio/available-symbols"
    
    print("\n🔍 Testando símbolos disponíveis globais...")
    
    try:
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Sucesso!")
            
            for category, symbols in data.items():
                print(f"\n📂 {category}:")
                for symbol_info in symbols[:3]:  # Mostrar apenas os 3 primeiros
                    print(f"   {symbol_info['symbol']}: {symbol_info['name']}")
                if len(symbols) > 3:
                    print(f"   ... e mais {len(symbols) - 3} símbolos")
        else:
            print(f"❌ Erro HTTP {response.status_code}")
            
    except Exception as e:
        print(f"❌ Erro na requisição: {str(e)}")

def test_legacy_compatibility():
    """Testa compatibilidade com endpoints antigos"""
    legacy_url = "http://localhost:5000/api/skfolio/brazilian-stocks/optimize"
    
    print("\n🔄 Testando compatibilidade com endpoint legado...")
    
    payload = {
        "symbols": ["PETR4.SA", "VALE3.SA"],
        "period": "6mo",
        "optimization_type": "mean_risk"
    }
    
    try:
        response = requests.post(legacy_url, json=payload, timeout=20)
        
        if response.status_code == 200:
            data = response.json()
            if "weights" in data:
                print("✅ Endpoint legado funcionando!")
                print(f"📊 Pesos: {list(data['weights'].keys())}")
            else:
                print("⚠️ Resposta sem pesos no endpoint legado")
        else:
            print(f"❌ Erro HTTP {response.status_code} no endpoint legado")
            
    except Exception as e:
        print(f"❌ Erro na requisição legada: {str(e)}")

if __name__ == "__main__":
    print("🚀 Testando SKFolio Global Portfolio Optimization")
    print("=" * 60)
    
    test_available_symbols()
    test_global_portfolio_optimization()
    test_legacy_compatibility()
    
    print("\n" + "=" * 60)
    print("✨ Testes concluídos!")
