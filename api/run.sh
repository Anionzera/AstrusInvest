#!/bin/bash

# Criar ambiente virtual se não existir
if [ ! -d "venv" ]; then
  echo "Criando ambiente virtual..."
  python -m venv venv
fi

# Ativar ambiente virtual
source venv/bin/activate

# Instalar dependências
echo "Instalando/atualizando dependências..."
pip install -r requirements.txt

# Iniciar o servidor
echo "Iniciando servidor API..."
flask run --host=0.0.0.0 --port=5000 