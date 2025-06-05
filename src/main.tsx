import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import QueryProvider from "./lib/query-provider";
import { ThemeProvider } from "./components/ui/theme-provider";
import { AuthProvider } from "./components/auth/AuthContext";

import { TempoDevtools } from "tempo-devtools";
TempoDevtools.init();

// Remove dark mode if it was previously set
document.documentElement.classList.remove("dark");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryProvider>
      <ThemeProvider defaultTheme="light" storageKey="investt-ui-theme">
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryProvider>
  </React.StrictMode>,
);
