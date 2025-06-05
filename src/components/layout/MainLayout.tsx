import React from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ThemeProvider } from "../ui/theme-provider";
import { Button } from "../ui/button";
import { ThemeToggle } from "../ui/theme-toggle";
import {
  LayoutDashboard,
  PieChart,
  History,
  FileText,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  AlertTriangle,
} from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../auth/AuthContext";

const MainLayout = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const navigate = useNavigate();
  // Usar o contexto de autenticação
  const { logout, user, isAuthenticated } = useAuth();
  
  // Atualizar o header do usuário para mostrar informações do contexto
  const userDisplayName = user?.name || user?.username || "Administrador";
  const userRole = user?.role === "admin" ? "Administrador" : 
                  user?.role === "demonstração" ? "Demonstração" : "Usuário";
  
  // Verificar se é uma conta de demonstração
  const isDemoAccount = user?.isDemoAccount === true || user?.role === "demonstração" || user?.username === "astrus";
  
  // Verificar explicitamente se o usuário tem acesso de administrador
  const hasAdminAccess = user?.isAdmin === true && user?.role === "admin" && !isDemoAccount;
  
  const handleLogout = () => {
    // Usar o método logout do contexto de autenticação
    logout();
  };
  
  // Fechar o menu móvel quando a rota mudar
  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const navigation = [
    {
      name: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
      current: location.pathname === "/",
    },
    {
      name: "Nova Recomendação",
      href: "/recommendation/new",
      icon: PieChart,
      current: location.pathname.includes("/recommendation"),
    },
    {
      name: "Histórico",
      href: "/history",
      icon: History,
      current: location.pathname === "/history",
    },
    {
      name: "Relatórios",
      href: "/report/new",
      icon: FileText,
      current: location.pathname.includes("/report"),
    },
    {
      name: "Clientes",
      href: "/clients",
      icon: Users,
      current: location.pathname === "/clients",
    },
    {
      name: "Configurações",
      href: "/settings",
      icon: Settings,
      current: location.pathname === "/settings",
    },
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const isActive = (href: string) => {
    if (href === "/" && location.pathname === "/") return true;
    if (href !== "/" && location.pathname.startsWith(href)) return true;
    return false;
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Faixa de demonstração - mais destacada e visível */}
      {isDemoAccount && (
        <div className="bg-amber-500 text-black py-3 px-4 text-center font-bold sticky top-0 z-50 flex justify-center items-center space-x-2 shadow-md">
          <AlertTriangle className="h-6 w-6 animate-pulse" />
          <span className="text-lg uppercase tracking-wider">MODO DEMONSTRAÇÃO - As alterações não serão salvas permanentemente</span>
          <AlertTriangle className="h-6 w-6 animate-pulse" />
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar para desktop */}
        <aside className="hidden md:block md:w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800">
          <div className="flex flex-col h-full">
            {/* Logo e título */}
            <div className="px-6 pt-6 pb-4 flex justify-between items-center">
              <Link to="/" className="text-xl font-bold text-blue-600 dark:text-blue-400">
                AstrusInvest
              </Link>
              <ThemeToggle />
            </div>

            {/* Informação do usuário */}
            <div className="px-6 py-4 border-t border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold">
                  {userDisplayName.charAt(0).toUpperCase()}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{userDisplayName}</p>
                  <div className="flex items-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{userRole}</p>
                    {isDemoAccount && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                        Demo
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Menu de navegação */}
            <ScrollArea className="flex-grow">
              <nav className="flex-1 px-2 py-4 space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors ${
                        isActive(item.href)
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                          : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800/50"
                      }`}
                    >
                      <Icon
                        className={`mr-3 flex-shrink-0 h-5 w-5 ${
                          isActive(item.href)
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-gray-500 dark:text-gray-400"
                        }`}
                      />
                      <span className="flex-1">{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </ScrollArea>

            {/* Botão de logout */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={handleLogout}
                className="w-full justify-start text-red-600 dark:text-red-400"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </aside>

        {/* Botão de menu móvel */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMobileMenu}
              className="mr-2"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              AstrusInvest
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* Menu móvel */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, x: -300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -300 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-30 md:hidden"
            >
              <div
                className="fixed inset-0 bg-gray-600 bg-opacity-75"
                onClick={toggleMobileMenu}
              ></div>
              <div className="relative flex-1 flex flex-col max-w-xs w-full pt-16 pb-4 bg-white dark:bg-gray-800">
                {/* Informação do usuário móvel */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold">
                      {userDisplayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{userDisplayName}</p>
                      <div className="flex items-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">{userRole}</p>
                        {isDemoAccount && (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                            Demo
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Menu de navegação móvel */}
                <ScrollArea className="flex-1">
                  <nav className="mt-4 px-2 space-y-1">
                    {navigation.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          className={`flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors ${
                            isActive(item.href)
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                              : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800/50"
                          }`}
                          onClick={toggleMobileMenu}
                        >
                          <Icon
                            className={`mr-3 flex-shrink-0 h-5 w-5 ${
                              isActive(item.href)
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-gray-500 dark:text-gray-400"
                            }`}
                          />
                          <span className="flex-1">{item.name}</span>
                        </Link>
                      );
                    })}
                  </nav>
                </ScrollArea>

                {/* Botão de logout móvel */}
                <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    variant="outline"
                    onClick={handleLogout}
                    className="w-full justify-start text-red-600 dark:text-red-400"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Conteúdo principal */}
        <main className="flex-1 overflow-auto md:pt-0 pt-16">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
