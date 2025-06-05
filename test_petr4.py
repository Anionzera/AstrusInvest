#!/usr/bin/env python
# -*- coding: utf-8 -*-

from services.fundamentus_scraper import FundamentusScraper
import json

def test_petr4():
    print("🔍 TESTANDO DADOS FUNDAMENTALISTAS DA PETR4")
    print("=" * 50)
    
    scraper = FundamentusScraper()
    data = scraper.get_stock_details('PETR4')
    
    if data:
        print("✅ DADOS OBTIDOS COM SUCESSO!")
        print(f"📊 Papel: {data.papel}")
        print(f"🏢 Empresa: {data.empresa}")
        print(f"🏭 Setor: {data.setor}")
        print(f"📈 Cotação: R$ {data.cotacao}")
        print(f"📅 Data Última Cotação: {data.data_ult_cot}")
        print(f"💰 Valor de Mercado: R$ {data.valor_mercado:,}")
        print(f"📊 Número de Ações: {data.nro_acoes:,}")
        
        print("\n📊 INDICADORES FUNDAMENTALISTAS:")
        print(f"💰 P/L: {data.pl}")
        print(f"📊 P/VP: {data.pvp}")
        print(f"💎 ROE: {data.roe}%")
        print(f"🔄 ROIC: {data.roic}%")
        print(f"💵 Dividend Yield: {data.div_yield}%")
        print(f"📊 Margem Líquida: {data.marg_liquida}%")
        print(f"💰 LPA: R$ {data.lpa}")
        print(f"📈 VPA: R$ {data.vpa}")
        print(f"📊 EV/EBIT: {data.ev_ebit}")
        
        print("\n📈 OSCILAÇÕES:")
        print(f"📅 Dia: {data.dia}%")
        print(f"📅 Mês: {data.mes}%")
        print(f"📅 30 dias: {data.dias_30}%")
        print(f"📅 12 meses: {data.meses_12}%")
        print(f"📅 2024: {data.ano_2024}%")
        print(f"📅 2023: {data.ano_2023}%")
        
        print("\n💼 DADOS FINANCEIROS:")
        print(f"💰 Receita Líquida (12m): R$ {data.receita_liquida:,}")
        print(f"📊 EBIT (12m): R$ {data.ebit:,}")
        print(f"💰 Lucro Líquido (12m): R$ {data.lucro_liquido:,}")
        print(f"🏦 Patrimônio Líquido: R$ {data.patrim_liq:,}")
        print(f"💳 Dívida Bruta: R$ {data.div_bruta:,}")
        print(f"💰 Dívida Líquida: R$ {data.div_liquida:,}")
        
        # Converter para dict para mostrar estrutura completa
        data_dict = scraper.to_dict(data)
        
        print("\n📄 SALVANDO DADOS COMPLETOS EM JSON...")
        with open('petr4_dados_completos.json', 'w', encoding='utf-8') as f:
            json.dump(data_dict, f, indent=2, ensure_ascii=False)
        print("✅ Dados salvos em 'petr4_dados_completos.json'")
        
        return True
    else:
        print("❌ ERRO: Não foi possível obter dados da PETR4")
        return False

if __name__ == "__main__":
    success = test_petr4()
    if success:
        print("\n🎉 TESTE CONCLUÍDO COM SUCESSO!")
    else:
        print("\n💥 TESTE FALHOU!") 