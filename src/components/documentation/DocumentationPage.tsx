import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FileText,
  Users,
  BarChart,
  FileOutput,
  Clock,
  GitBranch,
} from "lucide-react";
import ChangeLog from "./ChangeLog";

const DocumentationPage = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Documentação do Sistema</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Guia completo de funcionalidades e atualizações do sistema de
          recomendações de investimento
        </p>
      </div>

      <Tabs defaultValue="changelog">
        <TabsList className="mb-4">
          <TabsTrigger value="changelog" className="flex items-center">
            <Clock className="mr-2 h-4 w-4" />
            Histórico de Atualizações
          </TabsTrigger>
          <TabsTrigger value="clients" className="flex items-center">
            <Users className="mr-2 h-4 w-4" />
            Gestão de Clientes
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="flex items-center">
            <BarChart className="mr-2 h-4 w-4" />
            Recomendações
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center">
            <FileOutput className="mr-2 h-4 w-4" />
            Relatórios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="changelog">
          <ChangeLog />
        </TabsContent>

        <TabsContent value="clients">
          <Card>
            <CardHeader>
              <CardTitle>Gestão de Clientes</CardTitle>
              <CardDescription>
                Aprenda a gerenciar o cadastro de clientes no sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">
                  Cadastro de Clientes
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  O cadastro de clientes é o primeiro passo para utilizar o
                  sistema de recomendações. Todos os clientes devem ser
                  cadastrados antes de criar recomendações de investimento.
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600 dark:text-gray-300">
                  <li>Acesse a seção "Clientes" no menu principal</li>
                  <li>Clique em "Novo Cliente" para adicionar um cliente</li>
                  <li>Preencha os dados básicos (nome, email, telefone)</li>
                  <li>
                    Campos como CPF e data de nascimento são opcionais mas
                    recomendados
                  </li>
                  <li>Clique em "Salvar" para concluir o cadastro</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Edição e Exclusão</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Você pode editar ou excluir clientes a qualquer momento, mas
                  lembre-se que a exclusão de um cliente também removerá todas
                  as suas recomendações associadas.
                </p>
              </div>

              <div className="bg-blue-50 p-4 rounded-md border border-blue-100 dark:bg-blue-900/20 dark:border-blue-800">
                <h4 className="font-medium text-blue-800 dark:text-blue-300">
                  Novidade na versão 1.1.0
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                  Agora as recomendações só podem ser criadas para clientes
                  previamente cadastrados no sistema. Isso garante melhor
                  organização e rastreabilidade das recomendações.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations">
          <Card>
            <CardHeader>
              <CardTitle>Recomendações de Investimento</CardTitle>
              <CardDescription>
                Como criar e gerenciar recomendações personalizadas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">
                  Criação de Recomendações
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  As recomendações de investimento são criadas em um processo de
                  6 etapas:
                </p>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-gray-600 dark:text-gray-300">
                  <li>
                    <strong>Seleção do Cliente:</strong> Escolha um cliente
                    cadastrado
                  </li>
                  <li>
                    <strong>Perfil de Risco:</strong> Determine o perfil de
                    risco do cliente
                  </li>
                  <li>
                    <strong>Horizonte de Investimento:</strong> Defina o prazo
                    dos investimentos
                  </li>
                  <li>
                    <strong>Classes de Ativos:</strong> Selecione as classes de
                    ativos adequadas
                  </li>
                  <li>
                    <strong>Estratégia:</strong> Escolha a estratégia de
                    alocação
                  </li>
                  <li>
                    <strong>Visualização:</strong> Revise a recomendação antes
                    de finalizar
                  </li>
                </ol>
              </div>

              <div className="bg-blue-50 p-4 rounded-md border border-blue-100 dark:bg-blue-900/20 dark:border-blue-800">
                <h4 className="font-medium text-blue-800 dark:text-blue-300">
                  Novidade na versão 1.1.0
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                  As recomendações agora são automaticamente excluídas após a
                  geração do relatório final, evitando duplicidade e mantendo o
                  sistema organizado.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">
                  Histórico de Recomendações
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Todas as recomendações são armazenadas no histórico até que
                  sejam convertidas em relatórios ou excluídas manualmente. O
                  histórico permite visualizar, editar ou gerar relatórios a
                  partir das recomendações salvas.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Relatórios</CardTitle>
              <CardDescription>
                Geração e personalização de relatórios de investimento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">
                  Geração de Relatórios
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Os relatórios são a versão final das recomendações, formatados
                  para apresentação ao cliente. Você pode personalizar quais
                  seções incluir e exportar em formato PDF.
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600 dark:text-gray-300">
                  <li>Acesse uma recomendação e clique em "Gerar Relatório"</li>
                  <li>Personalize o título, descrição e seções a incluir</li>
                  <li>Visualize a prévia do relatório</li>
                  <li>Clique em "Salvar Relatório" para finalizar</li>
                  <li>Exporte como PDF para compartilhar com o cliente</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">
                  Seções do Relatório
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Você pode personalizar quais seções incluir no relatório:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600 dark:text-gray-300">
                  <li>
                    <strong>Resumo Executivo:</strong> Visão geral da
                    recomendação
                  </li>
                  <li>
                    <strong>Análise de Mercado:</strong> Contexto atual do
                    mercado
                  </li>
                  <li>
                    <strong>Alocação de Ativos:</strong> Detalhamento da
                    alocação recomendada
                  </li>
                  <li>
                    <strong>Análise de Risco:</strong> Avaliação dos riscos da
                    estratégia
                  </li>
                  <li>
                    <strong>Recomendações Específicas:</strong> Sugestões
                    detalhadas de investimentos
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 p-4 rounded-md border border-blue-100 dark:bg-blue-900/20 dark:border-blue-800">
                <h4 className="font-medium text-blue-800 dark:text-blue-300">
                  Importante
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                  Após a geração do relatório final, a recomendação original é
                  automaticamente excluída para evitar duplicidade. O relatório
                  gerado fica disponível no histórico para consulta e exportação
                  a qualquer momento.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DocumentationPage;
