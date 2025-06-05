import React, { useState } from "react";
import PositionManager from "./PositionManager";
import PortfolioAnalysisView from "../analysis/PortfolioAnalysisView";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const PortfolioManager: React.FC = () => {
  const { clienteId } = useParams<{ clienteId: string }>();
  const [showAnalysis, setShowAnalysis] = useState(false);
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  if (!clienteId || isNaN(Number(clienteId))) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <h2 className="text-xl font-bold">Cliente não encontrado</h2>
          <p className="text-muted-foreground">
            O ID do cliente não foi fornecido ou é inválido.
          </p>
          <Button onClick={handleBack}>Voltar</Button>
        </div>
      </div>
    );
  }

  const clienteIdNumber = Number(clienteId);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          Gestão de Portfólio
        </h1>
      </div>

      {showAnalysis ? (
        <PortfolioAnalysisView 
          clienteId={clienteIdNumber} 
          onClose={() => setShowAnalysis(false)} 
        />
      ) : (
        <PositionManager 
          clienteId={clienteIdNumber} 
          onAnalyzePortfolio={() => setShowAnalysis(true)} 
        />
      )}
    </div>
  );
};

export default PortfolioManager; 