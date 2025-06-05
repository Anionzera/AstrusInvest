import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";
import { cn } from "@/lib/utils";

interface CustomCardProps {
  className?: string;
  children: React.ReactNode;
}

export function CustomCard({ className, children }: CustomCardProps) {
  return (
    <Card
      className={cn(
        "border-blue-100 shadow-md dark:border-gray-700 dark:bg-gray-800",
        className,
      )}
    >
      {children}
    </Card>
  );
}

interface CustomCardHeaderProps {
  className?: string;
  children: React.ReactNode;
  gradient?: boolean;
}

export function CustomCardHeader({
  className,
  children,
  gradient = true,
}: CustomCardHeaderProps) {
  return (
    <CardHeader
      className={cn(
        gradient
          ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-b dark:from-blue-900/20 dark:to-indigo-900/20 dark:border-gray-700"
          : "",
        className,
      )}
    >
      {children}
    </CardHeader>
  );
}

interface CustomCardTitleProps {
  className?: string;
  children: React.ReactNode;
}

export function CustomCardTitle({ className, children }: CustomCardTitleProps) {
  return (
    <CardTitle className={cn("text-blue-800 dark:text-blue-300", className)}>
      {children}
    </CardTitle>
  );
}

interface CustomCardDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

export function CustomCardDescription({
  className,
  children,
}: CustomCardDescriptionProps) {
  return (
    <CardDescription
      className={cn("text-gray-600 dark:text-gray-300", className)}
    >
      {children}
    </CardDescription>
  );
}

interface CustomCardContentProps {
  className?: string;
  children: React.ReactNode;
}

export function CustomCardContent({
  className,
  children,
}: CustomCardContentProps) {
  return <CardContent className={className}>{children}</CardContent>;
}

interface CustomCardFooterProps {
  className?: string;
  children: React.ReactNode;
  highlighted?: boolean;
}

export function CustomCardFooter({
  className,
  children,
  highlighted = false,
}: CustomCardFooterProps) {
  return (
    <CardFooter
      className={cn(
        "border-t dark:border-gray-700",
        highlighted ? "bg-gray-50 dark:bg-gray-800/50" : "",
        className,
      )}
    >
      {children}
    </CardFooter>
  );
}

interface InfoAlertProps {
  title: string;
  description: string;
  variant?: "info" | "warning" | "success" | "error";
  className?: string;
  icon?: React.ReactNode;
}

export function InfoAlert({
  title,
  description,
  variant = "info",
  className,
  icon,
}: InfoAlertProps) {
  const variantStyles = {
    info: {
      bg: "bg-blue-50 dark:bg-blue-900/20",
      border: "border-blue-200 dark:border-blue-800/50",
      titleColor: "text-blue-800 dark:text-blue-300",
      textColor: "text-blue-700 dark:text-blue-400",
      iconColor: "text-blue-500 dark:text-blue-400",
    },
    warning: {
      bg: "bg-amber-50 dark:bg-amber-900/20",
      border: "border-amber-200 dark:border-amber-800/50",
      titleColor: "text-amber-800 dark:text-amber-300",
      textColor: "text-amber-700 dark:text-amber-400",
      iconColor: "text-amber-500 dark:text-amber-400",
    },
    success: {
      bg: "bg-green-50 dark:bg-green-900/20",
      border: "border-green-200 dark:border-green-800/50",
      titleColor: "text-green-800 dark:text-green-300",
      textColor: "text-green-700 dark:text-green-400",
      iconColor: "text-green-500 dark:text-green-400",
    },
    error: {
      bg: "bg-red-50 dark:bg-red-900/20",
      border: "border-red-200 dark:border-red-800/50",
      titleColor: "text-red-800 dark:text-red-300",
      textColor: "text-red-700 dark:text-red-400",
      iconColor: "text-red-500 dark:text-red-400",
    },
  };

  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        styles.bg,
        styles.border,
        "rounded-lg p-4 flex gap-3 shadow-sm",
        className,
      )}
    >
      {icon && (
        <div className={cn("flex-shrink-0 mt-0.5", styles.iconColor)}>
          {icon}
        </div>
      )}
      <div>
        <h4 className={cn("font-medium", styles.titleColor)}>{title}</h4>
        <p className={cn("text-sm mt-1", styles.textColor)}>{description}</p>
      </div>
    </div>
  );
}
