import React, { useRef } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../ui/card";
import { Button } from "../ui/button";
import { Check, CheckCircle2, DownloadCloud, FileText, Send, ThumbsUp } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { formatCurrency } from "../../utils/formatters";
import { FormData } from "./AdvancedRecommendationForm";
import { calculateReturns } from "../../utils/returns";
import { Badge } from "../ui/badge";
import { useNavigate } from "react-router-dom";
import { useToast } from "../ui/use-toast";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// Definir a interface AssetClass localmente baseada no AdvancedRecommendationForm.tsx
interface AssetClass {
  name: string;
  allocation: number;
  color: string;
  expectedReturn?: {
    pessimistic: number;
    baseline: number;
    optimistic: number;
  };
  regulatoryInfo?: {
    suitabilityProfiles: string[];
    requiredDisclosures: string[];
    regulatoryCategory: string;
    taxEfficiency: number;
  };
}

interface RecommendationSummaryProps {
  formData: FormData & { id?: string, assetClasses: AssetClass[] };
  onSave: () => void;
  onBack: () => void;
  saving?: boolean;
}

const COLORS = ["#4299e1", "#9f7aea", "#f56565", "#68d391"];

const RecommendationSummary: React.FC<RecommendationSummaryProps> = ({
  formData,
  onSave,
  onBack,
  saving = false,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const summaryRef = useRef<HTMLDivElement>(null);

  const getTotalAllocation = () => {
    return formData.assetClasses.reduce(
      (total, asset) => total + asset.allocation,
      0
    );
  };

  const calculateExpectedReturn = () => {
    return formData.assetClasses.reduce((acc, asset) => {
      return acc + ((asset.expectedReturn?.baseline || 0) * (asset.allocation / 100));
    }, 0);
  };

  const calculateRisk = () => {
    // Usar volatilidade ou outro indicador como medida de risco
    return formData.assetClasses.reduce((acc, asset) => {
      // Se não tiver regulatoryInfo com alguma medida de risco, usar um valor padrão
      const riskValue = asset.regulatoryInfo?.taxEfficiency || 5; // valor padrão de risco
      return acc + (riskValue * (asset.allocation / 100));
    }, 0);
  };

  const calculateAmountAllocated = (allocation: number) => {
    return (formData.clientInfo.valorInvestimento * allocation) / 100;
  };

  const riskProfileLabel = {
    conservador: "Conservador",
    moderado: "Moderado",
    agressivo: "Agressivo",
  }[formData.riskProfile.selectedProfile || "moderado"] || "Moderado";

  const horizonTypeLabel = {
    "curto-prazo": "Curto Prazo (1-2 anos)",
    "medio-prazo": "Médio Prazo (3-5 anos)",
    "longo-prazo": "Longo Prazo (6+ anos)",
  }[formData.investmentHorizon.type || "medio-prazo"];

  const returnProjections = calculateReturns(
    formData.clientInfo.valorInvestimento,
    calculateExpectedReturn(),
    formData.investmentHorizon.years
  );

  const handleSaveRecommendation = () => {
    try {
      // Verifica se temos dados suficientes para salvar
      if (!formData.clientInfo || !formData.clientInfo.nome) {
        toast({
          title: "Dados incompletos",
          description: "Informações do cliente são necessárias para salvar",
          variant: "destructive",
        });
        return;
      }
      
      // Chama a função onSave passada como prop
      onSave();
      
      toast({
        title: "Recomendação salva",
        description: "Sua recomendação foi salva com sucesso",
      });
    } catch (error) {
      console.error("Erro ao salvar recomendação:", error);
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar a recomendação",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = async () => {
    if (!summaryRef.current) return;

    try {
      toast({
        title: "Gerando PDF...",
        description: "Aguarde enquanto criamos seu documento",
      });

      // Capturar o conteúdo como imagem
      const canvas = await html2canvas(summaryRef.current, {
        scale: 2,
        logging: false,
        useCORS: true,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Calcular proporção para manter a escala
      const imgWidth = 210; // A4 width in mm (portrait)
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      const filename = `Recomendacao_${formData.clientInfo.nome}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(filename);

      toast({
        title: "PDF gerado com sucesso!",
        description: "O documento foi baixado para o seu computador",
        variant: "default",
      });
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Não foi possível criar o documento. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto mb-10">
      <div className="flex flex-col space-y-6" ref={summaryRef}>
        <Card className="shadow-md border-slate-200">
          <CardHeader className="pb-4 border-b">
            <div className="flex justify-between items-start">
              <div>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 mb-2">
                  Recomendação de Investimento
                </Badge>
                <CardTitle className="text-2xl font-bold">
                  {formData.clientInfo.titulo || "Recomendação Personalizada"}
                </CardTitle>
                <CardDescription className="text-base mt-1">
                  Preparado para {formData.clientInfo.nome}
                </CardDescription>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Data</p>
                <p className="font-medium">{new Date().toLocaleDateString("pt-BR")}</p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6 pb-2 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                <h3 className="text-sm font-medium text-blue-700">Perfil de Risco</h3>
                <div className="mt-1 flex items-center">
                  <span className="text-xl font-bold text-blue-800">{riskProfileLabel}</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-100">
                <h3 className="text-sm font-medium text-purple-700">Horizonte</h3>
                <div className="mt-1 flex items-center">
                  <span className="text-xl font-bold text-purple-800">
                    {formData.investmentHorizon.years} anos
                  </span>
                  <span className="text-sm ml-2 text-purple-600">({horizonTypeLabel})</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-lg p-4 border border-green-100">
                <h3 className="text-sm font-medium text-green-700">Montante Total</h3>
                <div className="mt-1">
                  <span className="text-xl font-bold text-green-800">
                    {formatCurrency(formData.clientInfo.valorInvestimento)}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-b py-4">
              <h3 className="text-lg font-medium mb-4">Resumo do Cliente</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Nome</p>
                    <p className="font-medium">{formData.clientInfo.nome}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{formData.clientInfo.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p className="font-medium">{formData.clientInfo.telefone}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Objetivo de Investimento</p>
                    <p className="font-medium">{formData.clientInfo.objetivoInvestimento}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor do Investimento</p>
                    <p className="font-medium">{formatCurrency(formData.clientInfo.valorInvestimento)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Expectativa de Retorno</p>
                    <p className="font-medium">{calculateExpectedReturn().toFixed(2)}% ao ano</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Alocação de Ativos Recomendada</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={formData.assetClasses}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={120}
                        innerRadius={50}
                        fill="#8884d8"
                        dataKey="allocation"
                        nameKey="name"
                        label={({ name, allocation }) => `${name}: ${allocation}%`}
                      >
                        {formData.assetClasses.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any) => [`${value}%`, 'Alocação']} 
                        labelFormatter={(name) => `${name}`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Classe de Ativo</TableHead>
                        <TableHead className="text-right">Alocação</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.assetClasses.map((asset, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: asset.color || COLORS[index % COLORS.length] }}
                              ></div>
                              {asset.name}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{asset.allocation}%</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(calculateAmountAllocated(asset.allocation))}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell className="font-bold">Total</TableCell>
                        <TableCell className="text-right font-bold">{getTotalAllocation()}%</TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(formData.clientInfo.valorInvestimento)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>

                  <div className="mt-4 pt-3 border-t grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Retorno Esperado</p>
                      <p className="font-medium text-emerald-600">{calculateExpectedReturn().toFixed(2)}% ao ano</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Nível de Risco</p>
                      <p className="font-medium text-amber-600">{calculateRisk().toFixed(1)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-4">Projeção de Crescimento</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ano</TableHead>
                    <TableHead>Valor Projetado</TableHead>
                    <TableHead>Retorno Acumulado</TableHead>
                    <TableHead className="text-right">Crescimento %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returnProjections.map((projection, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{projection.year}</TableCell>
                      <TableCell>
                        {formatCurrency(projection.value)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(projection.value - formData.clientInfo.valorInvestimento)}
                      </TableCell>
                      <TableCell className="text-right">
                        {((projection.value / formData.clientInfo.valorInvestimento - 1) * 100).toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 border">
              <div className="flex gap-2 items-start">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <h4 className="font-medium">Estratégia Recomendada</h4>
                  <p className="text-sm text-slate-600 mt-1">
                    A estratégia de investimento foi elaborada considerando o perfil de risco {riskProfileLabel.toLowerCase()} 
                    do cliente e seu horizonte de investimento de {formData.investmentHorizon.years} anos. 
                    A alocação recomendada visa equilibrar retorno esperado com nível de risco adequado 
                    para atingir os objetivos financeiros estabelecidos.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={onBack}>
          Voltar e Editar
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportPDF} className="flex items-center gap-2">
            <DownloadCloud className="h-4 w-4" />
            Exportar PDF
          </Button>
          <Button 
            onClick={handleSaveRecommendation} 
            disabled={saving}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            {saving ? (
              <>Salvando...</>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Salvar Recomendação
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RecommendationSummary; 