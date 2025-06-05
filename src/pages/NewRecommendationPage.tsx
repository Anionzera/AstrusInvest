import React, { useState } from "react";
import AdvancedRecommendationForm from "@/components/recommendation/AdvancedRecommendationForm";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ArrowRight, User, UserPlus } from "lucide-react";
import ClientSelector from "@/components/recommendation/ClientSelector";
import { Cliente } from "@/lib/db";
import { motion, AnimatePresence } from "framer-motion";

export default function NewRecommendationPage() {
  const navigate = useNavigate();
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  const [showRecommendationForm, setShowRecommendationForm] = useState(false);

  const handleClientSelect = (client: Cliente | null) => {
    setSelectedClient(client);
  };

  const handleContinue = () => {
    if (selectedClient) {
      setShowRecommendationForm(true);
    }
  };

  const handleBack = () => {
    setShowRecommendationForm(false);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100 via-indigo-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <AnimatePresence mode="wait">
        {!showRecommendationForm ? (
          <motion.div
            key="client-selection"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="max-w-4xl mx-auto py-8"
          >
            <Card className="shadow-lg border-border/40">
              <CardHeader className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-950/30 dark:to-indigo-950/30 border-b border-border/40">
                <CardTitle className="text-2xl font-bold text-blue-800 dark:text-blue-300 tracking-tight">Nova Recomendação de Investimento</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-300">
                  Selecione um cliente para prosseguir com a recomendação personalizada
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-6 pb-4">
                <div className="space-y-6">
                  <ClientSelector 
                    onClientSelect={handleClientSelect} 
                    selectedClientId={selectedClient?.id} 
                  />
                  
                  {selectedClient === null && (
                    <Alert variant="warning" className="bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800/60">
                      <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                      <AlertTitle>Cliente não selecionado</AlertTitle>
                      <AlertDescription>
                        É necessário selecionar um cliente para continuar com a recomendação.
                        Se o cliente ainda não está cadastrado, você pode cadastrá-lo no gerenciador de clientes.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
              
              <CardFooter className="flex justify-between py-4 border-t border-border/40 bg-gray-50/50 dark:bg-gray-900/20">
                <Button
                  variant="outline"
                  onClick={() => navigate("/clients")}
                  className="gap-1"
                >
                  <UserPlus size={16} />
                  <span>Gerenciar Clientes</span>
                </Button>
                
                <Button
                  onClick={handleContinue}
                  disabled={!selectedClient}
                  className="gap-1"
                >
                  <span>Continuar</span>
                  <ArrowRight size={16} />
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="recommendation-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-4">
              <Button
                variant="outline"
                onClick={handleBack}
                className="gap-1"
              >
                <User size={16} />
                <span>Voltar para seleção de cliente</span>
              </Button>
            </div>
            <AdvancedRecommendationForm 
              initialData={{
                client: {
                  id: selectedClient?.id,
                  name: selectedClient?.nome || "",
                  email: selectedClient?.email || "",
                  age: selectedClient?.idade || 30,
                  income: 0,
                  objetivos: []
                }
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
