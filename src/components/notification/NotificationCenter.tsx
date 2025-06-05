import React, { useState, useEffect } from "react";
import { Bell, X, Check, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  read: boolean;
  date: Date;
};

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    // Simular carregamento de notificações
    // Em uma implementação real, isso viria do banco de dados
    const loadNotifications = async () => {
      try {
        // Verificar clientes sem recomendações
        const clients = await db.clientes.toArray();
        const recommendations = await db.recomendacoes.toArray();

        const clientIds = new Set(clients.map((client) => client.id));
        const clientsWithRecs = new Set(
          recommendations
            .filter((rec) => rec.clienteId)
            .map((rec) => rec.clienteId),
        );

        const clientsWithoutRecs = clients.filter(
          (client) => !clientsWithRecs.has(client.id),
        );

        const newNotifications: Notification[] = [];

        // Notificação para clientes sem recomendações
        if (clientsWithoutRecs.length > 0) {
          newNotifications.push({
            id: "clients-without-recs",
            title: "Clientes sem recomendações",
            message: `${clientsWithoutRecs.length} cliente(s) não possuem recomendações de investimento.`,
            type: "warning",
            read: false,
            date: new Date(),
          });
        }

        // Verificar recomendações recentes (últimos 7 dias)
        const recentDate = new Date();
        recentDate.setDate(recentDate.getDate() - 7);

        const recentRecs = recommendations.filter(
          (rec) => new Date(rec.data) >= recentDate,
        );

        if (recentRecs.length > 0) {
          newNotifications.push({
            id: "recent-recommendations",
            title: "Novas recomendações",
            message: `${recentRecs.length} nova(s) recomendação(ões) criada(s) nos últimos 7 dias.`,
            type: "info",
            read: false,
            date: new Date(),
          });
        }

        // Adicionar notificação de sistema
        newNotifications.push({
          id: "system-update",
          title: "Atualização do sistema",
          message:
            "Nova versão disponível com melhorias de performance e novas funcionalidades.",
          type: "success",
          read: false,
          date: new Date(),
        });

        setNotifications(newNotifications);
        setUnreadCount(newNotifications.filter((n) => !n.read).length);
      } catch (error) {
        console.error("Erro ao carregar notificações:", error);
      }
    };

    loadNotifications();
  }, []);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification,
      ),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, read: true })),
    );
    setUnreadCount(0);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "info":
        return <Info className="h-4 w-4 text-blue-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "success":
        return <Check className="h-4 w-4 text-green-500" />;
      case "error":
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-medium">Notificações</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs h-8"
            >
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length > 0 ? (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 ${notification.read ? "bg-white dark:bg-gray-800" : "bg-blue-50 dark:bg-blue-900/10"}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">
                          {notification.title}
                        </h4>
                        <Badge
                          variant={notification.read ? "outline" : "default"}
                          className="text-[10px] px-1 py-0 h-4"
                        >
                          {notification.read ? "Lida" : "Nova"}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-gray-400">
                          {new Date(notification.date).toLocaleDateString(
                            "pt-BR",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </span>
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                            className="text-xs h-6 px-2"
                          >
                            Marcar como lida
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Nenhuma notificação
              </p>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationCenter;
