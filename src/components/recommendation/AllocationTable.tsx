import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Slider } from "../ui/slider";
import { Input } from "../ui/input";
import { formatCurrency } from "../../utils/formatters";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "../ui/tooltip";
import { Info } from "lucide-react";
import { AssetClass } from "../../types/assets";

interface AllocationTableProps {
  assets: AssetClass[];
  onAllocationChange: (index: number, newValue: number) => void;
  editMode: boolean;
  investmentAmount: number;
}

const AllocationTable: React.FC<AllocationTableProps> = ({
  assets,
  onAllocationChange,
  editMode,
  investmentAmount,
}) => {
  // Função para calcular o valor monetário alocado
  const calculateAmountAllocated = (allocation: number) => {
    return (investmentAmount * allocation) / 100;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[200px]">Classe de Ativo</TableHead>
          <TableHead className="text-right">Alocação</TableHead>
          {editMode && <TableHead className="text-right">Ajustar</TableHead>}
          <TableHead className="text-right">Valor Estimado</TableHead>
          <TableHead className="text-right">Retorno Esperado</TableHead>
          <TableHead className="text-right">Risco</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {assets.map((asset, index) => (
          <TableRow key={asset.name}>
            <TableCell className="font-medium">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: asset.color }} />
                <span>{asset.name}</span>
                {asset.description && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">{asset.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </TableCell>
            <TableCell className="text-right">
              {editMode ? (
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={asset.allocation}
                  onChange={(e) => onAllocationChange(index, parseFloat(e.target.value) || 0)}
                  className="w-20 ml-auto"
                />
              ) : (
                `${asset.allocation}%`
              )}
            </TableCell>
            {editMode && (
              <TableCell>
                <Slider
                  value={[asset.allocation]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(values) => onAllocationChange(index, values[0])}
                />
              </TableCell>
            )}
            <TableCell className="text-right">
              {formatCurrency(calculateAmountAllocated(asset.allocation))}
            </TableCell>
            <TableCell className="text-right">{`${asset.expected_return}%`}</TableCell>
            <TableCell className="text-right">{`${asset.risk}%`}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default AllocationTable; 