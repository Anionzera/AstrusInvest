import React from "react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  actions,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6",
        className,
      )}
    >
      <div className="flex flex-col">
        <h2 className="text-2xl font-bold tracking-tight dark:text-white">
          {title}
        </h2>
        {description && (
          <p className="text-muted-foreground dark:text-gray-400 mt-1">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
