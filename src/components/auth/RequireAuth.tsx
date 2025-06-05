import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { LoadingSpinner } from '../ui/loading-spinner';

interface RequireAuthProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requiredPermissions?: string[]; // Lista de permissões necessárias para acessar a rota
}

/**
 * Componente que protege rotas que exigem autenticação.
 * Também pode verificar permissões específicas ou restringir acesso a admins.
 */
const RequireAuth: React.FC<RequireAuthProps> = ({ 
  children, 
  requireAdmin = false,
  requiredPermissions = []
}) => {
  const { isAuthenticated, isLoading, user, hasPermission, updateLastActivity } = useAuth();
  const location = useLocation();

  // Atualizar atividade quando o componente montar
  useEffect(() => {
    if (isAuthenticated) {
      updateLastActivity();
    }
  }, [isAuthenticated, updateLastActivity]);

  // Verificar permissões quando necessário
  const checkPermissions = (): boolean => {
    // Se não requer nenhuma permissão especial, conceder acesso
    if (!requireAdmin && requiredPermissions.length === 0) return true;
    
    // Se não há usuário logado, negar acesso
    if (!user) return false;
    
    // Verificar se é admin quando necessário
    if (requireAdmin) {
      const isUserAdmin = user.isAdmin === true || user.role === "admin";
      
      // Se requerer admin e o usuário não for admin, negar acesso
      if (!isUserAdmin) return false;
    }
    
    // Verificar permissões específicas
    if (requiredPermissions.length > 0) {
      // Deve ter TODAS as permissões listadas
      for (const permission of requiredPermissions) {
        if (!hasPermission(permission)) {
          console.log(`Acesso negado: falta permissão ${permission}`);
          return false;
        }
      }
    }
    
    // Se passou por todas as verificações, conceder acesso
    return true;
  };

  // Se estiver carregando, mostrar indicador
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">Verificando permissões...</span>
      </div>
    );
  }

  // Se não estiver autenticado, redirecionar para login com a rota atual como state
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // Verificar permissões
  const hasPermissions = checkPermissions();
  
  // Se não tiver permissão, redirecionar para dashboard com mensagem de erro
  if (!hasPermissions) {
    // Em um sistema real, poderíamos armazenar uma mensagem de erro para exibir após o redirecionamento
    return <Navigate to="/" state={{ error: "Acesso negado: permissões insuficientes" }} replace />;
  }

  // Se estiver autenticado e com permissões adequadas, mostrar o conteúdo
  return <>{children}</>;
};

export default RequireAuth; 