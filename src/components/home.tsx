import React, { useState, useEffect } from "react";
import DashboardContent from "./dashboard/DashboardContent";
import { Button } from "./ui/button";
import { Settings, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose
} from "./ui/sheet";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { useAuth } from "./auth/AuthContext";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";

export default function Home() {
  // Configurações do dashboard
  const [dashboardSettings, setDashboardSettings] = useState({
    showQuickActions: true,
    showPerformanceMetrics: true,
    showClientStats: true,
    showRecentRecommendations: true,
    showPortfolioMetrics: true
  });
  
  // Carrega as preferências do usuário se existirem
  useEffect(() => {
    const savedSettings = localStorage.getItem("dashboard-settings");
    if (savedSettings) {
      try {
        setDashboardSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error("Erro ao carregar configurações do dashboard:", e);
      }
    }
  }, []);
  
  // Salva as preferências do usuário
  const updateSetting = (key, value) => {
    const newSettings = { ...dashboardSettings, [key]: value };
    setDashboardSettings(newSettings);
    localStorage.setItem("dashboard-settings", JSON.stringify(newSettings));
  };
  
  // Lista de configurações disponíveis
  const settingOptions = [
    { key: "showQuickActions", label: "Exibir Ações Rápidas" },
    { key: "showPerformanceMetrics", label: "Exibir Métricas de Desempenho" },
    { key: "showClientStats", label: "Exibir Estatísticas de Clientes" },
    { key: "showRecentRecommendations", label: "Exibir Recomendações Recentes" },
    { key: "showPortfolioMetrics", label: "Exibir Métricas de Portfólio" }
  ];
  
  // Obter o usuário atual para debug
  const { user } = useAuth();
  
  return (
    <div className="relative">
      {/* Dashboard principal */}
      <DashboardContent
        customSettings={{
          showQuickActions: dashboardSettings.showQuickActions,
          showPerformanceMetrics: dashboardSettings.showPerformanceMetrics,
          showClientStats: dashboardSettings.showClientStats,
          showRecentRecommendations: dashboardSettings.showRecentRecommendations,
          showPortfolioMetrics: dashboardSettings.showPortfolioMetrics || true
        }}
      />
      
      {/* Botão de configurações discreto no canto superior direito */}
      <Sheet>
        <SheetTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="fixed top-4 right-4 z-50 rounded-full p-2 bg-white/80 dark:bg-gray-800/80 shadow-sm hover:shadow-md backdrop-blur-sm"
            title="Personalizar Dashboard"
          >
            <Settings className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Personalizar Dashboard</SheetTitle>
            <SheetDescription>
              Configure os componentes que deseja exibir no dashboard
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 py-6">
            {settingOptions.map((option) => (
              <div key={option.key} className="flex items-center justify-between space-x-2">
                <Label htmlFor={option.key} className="flex-1">
                  {option.label}
                </Label>
                <Switch
                  id={option.key}
                  checked={dashboardSettings[option.key]}
                  onCheckedChange={(checked) => updateSetting(option.key, checked)}
                />
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => {
                // Resetar para as configurações padrão
                const defaultSettings = {
                  showQuickActions: true,
                  showPerformanceMetrics: true,
                  showClientStats: true,
                  showRecentRecommendations: true,
                  showPortfolioMetrics: true
                };
                setDashboardSettings(defaultSettings);
                localStorage.setItem("dashboard-settings", JSON.stringify(defaultSettings));
              }}
            >
              Restaurar Padrão
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
