import React from "react";
import { Link } from "react-router-dom";
import {
  PlusCircle,
  History,
  FileText,
  Users,
  Settings,
  BarChart,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../ui/card";
import { Button } from "../ui/button";

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  to: string;
  buttonText: string;
  variant?:
    | "default"
    | "secondary"
    | "outline"
    | "destructive"
    | "ghost"
    | "link";
}

const QuickActionCard = ({
  title = "Título da Ação",
  description = "Descrição desta ação rápida",
  icon = <PlusCircle className="h-8 w-8" />,
  to = "/",
  buttonText = "Ir",
  variant = "default",
}: QuickActionCardProps) => {
  return (
    <Card className="w-full h-full bg-white dark:bg-gray-800 hover:shadow-lg transition-all duration-300 dark:border-gray-700 flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="text-primary dark:text-primary">{icon}</div>
          <CardTitle className="dark:text-white">{title}</CardTitle>
        </div>
        <CardDescription className="dark:text-gray-300">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="h-16 flex items-center justify-center">
          {/* Placeholder for any additional content */}
        </div>
      </CardContent>
      <CardFooter>
        <Button
          variant="default"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          asChild
        >
          <Link to={to}>{buttonText}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

interface QuickActionsProps {
  actions?: QuickActionCardProps[];
}

const QuickActions = ({
  actions = [
    {
      title: "Criar Nova Recomendação",
      description: "Iniciar uma nova recomendação de alocação de investimentos",
      icon: <PlusCircle className="h-8 w-8" />,
      to: "/recommendation/new",
      buttonText: "Criar Nova",
      variant: "default",
    },
    {
      title: "Ver Histórico",
      description: "Acessar recomendações geradas anteriormente",
      icon: <History className="h-8 w-8" />,
      to: "/history",
      buttonText: "Ver Histórico",
      variant: "default",
    },
    {
      title: "Gerar Relatório",
      description:
        "Criar um relatório PDF personalizado a partir dos dados existentes",
      icon: <FileText className="h-8 w-8" />,
      to: "/report/new",
      buttonText: "Gerar",
      variant: "default",
    },
    {
      title: "Gestão de Clientes",
      description: "Cadastrar e gerenciar clientes do escritório",
      icon: <Users className="h-8 w-8" />,
      to: "/clients",
      buttonText: "Gerenciar",
      variant: "default",
    },
    {
      title: "Análise de Portfólio",
      description: "Visualizar análises detalhadas do portfólio",
      icon: <BarChart className="h-8 w-8" />,
      to: "/analysis",
      buttonText: "Analisar",
      variant: "default",
    },
  ],
}: QuickActionsProps) => {
  return (
    <div className="w-full bg-gray-50 dark:bg-gray-900 p-6 rounded-lg shadow-sm">
      <h2 className="text-2xl font-bold mb-6 dark:text-white">Ações Rápidas</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-[220px]">
        {actions.map((action, index) => (
          <QuickActionCard key={index} {...action} />
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
