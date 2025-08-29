import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { fiApi } from "@/services/fixedIncomeService";

interface Props {
  clientServerId: string; // UUID
  onBack: () => void;
  onCreated?: (positionId: string) => void;
}

const FixedIncomeManager: React.FC<Props> = ({ clientServerId, onBack, onCreated }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [inst, setInst] = useState({
    kind: "CDB" as "CDB" | "LCI" | "LCA" | "CRI" | "CRA",
    indexer: "CDI" as "PRE" | "CDI" | "SELIC" | "IPCA",
    issuer: "",
    rate: "",
    face_value: "1000",
    issue_date: "",
    maturity_date: "",
    ipca_lag_months: "2",
    daycount: "BUS/252",
    amortization: "BULLET" as "BULLET" | "PRICE" | "SAC",
    tax_regime: "PF" as "PF" | "PJ",
  });
  const [pos, setPos] = useState({
    trade_date: "",
    quantity: "",
    price: "1000",
  });

  const canCreate = useMemo(() => {
    return Boolean(inst.issuer && inst.issue_date && pos.trade_date && Number(pos.quantity) > 0);
  }, [inst, pos]);

  const create = async () => {
    try {
      setLoading(true);
      const instrument_id = await fiApi.createInstrument({
        kind: inst.kind,
        issuer: inst.issuer,
        indexer: inst.indexer,
        rate: Number(inst.rate || 0),
        face_value: Number(inst.face_value || 1000),
        issue_date: inst.issue_date,
        maturity_date: inst.maturity_date || undefined,
        daycount: inst.daycount,
        business_convention: undefined,
        ipca_lag_months: Number(inst.ipca_lag_months || 2),
        amortization: inst.amortization,
        tax_regime: inst.tax_regime,
      });
      const position_id = await fiApi.createPosition({
        instrument_id,
        client_id: clientServerId,
        trade_date: pos.trade_date,
        quantity: Number(pos.quantity || 0),
        price: Number(pos.price || 0),
      });
      toast({ title: "Posição criada", description: "Renda fixa adicionada com sucesso." });
      onCreated?.(position_id);
      onBack();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao criar posição", description: String(e?.message || e) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xl font-semibold">Renda Fixa - Novo Instrumento e Posição</div>
        <Button variant="outline" onClick={onBack}>Voltar</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Instrumento</CardTitle>
          <CardDescription>Defina os parâmetros do título</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>Emissor</Label>
            <Input value={inst.issuer} onChange={e => setInst(s => ({ ...s, issuer: e.target.value }))} placeholder="Banco/Emissor"/>
          </div>
          <div className="grid gap-2">
            <Label>Tipo</Label>
            <Select value={inst.kind} onValueChange={v => setInst(s => ({ ...s, kind: v as any }))}>
              <SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="CDB">CDB</SelectItem>
                <SelectItem value="DEB">Debênture</SelectItem>
                <SelectItem value="LFSN">LFSN</SelectItem>
                <SelectItem value="LCI">LCI</SelectItem>
                <SelectItem value="LCA">LCA</SelectItem>
                <SelectItem value="CRI">CRI</SelectItem>
                <SelectItem value="CRA">CRA</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Indexer</Label>
            <Select value={inst.indexer} onValueChange={v => setInst(s => ({ ...s, indexer: v as any }))}>
              <SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="PRE">Pré</SelectItem>
                <SelectItem value="CDI">CDI</SelectItem>
                <SelectItem value="SELIC">SELIC</SelectItem>
                <SelectItem value="IPCA">IPCA+</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Taxa</Label>
            <Input type="number" step="0.0001" value={inst.rate} onChange={e => setInst(s => ({ ...s, rate: e.target.value }))} placeholder="Ex.: 0.12 (12% a.a.) ou 1.2 (CDI 120%)"/>
          </div>
          <div className="grid gap-2">
            <Label>Face Value</Label>
            <Input type="number" step="0.0001" value={inst.face_value} onChange={e => setInst(s => ({ ...s, face_value: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Data Emissão</Label>
            <Input type="date" value={inst.issue_date} onChange={e => setInst(s => ({ ...s, issue_date: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Vencimento</Label>
            <Input type="date" value={inst.maturity_date} onChange={e => setInst(s => ({ ...s, maturity_date: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Defasagem IPCA (meses)</Label>
            <Input type="number" step="1" value={inst.ipca_lag_months} onChange={e => setInst(s => ({ ...s, ipca_lag_months: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Amortização</Label>
            <Select value={inst.amortization} onValueChange={v => setInst(s => ({ ...s, amortization: v as any }))}>
              <SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="BULLET">Bullet</SelectItem>
                <SelectItem value="PRICE">PRICE</SelectItem>
                <SelectItem value="SAC">SAC</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Regime Tributário</Label>
            <Select value={inst.tax_regime} onValueChange={v => setInst(s => ({ ...s, tax_regime: v as any }))}>
              <SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="PF">Pessoa Física (isento LCI/LCA/CRI/CRA)</SelectItem>
                <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Posição</CardTitle>
          <CardDescription>Vincule a posição do cliente</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="grid gap-2">
            <Label>Data Compra</Label>
            <Input type="date" value={pos.trade_date} onChange={e => setPos(s => ({ ...s, trade_date: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Quantidade</Label>
            <Input type="number" step="0.0001" value={pos.quantity} onChange={e => setPos(s => ({ ...s, quantity: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>PU (Preço na compra)</Label>
            <Input type="number" step="0.01" value={pos.price} onChange={e => setPos(s => ({ ...s, price: e.target.value }))} />
          </div>
          <div className="col-span-3 flex justify-end gap-2">
            <Button variant="outline" onClick={onBack}>Cancelar</Button>
            <Button disabled={!canCreate || loading} onClick={create}>{loading ? "Salvando..." : "Salvar Posição"}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FixedIncomeManager;


