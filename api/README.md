# API Astrus Investimentos

API para coleta, processamento e armazenamento de dados financeiros.

## Requisitos

- Python 3.8+
- MongoDB
- ArcticDB

## Instalação

1. Clone este repositório
2. Execute o script `run.bat` para instalar dependências e iniciar a API

```bash
./run.bat
```

## Uso da API

A API estará disponível em http://localhost:5000

## Gerenciamento do ArcticDB

### Configuração Inicial

Para configurar o ArcticDB pela primeira vez, execute:

```bash
python setup_arcticdb.py
```

### Limpeza de Dados

Para limpar dados no ArcticDB, use o script `clean_arcticdb.py`. Este script permite:

- Listar bibliotecas disponíveis
- Listar símbolos em bibliotecas
- Remover símbolos específicos
- Limpar bibliotecas inteiras
- Remover bibliotecas

**Exemplos de uso:**

```bash
# Listar todas as bibliotecas
python clean_arcticdb.py --list-libraries

# Listar símbolos em uma biblioteca específica
python clean_arcticdb.py --list-symbols --library nome_da_biblioteca

# Listar símbolos em todas as bibliotecas
python clean_arcticdb.py --list-symbols

# Remover um símbolo específico de uma biblioteca
python clean_arcticdb.py --remove-symbol PETR4.SA --library cotacoes

# Remover um símbolo de todas as bibliotecas
python clean_arcticdb.py --remove-symbol PETR4.SA

# Limpar todos os símbolos de uma biblioteca (mantém a biblioteca)
python clean_arcticdb.py --clean-library cotacoes

# Remover completamente uma biblioteca
python clean_arcticdb.py --delete-library cotacoes
```

## Guias adicionais
Para mais informações sobre a API e seus endpoints, consulte a documentação em `/docs`. 
