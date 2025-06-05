import React, { useState } from "react";
import { motion } from "framer-motion";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: string;
  label: string;
}

interface RecommendationStepperProps {
  steps: Step[];
  activeStep: string;
  onStepClick?: (stepId: string) => void;
}

const RecommendationStepper: React.FC<RecommendationStepperProps> = ({
  steps,
  activeStep,
  onStepClick,
}) => {
  const getStepStatus = (stepId: string) => {
    const currentIndex = steps.findIndex((step) => step.id === activeStep);
    const stepIndex = steps.findIndex((step) => step.id === stepId);

    if (stepIndex < currentIndex) return "complete";
    if (stepIndex === currentIndex) return "current";
    return "upcoming";
  };

  return (
    <div className="w-full mb-8 mt-6">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <motion.div
              className="flex flex-col items-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <button
                onClick={() => onStepClick && onStepClick(step.id)}
                disabled={getStepStatus(step.id) === "upcoming"}
                className={cn(
                  "flex items-center justify-center w-12 h-12 rounded-full shadow-md text-white transition-all duration-300",
                  getStepStatus(step.id) === "complete"
                    ? "bg-green-500 hover:bg-green-600"
                    : getStepStatus(step.id) === "current"
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-gray-300 dark:bg-gray-600 cursor-not-allowed",
                )}
              >
                {getStepStatus(step.id) === "complete" ? (
                  <Check className="w-6 h-6" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </button>
              <span
                className={cn(
                  "mt-2 text-sm font-medium",
                  getStepStatus(step.id) === "complete"
                    ? "text-green-600"
                    : getStepStatus(step.id) === "current"
                      ? "text-blue-600"
                      : "text-gray-500 dark:text-gray-400",
                )}
              >
                {step.label}
              </span>
            </motion.div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-1 mx-2 rounded-full transition-all duration-500",
                  index < steps.findIndex((s) => s.id === activeStep)
                    ? "bg-green-500"
                    : "bg-gray-300 dark:bg-gray-600",
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default RecommendationStepper;
