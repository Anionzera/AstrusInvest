import React, { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, Coins, Target, DollarSign, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../ui/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ClientSelector from "./ClientSelector";
import { Cliente, db } from "@/lib/db";

const formSchema = z.object({
  clientName: z.string().min(1, "Nome do cliente é obrigatório"),
  clientAge: z.coerce.number().int().min(18).max(100),
  investmentObjective: z.string().min(1, "Objetivo é obrigatório"),
  investmentValue: z.coerce.number().positive("Valor deve ser maior que zero"),
});

type ClientInfoFormValues = z.infer<typeof formSchema>;

interface ClientInfoStepProps {
  onNext?: (data: {
    clientName: string;
    clientAge: number;
    investmentObjective: string;
    investmentValue: number;
    clientId?: number;
  }) => void;
  initialValues?: {
    clientName: string;
    clientAge: number;
    investmentObjective: string;
    investmentValue: number;
    clientId?: number;
  };
}

const investmentObjectives = [
  { value: "retirement", label: "Aposentadoria" },
  { value: "reserve", label: "Reserva de Emergência" },
  { value: "education", label: "Educação" },
  { value: "property", label: "Compra de Imóvel" },
  { value: "wealth", label: "Crescimento de Patrimônio" },
  { value: "income", label: "Geração de Renda" },
  { value: "travel", label: "Viagens" },
  { value: "other", label: "Outro Objetivo" },
];

const ClientInfoStep: React.FC<ClientInfoStepProps> = ({
  onNext = () => {},
  initialValues = {
    clientName: "",
    clientAge: 35,
    investmentObjective: "wealth",
    investmentValue: 10000,
    clientId: undefined,
  },
}) => {
  const [selectedClient, setSelectedClient] = React.useState<Cliente | null>(
    null,
  );
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm<ClientInfoFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: initialValues.clientName,
      clientAge: initialValues.clientAge,
      investmentObjective: initialValues.investmentObjective,
      investmentValue: initialValues.investmentValue,
    },
  });

  const handleClientSelect = (client: Cliente | null) => {
    setSelectedClient(client);
    if (client) {
      let clientAge = initialValues.clientAge;
      if (client.dataNascimento) {
        const birthDate = new Date(client.dataNascimento);
        const today = new Date();
        clientAge = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          clientAge--;
        }
      }

      form.setValue("clientName", client.nome);
      form.setValue("clientAge", clientAge);
    } else {
      form.setValue("clientName", "");
      form.setValue("clientAge", initialValues.clientAge);
    }
  };

  const onSubmit = (data: ClientInfoFormValues) => {
    if (!selectedClient) {
      toast({
        variant: "destructive",
        title: "Cliente não selecionado",
        description:
          "É necessário selecionar um cliente cadastrado para criar uma recomendação. Use a barra de pesquisa para localizar um cliente ou vá para o Gerenciador de Clientes para cadastrar um novo.",
      });
      return;
    }

    onNext({
      clientName: data.clientName,
      clientAge: data.clientAge,
      investmentObjective: data.investmentObjective,
      investmentValue: data.investmentValue,
      clientId: selectedClient?.id,
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="border-slate-200 shadow-sm bg-gradient-to-b from-white to-slate-50/80">
        <CardHeader className="pb-4 border-b">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle>Dados do Cliente</CardTitle>
          </div>
          <CardDescription className="mt-2">
            Selecione um cliente existente ou preencha os dados manualmente para continuar
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-8">
            <div className="mb-6">
              <ClientSelector
                onClientSelect={handleClientSelect}
                selectedClientId={selectedClient?.id}
              />
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Campos ocultos para nome e idade do cliente que serão preenchidos automaticamente */}
                <input type="hidden" {...form.register("clientName")} />
                <input type="hidden" {...form.register("clientAge")} />

                {/* Objetivo */}
                <FormField
                  control={form.control}
                  name="investmentObjective"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="flex items-center text-base font-medium">
                          <Target className="h-4 w-4 mr-2 text-primary" />
                          Objetivo do Investimento
                        </FormLabel>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>O objetivo de investimento ajudará a definir o horizonte e a alocação recomendada.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <SelectTrigger className="w-full h-12">
                            <SelectValue placeholder="Selecione o objetivo" />
                          </SelectTrigger>
                          <SelectContent>
                            {investmentObjectives.map((objective) => (
                              <SelectItem
                                key={objective.value}
                                value={objective.value}
                              >
                                {objective.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Valor do investimento */}
                <FormField
                  control={form.control}
                  name="investmentValue"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="flex items-center text-base font-medium">
                          <DollarSign className="h-4 w-4 mr-2 text-primary" />
                          Valor do Investimento
                        </FormLabel>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>O valor total que será considerado para esta recomendação de investimento.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <div className="absolute left-3 top-3 text-gray-500">
                            R$
                          </div>
                          <Input
                            {...field}
                            type="number"
                            min="1000"
                            step="1000"
                            className="pl-9 h-12"
                            placeholder="Valor a ser investido"
                          />
                        </div>
                      </FormControl>
                      <p className="text-sm text-muted-foreground mt-2">
                        {field.value
                          ? `Valor formatado: ${formatCurrency(+field.value)}`
                          : "Insira o valor para ver o formatado"}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-4 flex justify-end">
                  <Button 
                    type="submit" 
                    className="w-full sm:w-auto px-8 py-2.5 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all"
                  >
                    Continuar para Definição de Perfil
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </CardContent>
      </Card>
      
      <div className="mt-6 rounded-lg border p-4 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
        <h3 className="text-lg font-medium flex items-center gap-2 text-amber-800 dark:text-amber-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
              clipRule="evenodd"
            />
          </svg>
          Dica
        </h3>
        <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
          Selecionar o cliente é o primeiro passo para criar uma recomendação de investimento personalizada. 
          Use a barra de pesquisa para encontrar rapidamente clientes por nome, CPF ou e-mail. 
          Se o cliente ainda não estiver cadastrado, cadastre-o primeiro no Gerenciador de Clientes antes de criar uma recomendação.
        </p>
      </div>
    </div>
  );
};

export default ClientInfoStep;
