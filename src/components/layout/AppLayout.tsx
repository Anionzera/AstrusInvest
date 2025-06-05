import React, { useState, useEffect, createContext, useContext } from "react";
import { Outlet, Link, useLocation, useNavigate, Navigate } from "react-router-dom";
import {
  BarChart,
  History,
  Home,
  PieChart,
  Settings,
  FileText,
  Menu,
  ArrowLeft,
  Sun,
  Moon,
  Users,
  Database,
  HelpCircle,
  ChevronRight,
  LogOut,
  BarChart3,
  X,
  Briefcase,
  User,
  CheckSquare,
  Bell,
  Calculator,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../ui/theme-provider";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";
import { useAuth } from "../auth/AuthContext";
import { SideNav } from "./SideNav";
import PageLoading from "../ui/page-loading";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Criar contexto para o estado de colapso do menu
export const SidebarContext = createContext<{
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}>({
  collapsed: false,
  setCollapsed: () => {},
});

// Hook para usar o contexto da barra lateral
export const useSidebar = () => useContext(SidebarContext);

interface AppLayoutProps {
  children?: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { logout, user, isAuthenticated, isLoading } = useAuth();
  const isFirstRender = React.useRef(true);

  useEffect(() => {
    // Fechar menu móvel quando a rota mudar
    setMobileMenuOpen(false);

    // Verificar tamanho da tela ao iniciar
    const checkScreenSize = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      }
    };
    
    checkScreenSize();
    
    // Adicionar listener para redimensionamento
    window.addEventListener('resize', checkScreenSize);
    
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, [location.pathname]);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === "light" ? "dark" : "light");
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleLogout = () => {
    logout();
  };

  const navigation = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "Nova Recomendação", href: "/recommendation/new", icon: PieChart },
    { name: "Valuation", href: "/valuation", icon: Calculator },
    { name: "Performance", href: "/performance", icon: BarChart3 },
    { name: "Histórico", href: "/history", icon: History },
    { name: "Aprovações", href: "/approvals", icon: CheckSquare },
    { name: "Relatórios", href: "/report/new", icon: FileText },
    { name: "Estatística", href: "/analysis", icon: BarChart },
    { name: "Clientes", href: "/clients", icon: Users },
    { name: "Portfólios", href: "/portfolios", icon: Briefcase },
    { name: "Configurações", href: "/settings", icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  if (isLoading) {
    return <PageLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <SidebarContext.Provider value={{ collapsed: sidebarCollapsed, setCollapsed: setSidebarCollapsed }}>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
        {/* SideNav - Visível apenas no desktop */}
        <div className="hidden md:block">
          <SideNav />
        </div>

        <motion.div 
          className="flex flex-col w-full h-full overflow-hidden"
          animate={{ 
            marginLeft: 0 
          }}
          transition={{ duration: 0.2 }}
        >
          {/* Mobile Header */}
          <header className="md:hidden flex items-center justify-between bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 z-30">
            <div className="flex items-center">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mr-2"
                    aria-label="Menu"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="w-[80%] p-0 bg-white dark:bg-gray-800"
                >
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center">
                        <img
                          className="h-8 w-auto"
                          src="/logo.png"
                          alt="ASTRUS Investimentos"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = "/logo-fallback.svg";
                          }}
                        />
                        <h1 className="ml-2 text-xl font-semibold text-gray-900 dark:text-white">
                          ASTRUS Investimentos
                        </h1>
                      </div>
                    </div>

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
                              {isActive(item.href) && (
                                <ChevronRight className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                              )}
                            </Link>
                          );
                        })}
                      </nav>
                    </ScrollArea>

                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        onClick={handleLogout}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                ASTRUS Investimentos
              </h1>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                onClick={toggleTheme}
                className="h-9 w-9 rounded-full"
              >
                {resolvedTheme === "dark" ? (
                  <Sun className="h-4 w-4 text-amber-500" />
                ) : (
                  <Moon className="h-4 w-4 text-blue-600" />
                )}
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full">
                    <Bell className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                    <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center">
                      3
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Notificações</span>
                    <span className="text-xs text-muted-foreground">3 novas</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem className="py-2">
                      <div className="flex items-start gap-3">
                        <PieChart className="h-5 w-5 text-blue-500 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">Nova recomendação</p>
                          <p className="text-xs text-muted-foreground">Recomendação para o cliente João Silva foi criada</p>
                          <p className="text-xs text-blue-500 mt-1">Há 2 horas</p>
                        </div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="py-2">
                      <div className="flex items-start gap-3">
                        <Users className="h-5 w-5 text-green-500 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">Cliente atualizado</p>
                          <p className="text-xs text-muted-foreground">Maria Oliveira atualizou suas informações</p>
                          <p className="text-xs text-blue-500 mt-1">Há 3 horas</p>
                        </div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="py-2">
                      <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-amber-500 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">Relatório gerado</p>
                          <p className="text-xs text-muted-foreground">Relatório de desempenho Q1 está pronto</p>
                          <p className="text-xs text-blue-500 mt-1">Há 5 horas</p>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link to="/history" className="flex justify-center text-blue-500 font-medium text-sm">
                        Ver histórico de recomendações
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button
                variant="outline"
                size="icon"
                onClick={handleGoBack}
                className="h-9 w-9 rounded-full"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={handleLogout}
                className="h-9 w-9 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                title="Sair"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>

          {/* Desktop Header */}
          <header className="hidden md:flex items-center justify-between bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 z-30">
            <div className="flex items-center">
              <img
                className="h-8 w-auto mr-2"
                src="/logo.png"
                alt="ASTRUS Investimentos"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = "/logo-fallback.svg";
                }}
              />
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {sidebarCollapsed ? "ASTRUS Investimentos" : ""}
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              {/* Informações do usuário logado */}
              <div className="flex items-center mr-4">
                <User className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {user?.name || user?.username || 'Usuário'}
                  {user?.isAdmin && (
                    <span className="ml-2 text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                      Admin
                    </span>
                  )}
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={toggleTheme}
                className="h-9 px-3"
              >
                {resolvedTheme === "dark" ? (
                  <Sun className="h-4 w-4 text-amber-500 mr-2" />
                ) : (
                  <Moon className="h-4 w-4 text-blue-600 mr-2" />
                )}
                {resolvedTheme === "dark" ? "Modo Claro" : "Modo Escuro"}
              </Button>
              
              <Button
                variant="destructive"
                size="sm"
                onClick={handleLogout}
                className="h-9"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
            <Outlet />
            {children}
          </main>
        </motion.div>
      </div>
    </SidebarContext.Provider>
  );
};

export default AppLayout;
