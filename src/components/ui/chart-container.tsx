import React, { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./card";
import { Button } from "./button";
import { Tabs, TabsList, TabsTrigger } from "./tabs";
import { Maximize2, Minimize2, RefreshCw } from "lucide-react";

interface ChartContainerProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  className?: string;
  onRefresh?: () => void;
  isLoading?: boolean;
  chartTypes?: string[];
  defaultChartType?: string;
  onChartTypeChange?: (type: string) => void;
  expandable?: boolean;
  accentColor?: string;
  borderRadius?: 'sm' | 'md' | 'lg' | 'xl';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  highQuality?: boolean;
}

export function ChartContainer({
  children,
  title,
  description,
  className,
  onRefresh,
  isLoading = false,
  chartTypes,
  defaultChartType,
  onChartTypeChange,
  expandable = false,
  accentColor,
  borderRadius = 'lg',
  shadow = 'md',
  highQuality = true,
}: ChartContainerProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeChartType, setActiveChartType] = useState(
    defaultChartType || (chartTypes && chartTypes[0]),
  );

  const handleChartTypeChange = (type: string) => {
    setActiveChartType(type);
    if (onChartTypeChange) {
      onChartTypeChange(type);
    }
  };

  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  // Mapeamento de classes de sombra
  const shadowClasses = {
    none: "",
    sm: "shadow-sm",
    md: "shadow-md",
    lg: "shadow-lg"
  };

  // Mapeamento de classes de borda
  const radiusClasses = {
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-xl"
  };

  // Estilo para acento de cor
  const accentStyle = accentColor ? {
    borderTop: `3px solid ${accentColor}`
  } : {};

  return (
    <motion.div
      layout
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={cn(
        "relative",
        expanded ? "fixed inset-4 z-50" : "w-full",
        className,
      )}
    >
      <Card
        style={accentStyle}
        className={cn(
          "bg-card dark:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-all duration-200",
          `${radiusClasses[borderRadius]} ${shadowClasses[shadow]}`,
          expanded ? "h-full" : "",
          expanded ? "shadow-xl" : "",
          shadow !== 'none' && !expanded ? "hover:shadow-lg" : ""
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-foreground dark:text-white flex items-center gap-2">
              {title}
            </CardTitle>
            {description && <CardDescription className="text-muted-foreground">{description}</CardDescription>}
          </div>
          <div className="flex items-center gap-2">
            {chartTypes && chartTypes.length > 1 && (
              <Tabs
                value={activeChartType}
                onValueChange={handleChartTypeChange}
                className="h-8"
              >
                <TabsList className="h-8 p-1 bg-muted">
                  {chartTypes.map((type) => (
                    <TabsTrigger
                      key={type}
                      value={type}
                      className="text-xs h-6 px-2 transition-colors duration-200"
                    >
                      {type}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}
            {onRefresh && (
              <Button
                variant="outline"
                size="icon-sm"
                onClick={onRefresh}
                disabled={isLoading}
                className="h-8 w-8 text-foreground hover:bg-muted transition-colors"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
              </Button>
            )}
            {expandable && (
              <Button
                variant="outline"
                size="icon-sm"
                onClick={toggleExpand}
                className="h-8 w-8 text-foreground hover:bg-muted transition-colors"
              >
                {expanded ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent
          className={cn(expanded ? "overflow-auto" : "", "relative", 
            "px-4 py-0 pb-4" // Adicionar padding consistente
          )}
        >
          <div
            className={cn(
              "transition-opacity duration-300 chart-wrapper",
              isLoading ? "opacity-50" : "opacity-100",
              highQuality ? "high-quality-chart" : ""
            )}
            style={{
              // Melhorar a qualidade de renderização SVG
              shapeRendering: highQuality ? "geometricPrecision" : "auto",
              textRendering: "optimizeLegibility",
            }}
          >
            {children}
          </div>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          )}
        </CardContent>
      </Card>
      {expanded && (
        <div
          className="fixed inset-0 bg-black/20 dark:bg-black/50 z-40 backdrop-blur-sm"
          onClick={toggleExpand}
        />
      )}
    </motion.div>
  );
}
