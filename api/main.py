from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import portfolio

app = FastAPI(title="Investment API", description="API para análise e otimização de investimentos")

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, defina origens específicas
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["portfolio"])

@app.get("/")
async def root():
    return {"message": "Bem-vindo à API de Investimentos"} 