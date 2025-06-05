import React from "react";
import { cn } from "@/lib/utils";

interface AnimatedGradientBackgroundProps {
  className?: string;
  children: React.ReactNode;
}

export function AnimatedGradientBackground({
  className,
  children,
}: AnimatedGradientBackgroundProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-white dark:bg-gray-900",
        className,
      )}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-[10px] opacity-50 dark:opacity-30">
          <div
            className="absolute top-0 -left-40 w-80 h-80 bg-gradient-to-r from-blue-100 to-indigo-200 dark:from-blue-900/40 dark:to-indigo-900/40 rounded-full mix-blend-multiply dark:mix-blend-soft-light blur-3xl animate-blob"
            style={{ animationDelay: "0s" }}
          />
          <div
            className="absolute top-0 -right-40 w-80 h-80 bg-gradient-to-r from-indigo-100 to-purple-200 dark:from-indigo-900/40 dark:to-purple-900/40 rounded-full mix-blend-multiply dark:mix-blend-soft-light blur-3xl animate-blob animation-delay-2000"
            style={{ animationDelay: "2s" }}
          />
          <div
            className="absolute -bottom-40 left-20 w-80 h-80 bg-gradient-to-r from-blue-100 to-sky-200 dark:from-blue-900/40 dark:to-sky-900/40 rounded-full mix-blend-multiply dark:mix-blend-soft-light blur-3xl animate-blob animation-delay-4000"
            style={{ animationDelay: "4s" }}
          />
        </div>
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}
