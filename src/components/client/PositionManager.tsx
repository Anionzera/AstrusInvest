import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { db, Ativo, Posicao, Cliente } from "@/lib/db";
import {
  PlusCircle,
  Edit,
  Trash2,
  BarChart3,
  TrendingUp,
  Percent,
  Calendar,
  DollarSign,
  CreditCard,
  X,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface PositionManagerProps {
  clienteId: number;
  onAnalyzePortfolio?: () => void;
}

const PositionManager: React.FC<PositionManagerProps> = ({
  clienteId,
  onAnalyzePortfolio,
}) => {
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [ativos, setAtivos] = useState<Ativo[]>([]);
  const [posicoes, setPosicoes] = useState<(Posicao & { ativoNome?: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [valorTotal, setValorTotal] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Estado para o formulário
  const [formData, setFormData] = useState<Partial<Posicao>>({
    clienteId,
    quantidade: 0,
    precoMedio: 0,
    dataAtualizacao: new Date(),
  });

  // Carregar dados iniciais
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        // Buscar cliente
        const clienteData = await db.clientes.get(clienteId);
        if (!clienteData) {
          throw new Error("Cliente não encontrado");
        }
        setCliente(clienteData);

        // Buscar todos os ativos
        const ativosData = await db.ativos.toArray();
        setAtivos(ativosData);

        // Buscar posições do cliente
        await carregarPosicoes();
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar os dados. Tente novamente mais tarde.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [clienteId, toast]);

  // Função para carregar as posições do cliente
  const carregarPosicoes = async () => {
    try {
      const posicoesData = await db.posicoes
        .where("clienteId")
        .equals(clienteId)
        .toArray();

      // Mapear os nomes dos ativos
      const posicoesComNomes = await Promise.all(
        posicoesData.map(async (posicao) => {
          const ativo = await db.ativos.get(posicao.ativoId);
          const valorTotal = posicao.quantidade * posicao.precoMedio;
          return {
            ...posicao,
            ativoNome: ativo?.nome || "Ativo desconhecido",
            valorTotal,
          };
        })
      );

      // Calcular valor total
      const total = posicoesComNomes.reduce(
        (sum, posicao) => sum + posicao.quantidade * posicao.precoMedio,
        0
      );
      setValorTotal(total);
      setPosicoes(posicoesComNomes);
    } catch (error) {
      console.error("Erro ao carregar posições:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar posições",
        description:
          "Não foi possível carregar as posições do cliente. Tente novamente.",
      });
    }
  };

  // Manipulador para mudanças nos campos do formulário
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "ativoId" ? Number(value) : 
              name === "quantidade" || name === "precoMedio" ? 
              parseFloat(value) : value,
    }));
  };

  // Manipulador para seleção de ativo
  const handleAtivoSelect = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      ativoId: Number(value),
    }));
  };

  // Manipulador para adicionar/editar posição
  const handleSavePosition = async () => {
    try {
      // Validações básicas
      if (!formData.ativoId) {
        toast({
          variant: "destructive",
          title: "Ativo obrigatório",
          description: "Selecione um ativo para continuar.",
        });
        return;
      }

      if (!formData.quantidade || formData.quantidade <= 0) {
        toast({
          variant: "destructive",
          title: "Quantidade inválida",
          description: "A quantidade deve ser maior que zero.",
        });
        return;
      }

      if (!formData.precoMedio || formData.precoMedio <= 0) {
        toast({
          variant: "destructive",
          title: "Preço médio inválido",
          description: "O preço médio deve ser maior que zero.",
        });
        return;
      }

      // Calcular valor total
      const valorTotal = formData.quantidade! * formData.precoMedio!;

      // Preparar objeto para salvar
      const posicaoData: Posicao = {
        clienteId,
        ativoId: formData.ativoId!,
        quantidade: formData.quantidade!,
        precoMedio: formData.precoMedio!,
        dataAtualizacao: new Date(),
        valorTotal,
      };

      // Se tiver ID, atualiza a posição existente
      if (formData.id) {
        await db.posicoes.update(formData.id, posicaoData);
        toast({
          title: "Posição atualizada",
          description: "A posição foi atualizada com sucesso.",
        });
      } else {
        // Verificar se já existe posição para este ativo
        const posicaoExistente = posicoes.find(
          (p) => p.ativoId === formData.ativoId
        );

        if (posicaoExistente) {
          // Se já existe, atualiza média ponderada
          const novaQuantidade = posicaoExistente.quantidade + formData.quantidade!;
          const novoPrecoMedio = (posicaoExistente.quantidade * posicaoExistente.precoMedio + 
            formData.quantidade! * formData.precoMedio!) / novaQuantidade;
          
          await db.posicoes.update(posicaoExistente.id!, {
            quantidade: novaQuantidade,
            precoMedio: novoPrecoMedio,
            dataAtualizacao: new Date(),
            valorTotal: novaQuantidade * novoPrecoMedio,
          });
          
          toast({
            title: "Posição atualizada",
            description: "A posição existente foi atualizada com preço médio recalculado.",
          });
        } else {
          // Se não existe, adiciona nova posição
          await db.posicoes.add(posicaoData);
          toast({
            title: "Posição adicionada",
            description: "A posição foi adicionada com sucesso.",
          });
        }
      }

      // Resetar formulário e fechar diálogo
      resetForm();
      setIsDialogOpen(false);

      // Recarregar posições
      await carregarPosicoes();
    } catch (error) {
      console.error("Erro ao salvar posição:", error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "Não foi possível salvar a posição. Tente novamente.",
      });
    }
  };

  // Manipulador para excluir posição
  const handleDeletePosition = async (id: number) => {
    try {
      if (confirm("Tem certeza que deseja excluir esta posição?")) {
        await db.posicoes.delete(id);
        toast({
          title: "Posição excluída",
          description: "A posição foi excluída com sucesso.",
        });
        await carregarPosicoes();
      }
    } catch (error) {
      console.error("Erro ao excluir posição:", error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: "Não foi possível excluir a posição. Tente novamente.",
      });
    }
  };

  // Manipulador para editar posição
  const handleEditPosition = (posicao: Posicao) => {
    setFormData({
      id: posicao.id,
      clienteId: posicao.clienteId,
      ativoId: posicao.ativoId,
      quantidade: posicao.quantidade,
      precoMedio: posicao.precoMedio,
      dataAtualizacao: posicao.dataAtualizacao,
    });
    setIsDialogOpen(true);
  };

  // Resetar formulário
  const resetForm = () => {
    setFormData({
      clienteId,
      quantidade: 0,
      precoMedio: 0,
      dataAtualizacao: new Date(),
    });
  };

  // Formatador de moeda
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Navegação para o otimizador de portfólio
  const navegarParaOtimizador = () => {
    navigate(`/clients/${clienteId}/portfolio/optimize`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-60">
        <div className="animate-spin w-8 h-8 border-t-2 border-primary rounded-full"></div>
      </div>
    );
  }

  // Renderização do cartão de sumário
  const renderSummaryCard = () => {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <div>Resumo do Portfólio</div>
            <div className="flex gap-2">
              {onAnalyzePortfolio && (
                <Button variant="outline" onClick={onAnalyzePortfolio}>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Analisar Portfólio
                </Button>
              )}
              <Button variant="default" onClick={navegarParaOtimizador}>
                <TrendingUp className="mr-2 h-4 w-4" />
                Otimizar Portfólio
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Visão geral das posições e valor total investido
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Valor Total</div>
              <div className="text-2xl font-bold">{formatCurrency(valorTotal)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Ativos na Carteira</div>
              <div className="text-2xl font-bold">{posicoes.length}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Cliente</div>
              <div className="text-2xl font-bold">{cliente?.nome || "---"}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Resumo do portfólio */}
      {renderSummaryCard()}

      {/* Lista de posições */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead className="text-right">Preço Médio</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead className="text-right">Última Atualização</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posicoes.map((posicao) => (
                <TableRow key={posicao.id}>
                  <TableCell className="font-medium">
                    {posicao.ativoNome}
                  </TableCell>
                  <TableCell className="text-right">
                    {posicao.quantidade.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 6,
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(posicao.precoMedio)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(posicao.quantidade * posicao.precoMedio)}
                  </TableCell>
                  <TableCell className="text-right">
                    {format(
                      new Date(posicao.dataAtualizacao),
                      "dd/MM/yyyy",
                      { locale: ptBR }
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditPosition(posicao)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeletePosition(posicao.id!)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button onClick={() => resetForm()}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Posição
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {formData.id ? "Editar Posição" : "Adicionar Nova Posição"}
            </DialogTitle>
            <DialogDescription>
              {formData.id
                ? "Atualize os dados da posição de ativo existente"
                : "Adicione um novo ativo à carteira do cliente"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid items-center gap-2">
              <Label htmlFor="ativo">Ativo</Label>
              <Select
                value={formData.ativoId?.toString()}
                onValueChange={handleAtivoSelect}
                disabled={Boolean(formData.id)} // Desabilita quando estiver editando
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um ativo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Renda Variável</SelectLabel>
                    {ativos
                      .filter((a) => a.tipo === "Renda Variável")
                      .map((ativo) => (
                        <SelectItem key={ativo.id} value={ativo.id?.toString() || ""}>
                          {ativo.nome}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Renda Fixa</SelectLabel>
                    {ativos
                      .filter((a) => a.tipo === "Renda Fixa")
                      .map((ativo) => (
                        <SelectItem key={ativo.id} value={ativo.id?.toString() || ""}>
                          {ativo.nome}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Outros</SelectLabel>
                    {ativos
                      .filter(
                        (a) =>
                          a.tipo !== "Renda Variável" &&
                          a.tipo !== "Renda Fixa"
                      )
                      .map((ativo) => (
                        <SelectItem key={ativo.id} value={ativo.id?.toString() || ""}>
                          {ativo.nome}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 items-center gap-4">
              <div className="grid gap-2">
                <Label htmlFor="quantidade">Quantidade</Label>
                <div className="relative">
                  <Input
                    id="quantidade"
                    name="quantidade"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.quantidade || ""}
                    onChange={handleInputChange}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="precoMedio">Preço Médio (R$)</Label>
                <div className="relative">
                  <Input
                    id="precoMedio"
                    name="precoMedio"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.precoMedio || ""}
                    onChange={handleInputChange}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>

            {formData.quantidade && formData.precoMedio && (
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm font-medium">Valor Total:</p>
                <p className="text-lg font-bold">
                  {formatCurrency(formData.quantidade * formData.precoMedio)}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePosition}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PositionManager; 