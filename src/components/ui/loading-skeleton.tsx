import React from "react";
import { Skeleton } from "./skeleton";
import { Card, CardContent, CardHeader } from "./card";

interface LoadingSkeletonProps {
  type?: "chart" | "table" | "form" | "card";
  count?: number;
  className?: string;
}

/**
 * Componente de esqueleto de carregamento para diferentes tipos de conteúdo
 */
export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  type = "card",
  count = 1,
  className = "",
}) => {
  // Esqueleto para gráficos
  const ChartSkeleton = () => (
    <div className={`space-y-4 w-full ${className}`}>
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );

  // Esqueleto para tabelas
  const TableSkeleton = () => (
    <div className={`space-y-4 w-full ${className}`}>
      <Skeleton className="h-8 w-3/4" />
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        {Array(5)
          .fill(0)
          .map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
      </div>
    </div>
  );

  // Esqueleto para formulários
  const FormSkeleton = () => (
    <div className={`space-y-6 w-full ${className}`}>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-20 w-full" />
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );

  // Esqueleto para cards
  const CardSkeleton = () => (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-2">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Renderizar o tipo de esqueleto apropriado com a quantidade especificada
  const renderSkeleton = () => {
    let SkeletonComponent;
    
    switch (type) {
      case "chart":
        SkeletonComponent = ChartSkeleton;
        break;
      case "table":
        SkeletonComponent = TableSkeleton;
        break;
      case "form":
        SkeletonComponent = FormSkeleton;
        break;
      case "card":
      default:
        SkeletonComponent = CardSkeleton;
        break;
    }

    if (count === 1) {
      return <SkeletonComponent />;
    }

    return Array(count)
      .fill(0)
      .map((_, i) => <SkeletonComponent key={i} />);
  };

  return <>{renderSkeleton()}</>;
}; 