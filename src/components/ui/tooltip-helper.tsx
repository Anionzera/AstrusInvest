import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

interface TooltipHelperProps {
  text: string;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
  iconSize?: number;
}

const TooltipHelper: React.FC<TooltipHelperProps> = ({
  text,
  side = "top",
  className = "",
  iconSize = 16,
}) => {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <span className={`inline-flex cursor-help ${className}`}>
            <HelpCircle
              size={iconSize}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
            />
          </span>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs text-sm">
          <p>{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default TooltipHelper;
