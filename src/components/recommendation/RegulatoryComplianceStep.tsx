import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  FileCheck,
  Info,
  Shield,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  BarChart,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ComplianceData {
  isCompliant: boolean;
  warnings: string[];
  requiredDisclosures: string[];
  benchmarkComparison: Array<{
    name: string;
    expectedOutperformance: number;
    historicalCorrelation: number;
  }>;
}

interface RegulatoryComplianceStepProps {
  clientRiskProfile: string;
  assetAllocation: Array<{
    name: string;
    allocation: number;
    regulatoryInfo?: {
      suitabilityProfiles: string[];
      requiredDisclosures: string[];
      regulatoryCategory: string;
      taxEfficiency: number;
    };
  }>;
  selectedStrategy: string;
  complianceData: ComplianceData;
  onUpdate: (data: ComplianceData) => void;
  onNext: () => void;
  onBack: () => void;
  onFinish?: () => void;
}

const RegulatoryComplianceStep: React.FC<RegulatoryComplianceStepProps> = ({
  clientRiskProfile,
  assetAllocation,
  selectedStrategy,
  complianceData,
  onUpdate,
  onNext,
  onBack,
  onFinish,
}) => {
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    validateCompliance();
  }, [clientRiskProfile, assetAllocation, selectedStrategy]);

  const validateCompliance = async () => {
    setValidating(true);
    
    // Simular uma validação da conformidade regulatória
    setTimeout(() => {
      const updatedData: ComplianceData = {
        isCompliant: true,
        warnings: [],
        requiredDisclosures: [
          "Investimentos não contam com garantia do administrador, do gestor, de qualquer mecanismo de seguro ou do Fundo Garantidor de Crédito (FGC)",
          "Rentabilidade passada não representa garantia de rentabilidade futura",
          "A rentabilidade divulgada não é líquida de impostos e taxas de administração",
        ],
        benchmarkComparison: [
          {
            name: "CDI",
            expectedOutperformance: 1.8,
            historicalCorrelation: 0.3,
          },
          {
            name: "IBOVESPA",
            expectedOutperformance: -2.1,
            historicalCorrelation: 0.7,
          },
          {
            name: "IMA-B",
            expectedOutperformance: 0.9,
            historicalCorrelation: 0.6,
          },
        ],
      };

      // Verificar adequação do perfil do cliente
      const hasHighRiskAssets = assetAllocation.some(
        (asset) =>
          asset.regulatoryInfo &&
          !asset.regulatoryInfo.suitabilityProfiles.includes(clientRiskProfile.toLowerCase()) &&
          asset.allocation > 5
      );

      if (hasHighRiskAssets) {
        updatedData.isCompliant = false;
        updatedData.warnings.push(
          "Alguns ativos na alocação possuem perfil de risco superior ao perfil do cliente"
        );
      }

      // Verificar concentração excessiva
      const hasTooMuchConcentration = assetAllocation.some(
        (asset) => asset.allocation > 40
      );

      if (hasTooMuchConcentration) {
        updatedData.warnings.push(
          "Concentração elevada em uma única classe de ativo pode aumentar o risco da carteira"
        );
      }

      onUpdate(updatedData);
      setValidating(false);
    }, 1500);
  };

  const formatPercentage = (value: number) => {
    return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Conformidade Regulatória</h2>
          <p className="text-muted-foreground">
            Validação de conformidade com os requisitos regulatórios da CVM
          </p>
        </div>
        <Badge
          variant={complianceData.isCompliant ? "default" : "destructive"}
          className={`${
            complianceData.isCompliant
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
          }`}
        >
          {complianceData.isCompliant ? (
            <div className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4" />
              <span>Recomendação Conforme</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              <span>Ajustes Necessários</span>
            </div>
          )}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Avisos e alertas */}
          {complianceData.warnings.length > 0 && (
            <Card className="border-amber-300 dark:border-amber-700">
              <CardHeader className="pb-2 bg-amber-50 dark:bg-amber-900/20">
                <CardTitle className="text-amber-800 dark:text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Pontos de Atenção
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <ul className="space-y-2">
                  {complianceData.warnings.map((warning, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-amber-700 dark:text-amber-400"
                    >
                      <ChevronRight className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Comparação com benchmarks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5" />
                Comparação com Benchmarks
              </CardTitle>
              <CardDescription>
                Análise comparativa da recomendação com índices de referência
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Benchmark</TableHead>
                    <TableHead>Performance Esperada</TableHead>
                    <TableHead>Correlação Histórica</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {complianceData.benchmarkComparison.map((benchmark, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {benchmark.name}
                      </TableCell>
                      <TableCell
                        className={
                          benchmark.expectedOutperformance > 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }
                      >
                        {formatPercentage(benchmark.expectedOutperformance)}
                      </TableCell>
                      <TableCell>
                        {(benchmark.historicalCorrelation * 100).toFixed(0)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Divulgações obrigatórias */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileCheck className="h-5 w-5" />
                Divulgações Obrigatórias
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4">
                {complianceData.requiredDisclosures.map((disclosure, index) => (
                  <Alert key={index} className="text-xs">
                    <Info className="h-4 w-4" />
                    <AlertDescription>{disclosure}</AlertDescription>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Informações regulatórias */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-5 w-5" />
                Informações Regulatórias
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="regulations">
                  <AccordionTrigger>Normas Aplicáveis</AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <span>
                          Instrução CVM nº 592 - Consultoria de valores
                          mobiliários
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <span>
                          Instrução CVM nº 539 - Perfil de investidor
                          (suitability)
                        </span>
                      </li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="links">
                  <AccordionTrigger>Links Úteis</AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2 text-blue-600 dark:text-blue-400">
                        <ExternalLink className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <a
                          href="https://www.gov.br/cvm"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Site da CVM
                        </a>
                      </li>
                      <li className="flex items-start gap-2 text-blue-600 dark:text-blue-400">
                        <ExternalLink className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <a
                          href="https://www.investidor.gov.br"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Portal do Investidor
                        </a>
                      </li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Botões de navegação */}
      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>

        <Button
          onClick={onFinish || onNext}
          className="flex items-center gap-2"
        >
          Finalizar
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default RegulatoryComplianceStep; 