import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, FileCheck, Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ReportPreview from "./ReportPreview";

const formSchema = z.object({
  title: z.string().min(2, { message: "Title must be at least 2 characters." }),
  description: z.string().optional(),
  clientName: z.string().min(2, { message: "Client name is required." }),
  includeExecutiveSummary: z.boolean().default(true),
  includeMarketAnalysis: z.boolean().default(true),
  includeAssetAllocation: z.boolean().default(true),
  includePerformanceProjections: z.boolean().default(true),
  includeRiskAnalysis: z.boolean().default(true),
  includeRecommendations: z.boolean().default(true),
  reportFormat: z.enum(["detailed", "summary", "presentation"]),
  additionalNotes: z.string().optional(),
});

type ReportCustomizationProps = {
  onSubmit?: (values: z.infer<typeof formSchema>) => void;
  initialData?: z.infer<typeof formSchema>;
  recommendations?: any[];
  onRecommendationSelect?: (id: number) => void;
  title?: string;
  description?: string;
};

const ReportCustomization = ({
  onSubmit = () => {},
  initialData = {
    title: "Recomendação de Alocação de Investimentos",
    description:
      "Recomendação personalizada de alocação de investimentos com base no perfil de risco e horizonte de investimento do cliente.",
    clientName: "",
    includeExecutiveSummary: true,
    includeMarketAnalysis: true,
    includeAssetAllocation: true,
    includePerformanceProjections: true,
    includeRiskAnalysis: true,
    includeRecommendations: true,
    reportFormat: "detailed" as const,
    additionalNotes: "",
  },
  recommendations = [],
  onRecommendationSelect = () => {},
  title = "",
  description = "",
}: ReportCustomizationProps) => {
  const [selectedRecommendation, setSelectedRecommendation] = useState<
    number | null
  >(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData,
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values);
  };

  const handleRecommendationSelect = (id: number) => {
    setSelectedRecommendation(id);
    onRecommendationSelect(id);
  };

  return (
    <div className="w-full bg-background p-6 rounded-lg dark:bg-gray-800">
      {recommendations.length > 0 && (
        <Card className="mb-6 dark:bg-gray-700 dark:border-gray-600">
          <CardHeader>
            <CardTitle className="text-lg dark:text-white">
              Selecionar Recomendação
            </CardTitle>
            <CardDescription className="dark:text-gray-300">
              Escolha uma recomendação existente para gerar o relatório
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendations.slice(0, 4).map((rec) => (
                <div
                  key={rec.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors dark:border-gray-600 ${selectedRecommendation === rec.id ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-600"}`}
                  onClick={() => handleRecommendationSelect(rec.id)}
                >
                  <div className="flex items-start">
                    <div className="mr-3 mt-1">
                      {selectedRecommendation === rec.id ? (
                        <FileCheck className="h-5 w-5 text-blue-500" />
                      ) : (
                        <FileText className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                      )}
                    </div>
                    <div>
                      <h4
                        className={`font-medium ${selectedRecommendation === rec.id ? "text-blue-700 dark:text-blue-400" : "text-gray-900 dark:text-gray-200"}`}
                      >
                        {rec.titulo}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {rec.nomeCliente} - {rec.perfilRisco} -{" "}
                        {new Date(rec.data).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="dark:bg-gray-700 dark:border-gray-600">
        <CardHeader>
          <CardTitle className="text-lg dark:text-white">
            Personalizar Relatório
          </CardTitle>
          <CardDescription className="dark:text-gray-300">
            Configure as opções do relatório conforme necessário
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="dark:text-white">
                        Título do Relatório
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Título do relatório"
                          {...field}
                          className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="dark:text-white">
                        Nome do Cliente
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nome do cliente"
                          {...field}
                          className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="dark:text-white">Descrição</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descrição do relatório"
                        {...field}
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <h3 className="text-lg font-medium dark:text-white">
                  Seções do Relatório
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="includeExecutiveSummary"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 dark:border-gray-700">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="dark:text-white">
                            Resumo Executivo
                          </FormLabel>
                          <FormDescription className="dark:text-gray-400">
                            Incluir um resumo executivo no início do relatório
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="includeMarketAnalysis"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 dark:border-gray-700">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="dark:text-white">
                            Análise de Mercado
                          </FormLabel>
                          <FormDescription className="dark:text-gray-400">
                            Incluir análise do cenário de mercado atual
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="includeAssetAllocation"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 dark:border-gray-700">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="dark:text-white">
                            Alocação de Ativos
                          </FormLabel>
                          <FormDescription className="dark:text-gray-400">
                            Incluir detalhes da alocação de ativos recomendada
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="includePerformanceProjections"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 dark:border-gray-700">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="dark:text-white">
                            Projeções de Desempenho
                          </FormLabel>
                          <FormDescription className="dark:text-gray-400">
                            Incluir projeções de desempenho futuro
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="reportFormat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="dark:text-white">
                      Formato do Relatório
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                          <SelectValue placeholder="Selecione um formato" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                        <SelectItem value="detailed">Detalhado</SelectItem>
                        <SelectItem value="summary">Resumido</SelectItem>
                        <SelectItem value="presentation">
                          Apresentação
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="dark:text-gray-400">
                      Escolha o formato que melhor atende às necessidades do
                      cliente
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="additionalNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="dark:text-white">
                      Notas Adicionais
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Notas adicionais para o relatório"
                        {...field}
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </FormControl>
                    <FormDescription className="dark:text-gray-400">
                      Informações adicionais que devem ser incluídas no
                      relatório
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Mensagem informativa sobre a preservação da alocação original */}
              <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/50">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                <AlertDescription className="text-blue-700 dark:text-blue-300 text-sm">
                  A alocação de ativos definida na recomendação original será sempre preservada no relatório final, garantindo que as recomendações avançadas personalizadas sejam mantidas integralmente.
                </AlertDescription>
              </Alert>

              <Button type="submit" className="w-full">
                Continuar para Prévia
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportCustomization;
