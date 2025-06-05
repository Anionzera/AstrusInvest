# 🤝 Guia de Contribuição - Astrus Valuation

Obrigado por considerar contribuir para o Astrus Valuation! Este documento fornece diretrizes para contribuições efetivas.

## 📋 **Como Contribuir**

### **1. Reportar Bugs**
- Use o [GitHub Issues](https://github.com/seu-usuario/astrus-valuation/issues)
- Inclua uma descrição clara do problema
- Forneça passos para reproduzir o bug
- Inclua informações do ambiente (OS, Python, Node.js versions)

### **2. Sugerir Melhorias**
- Abra uma [Issue](https://github.com/seu-usuario/astrus-valuation/issues) com a tag `enhancement`
- Descreva claramente a funcionalidade proposta
- Explique por que seria útil
- Considere implementações alternativas

### **3. Contribuir com Código**

#### **Fork e Clone**
```bash
# Fork o repositório no GitHub, então:
git clone https://github.com/seu-usuario/astrus-valuation.git
cd astrus-valuation
```

#### **Configurar Ambiente**
```bash
# Backend
cd api
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate     # Windows
pip install -r requirements.txt

# Frontend
cd ..
npm install
```

#### **Criar Branch**
```bash
git checkout -b feature/nome-da-feature
# ou
git checkout -b fix/nome-do-bug
```

## 📝 **Padrões de Código**

### **Python (Backend)**
- Siga [PEP 8](https://pep8.org/)
- Use **type hints** quando possível
- Documente funções com **docstrings**
- Máximo 100 caracteres por linha

```python
def calculate_sharpe_ratio(returns: pd.Series, risk_free_rate: float) -> float:
    """
    Calcula o Sharpe Ratio para uma série de retornos.
    
    Args:
        returns: Série temporal de retornos
        risk_free_rate: Taxa livre de risco anualizada
        
    Returns:
        Sharpe ratio calculado
    """
    excess_returns = returns.mean() * 252 - risk_free_rate
    volatility = returns.std() * np.sqrt(252)
    return excess_returns / volatility if volatility > 0 else 0
```

### **TypeScript (Frontend)**
- Use **TypeScript** rigorosamente
- Prefira **interfaces** a tipos quando apropriado
- Use **React Hooks** ao invés de classes
- Componentes funcionais com **arrow functions**

```typescript
interface Portfolio {
  id: string;
  name: string;
  assets: Asset[];
  weights: number[];
}

const PortfolioCard: React.FC<{ portfolio: Portfolio }> = ({ portfolio }) => {
  const [isLoading, setIsLoading] = useState(false);
  
  // Component logic here
  
  return (
    <Card className="portfolio-card">
      {/* JSX here */}
    </Card>
  );
};
```

## 🧪 **Testes**

### **Backend**
```bash
cd api
python -m pytest tests/ -v
python test_valuation_integration.py
```

### **Frontend**
```bash
npm test
npm run test:coverage
```

### **Cobertura Mínima**
- **90%** para novas funcionalidades
- **80%** para código legado
- Todos os testes devem passar

## 📦 **Commits**

### **Formato de Commit**
Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipo>(<escopo>): <descrição>

[corpo opcional]

[rodapé opcional]
```

### **Tipos Aceitos**
- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `docs`: Mudanças na documentação
- `style`: Formatação, sem mudança de lógica
- `refactor`: Refatoração sem mudança de funcionalidade
- `test`: Adição/correção de testes
- `chore`: Mudanças de build, ferramentas, etc.

### **Exemplos**
```bash
feat(valuation): add DCF sensitivity analysis
fix(api): resolve cache invalidation issue
docs(readme): update installation instructions
test(portfolio): add unit tests for optimization
```

## 🔍 **Pull Request Process**

### **1. Antes de Enviar**
- [ ] Código segue os padrões estabelecidos
- [ ] Testes foram adicionados/atualizados
- [ ] Testes passam localmente
- [ ] Documentação foi atualizada
- [ ] Commit messages seguem convenção

### **2. Descrição do PR**
```markdown
## Descrição
Breve descrição das mudanças

## Tipo de Mudança
- [ ] Bug fix
- [ ] Nova funcionalidade
- [ ] Breaking change
- [ ] Documentação

## Testes
- [ ] Testes unitários passam
- [ ] Testes de integração passam
- [ ] Testado manualmente

## Checklist
- [ ] Código segue style guides
- [ ] Self-review realizado
- [ ] Documentação atualizada
```

### **3. Review Process**
- Pelo menos **1 aprovação** necessária
- Todos os testes devem passar
- **Code coverage** não pode diminuir
- Conflitos resolvidos

## 🏗️ **Estrutura do Projeto**

### **Adicionando Novas Funcionalidades**

#### **Backend (API Endpoint)**
```python
# api/routes/nova_funcionalidade.py
from flask import Blueprint, request, jsonify

nova_bp = Blueprint('nova', __name__, url_prefix='/api/nova')

@nova_bp.route('/endpoint', methods=['POST'])
def novo_endpoint():
    # Implementação
    pass
```

#### **Backend (Service)**
```python
# api/services/novo_service.py
class NovoService:
    def __init__(self):
        # Inicialização
        pass
    
    def metodo_principal(self, parametros):
        # Lógica de negócio
        pass
```

#### **Frontend (Componente)**
```typescript
// src/components/NovoComponente.tsx
interface NovoComponenteProps {
  prop1: string;
  prop2?: number;
}

export const NovoComponente: React.FC<NovoComponenteProps> = ({ 
  prop1, 
  prop2 = 0 
}) => {
  // Implementação
};
```

## 📚 **Recursos Úteis**

### **Documentação**
- [Flask Documentation](https://flask.palletsprojects.com/)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Pandas Documentation](https://pandas.pydata.org/docs/)

### **Ferramentas**
- [Postman](https://www.postman.com/) - Testar APIs
- [VS Code](https://code.visualstudio.com/) - Editor recomendado
- [Git Flow](https://github.com/nvie/gitflow) - Workflow Git

## ❓ **Dúvidas?**

- Abra uma [Discussion](https://github.com/seu-usuario/astrus-valuation/discussions)
- Entre em contato: astrus@exemplo.com
- Consulte a [documentação](README.md)

## 🙏 **Agradecimentos**

Toda contribuição é valiosa, desde:
- Correções de typos
- Melhorias na documentação  
- Novas funcionalidades
- Relatórios de bugs
- Feedback de usabilidade

**Obrigado por contribuir! 🚀** 