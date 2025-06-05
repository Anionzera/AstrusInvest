import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { Settings, Plus, BarChart as BarChartIcon, PieChart as PieChartIcon, LineChart as LineChartIcon, Activity, DollarSign, Users, TrendingUp, X } from "lucide-react";
import { db } from "../../lib/db";
import { useToast } from "../ui/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { ScrollArea } from "../ui/scroll-area";
import { calculateAssetAllocation } from "../../lib/investmentUtils";

interface DashboardItem {
  id: string;
  type: string;
  title: string;
  size: "small" | "medium" | "large";
  position: { x: number; y: number };
  config?: any;
}

const COLORS = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042", 
  "#8884D8", "#82CA9D", "#FF6B6B", "#6B88FF",
  "#8E44AD", "#16A085", "#F39C12", "#E74C3C",
];

const DashboardView: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [clienteCount, setClienteCount] = useState(0);
  const [recomendacaoCount, setRecomendacaoCount] = useState(0);
  const [posicaoCount, setPosicaoCount] = useState(0);
  const [ativoCount, setAtivoCount] = useState(0);
  const [patrimonioTotal, setPatrimonioTotal] = useState(0);
  const [rendimentoMedio, setRendimentoMedio] = useState(0);
  const [alocacaoAtivos, setAlocacaoAtivos] = useState<any[]>([]);
  
  // Estado para controlar os widgets do dashboard
  const [dashboardLayout, setDashboardLayout] = useState<DashboardItem[]>([]);
  const [currentDragItem, setCurrentDragItem] = useState<string | null>(null);
  const [isAddWidgetOpen, setIsAddWidgetOpen] = useState(false);
  const [newWidgetType, setNewWidgetType] = useState("summary");
  
  // Dados simulados para gráficos
  const [rendimentoHistorico, setRendimentoHistorico] = useState<any[]>([]);
  const [distribuicaoClientes, setDistribuicaoClientes] = useState<any[]>([]);
  
  // Layout padrão do dashboard
  const defaultLayout: DashboardItem[] = [
    { id: "summary", type: "summary", title: "Resumo", size: "medium", position: { x: 0, y: 0 } },
    { id: "asset-allocation", type: "pie", title: "Alocação de Ativos", size: "medium", position: { x: 1, y: 0 } },
    { id: "performance", type: "line", title: "Desempenho", size: "large", position: { x: 0, y: 1 } },
    { id: "client-distribution", type: "bar", title: "Distribuição de Clientes", size: "medium", position: { x: 0, y: 2 } }
  ];
  
  useEffect(() => {
    // Carregar layout salvo ou usar o padrão
    const savedLayout = localStorage.getItem("dashboard-layout");
    if (savedLayout) {
      try {
        setDashboardLayout(JSON.parse(savedLayout));
      } catch (e) {
        console.error("Erro ao carregar layout do dashboard:", e);
        setDashboardLayout(defaultLayout);
      }
    } else {
      setDashboardLayout(defaultLayout);
    }
    
    loadDashboardData();
  }, []);
  
  // Salvar layout quando mudar
  useEffect(() => {
    if (dashboardLayout.length > 0) {
      localStorage.setItem("dashboard-layout", JSON.stringify(dashboardLayout));
    }
  }, [dashboardLayout]);
  
  const loadDashboardData = async () => {
    setIsLoading(true);
    
    try {
      // Carregar contagem de clientes
      const clientes = await db.clientes.toArray();
      setClienteCount(clientes.length);
      
      // Carregar contagem de recomendações
      const recomendacoes = await db.recomendacoes.toArray();
      setRecomendacaoCount(recomendacoes.length);
      
      // Carregar informações de posições
      const posicoes = await db.posicoes.toArray();
      setPosicaoCount(posicoes.length);
      
      // Calcular patrimônio total
      const patrimonio = posicoes.reduce((sum, pos) => sum + (pos.valorTotal || 0), 0);
      setPatrimonioTotal(patrimonio);
      
      // Carregar ativos
      const ativos = await db.ativos.toArray();
      setAtivoCount(ativos.length);
      
      // Calcular rendimento médio simulado
      const rendMedio = Math.random() * 0.15 + 0.05; // Entre 5% e 20%
      setRendimentoMedio(rendMedio);
      
      // Gerar dados para alocação de ativos
      try {
        const alocacao = calculateAssetAllocation("Moderado", "Médio Prazo", "Balanceada" as any);
        setAlocacaoAtivos(alocacao);
      } catch (error) {
        console.error("Erro ao calcular alocação de ativos:", error);
        // Dados de fallback para caso falhe a alocação
        setAlocacaoAtivos([
          { name: "Renda Fixa", percentage: 40, color: "#0088FE" },
          { name: "Ações", percentage: 30, color: "#00C49F" },
          { name: "Multimercado", percentage: 15, color: "#FFBB28" },
          { name: "Internacional", percentage: 10, color: "#FF8042" },
          { name: "Outros", percentage: 5, color: "#8884D8" }
        ]);
      }
      
      // Gerar dados simulados para gráficos
      generateHistoricalData();
      generateClientDistribution(clientes);
      
    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar dashboard",
        description: "Não foi possível carregar os dados do dashboard.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Gerar dados históricos simulados
  const generateHistoricalData = () => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const data = [];
    let value = 100;
    
    for (let i = 0; i < 12; i++) {
      const change = (Math.random() * 0.1) - 0.03; // Entre -3% e +7%
      value = value * (1 + change);
      
      data.push({
        name: months[i],
        carteira: Math.round(value * 100) / 100,
        benchmarkCDI: Math.round((100 * (1 + (0.007 * (i + 1)))) * 100) / 100,
        benchmarkIBOV: Math.round((100 * (1 + (0.005 * (i + 1)) + (Math.random() * 0.1) - 0.05)) * 100) / 100,
      });
    }
    
    setRendimentoHistorico(data);
  };
  
  // Gerar distribuição de clientes por perfil
  const generateClientDistribution = (clientes: any[]) => {
    const perfis = {
      "Conservador": 0,
      "Moderado": 0,
      "Arrojado": 0,
      "Agressivo": 0,
      "Não definido": 0
    };
    
    clientes.forEach(cliente => {
      const perfil = cliente.perfilRisco || "Não definido";
      if (perfil in perfis) {
        perfis[perfil]++;
      } else {
        perfis["Não definido"]++;
      }
    });
    
    const data = Object.entries(perfis).map(([name, value]) => ({ name, value }));
    setDistribuicaoClientes(data);
  };
  
  // Iniciar arrastar um widget
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setCurrentDragItem(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };
  
  // Permitir soltar widget
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  
  // Processar soltar widget
  const handleDrop = (e: React.DragEvent, targetPosition: { x: number, y: number }) => {
    e.preventDefault();
    
    if (!currentDragItem) return;
    
    // Encontrar o widget sendo arrastado
    const itemIndex = dashboardLayout.findIndex(item => item.id === currentDragItem);
    if (itemIndex === -1) return;
    
    // Atualizar posição
    const newLayout = [...dashboardLayout];
    newLayout[itemIndex] = { ...newLayout[itemIndex], position: targetPosition };
    
    // Verificar se há colisão com outro widget
    const collidingItemIndex = newLayout.findIndex((item, idx) => 
      idx !== itemIndex && item.position.x === targetPosition.x && item.position.y === targetPosition.y
    );
    
    // Se há colisão, trocar as posições
    if (collidingItemIndex !== -1) {
      newLayout[collidingItemIndex] = { 
        ...newLayout[collidingItemIndex], 
        position: dashboardLayout[itemIndex].position 
      };
    }
    
    setDashboardLayout(newLayout);
    setCurrentDragItem(null);
  };
  
  // Adicionar novo widget
  const handleAddWidget = () => {
    // Encontrar a próxima posição disponível
    const maxY = Math.max(...dashboardLayout.map(item => item.position.y), 0);
    const id = `widget-${Date.now()}`;
    
    const newWidget: DashboardItem = {
      id,
      type: newWidgetType,
      title: getWidgetTitle(newWidgetType),
      size: "medium",
      position: { x: 0, y: maxY + 1 }
    };
    
    setDashboardLayout([...dashboardLayout, newWidget]);
    setIsAddWidgetOpen(false);
  };
  
  // Remover widget
  const handleRemoveWidget = (id: string) => {
    setDashboardLayout(dashboardLayout.filter(item => item.id !== id));
  };
  
  // Obter título com base no tipo
  const getWidgetTitle = (type: string): string => {
    switch (type) {
      case "summary": return "Resumo";
      case "pie": return "Alocação de Ativos";
      case "line": return "Desempenho";
      case "bar": return "Distribuição de Clientes";
      case "metrics": return "Métricas Principais";
      default: return "Novo Widget";
    }
  };
  
  // Renderizar widget com base no tipo
  const renderWidget = (widget: DashboardItem) => {
    const widthClass = widget.size === "small" 
      ? "col-span-1" 
      : (widget.size === "large" ? "col-span-3" : "col-span-2");
    
    return (
      <div 
        key={widget.id}
        className={`${widthClass} row-span-1`}
        style={{ gridColumn: `span ${widget.size === "small" ? 1 : (widget.size === "large" ? 3 : 2)}` }}
        draggable
        onDragStart={(e) => handleDragStart(e, widget.id)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, widget.position)}
      >
        <Card className="h-full">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => handleRemoveWidget(widget.id)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {widget.type === "summary" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Clientes</span>
                  </div>
                  <div className="text-2xl font-bold">{clienteCount}</div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Patrimônio</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                      .format(patrimonioTotal)}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium">Recomendações</span>
                  </div>
                  <div className="text-2xl font-bold">{recomendacaoCount}</div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium">Rendimento</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {(rendimentoMedio * 100).toFixed(2)}%
                  </div>
                </div>
              </div>
            )}
            
            {widget.type === "pie" && (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={alocacaoAtivos}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="percentage"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {alocacaoAtivos.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            
            {widget.type === "line" && (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={rendimentoHistorico}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value}`} />
                    <Legend />
                    <Line type="monotone" dataKey="carteira" stroke="#8884d8" activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="benchmarkCDI" stroke="#82ca9d" />
                    <Line type="monotone" dataKey="benchmarkIBOV" stroke="#ff7300" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            
            {widget.type === "bar" && (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={distribuicaoClientes}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8884d8">
                      {distribuicaoClientes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            
            {widget.type === "metrics" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Sharpe Ratio</span>
                  <span className="font-bold">{(Math.random() * 1.5 + 0.5).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Sortino Ratio</span>
                  <span className="font-bold">{(Math.random() * 2 + 0.7).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Volatilidade</span>
                  <span className="font-bold">{(Math.random() * 15 + 5).toFixed(2)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Máx. Drawdown</span>
                  <span className="font-bold">{(Math.random() * 20 + 10).toFixed(2)}%</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };
  
  // Organizar widgets por posição
  const organizedLayout = [...dashboardLayout].sort((a, b) => {
    if (a.position.y !== b.position.y) {
      return a.position.y - b.position.y;
    }
    return a.position.x - b.position.x;
  });
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">
              Visão geral e análise da carteira
            </p>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline"
              onClick={() => loadDashboardData()}
            >
              Atualizar
            </Button>
            <Button 
              variant="outline"
              onClick={() => setDashboardLayout(defaultLayout)}
            >
              Resetar Layout
            </Button>
            <Button onClick={() => setIsAddWidgetOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Widget
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
            <p className="mt-4 text-muted-foreground">Carregando dashboard...</p>
          </div>
        ) : (
          <div className="grid grid-cols-6 gap-4">
            {organizedLayout.map(renderWidget)}
          </div>
        )}
      </div>
      
      {/* Diálogo para adicionar widget */}
      <Dialog open={isAddWidgetOpen} onOpenChange={setIsAddWidgetOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Adicionar Widget</DialogTitle>
            <DialogDescription>
              Selecione o tipo de widget que deseja adicionar ao dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <RadioGroup 
              value={newWidgetType} 
              onValueChange={setNewWidgetType}
              className="space-y-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="summary" id="summary" />
                <Label htmlFor="summary" className="flex items-center">
                  <DollarSign className="mr-2 h-4 w-4" /> Resumo
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pie" id="pie" />
                <Label htmlFor="pie" className="flex items-center">
                  <PieChartIcon className="mr-2 h-4 w-4" /> Alocação de Ativos
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="line" id="line" />
                <Label htmlFor="line" className="flex items-center">
                  <LineChartIcon className="mr-2 h-4 w-4" /> Desempenho
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bar" id="bar" />
                <Label htmlFor="bar" className="flex items-center">
                  <BarChartIcon className="mr-2 h-4 w-4" /> Distribuição de Clientes
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="metrics" id="metrics" />
                <Label htmlFor="metrics" className="flex items-center">
                  <Activity className="mr-2 h-4 w-4" /> Métricas de Risco
                </Label>
              </div>
            </RadioGroup>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddWidgetOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddWidget}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardView; 