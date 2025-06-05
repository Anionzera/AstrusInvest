import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { ScrollArea } from "../ui/scroll-area";
import { Label } from "../ui/label";
import { FieldMapping } from "../../lib/importExportUtils";

interface ImportMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceFields: string[];
  targetFields: string[];
  onMappingConfirm: (mappings: FieldMapping[]) => void;
  initialMappings?: FieldMapping[];
}

export default function ImportMappingDialog({
  open,
  onOpenChange,
  sourceFields,
  targetFields,
  onMappingConfirm,
  initialMappings,
}: ImportMappingDialogProps) {
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  
  // Inicializar mapeamentos quando o diálogo for aberto
  useEffect(() => {
    if (open) {
      if (initialMappings && initialMappings.length > 0) {
        setMappings([...initialMappings]);
      } else {
        // Tentar mapear automaticamente os campos com nomes correspondentes
        const autoMappings: FieldMapping[] = [];
        
        sourceFields.forEach(sourceField => {
          // Procurar campo correspondente no destino (ignorando case)
          const matchingField = targetFields.find(
            targetField => targetField.toLowerCase() === sourceField.toLowerCase()
          );
          
          if (matchingField) {
            autoMappings.push({
              sourceField,
              targetField: matchingField
            });
          } else {
            // Para campos sem correspondência, adicionar com targetField vazio
            autoMappings.push({
              sourceField,
              targetField: ""
            });
          }
        });
        
        setMappings(autoMappings);
      }
    }
  }, [open, initialMappings, sourceFields, targetFields]);
  
  const handleFieldChange = (sourceField: string, targetField: string) => {
    setMappings(prev => 
      prev.map(mapping => 
        mapping.sourceField === sourceField 
          ? { ...mapping, targetField } 
          : mapping
      )
    );
  };
  
  const handleConfirm = () => {
    // Filtrar apenas mapeamentos com targetField definido
    const validMappings = mappings.filter(m => m.targetField);
    onMappingConfirm(validMappings);
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Mapeamento de Campos</DialogTitle>
          <DialogDescription>
            Selecione como cada campo do arquivo de origem deve ser mapeado para os campos no sistema. 
            Campos não mapeados serão ignorados na importação.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] mt-4 px-1">
          <div className="grid grid-cols-2 gap-4 pb-4">
            <div className="font-bold text-sm">Campo no Arquivo</div>
            <div className="font-bold text-sm">Campo no Sistema</div>
            
            {mappings.map((mapping, index) => (
              <div key={index} className="contents">
                <div className="py-2 flex items-center">
                  <span className="truncate text-sm">{mapping.sourceField}</span>
                </div>
                <div>
                  <Select
                    value={mapping.targetField}
                    onValueChange={(value) => handleFieldChange(mapping.sourceField, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Não importar este campo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Não importar este campo</SelectItem>
                      {targetFields.map((field) => (
                        <SelectItem key={field} value={field}>
                          {field}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        <DialogFooter className="flex space-x-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>
            Confirmar Mapeamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 