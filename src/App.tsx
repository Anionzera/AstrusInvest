import React from "react";
import { useRoutes } from "react-router-dom";
import { Toaster } from "./components/ui/toaster";
import { appRoutes } from "./routes";

// Componente principal da aplicação
const App = () => {
  // Usar as rotas definidas em routes.tsx
  const routeContent = useRoutes(appRoutes);

  return (
    <>
      {/* Renderizar as rotas */}
      {routeContent}
      
      {/* Toaster para notificações */}
      <Toaster />
    </>
  );
};

export default App;
