@echo off
echo Iniciando API do Astrus Investimentos...

REM Verificar se o ambiente virtual existe
if not exist venv (
    echo Criando ambiente virtual...
    python -m venv venv
)

REM Ativar ambiente virtual
call venv\Scripts\activate

REM Instalar dependências
echo Instalando/atualizando dependências...
pip install -r requirements.txt

REM Verificar se o MongoDB está rodando
echo Verificando se o MongoDB está rodando...
python -c "import pymongo; pymongo.MongoClient('mongodb://localhost:27017/', serverSelectionTimeoutMS=2000).server_info()" >nul 2>&1
if %errorlevel% neq 0 (
    echo MongoDB não está rodando. Tentando iniciar...
    
    REM Verificar se o diretório de dados existe
    if not exist C:\data\db (
        echo Criando diretório de dados para MongoDB...
        mkdir C:\data\db
    )
    
    REM Iniciar MongoDB em uma nova janela usando o caminho completo
    start "MongoDB" "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe" --dbpath=C:\data\db
    
    echo Aguardando MongoDB inicializar...
    timeout /t 5 /nobreak
) else (
    echo MongoDB já está rodando.
)

REM Configurar ArcticDB se solicitado
set /p setup_arctic="Deseja configurar o ArcticDB e carregar dados iniciais? (s/n): "
if /i "%setup_arctic%"=="s" (
    echo Configurando ArcticDB...
    python setup_arcticdb.py
)

REM Definir variável de ambiente para Flask
set FLASK_APP=app.py

REM Iniciar o servidor
echo Iniciando servidor API...
flask run --host=0.0.0.0 --port=5000

pause 