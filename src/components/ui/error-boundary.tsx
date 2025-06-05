import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Erro capturado pelo ErrorBoundary:", error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: undefined });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800/50 flex flex-col items-center justify-center text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 dark:text-red-400 mb-4" />
          <h2 className="text-xl font-semibold text-red-700 dark:text-red-300 mb-2">
            Algo deu errado
          </h2>
          <p className="text-red-600 dark:text-red-300 mb-4">
            {this.state.error?.message || "Ocorreu um erro inesperado."}
          </p>
          <Button
            onClick={this.handleReset}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
          >
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
