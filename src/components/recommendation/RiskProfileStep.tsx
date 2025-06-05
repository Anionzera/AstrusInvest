import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../ui/card";
import { Button } from "../ui/button";
import { ChevronLeft, ChevronRight, Info, Shield, AlertTriangle, Activity, Clock } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import { Alert, AlertDescription } from "../ui/alert";

interface RiskProfileStepProps {
  onNext?: (profile: string) => void;
  onPrevious?: () => void;
  selectedProfile?: string;
  clientAge?: number;
  investmentObjective?: string;
}

const RiskProfileStep = ({
  onNext = () => {},
  onPrevious = () => {},
  selectedProfile = "moderado",
  clientAge = 35,
  investmentObjective = "wealth",
}: RiskProfileStepProps) => {
  const [selectedRiskProfile, setSelectedRiskProfile] =
    useState<string>(selectedProfile);

  // Função para recomendar um perfil com base na idade e objetivo
  const getRecommendedProfile = () => {
    // Lógica baseada na idade
    let recommendedProfile = "moderado";

    if (clientAge < 30) {
      recommendedProfile = "agressivo";
    } else if (clientAge > 55) {
      recommendedProfile = "conservador";
    }

    // Ajuste baseado no objetivo
    if (investmentObjective === "retirement" && clientAge > 45) {
      recommendedProfile = "conservador";
    } else if (investmentObjective === "reserve") {
      recommendedProfile = "conservador";
    } else if (investmentObjective === "wealth" && clientAge < 40) {
      recommendedProfile = "agressivo";
    }

    return recommendedProfile;
  };

  const handleNext = () => {
    onNext(selectedRiskProfile);
  };

  // Detalhes de cada perfil de risco
  const getProfileDetails = (profile: string) => {
    switch (profile) {
      case "conservador":
        return {
          title: "Conservador",
          icon: <Shield className="h-7 w-7 text-blue-500" />,
          description:
            "Prioriza a preservação de capital e renda estável. Volatilidade mínima, adequado para objetivos de curto a médio prazo.",
          investmentHorizon: "1-3 anos",
          volatility: "Baixa",
          examples: "Tesouro Direto, CDBs, fundos de renda fixa",
          colorScheme: {
            cardBg: "border-blue-100 hover:border-blue-300 dark:hover:border-blue-700",
            selectedBg: "bg-blue-50 border-blue-500 dark:bg-blue-900/30 dark:border-blue-600",
            title: "text-blue-800 dark:text-blue-400",
            checkBg: "bg-blue-500 dark:bg-blue-600",
            meter: "bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900",
            meterFill: "bg-blue-500 dark:bg-blue-600",
          },
          meterValue: "30%",
        };
      case "moderado":
        return {
          title: "Moderado",
          icon: <AlertTriangle className="h-7 w-7 text-amber-500" />,
          description:
            "Busca equilibrar crescimento e preservação. Volatilidade moderada, adequado para objetivos de médio a longo prazo.",
          investmentHorizon: "3-5 anos",
          volatility: "Moderada",
          examples:
            "Ações de dividendos, fundos multimercado, mistura de renda fixa e variável",
          colorScheme: {
            cardBg: "border-amber-100 hover:border-amber-300 dark:hover:border-amber-700",
            selectedBg: "bg-amber-50 border-amber-500 dark:bg-amber-900/30 dark:border-amber-600",
            title: "text-amber-800 dark:text-amber-400",
            checkBg: "bg-amber-500 dark:bg-amber-600",
            meter: "bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900",
            meterFill: "bg-amber-500 dark:bg-amber-600",
          },
          meterValue: "55%",
        };
      case "agressivo":
        return {
          title: "Agressivo",
          icon: <Activity className="h-7 w-7 text-red-500" />,
          description:
            "Foco em crescimento de capital. Maior volatilidade, adequado para objetivos de longo prazo.",
          investmentHorizon: "5+ anos",
          volatility: "Alta",
          examples:
            "Ações growth, small caps, fundos de ações, cripto, investimentos internacionais",
          colorScheme: {
            cardBg: "border-red-100 hover:border-red-300 dark:hover:border-red-700",
            selectedBg: "bg-red-50 border-red-500 dark:bg-red-900/30 dark:border-red-600",
            title: "text-red-800 dark:text-red-400",
            checkBg: "bg-red-500 dark:bg-red-600",
            meter: "bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950 dark:to-red-900",
            meterFill: "bg-red-500 dark:bg-red-600",
          },
          meterValue: "90%",
        };
      default:
        return {
          title: "Moderado",
          icon: <AlertTriangle className="h-7 w-7 text-amber-500" />,
          description:
            "Busca equilibrar crescimento e preservação. Volatilidade moderada, adequado para objetivos de médio a longo prazo.",
          investmentHorizon: "3-5 anos",
          volatility: "Moderada",
          examples:
            "Ações de dividendos, fundos multimercado, mistura de renda fixa e variável",
          colorScheme: {
            cardBg: "border-amber-100 hover:border-amber-300 dark:hover:border-amber-700",
            selectedBg: "bg-amber-50 border-amber-500 dark:bg-amber-900/30 dark:border-amber-600",
            title: "text-amber-800 dark:text-amber-400",
            checkBg: "bg-amber-500 dark:bg-amber-600",
            meter: "bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900",
            meterFill: "bg-amber-500 dark:bg-amber-600",
          },
          meterValue: "55%",
        };
    }
  };

  // Obter perfil recomendado
  const recommendedProfile = getRecommendedProfile();

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-indigo-600"
              >
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            Selecione o Perfil de Risco
          </CardTitle>
          <CardDescription className="dark:text-gray-300">
            Escolha o perfil de risco que melhor corresponde aos objetivos
            de investimento e nível de conforto com as flutuações do mercado.
          </CardDescription>
          {recommendedProfile && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-500 dark:text-blue-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-800 dark:text-blue-300">
                    Recomendação Personalizada
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                    Com base na sua idade ({clientAge} anos) e objetivo de
                    investimento, recomendamos o perfil{" "}
                    <strong className="font-medium">
                      {recommendedProfile === "conservador"
                        ? "Conservador"
                        : recommendedProfile === "moderado"
                          ? "Moderado"
                          : "Agressivo"}
                    </strong>
                    . Esta é apenas uma sugestão, você pode escolher o perfil
                    que melhor se adeque às suas preferências.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <RadioGroup
            className="grid gap-6 pt-2"
            value={selectedRiskProfile}
            onValueChange={setSelectedRiskProfile}
          >
            {["conservador", "moderado", "agressivo"].map((profile) => {
              const profileData = getProfileDetails(profile);
              const isSelected = selectedRiskProfile === profile;
              const isRecommended = recommendedProfile === profile;

              return (
                <Label
                  key={profile}
                  htmlFor={profile}
                  className={`relative flex flex-col cursor-pointer rounded-lg border-2 p-4 transition-all duration-300 hover:shadow-md
                    ${isSelected ? profileData.colorScheme.selectedBg : `${profileData.colorScheme.cardBg} bg-white dark:bg-gray-800`}
                  `}
                >
                  <RadioGroupItem
                    value={profile}
                    id={profile}
                    className="sr-only"
                  />
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      {profileData.icon}
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="flex items-center">
                        <h3 className={`text-lg font-semibold ${profileData.colorScheme.title}`}>
                          {profileData.title}
                        </h3>
                        {isRecommended && (
                          <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                            Recomendado
                          </span>
                        )}
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.2 }}
                            className={`ml-auto w-5 h-5 rounded-full ${profileData.colorScheme.checkBg} flex items-center justify-center`}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-3 w-3 text-white"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </motion.div>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        {profileData.description}
                      </p>

                      <div className="mt-4 space-y-3">
                        <div>
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            Horizonte de investimento ideal
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                              {profileData.investmentHorizon}
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            Nível de risco
                          </span>
                          <div className="mt-1 h-2 w-full rounded-full overflow-hidden ${profileData.colorScheme.meter}">
                            <div
                              className={`h-full rounded-full ${profileData.colorScheme.meterFill}`}
                              style={{ width: profileData.meterValue }}
                            ></div>
                          </div>
                        </div>

                        <div>
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            Exemplos de investimentos
                          </span>
                          <p className="text-sm mt-1 text-gray-700 dark:text-gray-200">
                            {profileData.examples}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Label>
              );
            })}
          </RadioGroup>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onPrevious} className="flex items-center">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <Button 
            onClick={handleNext} 
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            Continuar
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
        {clientAge && clientAge > 60 && (
          <CardFooter>
            <Alert variant="default" className="w-full mt-2 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Considerando a idade do cliente ({clientAge} anos), recomenda-se cautela adicional 
                na exposição a ativos de maior risco.
              </AlertDescription>
            </Alert>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default RiskProfileStep;
