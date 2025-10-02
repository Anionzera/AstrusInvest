## Aba de Clientes — Fluxo, Funções e Endpoints

### Visão geral
- Ao clicar em “Clientes”, a aplicação navega para a rota `/clients`, que renderiza o componente `ClientManager`.
- O carregamento da lista utiliza o hook `useClients`, que consulta a API (`/api/clients`) e faz o mapeamento dos dados para o modelo do frontend.
- A aba permite: listar, criar, editar e excluir clientes, além de abrir o Dashboard do cliente (consolidação RV+RF, FX e performance).

### Navegação
- Rota: `/clients`
- Componente: `ClientManager`
- Rotas relacionadas:
  - `/clients/:id` (exibe `ClientDashboard` dentro do `ClientManager`)
  - `/portfolios` (visão de portfólios por cliente)

### Fluxo de carregamento (lista de clientes)
1. `ClientManager` monta e chama `useClients()`
2. `useClients` executa `syncClientsDown()`
3. `syncClientsDown()` faz:
   - `GET /api/health` (sanidade do backend)
   - `GET /api/clients` (lista de clientes)
   - Mapeamento dos campos do servidor para o modelo local

#### Funções e chamadas (exatas)
- Frontend
  - `ClientManager` → `useClients()`
  - `useClients` → `syncClientsDown()`
  - `syncClientsDown` → `api.health()` e `clientsApi.list()` → `api.get('/api/clients')`
  - Mapeamento: `toLocal(serverClient)` → objeto `Cliente` utilizado na UI

### Ações na aba e funções chamadas
- Criar cliente
  - UI: `ClienteForm` → `onSave` em `ClientManager` → `addClient`
  - Hook: `useClients.addClient` → `createClientSmart`
  - Serviço: `clientsApi.create(payload)` → `POST /api/clients`

- Atualizar cliente
  - UI: `ClienteForm` → `onSave` em `ClientManager` → `updateClient`
  - Hook: `useClients.updateClient` → `updateClientSmart`
  - Serviço: `clientsApi.update(id, payload)` → `PUT /api/clients/:id`

- Excluir cliente
  - UI: `ClientManager.handleDeleteCliente`
  - Hook: `useClients.deleteClient` → `deleteClientSmart`
  - Serviço: `clientsApi.delete(id)` → `DELETE /api/clients/:id`

- Abrir Dashboard do cliente
  - UI: botão/ícone “Dashboard” em `ClientManager` → `navigate('/clients/:id')`
  - `ClientDashboard` chama:
    - `GET /api/clients/:id/dashboard` (consolidação RV, RF, FX, retorno)
    - `GET /api/timeseries/indexer?code=CDI&start=YYYY-MM-DD&end=YYYY-MM-DD` (CDI para benchmark)
    - Market data (PriceHub/SSE) para atualização em tempo real (ex.: `BRL=X`)

### Endpoints Backend (Clientes)
- Listar clientes
```http
GET /api/clients
Response: { success: boolean, data: ServerClient[] }
```

- Criar cliente
```http
POST /api/clients
Body (parcial): {
  name, email, phone?, company?, risk_profile?, active?,
  birth_date?, cpf?, marital_status?, profession?, nationality?, identity_document?,
  address?, zip_code?, city?, state?, last_contact?, profile?
}
Response: { success: boolean, id: string }
```

- Atualizar cliente
```http
PUT /api/clients/:id
Body: mesmos campos do POST (parcial)
Response: { success: boolean }
```

- Excluir cliente
```http
DELETE /api/clients/:id
Response: { success: boolean }
```

- Dashboard do cliente
```http
GET /api/clients/:id/dashboard
Response: {
  success: true,
  data: {
    client: { id, name, email },
    usdbrl: number,
    totals: { marketBRL, marketUSD, costBRL, costUSD, retCost },
    rv: { symbols: string[], positions: Array<{ symbol, quantity, avg_price, pxLast, isBR, priceBRL, purchase_date? }> },
    fi: { positions: Array<{ id, instrument_id, kind, label, quantity, unit_price, dirty_price, trade_date? }> },
    streamSymbols: string[]
  }
}
```

### Modelo de dados — mapeamento Server → Frontend
- ServerClient (resumo dos principais campos):
  - `id, name, email, phone, company, risk_profile, active`
  - Pessoais: `birth_date, cpf, marital_status, profession, nationality, identity_document`
  - Endereço: `address, zip_code, city, state`
  - Contato: `last_contact, created_at, updated_at`
  - Perfil/suitability: `profile` (JSON)

- Mapeado para `Cliente` na UI:
  - `serverId = id`
  - `nome = name`, `email`, `telefone = phone`, `empresa = company`, `perfilRisco = risk_profile`, `ativo = active`
  - Datas: `dataNascimento ← birth_date`, `dataUltimoContato ← last_contact`, `dataCadastro ← onlyDate(created_at)`
  - Pessoais: `cpf, estadoCivil, profissao, nacionalidade, documentoIdentidade`
  - Endereço: `endereco, cep, cidade, estado`
  - `profile` mantido como JSON

### Sequência resumida ao abrir “Clientes”
- `ClientManager` → `useClients()` → `syncClientsDown()` → `api.get('/api/clients')` → mapeia para `Cliente[]` → renderiza tabela/cartões.

### Observações de segurança e qualidade
- Proteção JWT nas rotas de clientes é recomendada (aplicar `jwt_required`).
- Evitar DDL em tempo de requisição no backend; usar migrações (Alembic).
- Adicionar paginação/ordenação a `GET /api/clients` para grandes volumes.
- Validar e tratar erros de e-mail duplicado e formato no backend (400/409).

### Referências rápidas
- Frontend
  - `src/components/client/ClientManager.tsx`
  - `src/hooks/useClients.ts`
  - `src/services/clientsService.ts`
  - `src/components/client/ClientDashboard.tsx`
- Backend
  - `api/routes/clients_routes.py`
  - `api/models/client.py`


