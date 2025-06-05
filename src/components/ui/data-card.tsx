import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { cn } from "@/lib/utils";

interface DataCardProps {
  title: string;
  value: string | number | React.ReactNode;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  valueClassName?: string;
}

export function DataCard({
  title,
  value,
  description,
  icon,
  trend,
  className,
  valueClassName,
}: DataCardProps) {
  return (
    <Card
      className={cn(
        "bg-white dark:bg-gray-800 dark:border-gray-700 overflow-hidden",
        className,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium dark:text-white">
          {title}
        </CardTitle>
        {icon && (
          <div className="h-4 w-4 text-muted-foreground dark:text-gray-400">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div
          className={cn("text-2xl font-bold dark:text-white", valueClassName)}
        >
          {value}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground dark:text-gray-400">
            {description}
          </p>
        )}
        {trend && (
          <div className="mt-2 flex items-center">
            <span
              className={cn(
                "text-xs font-medium",
                trend.isPositive
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400",
              )}
            >
              {trend.isPositive ? "+" : ""}
              {trend.value}%
            </span>
            <span className="ml-1 text-xs text-muted-foreground dark:text-gray-400">
              em relação ao período anterior
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
