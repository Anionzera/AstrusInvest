import React, { useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowLeft, Lightbulb, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/page-header";
import { DashboardShell } from "@/components/dashboard-shell";
import AdvancedRecommendationForm from "@/components/recommendation/AdvancedRecommendationForm";

// Componente para dicas inteligentes
const SmartTips = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 p-4 rounded-lg border border-blue-100 dark:border-blue-900"
    >
      <div className="flex items-start gap-3">
        <Lightbulb className="h-6 w-6 text-amber-500 flex-shrink-0 mt-1" />
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">Dicas para Recomendações Eficazes</h3>
          
          <div className="space-y-2">
            <div>
              <h4 className="font-medium text-sm">Perfil do Cliente</h4>
              <p className="text-sm text-muted-foreground">
                Fornecer informações detalhadas sobre o histórico de investimentos do cliente 
                melhora significativamente a qualidade da recomendação personalizada.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-sm">Simulação de Cenários</h4>
              <p className="text-sm text-muted-foreground">
                Explore diferentes cenários econômicos para preparar o cliente para 
                diversas condições de mercado, aumentando a confiança na estratégia.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-sm">Conformidade Regulatória</h4>
              <p className="text-sm text-muted-foreground">
                Certifique-se de que todas as divulgações obrigatórias sejam comunicadas 
                claramente ao cliente, conforme exigências da CVM.
              </p>
            </div>
          </div>
          
          <div className="pt-2">
            <Badge variant="outline" className="text-xs bg-white/50 dark:bg-gray-900/50">
              Recomendações Inteligentes
            </Badge>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Componente para informações sobre o histórico de dados
const DataSourceInfo = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-950/50 dark:to-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-800"
    >
      <div className="flex items-start gap-3">
        <Database className="h-6 w-6 text-purple-500 flex-shrink-0 mt-1" />
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">Fontes de Dados</h3>
          
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              O motor de recomendações utiliza múltiplas fontes de dados para gerar análises precisas:
            </p>
            
            <ul className="space-y-1 list-disc pl-4 text-muted-foreground">
              <li>Dados históricos de mercado dos últimos 10 anos</li>
              <li>Perfis comportamentais de investidores similares</li>
              <li>Desempenho passado dos ativos recomendados</li>
              <li>Indicadores macroeconômicos atualizados semanalmente</li>
              <li>Requisitos regulatórios conforme CVM</li>
            </ul>
          </div>
          
          <div className="pt-2">
            <Badge variant="outline" className="text-xs bg-white/50 dark:bg-gray-900/50">
              Atualizado em {new Date().toLocaleDateString('pt-BR')}
            </Badge>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function NewRecommendationPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("form");
  
  const handleSaveRecommendation = async (data: any) => {
    // Simular salvar no banco de dados (implementar chamada real à API)
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log("Recomendação salva:", data);
        toast.success("Recomendação salva com sucesso!");
        resolve(true);
      }, 1500);
    });
  };
  
  return (
    <>
      <Head>
        <title>Nova Recomendação | InvestT</title>
      </Head>
      <DashboardShell>
        <PageHeader>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => router.back()}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                Nova Recomendação
              </h1>
              <p className="text-muted-foreground">
                Utilize o motor de recomendação inteligente para análises personalizadas
              </p>
            </div>
          </div>
        </PageHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Alert className="mb-6">
              <AlertTitle className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Recomendação Inteligente
              </AlertTitle>
              <AlertDescription>
                Este formulário inclui recursos avançados como análise de comportamento histórico, 
                simulação de cenários econômicos e verificação de conformidade regulatória.
              </AlertDescription>
            </Alert>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList>
                <TabsTrigger value="form">Formulário de Recomendação</TabsTrigger>
                <TabsTrigger value="info">Informações & Dicas</TabsTrigger>
              </TabsList>
              
              <TabsContent value="form" className="space-y-4">
                <AdvancedRecommendationForm 
                  onSaveRecommendation={handleSaveRecommendation}
                />
              </TabsContent>
              
              <TabsContent value="info" className="space-y-6">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border shadow-sm">
                    <h2 className="text-xl font-bold mb-4">Sobre o Motor de Recomendação</h2>
                    <p className="text-muted-foreground mb-4">
                      O sistema de recomendação integra análise histórica, simulação de cenários e 
                      conformidade regulatória para oferecer sugestões de investimento altamente personalizadas.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="flex flex-col items-center text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <Badge className="mb-2 bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-800 dark:text-blue-300">Etapa 1</Badge>
                        <h3 className="font-medium mb-1">Análise Personalizada</h3>
                        <p className="text-sm text-muted-foreground">Considera histórico e comportamento do investidor</p>
                      </div>
                      
                      <div className="flex flex-col items-center text-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                        <Badge className="mb-2 bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-800 dark:text-amber-300">Etapa 2</Badge>
                        <h3 className="font-medium mb-1">Simulação de Cenários</h3>
                        <p className="text-sm text-muted-foreground">Projeta resultados em diferentes condições econômicas</p>
                      </div>
                      
                      <div className="flex flex-col items-center text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <Badge className="mb-2 bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-800 dark:text-green-300">Etapa 3</Badge>
                        <h3 className="font-medium mb-1">Validação Regulatória</h3>
                        <p className="text-sm text-muted-foreground">Garante conformidade com normas da CVM</p>
                      </div>
                    </div>
                    
                    <Separator className="my-6" />
                    
                    <div className="space-y-4">
                      <SmartTips />
                      <DataSourceInfo />
                    </div>
                  </div>
                </motion.div>
              </TabsContent>
            </Tabs>
          </div>
          
          <div className="hidden md:block">
            <div className="space-y-6 sticky top-20">
              <SmartTips />
              <DataSourceInfo />
            </div>
          </div>
        </div>
      </DashboardShell>
    </>
  );
} 