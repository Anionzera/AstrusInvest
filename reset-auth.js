// Script para resetar autenticação e banco de dados
// Execute este código no console do navegador quando estiver na aplicação

(async function() {
  console.log("Iniciando processo de reset de autenticação...");
  
  // 1. Limpar dados de autenticação do localStorage
  console.log("Limpando dados de autenticação...");
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
  localStorage.removeItem('auth_refresh_token');
  localStorage.removeItem('last_activity');
  
  // 2. Limpar dados relacionados ao banco
  console.log("Limpando versão do banco de dados...");
  localStorage.removeItem('astrus_db_version');
  
  // 3. Limpar dados específicos de usuários e contas
  console.log("Limpando dados de usuários...");
  localStorage.removeItem('users');
  localStorage.removeItem('registered_users');
  localStorage.removeItem('user_accounts');
  localStorage.removeItem('user_data');
  
  // 4. Limpar todas as chaves do localStorage que contenham 'user' ou 'auth'
  Object.keys(localStorage).forEach(key => {
    if (key.includes('user') || key.includes('auth') || key.includes('account')) {
      console.log(`Removendo chave: ${key}`);
      localStorage.removeItem(key);
    }
  });
  
  // 5. Limpar cookies que possam estar relacionados à autenticação
  console.log("Limpando cookies...");
  document.cookie.split(";").forEach(function(c) {
    document.cookie = c.replace(/^ +/, "")
      .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
  });
  
  try {
    // 6. Tentar limpar o banco de dados se a função estiver disponível
    console.log("Tentando limpar banco de dados...");
    if (window.db && typeof window.db.close === 'function') {
      // Fechar conexão primeiro
      window.db.close();
    }
    
    if (window.indexedDB) {
      console.log("Usando IndexedDB para excluir banco...");
      // Tentar excluir o banco usando a API IndexedDB diretamente
      const deleteRequest = window.indexedDB.deleteDatabase("astrusDatabase");
      
      deleteRequest.onsuccess = function() {
        console.log("Banco de dados excluído com sucesso!");
      };
      
      deleteRequest.onerror = function(event) {
        console.error("Erro ao excluir banco de dados:", event);
      };
    }
  } catch (error) {
    console.error("Erro ao limpar banco de dados:", error);
    console.log("Continue com o processo de reset mesmo com este erro.");
  }
  
  // 7. Limpar sessionStorage também
  console.log("Limpando sessionStorage...");
  sessionStorage.clear();
  
  console.log("Reset completo! Redirecionando para a página de login...");
  
  // 8. Redirecionar para a página de login
  setTimeout(() => {
    window.location.href = "/login";
  }, 1000);
})(); 