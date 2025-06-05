#!/usr/bin/env python
# -*- coding: utf-8 -*-

from bs4 import BeautifulSoup

def analyze_fundamentus_structure():
    """Analisa a estrutura HTML do Fundamentus"""
    
    with open('fundamentus_PETR4_debug.html', 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Encontrar elementos com classes data e label
    data_elements = soup.find_all(class_='data')
    label_elements = soup.find_all(class_='label')
    
    print(f"🔍 ANÁLISE DA ESTRUTURA DO FUNDAMENTUS")
    print("=" * 50)
    print(f"📊 Elementos 'data': {len(data_elements)}")
    print(f"📊 Elementos 'label': {len(label_elements)}")
    
    print("\n📋 PRIMEIROS 20 PARES LABEL-DATA:")
    print("-" * 50)
    
    for i in range(min(20, len(label_elements), len(data_elements))):
        label = label_elements[i].get_text(strip=True)
        data = data_elements[i].get_text(strip=True)
        print(f"{i+1:2d}. {label:<25} : {data}")
    
    # Analisar estrutura específica
    print("\n🔍 ANÁLISE DETALHADA DOS ELEMENTOS:")
    print("-" * 50)
    
    for i in range(min(5, len(label_elements))):
        label_elem = label_elements[i]
        data_elem = data_elements[i]
        
        print(f"\nElemento {i+1}:")
        print(f"  Label: {label_elem.get_text(strip=True)}")
        print(f"  Data: {data_elem.get_text(strip=True)}")
        print(f"  Label parent: {label_elem.parent.name if label_elem.parent else 'None'}")
        print(f"  Data parent: {data_elem.parent.name if data_elem.parent else 'None'}")

if __name__ == "__main__":
    analyze_fundamentus_structure() 