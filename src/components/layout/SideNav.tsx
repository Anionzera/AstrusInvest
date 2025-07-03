import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { SidebarContext } from "./AppLayout";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Briefcase,
  TrendingUp,
  Settings,
  Wrench,
  LifeBuoy,
  Database,
  Save,
  FileText,
  LogOut,
  ChevronLeft,
  ChevronRight,
  PieChart,
  ListTodo,
  History,
  CheckSquare,
  HelpCircle,
  ShieldAlert,
  Calculator,
  Brain
} from "lucide-react";

// Interface para os itens de navegação
interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  indicator?: React.ReactNode;
  description?: string;
}

// Interface para os grupos de navegação
interface NavGroup {
  title: string;
  items: NavItem[];
}

// Componente NavLink para menu de navegação
interface NavLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  indicator?: React.ReactNode;
  isActive: boolean;
  collapsed: boolean;
  description?: string;
}

const NavLink: React.FC<NavLinkProps> = ({ 
  to, 
  icon, 
  label, 
  indicator, 
  isActive,
  collapsed,
  description
}) => {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to={to}
            className={`
              flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
              ${isActive 
                ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground" 
                : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800/50"}
              ${collapsed ? "justify-center" : ""}
            `}
          >
            <div className={`${isActive ? "text-primary dark:text-primary" : "text-gray-500 dark:text-gray-400"}`}>
              {icon}
            </div>
            
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.span 
                  className="flex-1 ml-3"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {label}
                </motion.span>
              )}
            </AnimatePresence>
            
            {!collapsed && indicator}
          </Link>
        </TooltipTrigger>
        {collapsed && (
          <TooltipContent side="right" className="flex flex-col">
            <p className="font-medium">{label}</p>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};

// Componente para grupo de navegação
interface NavGroupProps {
  title: string;
  children: React.ReactNode;
  collapsed: boolean;
}

const NavGroup: React.FC<NavGroupProps> = ({ title, children, collapsed }) => {
  return (
    <div className="py-2">
      {!collapsed && (
        <h2 className="mb-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {title}
        </h2>
      )}
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );
};

export function SideNav() {
  const { user, logout } = useAuth();
  const location = useLocation();
  // Usar o contexto do SidebarContext em vez de estado local
  const { collapsed, setCollapsed } = React.useContext(SidebarContext);

  // Verificação das permissões de administrador
  const isAdmin = user?.isAdmin === true || user?.role === "admin";
  const isRealAdmin = user?.hasRealAdminAccess === true || (user?.role === "admin" && user?.username === "Anion");

  // Função para lidar com o logout
  const handleLogout = () => {
    logout();
  };

  // Verificar se uma rota está ativa
  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  // Definição dos grupos de navegação
  const dashboardGroup: NavGroup = {
    title: "Principal",
    items: [
      {
        to: "/",
        icon: <LayoutDashboard className="h-5 w-5" />,
        label: "Dashboard",
        description: "Visão geral da carteira e clientes"
      }
    ]
  };

  const clientsGroup: NavGroup = {
    title: "Clientes",
    items: [
      {
        to: "/clients",
        icon: <Users className="h-5 w-5" />,
        label: "Gerenciar Clientes",
        description: "Cadastro e gestão de clientes"
      },
      {
        to: "/portfolios",
        icon: <Briefcase className="h-5 w-5" />,
        label: "Portfólios",
        description: "Carteiras de investimentos"
      }
    ]
  };

  const recommendationsGroup: NavGroup = {
    title: "Investimentos",
    items: [
      {
        to: "/recommendation/new",
        icon: <PieChart className="h-5 w-5" />,
        label: "Nova Recomendação",
        description: "Criar nova recomendação de investimento"
      },
      {
        to: "/valuation",
        icon: <Calculator className="h-5 w-5" />,
        label: "Valuation",
        description: "Análise fundamentalista e precificação de ativos"
      },
      {
        to: "/report/new",
        icon: <FileText className="h-5 w-5" />,
        label: "Gerar Relatório",
        description: "Gerar relatórios personalizados"
      }
    ]
  };

  const historyGroup: NavGroup = {
    title: "Histórico",
    items: [
      {
        to: "/history",
        icon: <ListTodo className="h-5 w-5" />,
        label: "Recomendações",
        description: "Histórico de recomendações"
      }
    ]
  };

  const analysisGroup: NavGroup = {
    title: "Estatística",
    items: [
      {
        to: "/analysis",
        icon: <TrendingUp className="h-5 w-5" />,
        label: "Estatísticas",
        description: "Análises e projeções de mercado"
      },
      {
        to: "/market",
        icon: <BarChart3 className="h-5 w-5" />,
        label: "Mercado",
        description: "Dados e análise de mercado em tempo real"
      },
      {
        to: "/performance",
        icon: <PieChart className="h-5 w-5" />,
        label: "Performance",
        description: "Análise avançada de performance com pyfolio e empyrical"
      },
      {
        to: "/optimization",
        icon: <Brain className="h-5 w-5" />,
        label: "Otimização IA",
        description: "Otimização avançada de portfólio com SKFolio e IA"
      }
    ]
  };

  const settingsGroup: NavGroup = {
    title: "Sistema",
    items: [
      {
        to: "/settings",
        icon: <Settings className="h-5 w-5" />,
        label: "Configurações",
        description: "Configurações da aplicação"
      },
      {
        to: "/backup",
        icon: <Save className="h-5 w-5" />,
        label: "Backup",
        description: "Backup e restauração de dados"
      },
      {
        to: "/documentation",
        icon: <HelpCircle className="h-5 w-5" />,
        label: "Ajuda",
        description: "Documentação e guias"
      }
    ]
  };

  const adminGroup: NavGroup = {
    title: "Administração",
    items: [
      {
        to: "/admin",
        icon: <ShieldAlert className="h-5 w-5" />,
        label: "Painel Admin",
        description: "Gerenciamento administrativo",
        indicator: (
          <Badge variant="default" className="ml-auto h-5 rounded px-1 text-xs">
            Admin
          </Badge>
        )
      }
    ]
  };

  const allGroups = [
    dashboardGroup,
    clientsGroup,
    recommendationsGroup,
    historyGroup,
    analysisGroup,
    settingsGroup
  ];

  // Adicionar grupo admin se usuário tiver permissão
  if (isAdmin || isRealAdmin) {
    allGroups.push(adminGroup);
  }

  return (
    <motion.div 
      className="h-full border-r border-border bg-background relative"
      animate={{ 
        width: collapsed ? 70 : 240 
      }}
      transition={{ duration: 0.2 }}
    >
      <div className={`p-4 border-b border-gray-200 dark:border-gray-700 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <>
            <img
              className="h-8 w-auto"
              src="/logo.png"
              alt="ASTRUS Capital"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = "/logo-fallback.svg";
              }}
            />
            <h1 className="ml-2 text-xl font-semibold text-gray-900 dark:text-white">
              ASTRUS
            </h1>
          </>
        )}
        {collapsed && (
          <img
            className="h-8 w-auto"
            src="/logo-icon.png"
            alt="ASTRUS"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.src = "/favicon.ico";
            }}
          />
        )}
        
        <Button
          variant="ghost"
          size="sm"
          className={`rounded-full p-1 ${collapsed ? 'ml-0' : 'ml-auto'}`}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <ScrollArea className={`h-[calc(100vh-10rem)] ${collapsed ? 'px-1' : 'px-2'}`}>
        {allGroups.map((group, index) => (
          <React.Fragment key={group.title}>
            <NavGroup title={group.title} collapsed={collapsed}>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  icon={item.icon}
                  label={item.label}
                  indicator={item.indicator}
                  isActive={isActive(item.to)}
                  collapsed={collapsed}
                  description={item.description}
                />
              ))}
            </NavGroup>
            {index < allGroups.length - 1 && <Separator className="my-2" />}
          </React.Fragment>
        ))}
      </ScrollArea>
      
      {/* Botão de logout na parte inferior do menu lateral */}
      <div className={`absolute bottom-0 left-0 w-full p-2 border-t border-gray-200 dark:border-gray-700 ${collapsed ? 'flex justify-center' : ''}`}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="destructive" 
                className={`${collapsed ? 'w-10 h-10 p-0' : 'w-full justify-start'}`}
                onClick={handleLogout}
              >
                <LogOut className={`h-4 w-4 ${collapsed ? '' : 'mr-2'}`} />
                {!collapsed && "Sair da conta"}
              </Button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">
                <p>Sair da conta</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </motion.div>
  );
} 