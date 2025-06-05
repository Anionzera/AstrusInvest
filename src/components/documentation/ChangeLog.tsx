import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

const ChangeLog = () => {
  const changes = [
    {
      version: "1.1.0",
      date: "Atualização atual",
      changes: [
        {
          title: "Recomendações apenas para clientes cadastrados",
          description:
            "Agora só é possível criar recomendações para clientes previamente cadastrados no sistema.",
          type: "feature",
        },
        {
          title: "Exclusão automática após geração de relatório",
          description:
            "As recomendações são automaticamente excluídas após a geração do relatório final.",
          type: "feature",
        },
        {
          title: "Estatísticas de clientes e recomendações",
          description:
            "Adicionado painel de estatísticas no dashboard mostrando clientes sem recomendações.",
          type: "feature",
        },
        {
          title: "Histórico de recomendações melhorado",
          description:
            "Interface aprimorada para visualização e gerenciamento do histórico de recomendações.",
          type: "improvement",
        },
        {
          title: "Integração cliente-recomendação",
          description:
            "Melhor integração entre o cadastro de clientes e o sistema de recomendações.",
          type: "improvement",
        },
      ],
    },
    {
      version: "1.0.0",
      date: "Versão inicial",
      changes: [
        {
          title: "Lançamento inicial",
          description:
            "Primeira versão do sistema com funcionalidades básicas de gestão de clientes e recomendações.",
          type: "release",
        },
        {
          title: "Gestão de clientes",
          description: "Cadastro e gerenciamento de clientes.",
          type: "feature",
        },
        {
          title: "Recomendações de investimento",
          description:
            "Criação de recomendações de investimento baseadas em perfil de risco.",
          type: "feature",
        },
        {
          title: "Geração de relatórios",
          description:
            "Geração de relatórios em PDF com recomendações de investimento.",
          type: "feature",
        },
      ],
    },
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Histórico de Atualizações</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-8">
            {changes.map((version, index) => (
              <div
                key={index}
                className="relative pl-6 border-l-2 border-gray-200 dark:border-gray-700"
              >
                <div className="absolute -left-1.5 top-0 h-3 w-3 rounded-full bg-blue-500"></div>
                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">
                      Versão {version.version}
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      {version.date}
                    </Badge>
                  </div>
                  <div className="mt-4 space-y-4">
                    {version.changes.map((change, changeIndex) => (
                      <div
                        key={changeIndex}
                        className="border-l-2 pl-4 py-1 border-gray-100 dark:border-gray-800"
                      >
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{change.title}</h4>
                          <Badge
                            variant={
                              change.type === "feature"
                                ? "default"
                                : change.type === "improvement"
                                  ? "secondary"
                                  : change.type === "fix"
                                    ? "destructive"
                                    : "outline"
                            }
                            className="text-xs"
                          >
                            {change.type === "feature"
                              ? "Novo"
                              : change.type === "improvement"
                                ? "Melhoria"
                                : change.type === "fix"
                                  ? "Correção"
                                  : change.type === "release"
                                    ? "Lançamento"
                                    : change.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {change.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ChangeLog;
