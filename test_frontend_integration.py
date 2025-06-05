#!/usr/bin/env python
# -*- coding: utf-8 -*-

import requests
import json
import time
from datetime import datetime

def test_api_health():
    """Testa se a API está funcionando"""
    try:
        response = requests.get('http://localhost:5000/api/health', timeout=5)
        if response.status_code == 200:
            print("✅ API está funcionando corretamente")
            return True
        else:
            print(f"❌ API retornou status {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Erro ao conectar com a API: {e}")
        return False

def test_valuation_endpoint():
    """Testa o endpoint de valuation"""
    try:
        print("\n🔍 Testando endpoint de valuation...")
        response = requests.get('http://localhost:5000/api/valuation/stock/PETR4', timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Endpoint de valuation funcionando")
            print(f"   Símbolo: {data.get('symbol', 'N/A')}")
            print(f"   Preço Atual: R$ {data.get('current_price', 0):.2f}")
            print(f"   Preço Alvo: R$ {data.get('target_price', 0):.2f}")
            print(f"   Recomendação: {data.get('recommendation', 'N/A')}")
            return True
        else:
            print(f"❌ Endpoint retornou status {response.status_code}")
            print(f"   Resposta: {response.text}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Erro ao testar endpoint: {e}")
        return False

def test_cors():
    """Testa se CORS está configurado corretamente"""
    try:
        print("\n🌐 Testando configuração CORS...")
        response = requests.options('http://localhost:5000/api/valuation/stock/PETR4')
        
        headers = response.headers
        if 'Access-Control-Allow-Origin' in headers:
            print("✅ CORS configurado corretamente")
            print(f"   Allow-Origin: {headers.get('Access-Control-Allow-Origin')}")
            return True
        else:
            print("❌ CORS não configurado")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Erro ao testar CORS: {e}")
        return False

def test_multiple_requests():
    """Testa múltiplas requisições para verificar performance"""
    print("\n⚡ Testando performance com múltiplas requisições...")
    symbols = ['PETR4', 'VALE3', 'ITUB4']
    results = []
    
    for symbol in symbols:
        try:
            start_time = time.time()
            response = requests.get(f'http://localhost:5000/api/valuation/stock/{symbol}', timeout=30)
            end_time = time.time()
            
            if response.status_code == 200:
                data = response.json()
                duration = end_time - start_time
                results.append({
                    'symbol': symbol,
                    'success': True,
                    'duration': duration,
                    'recommendation': data.get('recommendation', 'N/A')
                })
                print(f"   ✅ {symbol}: {duration:.2f}s - {data.get('recommendation', 'N/A')}")
            else:
                results.append({
                    'symbol': symbol,
                    'success': False,
                    'duration': 0,
                    'error': response.status_code
                })
                print(f"   ❌ {symbol}: Erro {response.status_code}")
        except Exception as e:
            results.append({
                'symbol': symbol,
                'success': False,
                'duration': 0,
                'error': str(e)
            })
            print(f"   ❌ {symbol}: {e}")
    
    success_rate = sum(1 for r in results if r['success']) / len(results) * 100
    avg_duration = sum(r['duration'] for r in results if r['success']) / max(1, sum(1 for r in results if r['success']))
    
    print(f"\n📊 Resultados:")
    print(f"   Taxa de sucesso: {success_rate:.1f}%")
    print(f"   Tempo médio: {avg_duration:.2f}s")
    
    return success_rate >= 80

def check_frontend_files():
    """Verifica se os arquivos do frontend existem"""
    import os
    
    print("\n📁 Verificando arquivos do frontend...")
    
    files_to_check = [
        'src/components/valuation/ValuationPage.tsx',
        'src/services/valuationService.ts',
        'src/routes.tsx'
    ]
    
    all_exist = True
    for file_path in files_to_check:
        if os.path.exists(file_path):
            print(f"   ✅ {file_path}")
        else:
            print(f"   ❌ {file_path} - ARQUIVO NÃO ENCONTRADO")
            all_exist = False
    
    return all_exist

def generate_test_report():
    """Gera relatório de teste"""
    report = {
        'timestamp': datetime.now().isoformat(),
        'tests': {
            'api_health': False,
            'valuation_endpoint': False,
            'cors_config': False,
            'performance': False,
            'frontend_files': False
        },
        'overall_status': 'FAILED'
    }
    
    print("🧪 INICIANDO TESTES DE INTEGRAÇÃO FRONTEND-BACKEND")
    print("=" * 60)
    
    # Executar testes
    report['tests']['api_health'] = test_api_health()
    report['tests']['valuation_endpoint'] = test_valuation_endpoint()
    report['tests']['cors_config'] = test_cors()
    report['tests']['performance'] = test_multiple_requests()
    report['tests']['frontend_files'] = check_frontend_files()
    
    # Calcular status geral
    passed_tests = sum(1 for test in report['tests'].values() if test)
    total_tests = len(report['tests'])
    success_rate = passed_tests / total_tests * 100
    
    if success_rate >= 80:
        report['overall_status'] = 'PASSED'
    elif success_rate >= 60:
        report['overall_status'] = 'WARNING'
    else:
        report['overall_status'] = 'FAILED'
    
    # Exibir relatório
    print("\n" + "=" * 60)
    print("📋 RELATÓRIO FINAL DE TESTES")
    print("=" * 60)
    
    for test_name, result in report['tests'].items():
        status = "✅ PASSOU" if result else "❌ FALHOU"
        print(f"{test_name.replace('_', ' ').title()}: {status}")
    
    print(f"\nTaxa de Sucesso: {success_rate:.1f}% ({passed_tests}/{total_tests})")
    print(f"Status Geral: {report['overall_status']}")
    
    if report['overall_status'] == 'PASSED':
        print("\n🎉 TODOS OS TESTES PASSARAM! O módulo de valuation está pronto para uso.")
    elif report['overall_status'] == 'WARNING':
        print("\n⚠️  ALGUNS TESTES FALHARAM. Verifique os problemas antes de usar em produção.")
    else:
        print("\n🚨 MUITOS TESTES FALHARAM. O sistema precisa de correções antes do uso.")
    
    # Salvar relatório
    with open('frontend_integration_test_report.json', 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    print(f"\n💾 Relatório salvo em 'frontend_integration_test_report.json'")
    
    return report

if __name__ == "__main__":
    generate_test_report() 