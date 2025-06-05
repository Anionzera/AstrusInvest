import {
  apiLogin,
  apiRefreshToken,
  storeAuthData,
  clearAuthData,
  getStoredAuthData,
  hasPermission,
  isTokenValid
} from '../lib/authService';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

// Assign mock to global object
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Auth Service', () => {
  // Limpar o localStorage antes de cada teste
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('apiLogin', () => {
    it('should return success for admin login', async () => {
      const result = await apiLogin('Anion', 'Astrus@12!');
      
      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user?.role).toBe('admin');
      expect(result.user?.isAdmin).toBe(true);
    });

    it('should return failure for invalid credentials', async () => {
      const result = await apiLogin('invalid', 'invalid');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Storage Functions', () => {
    it('should store and retrieve auth data correctly', () => {
      const authData = {
        token: 'test-token',
        refreshToken: 'test-refresh-token',
        user: {
          id: 'user-123',
          username: 'testuser',
          role: 'user',
          loginTime: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          isAdmin: false,
          hasAdminAccess: false,
          hasRealAdminAccess: false
        }
      };

      // Armazenar dados
      storeAuthData(authData);
      
      // Verificar se os dados foram armazenados corretamente
      expect(localStorage.getItem('auth_token')).toBe(authData.token);
      expect(localStorage.getItem('refresh_token')).toBe(authData.refreshToken);
      expect(localStorage.getItem('user_data')).toBe(JSON.stringify(authData.user));
      
      // Recuperar dados
      const retrievedData = getStoredAuthData();
      
      expect(retrievedData).not.toBeNull();
      expect(retrievedData?.token).toBe(authData.token);
      expect(retrievedData?.refreshToken).toBe(authData.refreshToken);
      expect(retrievedData?.user.username).toBe(authData.user.username);
    });

    it('should clear auth data correctly', () => {
      // Primeiro armazenar alguns dados
      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem('refresh_token', 'test-refresh-token');
      localStorage.setItem('user_data', '{"username":"test"}');
      localStorage.setItem('auth', 'true');
      
      // Limpar dados
      clearAuthData();
      
      // Verificar se tudo foi limpo
      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
      expect(localStorage.getItem('user_data')).toBeNull();
      expect(localStorage.getItem('auth')).toBeNull();
    });
  });

  describe('Permission Check', () => {
    it('should return true when user has specific permission', () => {
      const user = {
        id: 'user-123',
        username: 'testuser',
        role: 'user',
        loginTime: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        isAdmin: false,
        hasAdminAccess: false,
        hasRealAdminAccess: false,
        permissions: ['client:read', 'client:write']
      };
      
      expect(hasPermission(user, 'client:read')).toBe(true);
    });

    it('should return false when user does not have specific permission', () => {
      const user = {
        id: 'user-123',
        username: 'testuser',
        role: 'user',
        loginTime: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        isAdmin: false,
        hasAdminAccess: false,
        hasRealAdminAccess: false,
        permissions: ['client:read']
      };
      
      expect(hasPermission(user, 'client:write')).toBe(false);
    });

    it('should return true for admin users regardless of permission', () => {
      const user = {
        id: 'admin-123',
        username: 'admin',
        role: 'admin',
        loginTime: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        isAdmin: true,
        hasAdminAccess: true,
        hasRealAdminAccess: true,
        permissions: []
      };
      
      expect(hasPermission(user, 'any-permission')).toBe(true);
    });

    it('should return false when user is null', () => {
      expect(hasPermission(null, 'client:read')).toBe(false);
    });
  });
}); 