import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { ScrollArea } from "../ui/scroll-area";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Switch } from "../ui/switch";
import { LoadingSpinner } from "../ui/loading-spinner";
import { useToast } from "../ui/use-toast";
import { importData, FieldMapping } from "../../lib/importExportUtils";
import ImportMappingDialog from "./ImportMappingDialog";

interface AdvancedImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

// Mapeamento dos campos conhecidos para cada tipo de dados
const knownFields = {
  clientes: [
    "id", "nome", "email", "telefone", "cpf", "dataNascimento", 
    "endereco", "perfilRisco", "objetivos", "patrimonioTotal", 
    "dataCadastro", "observacoes"
  ],
  recomendacoes: [
    "id", "data", "titulo", "clienteId", "nomeCliente", "perfilRisco", 
    "horizonteInvestimento", "estrategia", "valorInvestimento", 
    "objetivoInvestimento", "observacoes", "status"
  ],
  ativos: [
    "id", "codigo", "nome", "tipo", "subTipo", "risco", 
    "rendimento", "vencimento", "preco", "moeda"
  ],
  portfolios: [
    "id", "nome", "clienteId", "data", "valorTotal", 
    "observacoes", "status", "posicoes"
  ]
};

// Extensões de arquivo aceitas para cada formato
const formatExtensions = {
  json: ".json",
  csv: ".csv",
  excel: ".xlsx,.xls"
};

export default function AdvancedImportDialog({
  open,
  onOpenChange,
  onImportComplete
}: AdvancedImportDialogProps) {
  const { toast } = useToast();
  
  // Estados para configuração da importação
  const [importFormat, setImportFormat] = useState<"json" | "csv" | "excel">("json");
  const [dataType, setDataType] = useState<"clientes" | "recomendacoes" | "ativos" | "portfolios">("clientes");
  const [shouldReplace, setShouldReplace] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Estado para o diálogo de mapeamento
  const [isMappingOpen, setIsMappingOpen] = useState(false);
  const [sourceFields, setSourceFields] = useState<string[]>([]);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  
  // Resetar estados quando o diálogo é fechado
  useEffect(() => {
    if (!open) {
      setSelectedFile(null);
      setFileContent(null);
      setIsLoading(false);
      setSourceFields([]);
      setMappings([]);
    }
  }, [open]);
  
  // Analisar o arquivo selecionado para extrair cabeçalhos/campos
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSelectedFile(file);
    setIsLoading(true);
    
    try {
      // Ler os primeiros registros do arquivo para extrair cabeçalhos
      const headers = await extractHeadersFromFile(file, importFormat);
      setSourceFields(headers);
      setIsLoading(false);
    } catch (error) {
      console.error("Erro ao analisar arquivo:", error);
      toast({
        variant: "destructive",
        title: "Erro ao analisar arquivo",
        description: "Não foi possível ler os campos do arquivo selecionado."
      });
      setSelectedFile(null);
      setIsLoading(false);
    }
  };
  
  // Extrair cabeçalhos do arquivo conforme o formato
  const extractHeadersFromFile = async (file: File, format: "json" | "csv" | "excel"): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          if (format === "json") {
            const jsonStr = e.target?.result as string;
            const jsonData = JSON.parse(jsonStr);
            
            // Se for um array, pegar as chaves do primeiro objeto
            if (Array.isArray(jsonData) && jsonData.length > 0) {
              resolve(Object.keys(jsonData[0]));
            } 
            // Se for um objeto, verificar se tem propriedades do tipo array
            else if (typeof jsonData === "object" && jsonData !== null) {
              // Procurar a primeira propriedade que seja um array
              for (const key in jsonData) {
                if (Array.isArray(jsonData[key]) && jsonData[key].length > 0) {
                  resolve(Object.keys(jsonData[key][0]));
                  return;
                }
              }
              reject(new Error("Não foi possível encontrar dados no formato esperado"));
            } else {
              reject(new Error("Formato de dados inválido"));
            }
          } else if (format === "csv") {
            const csvStr = e.target?.result as string;
            const lines = csvStr.split('\n');
            if (lines.length > 0) {
              // Extrair cabeçalhos da primeira linha, removendo aspas
              const headers = lines[0].split(',').map(h => 
                h.trim().replace(/^"(.*)"$/, '$1')
              );
              resolve(headers);
            } else {
              reject(new Error("Arquivo CSV vazio"));
            }
          } else if (format === "excel") {
            // Para Excel, precisamos de uma abordagem diferente
            reject(new Error("Extração de cabeçalhos de Excel não implementada neste método"));
          }
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error("Erro ao ler o arquivo"));
      
      if (format === "excel") {
        // Para Excel, usamos a biblioteca XLSX em outro método
        import("xlsx").then((XLSX) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const data = new Uint8Array(e.target?.result as ArrayBuffer);
              const workbook = XLSX.read(data, { type: 'array' });
              
              // Usar a primeira planilha
              const firstSheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[firstSheetName];
              
              // Converter apenas a primeira linha para obter cabeçalhos
              const headers = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] as string[];
              resolve(headers);
            } catch (error) {
              reject(error);
            }
          };
          reader.onerror = () => reject(new Error("Erro ao ler o arquivo Excel"));
          reader.readAsArrayBuffer(file);
        }).catch(reject);
      } else {
        reader.readAsText(file);
      }
    });
  };
  
  // Abrir diálogo de mapeamento de campos
  const handleProceedToMapping = () => {
    if (!selectedFile || sourceFields.length === 0) {
      toast({
        variant: "destructive",
        title: "Nenhum arquivo selecionado",
        description: "Selecione um arquivo para importação."
      });
      return;
    }
    
    setIsMappingOpen(true);
  };
  
  // Processar o mapeamento confirmado e iniciar a importação
  const handleMappingConfirm = async (confirmedMappings: FieldMapping[]) => {
    if (!selectedFile) return;
    
    setIsLoading(true);
    setMappings(confirmedMappings);
    
    try {
      // Importar dados com as opções configuradas
      await importData(selectedFile, {
        format: importFormat,
        dataType: dataType,
        replace: shouldReplace,
        fieldMapping: confirmedMappings
      });
      
      toast({
        title: "Importação concluída",
        description: `Os dados foram importados com sucesso.`
      });
      
      // Callback para notificar que a importação foi completada
      if (onImportComplete) {
        onImportComplete();
      }
      
      // Fechar o diálogo
      onOpenChange(false);
    } catch (error) {
      console.error("Erro na importação:", error);
      toast({
        variant: "destructive",
        title: "Erro na importação",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao importar os dados."
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Importação Avançada</DialogTitle>
            <DialogDescription>
              Configure as opções de importação e selecione um arquivo para importar.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="format" className="text-right">
                Formato
              </Label>
              <Select
                value={importFormat}
                onValueChange={(value: "json" | "csv" | "excel") => setImportFormat(value)}
              >
                <SelectTrigger id="format" className="col-span-3">
                  <SelectValue placeholder="Selecione o formato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dataType" className="text-right">
                Tipo de Dados
              </Label>
              <Select
                value={dataType}
                onValueChange={(value: "clientes" | "recomendacoes" | "ativos" | "portfolios") => setDataType(value)}
              >
                <SelectTrigger id="dataType" className="col-span-3">
                  <SelectValue placeholder="Selecione o tipo de dados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clientes">Clientes</SelectItem>
                  <SelectItem value="recomendacoes">Recomendações</SelectItem>
                  <SelectItem value="ativos">Ativos</SelectItem>
                  <SelectItem value="portfolios">Portfólios</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="replaceData" className="text-right">
                Substituir Dados
              </Label>
              <div className="flex items-center space-x-2 col-span-3">
                <Switch
                  id="replaceData"
                  checked={shouldReplace}
                  onCheckedChange={setShouldReplace}
                />
                <Label htmlFor="replaceData">
                  {shouldReplace ? "Substituir todos os dados existentes" : "Adicionar aos dados existentes"}
                </Label>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="fileUpload" className="text-right">
                Arquivo
              </Label>
              <div className="col-span-3">
                <input
                  type="file"
                  id="fileUpload"
                  className="hidden"
                  accept={formatExtensions[importFormat]}
                  onChange={handleFileChange}
                />
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById("fileUpload")?.click()}
                    disabled={isLoading}
                  >
                    Selecionar Arquivo
                  </Button>
                  {selectedFile && (
                    <span className="text-sm truncate max-w-[200px]">
                      {selectedFile.name}
                    </span>
                  )}
                  {isLoading && <LoadingSpinner size="sm" />}
                </div>
              </div>
            </div>
            
            {sourceFields.length > 0 && (
              <div className="bg-muted/50 p-3 rounded-md mt-2">
                <p className="text-sm font-medium mb-2">Campos detectados:</p>
                <div className="flex flex-wrap gap-2">
                  {sourceFields.map((field, index) => (
                    <span key={index} className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-md">
                      {field}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleProceedToMapping} disabled={!selectedFile || isLoading}>
              Prosseguir para Mapeamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de mapeamento de campos */}
      <ImportMappingDialog
        open={isMappingOpen}
        onOpenChange={setIsMappingOpen}
        sourceFields={sourceFields}
        targetFields={knownFields[dataType]}
        onMappingConfirm={handleMappingConfirm}
      />
    </>
  );
} 