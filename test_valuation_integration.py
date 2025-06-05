#!/usr/bin/env python3
"""
Script de teste para verificar a integração do módulo de valuation
"""

import requests
import json
import time
import sys
from datetime import datetime

def test_api_connection():
    """Testa se a API está rodando"""
    try:
        response = requests.get('http://localhost:5000/api/valuation/health', timeout=5)
        if response.status_code == 200:
            print("✅ API está rodando e respondendo")
            return True
        else:
            print(f"❌ API respondeu com status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Não foi possível conectar à API na porta 5000")
        return False
    except requests.exceptions.Timeout:
        print("❌ Timeout ao conectar à API")
        return False
    except Exception as e:
        print(f"❌ Erro inesperado: {e}")
        return False

def test_valuation_endpoint():
    """Testa o endpoint de valuation com PETR4"""
    try:
        print("\n🔍 Testando endpoint de valuation com PETR4...")
        response = requests.get('http://localhost:5000/api/valuation/stock/PETR4', timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Endpoint de valuation funcionando!")
            print(f"📊 Dados recebidos para PETR4:")
            print(f"   - Preço atual: R$ {data.get('current_price', 'N/A')}")
            print(f"   - Preço alvo: R$ {data.get('target_price', 'N/A')}")
            print(f"   - Potencial: {data.get('upside_potential', 'N/A')}%")
            print(f"   - Recomendação: {data.get('recommendation', 'N/A')}")
            return True
        else:
            print(f"❌ Endpoint retornou status {response.status_code}")
            print(f"   Resposta: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Não foi possível conectar ao endpoint de valuation")
        return False
    except requests.exceptions.Timeout:
        print("❌ Timeout ao chamar endpoint de valuation")
        return False
    except Exception as e:
        print(f"❌ Erro inesperado: {e}")
        return False

def check_frontend_files():
    """Verifica se os arquivos do frontend existem"""
    import os
    
    files_to_check = [
        'src/components/valuation/ValuationPage.tsx',
        'src/services/valuationService.ts',
        'src/routes.tsx',
        'src/components/layout/SideNav.tsx'
    ]
    
    print("\n📁 Verificando arquivos do frontend...")
    all_exist = True
    
    for file_path in files_to_check:
        if os.path.exists(file_path):
            print(f"✅ {file_path}")
        else:
            print(f"❌ {file_path} - ARQUIVO NÃO ENCONTRADO")
            all_exist = False
    
    return all_exist

def test_cors():
    """Testa se CORS está configurado corretamente"""
    try:
        print("\n🌐 Testando configuração CORS...")
        headers = {
            'Origin': 'http://localhost:3000',
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'Content-Type'
        }
        
        response = requests.options('http://localhost:5000/api/valuation/health', 
                                  headers=headers, timeout=5)
        
        if 'Access-Control-Allow-Origin' in response.headers:
            print("✅ CORS configurado corretamente")
            return True
        else:
            print("❌ CORS pode não estar configurado")
            return False
            
    except Exception as e:
        print(f"❌ Erro ao testar CORS: {e}")
        return False

def generate_integration_report():
    """Gera relatório de integração"""
    print("\n" + "="*60)
    print("🚀 RELATÓRIO DE INTEGRAÇÃO - MÓDULO DE VALUATION")
    print("="*60)
    print(f"📅 Data/Hora: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    print()
    
    # Testes
    api_ok = test_api_connection()
    valuation_ok = test_valuation_endpoint() if api_ok else False
    files_ok = check_frontend_files()
    cors_ok = test_cors() if api_ok else False
    
    # Resumo
    print("\n" + "="*60)
    print("📋 RESUMO DOS TESTES")
    print("="*60)
    print(f"🔌 API Connection:     {'✅ OK' if api_ok else '❌ FALHOU'}")
    print(f"📊 Valuation Endpoint: {'✅ OK' if valuation_ok else '❌ FALHOU'}")
    print(f"📁 Frontend Files:     {'✅ OK' if files_ok else '❌ FALHOU'}")
    print(f"🌐 CORS Configuration: {'✅ OK' if cors_ok else '❌ FALHOU'}")
    
    # Status geral
    all_ok = api_ok and valuation_ok and files_ok and cors_ok
    print(f"\n🎯 STATUS GERAL: {'✅ INTEGRAÇÃO COMPLETA' if all_ok else '⚠️ REQUER ATENÇÃO'}")
    
    if not all_ok:
        print("\n🔧 AÇÕES NECESSÁRIAS:")
        if not api_ok:
            print("   - Iniciar a API: python app.py")
        if not files_ok:
            print("   - Verificar se todos os arquivos do frontend foram criados")
        if not cors_ok and api_ok:
            print("   - Verificar configuração CORS na API")
    
    print("\n" + "="*60)
    
    return all_ok

if __name__ == "__main__":
    try:
        success = generate_integration_report()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⏹️ Teste interrompido pelo usuário")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erro fatal: {e}")
        sys.exit(1) 