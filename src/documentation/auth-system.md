# Documentação do Sistema de Autenticação

## Visão Geral

O sistema de autenticação da ASTRUS Investimentos foi completamente restruturado para fornecer maior segurança, confiabilidade e capacidade de manutenção. As principais melhorias incluem:

1. **Autenticação baseada em JWT**: Implementação de autenticação usando tokens JWT (JSON Web Tokens)
2. **Sistema de Refresh Token**: Permite renovar a sessão sem exigir novo login do usuário
3. **Controle de Permissões**: Sistema granular de permissões baseado em capacidades
4. **Detecção de Inatividade**: Encerramento automático de sessões inativas
5. **Validação de Token**: Verificação automática da validade dos tokens
6. **Gerenciamento de Sessão**: Controle centralizado do ciclo de vida da sessão

## Arquitetura

A arquitetura do sistema de autenticação foi dividida em três componentes principais:

### 1. AuthService

O `authService.ts` é a camada de serviço responsável por:
- Comunicação com a API de autenticação
- Armazenamento e recuperação segura de tokens e dados de usuário
- Validação de tokens
- Verificação de permissões
- Atualização automática de tokens

### 2. AuthContext

O `AuthContext.tsx` é a camada de contexto que:
- Fornece acesso ao estado de autenticação para toda a aplicação
- Gerencia o ciclo de vida da sessão
- Implementa verificações periódicas de validade de token
- Monitora inatividade do usuário
- Fornece métodos para login, logout e renovação de sessão

### 3. RequireAuth

O `RequireAuth.tsx` é um componente de proteção de rotas que:
- Verifica se o usuário está autenticado
- Valida permissões específicas necessárias para acessar certas rotas
- Verifica níveis de acesso administrativo
- Redireciona para o login quando necessário

## Fluxo de Autenticação

1. **Login Inicial**:
   - Usuário fornece credenciais (username/password)
   - O sistema autentica através de `apiLogin()`
   - Os tokens JWT e refresh são armazenados localmente
   - O estado de autenticação é atualizado

2. **Validação Contínua**:
   - O sistema verifica periodicamente a validade do token
   - Se o token estiver prestes a expirar, o sistema tenta renovar usando o refresh token
   - Em caso de falha na renovação, o usuário é desconectado

3. **Monitoramento de Atividade**:
   - O sistema registra a última atividade do usuário
   - Sessões inativas por mais de 30 minutos são encerradas automaticamente

4. **Logout**:
   - Todos os tokens são invalidados
   - Os dados locais são limpos
   - O usuário é redirecionado para a tela de login

## Sistema de Permissões

O novo sistema utiliza um controle de permissões baseado em capacidades:

- Cada usuário possui uma lista de permissões específicas (`user.permissions`)
- As permissões seguem o formato `recurso:ação` (ex.: `client:read`, `report:write`)
- Administradores têm todas as permissões automaticamente
- O componente `RequireAuth` pode exigir permissões específicas para acessar certas rotas

## Uso na Aplicação

### Protegendo Rotas

```tsx
<Route
  path="/admin/users"
  element={
    <RequireAuth 
      requireAdmin={true} 
      requiredPermissions={["user:read", "user:write"]}
    >
      <UserManager />
    </RequireAuth>
  }
/>
```

### Verificando Permissões em Componentes

```tsx
const { hasPermission } = useAuth();

// Exibir ou não um botão de edição
{hasPermission("client:write") && (
  <Button onClick={handleEdit}>Editar Cliente</Button>
)}
```

### Obter o Usuário Atual

```tsx
const { user, isAuthenticated } = useAuth();

if (isAuthenticated && user) {
  console.log(`Usuário logado: ${user.name}`);
}
```

## Segurança Adicional

- Tokens JWT são armazenados localmente com tempo de expiração
- Refresh tokens têm tempo de vida mais longo, permitindo renovação da sessão
- Todas as informações do usuário são armazenadas de forma segura
- O sistema detecta e encerra sessões inativas
- A proteção contra CSRF está implementada implicitamente pelo uso de tokens JWT

## Testes

Os testes unitários para o sistema de autenticação estão disponíveis em `src/tests/authService.test.ts` e cobrem:

- Login com diferentes tipos de usuário
- Verificação de permissões
- Armazenamento e recuperação de tokens
- Validação de tokens

## Considerações para Ambiente de Produção

Para um ambiente de produção, recomenda-se:

1. Implementar criptografia adicional para tokens armazenados localmente
2. Usar HTTPS para todas as comunicações
3. Implementar monitoramento de tentativas de login e bloqueio temporário após tentativas falhas
4. Considerar o uso de autenticação de dois fatores (2FA)
5. Implementar rotação periódica de refresh tokens

---

**Nota**: Este sistema atual simula a implementação JWT para desenvolvimento. Em um ambiente de produção, deve-se implementar a autenticação JWT do lado do servidor. 