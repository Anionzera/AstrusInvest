import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  User, 
  apiLogin, 
  apiLogout, 
  apiRefreshToken, 
  storeAuthData, 
  clearAuthData, 
  getStoredAuthData, 
  isTokenValid,
  updateUserActivity,
  hasPermission as checkPermission,
  registerUser,
  checkUserExists
} from '@/lib/authService';

// Interface para o contexto de autenticação
interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  createAccount: (data?: any) => Promise<boolean>;
  updateLastActivity: () => void;
  hasPermission: (permission: string) => boolean;
  refreshAuth: () => Promise<boolean>;
}

// Criar o contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Tempo de inatividade máximo (30 minutos em milissegundos)
const MAX_IDLE_TIME = 30 * 60 * 1000;

// Intervalo para verificar a validade do token (a cada 5 minutos)
const TOKEN_CHECK_INTERVAL = 5 * 60 * 1000;

// Provedor do contexto de autenticação
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [lastActivity, setLastActivity] = useState<Date>(new Date());
  const navigate = useNavigate();
  const location = useLocation();

  // Verificar autenticação ao iniciar
  useEffect(() => {
    const checkAuth = () => {
      try {
        // Obter dados de autenticação armazenados
        const authData = getStoredAuthData();
        
        if (authData && authData.token && isTokenValid(authData.token)) {
          // Se os dados são válidos e o token é válido
          setUser(authData.user);
          setToken(authData.token);
          setRefreshToken(authData.refreshToken);
          setIsAuthenticated(true);
        } else if (authData && authData.refreshToken) {
          // Se o token está inválido, mas temos um refresh token
          refreshAuth().catch(() => {
            // Se falhar, limpar dados e redirecionar para login
            handleLogout(false);
          });
        } else {
          // Dados não encontrados ou inválidos
          setIsAuthenticated(false);
          setUser(null);
          setToken(null);
          setRefreshToken(null);
        }
      } catch (error) {
        console.error("Erro ao verificar autenticação:", error);
        setIsAuthenticated(false);
        setUser(null);
        setToken(null);
        setRefreshToken(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  // Monitorar inatividade e verificar validade do token periodicamente
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Verificar inatividade
    const checkUserActivity = () => {
      const now = new Date();
      const timeSinceLastActivity = now.getTime() - lastActivity.getTime();
      
      if (timeSinceLastActivity > MAX_IDLE_TIME) {
        console.log("Sessão expirada por inatividade");
        handleLogout(true);
      }
    };
    
    // Verificar se o token está prestes a expirar e atualizá-lo se necessário
    const checkTokenValidity = async () => {
      if (!token || !refreshToken) return;
      
      try {
        // Se o token não é mais válido, tentar atualizar
        if (!isTokenValid(token)) {
          await refreshAuth();
        }
      } catch (error) {
        console.error("Erro ao verificar validade do token:", error);
        handleLogout(false);
      }
    };
    
    // Configurar intervalos para verificação
    const activityInterval = setInterval(checkUserActivity, 60000); // A cada minuto
    const tokenInterval = setInterval(checkTokenValidity, TOKEN_CHECK_INTERVAL); // A cada 5 minutos
    
    // Limpar intervalos ao desmontar
    return () => {
      clearInterval(activityInterval);
      clearInterval(tokenInterval);
    };
  }, [isAuthenticated, lastActivity, token, refreshToken]);
  
  // Atualizar atividade quando o caminho mudar
  useEffect(() => {
    if (isAuthenticated) {
      handleUpdateLastActivity();
    }
  }, [location.pathname]);

  // Função para atualizar a autenticação com refresh token
  const refreshAuth = async (): Promise<boolean> => {
    if (!refreshToken) return false;
    
    try {
      const response = await apiRefreshToken(refreshToken);
      
      if (response.success && response.token) {
        // Atualizar token no estado e armazenamento
        setToken(response.token);
        
        // Se o usuário existir, atualizar armazenamento
        if (user) {
          storeAuthData({
            token: response.token,
            refreshToken: response.refreshToken || refreshToken,
            user: user
          });
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Erro ao atualizar token:", error);
      return false;
    }
  };

  // Função para realizar login
  const handleLogin = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      const response = await apiLogin(username, password);
      
      if (response.success && response.token && response.user) {
        // Armazenar tokens e dados do usuário
        setToken(response.token);
        setRefreshToken(response.refreshToken || null);
        setUser(response.user);
        
        // Armazenar dados no localStorage
        storeAuthData({
          token: response.token,
          refreshToken: response.refreshToken || '',
          user: response.user
        });
        
        // Atualizar estado
        setIsAuthenticated(true);
        setLastActivity(new Date());
        setIsLoading(false);
        
        return true;
      }
      
      // Falha no login
      setIsLoading(false);
      return false;
    } catch (error) {
      console.error("Erro no processo de login:", error);
      setIsLoading(false);
      return false;
    }
  };

  // Função para realizar logout
  const handleLogout = async (redirect: boolean = true) => {
    console.log("Iniciando processo de logout...");
    
    try {
      // Chamar API de logout
      await apiLogout();
      
      // Limpar dados de autenticação
      clearAuthData();
      
      // Limpar cookies que possam estar relacionados à autenticação
      document.cookie.split(";").forEach(function(c) {
        document.cookie = c.replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      
      // Atualizar estado
      setUser(null);
      setToken(null);
      setRefreshToken(null);
      setIsAuthenticated(false);
      
      if (redirect) {
        // Redirecionar para login
        navigate("/login", { replace: true });
      }
    } catch (error) {
      console.error("Erro durante o logout:", error);
      
      // Forçar limpeza completa
      localStorage.clear();
      sessionStorage.clear();
      
      if (redirect) {
        // Redirecionar para login mesmo em caso de erro
        window.location.href = "/login";
      }
    }
  };
  
  // Função para criar uma nova conta (atualizada para usar as novas funções)
  const handleCreateAccount = async (data?: any): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // Verificar se os dados do usuário são válidos
      if (!data || !data.username) {
        console.error("Dados de usuário inválidos para criação de conta");
        setIsLoading(false);
        return false;
      }
      
      // Verificar se o nome de usuário já existe
      if (checkUserExists(data.username)) {
        console.error("Nome de usuário já existe:", data.username);
        setIsLoading(false);
        return false;
      }
      
      // Registrar o novo usuário
      const registrationSuccess = registerUser(data);
      
      if (!registrationSuccess) {
        console.error("Falha ao registrar usuário");
        setIsLoading(false);
        return false;
      }
      
      // Fazer login com o novo usuário
      const loginSuccess = await handleLogin(data.username, data.password);
      
      setIsLoading(false);
      return loginSuccess;
    } catch (error) {
      console.error("Erro ao criar conta:", error);
      setIsLoading(false);
      return false;
    }
  };
  
  // Função para atualizar a última atividade do usuário
  const handleUpdateLastActivity = () => {
    setLastActivity(new Date());
    updateUserActivity();
  };
  
  // Função para verificar se o usuário tem uma permissão específica
  const handleHasPermission = (permission: string): boolean => {
    return checkPermission(user, permission);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        token,
        login: handleLogin,
        logout: () => handleLogout(true),
        createAccount: handleCreateAccount,
        updateLastActivity: handleUpdateLastActivity,
        hasPermission: handleHasPermission,
        refreshAuth
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook para usar o contexto de autenticação
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  
  return context;
};

export default AuthContext; 