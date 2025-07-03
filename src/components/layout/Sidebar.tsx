import React from "react";
import { Link } from "react-router-dom";
import {
  Home,
  PieChart,
  History,
  Settings,
  Menu,
  BarChart3,
  Brain,
} from "lucide-react";
import { Button } from "../ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import Logo from "./Logo";

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

const Sidebar = ({ collapsed = false, onToggle = () => {} }: SidebarProps) => {
  const navItems = [
    { icon: Home, label: "Dashboard", path: "/" },
    {
      icon: PieChart,
      label: "Nova Recomendação",
      path: "/recommendation/new",
    },
    { icon: Brain, label: "Otimização IA", path: "/optimization" },
    { icon: History, label: "Histórico", path: "/history" },
    { icon: Settings, label: "Configurações", path: "/settings" },
    { icon: BarChart3, label: "Estatísticas", path: "/analysis" },
  ];

  return (
    <div className="h-full min-h-screen w-[280px] bg-slate-900 text-white flex flex-col border-r border-slate-800">
      <div className="p-4 flex items-center justify-between border-b border-slate-800">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Logo />
          </div>
        )}
        {collapsed && <Logo className="mx-auto" />}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <nav className="flex-1 py-6">
        <ul className="space-y-2 px-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <TooltipProvider>
                <Tooltip>
                  <Link to={item.path}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        className={`w-full justify-${collapsed ? "center" : "start"} text-slate-300 hover:text-white hover:bg-slate-800`}
                      >
                        <item.icon className="h-5 w-5 mr-2" />
                        {!collapsed && <span>{item.label}</span>}
                      </Button>
                    </TooltipTrigger>
                  </Link>
                  {collapsed && (
                    <TooltipContent side="right">
                      <p>{item.label}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;
