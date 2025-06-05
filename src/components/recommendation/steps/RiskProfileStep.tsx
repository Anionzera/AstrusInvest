import React, { useState, useEffect } from "react";
import { Shield, TrendingUp, Zap, ArrowLeft, InfoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "framer-motion";

interface RiskProfileStepProps {
  initialData?: {
    score: number;
    profile: string;
    questions: Array<{
      id: string;
      answer: string;
      weight: number;
    }>;
  };
  clientAge?: number;
  onUpdateRiskProfile: (data: {
    score: number;
    profile: string;
    questions: Array<{
      id: string;
      answer: string;
      weight: number;
    }>;
  }) => void;
  onNext: () => void;
  onBack: () => void;
}

// Definições de perfil
const RISK_PROFILES = [
  {
    id: "conservador",
    title: "Conservador",
    score: 7,
    icon: <Shield className="h-10 w-10" />,
    description: "Prioriza a segurança e preservação do capital, com baixa tolerância a oscilações de curto prazo.",
    color: "bg-emerald-100 hover:bg-emerald-200 border-emerald-300 text-emerald-800 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 dark:border-emerald-800 dark:text-emerald-400",
    iconBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400",
    advice: "Foco em renda fixa, títulos públicos e fundos de baixa volatilidade.",
    characteristics: [
      "Preferência por segurança",
      "Preservação de capital",
      "Baixa tolerância a perdas",
      "Retornos estáveis"
    ]
  },
  {
    id: "moderado",
    title: "Moderado",
    score: 13,
    icon: <TrendingUp className="h-10 w-10" />,
    description: "Busca equilíbrio entre segurança e rentabilidade, aceitando oscilações moderadas para obter melhores retornos no médio prazo.",
    color: "bg-blue-100 hover:bg-blue-200 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:border-blue-800 dark:text-blue-400",
    iconBg: "bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400",
    advice: "Diversificação entre renda fixa e variável, com exposição controlada a ativos de maior risco.",
    characteristics: [
      "Equilíbrio entre risco e retorno",
      "Diversificação de investimentos",
      "Aceitação de volatilidade moderada",
      "Horizonte de médio prazo"
    ]
  },
  {
    id: "agressivo",
    title: "Arrojado",
    score: 18,
    icon: <Zap className="h-10 w-10" />,
    description: "Busca maximizar retornos a longo prazo, tolerando alta volatilidade e riscos significativos.",
    color: "bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-800 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 dark:border-amber-800 dark:text-amber-400",
    iconBg: "bg-amber-50 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400",
    advice: "Maior alocação em renda variável, com exposição a classes de ativos diversificadas e potencialmente mais voláteis.",
    characteristics: [
      "Foco em valorização de capital",
      "Alta tolerância a riscos",
      "Aceitação de volatilidade significativa",
      "Horizonte de longo prazo"
    ]
  }
];

const RiskProfileStep: React.FC<RiskProfileStepProps> = ({
  initialData,
  clientAge,
  onUpdateRiskProfile,
  onNext,
  onBack
}) => {
  // Estado para armazenar o perfil selecionado
  const [selectedProfile, setSelectedProfile] = useState<string>(initialData?.profile || "");
  
  // Ajustar perfil com base na idade do cliente
  useEffect(() => {
    // Se a idade do cliente for superior a 60 anos, sugerir um perfil mais conservador
    if (clientAge && clientAge > 60 && !initialData?.profile) {
      // Não força a seleção, apenas pré-seleciona como sugestão
      setSelectedProfile("conservador");
    }
  }, [clientAge, initialData]);
  
  // Atualizar o componente pai quando o perfil é selecionado
  useEffect(() => {
    if (selectedProfile) {
      const profile = RISK_PROFILES.find(p => p.id === selectedProfile);
      if (profile) {
        onUpdateRiskProfile({
          score: profile.score,
          profile: profile.id,
          questions: [] // Não há mais questionário
        });
      }
    }
  }, [selectedProfile, onUpdateRiskProfile]);
  
  // Manipulador para seleção de perfil
  const handleProfileSelect = (profileId: string) => {
    setSelectedProfile(profileId);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Perfil de Risco</h2>
          <p className="text-muted-foreground">
            Selecione o perfil de investimento que melhor se adequa ao cliente
          </p>
        </div>
        
        {clientAge && (
          <Badge variant="outline" className="text-xs">
            Idade do cliente: {clientAge} anos
          </Badge>
        )}
      </div>
      
      {/* Informação de recomendação baseada na idade */}
      {clientAge && clientAge > 60 && (
        <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 flex items-start gap-2">
          <InfoIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Perfil recomendado: Conservador</p>
            <p>Com base na idade do cliente de {clientAge} anos, um perfil conservador é geralmente recomendado para proteção de capital.</p>
          </div>
        </div>
      )}
      
      {/* Seleção de perfil de risco com cartões */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {RISK_PROFILES.map((profile) => (
          <motion.div 
            key={profile.id}
            whileHover={{ y: -5 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card 
              className={`h-full cursor-pointer transition-all duration-200 ${
                selectedProfile === profile.id 
                  ? `border-2 ${profile.color} shadow-lg`
                  : `hover:shadow-md border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700`
              }`}
              onClick={() => handleProfileSelect(profile.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className={`p-3 rounded-full ${profile.iconBg}`}>
                    {profile.icon}
                  </div>
                  {selectedProfile === profile.id && (
                    <Badge className="bg-green-500 hover:bg-green-600">Selecionado</Badge>
                  )}
                </div>
                <CardTitle className="text-xl mt-4">{profile.title}</CardTitle>
                <CardDescription className="text-sm line-clamp-2">{profile.description}</CardDescription>
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-2 mt-2">
                  {profile.characteristics.map((characteristic, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        profile.id === "conservador" ? "bg-emerald-500" : 
                        profile.id === "moderado" ? "bg-blue-500" : "bg-amber-500"
                      }`}></span>
                      {characteristic}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      
      {/* Área de recomendação */}
      {selectedProfile && (
        <Card className="mt-4 border-gray-200 dark:border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Sugestão de Alocação</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {RISK_PROFILES.find(p => p.id === selectedProfile)?.advice}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RiskProfileStep; 