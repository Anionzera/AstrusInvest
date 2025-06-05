import { useState, useEffect } from 'react';
import { Cliente } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { 
  CalendarIcon, 
  Loader2, 
  User, 
  Mail, 
  Phone, 
  Building, 
  FileText, 
  AlertTriangle,
  BadgeDollarSign,
  MapPin,
  CreditCard,
  Calendar as CalendarIcon2,
  Shield,
  BadgeCheck,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ClienteFormProps {
  cliente: Cliente | null;
  onSave: (cliente: Cliente) => void;
  onCancel: () => void;
  isSaving: boolean;
}

const PERFIS_RISCO = [
  { id: 'conservador', label: 'Conservador' },
  { id: 'moderado', label: 'Moderado' },
  { id: 'arrojado', label: 'Arrojado' },
  { id: 'agressivo', label: 'Agressivo' }
];

export function ClienteForm({ cliente, onSave, onCancel, isSaving }: ClienteFormProps) {
  const [formData, setFormData] = useState<Cliente & {
    cpf?: string;
    endereco?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
    profissao?: string;
    estadoCivil?: string;
    nacionalidade?: string;
    documentoIdentidade?: string;
  }>(
    cliente || {
      id: '',
      nome: '',
      email: '',
      telefone: '',
      empresa: '',
      dataCadastro: new Date(),
      dataUltimoContato: null,
      dataNascimento: undefined,
      perfilRisco: '',
      observacoes: '',
      ativo: true,
      cpf: '',
      endereco: '',
      cidade: '',
      estado: '',
      cep: '',
      profissao: '',
      estadoCivil: '',
      nacionalidade: 'Brasileira',
      documentoIdentidade: '',
    }
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState("pessoal");
  
  // Use useEffect para formatar o telefone quando ele mudar
  useEffect(() => {
    if (formData.telefone) {
      // Apenas atualiza se não estiver no formato correto 
      if (!formData.telefone.includes('(') && formData.telefone.length > 0) {
        const cleaned = formData.telefone.replace(/\D/g, '');
        
        if (cleaned.length === 10) {
          const formatted = `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6, 10)}`;
          setFormData(prev => ({ ...prev, telefone: formatted }));
        } else if (cleaned.length === 11) {
          const formatted = `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7, 11)}`;
          setFormData(prev => ({ ...prev, telefone: formatted }));
        }
      }
    }
  }, [formData.telefone]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.nome.trim()) {
      newErrors.nome = 'O nome é obrigatório';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'O email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Formato de email inválido';
    }
    
    if (formData.cpf && !/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(formData.cpf)) {
      newErrors.cpf = 'Formato de CPF inválido (000.000.000-00)';
    }
    
    if (formData.cep && !/^\d{5}-\d{3}$/.test(formData.cep)) {
      newErrors.cep = 'Formato de CEP inválido (00000-000)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    // Limpa o erro quando o usuário começa a digitar
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSelectChange = (value: string, name: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (checked: boolean, name: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleDateChange = (date: Date | undefined, field: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: date || null,
    }));
  };

  // Adicionar funções para formatação de campos
  const formatCPF = (value: string) => {
    if (!value) return '';
    // Remove todos os caracteres não numéricos
    const digits = value.replace(/\D/g, '');
    // Limita a 11 dígitos
    const cpf = digits.slice(0, 11);
    
    // Aplica a formatação do CPF (000.000.000-00)
    if (cpf.length <= 3) {
      return cpf;
    } else if (cpf.length <= 6) {
      return `${cpf.slice(0, 3)}.${cpf.slice(3)}`;
    } else if (cpf.length <= 9) {
      return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6)}`;
    } else {
      return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
    }
  };

  const formatPhone = (value: string) => {
    if (!value) return '';
    // Remove todos os caracteres não numéricos
    const digits = value.replace(/\D/g, '');
    // Limita a 11 dígitos
    const phone = digits.slice(0, 11);
    
    // Aplica a formatação do telefone ((00) 00000-0000 ou (00) 0000-0000)
    if (phone.length <= 2) {
      return phone;
    } else if (phone.length <= 6) {
      return `(${phone.slice(0, 2)}) ${phone.slice(2)}`;
    } else if (phone.length <= 10) {
      return `(${phone.slice(0, 2)}) ${phone.slice(2, 6)}-${phone.slice(6)}`;
    } else {
      return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
    }
  };

  const formatCEP = (value: string) => {
    if (!value) return '';
    // Remove todos os caracteres não numéricos
    const digits = value.replace(/\D/g, '');
    // Limita a 8 dígitos
    const cep = digits.slice(0, 8);
    
    // Aplica a formatação do CEP (00000-000)
    if (cep.length <= 5) {
      return cep;
    } else {
      return `${cep.slice(0, 5)}-${cep.slice(5)}`;
    }
  };

  const handleMaskedInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Formata o valor de acordo com o campo
    let formattedValue = value;
    if (name === 'cpf') {
      formattedValue = formatCPF(value);
    } else if (name === 'telefone') {
      formattedValue = formatPhone(value);
    } else if (name === 'cep') {
      formattedValue = formatCEP(value);
    }
    
    setFormData((prev) => ({
      ...prev,
      [name]: formattedValue,
    }));
    
    // Limpa o erro quando o usuário começa a digitar
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      const clienteData: Cliente = {
        id: formData.id,
        nome: formData.nome,
        email: formData.email,
        telefone: formData.telefone,
        empresa: formData.empresa,
        dataCadastro: formData.dataCadastro,
        dataUltimoContato: formData.dataUltimoContato,
        dataNascimento: formData.dataNascimento,
        perfilRisco: formData.perfilRisco,
        observacoes: formData.observacoes,
        ativo: formData.ativo,
      };
      
      // Adicionar os campos adicionais ao observacoes como JSON
      const camposAdicionais = {
        cpf: formData.cpf,
        endereco: formData.endereco,
        cidade: formData.cidade,
        estado: formData.estado,
        cep: formData.cep,
        profissao: formData.profissao,
        estadoCivil: formData.estadoCivil,
        nacionalidade: formData.nacionalidade,
        documentoIdentidade: formData.documentoIdentidade,
      };
      
      // Se observacoes já tem dados em JSON, fazer um merge
      try {
        let observacoesObj = {};
        if (formData.observacoes && formData.observacoes.trim().startsWith('{')) {
          try {
            observacoesObj = JSON.parse(formData.observacoes);
          } catch (e) {
            observacoesObj = { texto: formData.observacoes };
          }
        } else if (formData.observacoes) {
          observacoesObj = { texto: formData.observacoes };
        }
        
        const mergedObservacoes = {
          ...observacoesObj,
          camposAdicionais,
        };
        
        clienteData.observacoes = JSON.stringify(mergedObservacoes);
      } catch (e) {
        // Em caso de erro, apenas convertemos para string
        clienteData.observacoes = JSON.stringify({
          texto: formData.observacoes,
          camposAdicionais,
        });
      }
      
      onSave(clienteData);
    }
  };

  // Extrair campos adicionais da propriedade observacoes
  useEffect(() => {
    if (cliente && cliente.observacoes) {
      try {
        const observacoesObj = JSON.parse(cliente.observacoes);
        if (observacoesObj.camposAdicionais) {
          setFormData(prev => ({
            ...prev,
            ...observacoesObj.camposAdicionais,
            observacoes: observacoesObj.texto || ''
          }));
        }
      } catch (e) {
        // Se não puder analisar como JSON, manter como está
        console.log("Não foi possível analisar observacoes como JSON");
      }
    }
  }, [cliente]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 mb-8">
          <TabsTrigger value="pessoal" className="flex items-center gap-2">
            <User size={16} />
            <span>Dados Pessoais</span>
          </TabsTrigger>
          <TabsTrigger value="contato" className="flex items-center gap-2">
            <Mail size={16} />
            <span>Contato</span>
          </TabsTrigger>
          <TabsTrigger value="endereco" className="flex items-center gap-2">
            <MapPin size={16} />
            <span>Endereço</span>
          </TabsTrigger>
          <TabsTrigger value="financeiro" className="flex items-center gap-2">
            <BadgeDollarSign size={16} />
            <span>Perfil Financeiro</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="pessoal" className="p-2">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Dados Pessoais</CardTitle>
              <CardDescription>Informações básicas do cliente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="nome" className={`text-sm font-medium ${errors.nome ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
                    Nome Completo <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="nome"
                    name="nome"
                    value={formData.nome}
                    onChange={handleInputChange}
                    placeholder="Nome completo do cliente"
                    className={`bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 ${errors.nome ? 'border-red-300 focus:ring-red-300 focus:border-red-300 dark:border-red-700' : 'focus:ring-blue-300 focus:border-blue-300'}`}
                  />
                  {errors.nome && <p className="mt-1 text-xs text-red-500">{errors.nome}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="dataNascimento" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Data de Nascimento
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
                          !formData.dataNascimento && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
                        {formData.dataNascimento ? (
                          format(formData.dataNascimento, "dd/MM/yyyy", { locale: pt })
                        ) : (
                          <span>Selecione uma data</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.dataNascimento}
                        onSelect={(date) => handleDateChange(date, 'dataNascimento')}
                        initialFocus
                        disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                        captionLayout="dropdown-buttons"
                        fromYear={1900}
                        toYear={new Date().getFullYear()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cpf" className={`text-sm font-medium ${errors.cpf ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
                    CPF
                  </Label>
                  <Input
                    id="cpf"
                    name="cpf"
                    value={formData.cpf || ''}
                    onChange={handleMaskedInputChange}
                    placeholder="000.000.000-00"
                    className={`bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 ${errors.cpf ? 'border-red-300 focus:ring-red-300 focus:border-red-300 dark:border-red-700' : 'focus:ring-blue-300 focus:border-blue-300'}`}
                    maxLength={14}
                  />
                  {errors.cpf && <p className="mt-1 text-xs text-red-500">{errors.cpf}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="documentoIdentidade" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Documento de Identidade
                  </Label>
                  <Input
                    id="documentoIdentidade"
                    name="documentoIdentidade"
                    value={formData.documentoIdentidade || ''}
                    onChange={handleInputChange}
                    placeholder="RG ou outro documento"
                    className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-blue-300 focus:border-blue-300"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="estadoCivil" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Estado Civil
                  </Label>
                  <Select 
                    value={formData.estadoCivil || ''} 
                    onValueChange={(value) => handleSelectChange(value, 'estadoCivil')}
                  >
                    <SelectTrigger id="estadoCivil" className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                      <SelectValue placeholder="Selecione o estado civil" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                      <SelectItem value="casado">Casado(a)</SelectItem>
                      <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                      <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                      <SelectItem value="uniao_estavel">União Estável</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="nacionalidade" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nacionalidade
                  </Label>
                  <Input
                    id="nacionalidade"
                    name="nacionalidade"
                    value={formData.nacionalidade || 'Brasileira'}
                    onChange={handleInputChange}
                    placeholder="Nacionalidade do cliente"
                    className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-blue-300 focus:border-blue-300"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="profissao" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Profissão
                  </Label>
                  <Input
                    id="profissao"
                    name="profissao"
                    value={formData.profissao || ''}
                    onChange={handleInputChange}
                    placeholder="Profissão ou ocupação"
                    className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-blue-300 focus:border-blue-300"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="contato" className="p-2">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Dados de Contato</CardTitle>
              <CardDescription>Informações para contato com o cliente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className={`text-sm font-medium ${errors.email ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="email@exemplo.com"
                    className={`bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 ${errors.email ? 'border-red-300 focus:ring-red-300 focus:border-red-300 dark:border-red-700' : 'focus:ring-blue-300 focus:border-blue-300'}`}
                  />
                  {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="telefone" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Telefone
                  </Label>
                  <Input
                    id="telefone"
                    name="telefone"
                    value={formData.telefone || ''}
                    onChange={handleMaskedInputChange}
                    placeholder="(00) 00000-0000"
                    className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-blue-300 focus:border-blue-300"
                    maxLength={15}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="empresa" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Empresa
                  </Label>
                  <Input
                    id="empresa"
                    name="empresa"
                    value={formData.empresa || ''}
                    onChange={handleInputChange}
                    placeholder="Nome da empresa"
                    className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-blue-300 focus:border-blue-300"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Último contato
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
                          !formData.dataUltimoContato && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
                        {formData.dataUltimoContato ? (
                          format(formData.dataUltimoContato, "dd/MM/yyyy", { locale: pt })
                        ) : (
                          <span>Selecione uma data</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.dataUltimoContato || undefined}
                        onSelect={(date) => handleDateChange(date, 'dataUltimoContato')}
                        initialFocus
                        disabled={(date) => date > new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="endereco" className="p-2">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Endereço</CardTitle>
              <CardDescription>Informações de endereço do cliente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
                <div className="space-y-2 md:col-span-4">
                  <Label htmlFor="endereco" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Endereço Completo
                  </Label>
                  <Input
                    id="endereco"
                    name="endereco"
                    value={formData.endereco || ''}
                    onChange={handleInputChange}
                    placeholder="Rua, número, complemento"
                    className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-blue-300 focus:border-blue-300"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="cep" className={`text-sm font-medium ${errors.cep ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
                    CEP
                  </Label>
                  <Input
                    id="cep"
                    name="cep"
                    value={formData.cep || ''}
                    onChange={handleMaskedInputChange}
                    placeholder="00000-000"
                    className={`bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 ${errors.cep ? 'border-red-300 focus:ring-red-300 focus:border-red-300 dark:border-red-700' : 'focus:ring-blue-300 focus:border-blue-300'}`}
                    maxLength={9}
                  />
                  {errors.cep && <p className="mt-1 text-xs text-red-500">{errors.cep}</p>}
                </div>
                
                <div className="space-y-2 md:col-span-4">
                  <Label htmlFor="cidade" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Cidade
                  </Label>
                  <Input
                    id="cidade"
                    name="cidade"
                    value={formData.cidade || ''}
                    onChange={handleInputChange}
                    placeholder="Nome da cidade"
                    className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-blue-300 focus:border-blue-300"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="estado" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Estado
                  </Label>
                  <Select 
                    value={formData.estado || ''} 
                    onValueChange={(value) => handleSelectChange(value, 'estado')}
                  >
                    <SelectTrigger id="estado" className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AC">AC</SelectItem>
                      <SelectItem value="AL">AL</SelectItem>
                      <SelectItem value="AP">AP</SelectItem>
                      <SelectItem value="AM">AM</SelectItem>
                      <SelectItem value="BA">BA</SelectItem>
                      <SelectItem value="CE">CE</SelectItem>
                      <SelectItem value="DF">DF</SelectItem>
                      <SelectItem value="ES">ES</SelectItem>
                      <SelectItem value="GO">GO</SelectItem>
                      <SelectItem value="MA">MA</SelectItem>
                      <SelectItem value="MT">MT</SelectItem>
                      <SelectItem value="MS">MS</SelectItem>
                      <SelectItem value="MG">MG</SelectItem>
                      <SelectItem value="PA">PA</SelectItem>
                      <SelectItem value="PB">PB</SelectItem>
                      <SelectItem value="PR">PR</SelectItem>
                      <SelectItem value="PE">PE</SelectItem>
                      <SelectItem value="PI">PI</SelectItem>
                      <SelectItem value="RJ">RJ</SelectItem>
                      <SelectItem value="RN">RN</SelectItem>
                      <SelectItem value="RS">RS</SelectItem>
                      <SelectItem value="RO">RO</SelectItem>
                      <SelectItem value="RR">RR</SelectItem>
                      <SelectItem value="SC">SC</SelectItem>
                      <SelectItem value="SP">SP</SelectItem>
                      <SelectItem value="SE">SE</SelectItem>
                      <SelectItem value="TO">TO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="financeiro" className="p-2">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Perfil Financeiro</CardTitle>
              <CardDescription>Informações para análise e recomendações</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="perfilRisco" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <span>Perfil de Risco</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info size={16} className="text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <p>Este perfil determina as recomendações de investimentos mais adequadas para o cliente.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Select 
                    value={formData.perfilRisco || ''} 
                    onValueChange={(value) => handleSelectChange(value, 'perfilRisco')}
                  >
                    <SelectTrigger id="perfilRisco" className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                      <SelectValue placeholder="Selecione o perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      {PERFIS_RISCO.map((perfil) => (
                        <SelectItem key={perfil.id} value={perfil.id}>{perfil.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Data de cadastro
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
                          !formData.dataCadastro && "text-muted-foreground"
                        )}
                        disabled
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
                        {formData.dataCadastro ? (
                          format(formData.dataCadastro, "dd/MM/yyyy", { locale: pt })
                        ) : (
                          <span>Selecione uma data</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.dataCadastro}
                        onSelect={(date) => handleDateChange(date, 'dataCadastro')}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Esta data é gerada automaticamente</p>
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="observacoes" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Observações
                  </Label>
                  <Textarea
                    id="observacoes"
                    name="observacoes"
                    value={formData.observacoes || ''}
                    onChange={handleInputChange}
                    placeholder="Informações adicionais sobre o cliente"
                    className="min-h-[120px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-blue-300 focus:border-blue-300"
                  />
                </div>
              </div>
              
              <div className="pt-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ativo"
                    checked={formData.ativo}
                    onCheckedChange={(checked) => handleCheckboxChange(checked as boolean, 'ativo')}
                  />
                  <Label
                    htmlFor="ativo"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                  >
                    Cliente ativo
                  </Label>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Clientes inativos não aparecem nas listagens padrão
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {Object.keys(errors).length > 0 && (
        <Alert variant="destructive" className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro no formulário</AlertTitle>
          <AlertDescription>
            Por favor, corrija os erros indicados antes de salvar.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex justify-end space-x-4 pt-4 border-t border-gray-100 dark:border-gray-700">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="bg-white dark:bg-gray-800"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSaving}
          className="bg-primary hover:bg-primary/90"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              {cliente ? 'Atualizar' : 'Cadastrar'} Cliente
            </>
          )}
        </Button>
      </div>
    </form>
  );
} 