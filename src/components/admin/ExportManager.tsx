import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { useToast } from "../ui/use-toast";
import { Badge } from "../ui/badge";
import { useAuth } from "../auth/AuthContext";
import { ArrowLeft, Download, FileJson, FileSpreadsheet, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

const ExportManager = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("csv");
  const [selectedEntity, setSelectedEntity] = useState("clientes");
  
  // Verificar permissões do administrador ao iniciar
  useEffect(() => {
    if (!user || !user.isAdmin) {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Você precisa ter privilégios de administrador para acessar esta página."
      });
      navigate("/");
    }
  }, [user, navigate, toast]);

  const handleExport = (format: string) => {
    toast({
      title: "Exportação iniciada",
      description: `Exportando ${selectedEntity} em formato ${format.toUpperCase()}.`
    });
    
    // Simulação de exportação
    setTimeout(() => {
      toast({
        title: "Exportação concluída",
        description: `Arquivo ${selectedEntity}_export.${format} gerado com sucesso.`
      });
    }, 1500);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Exportação de Dados</h1>
          <p className="text-muted-foreground">
            Exporte dados do sistema em diferentes formatos
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Painel
          </Button>
          <Badge variant={user?.hasRealAdminAccess ? "default" : "outline"} className="ml-2">
            {user?.hasRealAdminAccess ? "Admin Completo" : "Acesso Limitado"}
          </Badge>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Seleção de Dados</CardTitle>
            <CardDescription>
              Escolha qual entidade deseja exportar
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="entity">Entidade</Label>
                <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma entidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clientes">Clientes</SelectItem>
                    <SelectItem value="recomendacoes">Recomendações</SelectItem>
                    <SelectItem value="portfolios">Portfólios</SelectItem>
                    <SelectItem value="analises">Análises de Risco</SelectItem>
                    <SelectItem value="transacoes">Transações</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="p-4 bg-muted rounded-md">
                <p className="text-sm font-medium mb-2">Informações da entidade</p>
                <p className="text-sm text-muted-foreground">
                  {selectedEntity === "clientes" && "Dados dos clientes, incluindo informações de contato e perfil."}
                  {selectedEntity === "recomendacoes" && "Recomendações de investimento geradas pelo sistema."}
                  {selectedEntity === "portfolios" && "Portfólios de investimentos dos clientes."}
                  {selectedEntity === "analises" && "Análises de risco realizadas para os clientes."}
                  {selectedEntity === "transacoes" && "Histórico de transações realizadas."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Formato de Exportação</CardTitle>
            <CardDescription>
              Escolha o formato para exportar os dados
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="csv">
                  <FileText className="h-4 w-4 mr-2" />
                  CSV
                </TabsTrigger>
                <TabsTrigger value="excel">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Excel
                </TabsTrigger>
                <TabsTrigger value="json">
                  <FileJson className="h-4 w-4 mr-2" />
                  JSON
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="csv">
                <div className="p-4 bg-muted rounded-md mb-4">
                  <p className="text-sm font-medium mb-2">Formato CSV</p>
                  <p className="text-sm text-muted-foreground">
                    Arquivo de texto com valores separados por vírgula, compatível com Excel e outras planilhas.
                  </p>
                </div>
                <Button className="w-full" onClick={() => handleExport('csv')}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar como CSV
                </Button>
              </TabsContent>
              
              <TabsContent value="excel">
                <div className="p-4 bg-muted rounded-md mb-4">
                  <p className="text-sm font-medium mb-2">Formato Excel</p>
                  <p className="text-sm text-muted-foreground">
                    Arquivo .xlsx nativo do Microsoft Excel, com formatação e múltiplas planilhas.
                  </p>
                </div>
                <Button className="w-full" onClick={() => handleExport('xlsx')}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar como Excel
                </Button>
              </TabsContent>
              
              <TabsContent value="json">
                <div className="p-4 bg-muted rounded-md mb-4">
                  <p className="text-sm font-medium mb-2">Formato JSON</p>
                  <p className="text-sm text-muted-foreground">
                    Arquivo estruturado em formato JSON, ideal para integração com sistemas e APIs.
                  </p>
                </div>
                <Button className="w-full" onClick={() => handleExport('json')}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar como JSON
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExportManager; 