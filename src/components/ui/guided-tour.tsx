import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./button";
import { ChevronRight, ChevronLeft, X, HelpCircle } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { createPortal } from 'react-dom';

// Define os passos do tour
export type TourStep = {
  target: string; // Seletor CSS do elemento alvo
  title: string;
  content: string;
  position?: "top" | "right" | "bottom" | "left";
  route?: string; // Rota opcional para a qual navegar neste passo
};

type GuidedTourProps = {
  steps: TourStep[];
  onComplete?: () => void;
  isOpen: boolean;
  onClose: () => void;
};

export const GuidedTour: React.FC<GuidedTourProps> = ({
  steps,
  onComplete,
  isOpen,
  onClose,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<DOMRect | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Função para obter a posição do elemento
  const updateTargetElement = () => {
    if (!steps[currentStep]) return;
    
    const element = document.querySelector(steps[currentStep].target);
    if (element) {
      setTargetElement(element.getBoundingClientRect());
    } else {
      setTargetElement(null);
    }
  };

  // Atualiza a posição do elemento quando o passo muda
  useEffect(() => {
    if (!isOpen) return;
    
    // Se o passo tiver uma rota e estivermos em uma rota diferente, navegar para ela
    const step = steps[currentStep];
    if (step?.route && step.route !== location.pathname) {
      navigate(step.route);
    }
    
    // Atualizar a posição após um breve delay para garantir que a renderização concluiu
    const timer = setTimeout(() => {
      updateTargetElement();
    }, 300);
    
    return () => clearTimeout(timer);
  }, [currentStep, isOpen, location.pathname, navigate, steps]);

  // Atualiza a posição em caso de redimensionamento/scroll
  useEffect(() => {
    if (!isOpen) return;
    
    const handleUpdate = () => {
      updateTargetElement();
    };
    
    window.addEventListener("resize", handleUpdate);
    window.addEventListener("scroll", handleUpdate);
    
    return () => {
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("scroll", handleUpdate);
    };
  }, [isOpen, currentStep]);

  // Manipuladores de navegação
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setCurrentStep(0);
    onClose();
    if (onComplete) onComplete();
    
    // Salvar no localStorage que o tour foi concluído
    localStorage.setItem("guided-tour-completed", "true");
  };

  // Se não estiver aberto, não renderizar nada
  if (!isOpen || !steps.length) return null;

  // Calcular a posição do tooltip
  const getTooltipPosition = () => {
    if (!targetElement) {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    const position = steps[currentStep].position || "bottom";
    const gap = 12; // Espaço entre o elemento e o tooltip
    
    switch (position) {
      case "top":
        return {
          bottom: `${window.innerHeight - targetElement.top + gap}px`,
          left: `${targetElement.left + targetElement.width / 2}px`,
          transform: "translateX(-50%)",
        };
      case "right":
        return {
          top: `${targetElement.top + targetElement.height / 2}px`,
          left: `${targetElement.right + gap}px`,
          transform: "translateY(-50%)",
        };
      case "bottom":
        return {
          top: `${targetElement.bottom + gap}px`,
          left: `${targetElement.left + targetElement.width / 2}px`,
          transform: "translateX(-50%)",
        };
      case "left":
        return {
          top: `${targetElement.top + targetElement.height / 2}px`,
          right: `${window.innerWidth - targetElement.left + gap}px`,
          transform: "translateY(-50%)",
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Overlay escurecido com uma área destacada para o elemento alvo */}
      {targetElement && (
        <div className="absolute inset-0 bg-black/60 pointer-events-auto">
          <div
            className="absolute bg-transparent outline-white outline-2 outline"
            style={{
              top: targetElement.top - 4 + "px",
              left: targetElement.left - 4 + "px",
              width: targetElement.width + 8 + "px",
              height: targetElement.height + 8 + "px",
              borderRadius: "4px",
            }}
          />
        </div>
      )}

      {/* Tooltip com informações do passo */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="absolute bg-white dark:bg-gray-800 rounded-lg shadow-xl p-5 w-80 pointer-events-auto z-50 dark:text-white"
          style={getTooltipPosition()}
        >
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X size={18} />
          </button>
          
          <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white flex items-center">
            <HelpCircle className="inline mr-2 text-blue-500" size={20} />
            {steps[currentStep].title}
          </h3>
          
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {steps[currentStep].content}
          </p>
          
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {currentStep + 1} de {steps.length}
            </div>
            
            <div className="flex space-x-2">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrev}
                  className="flex items-center"
                >
                  <ChevronLeft size={16} className="mr-1" />
                  Anterior
                </Button>
              )}
              
              <Button
                onClick={handleNext}
                size="sm"
                className="flex items-center"
              >
                {currentStep < steps.length - 1 ? (
                  <>
                    Próximo
                    <ChevronRight size={16} className="ml-1" />
                  </>
                ) : (
                  "Concluir"
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// Função que ajuda a verificar se deve mostrar o tour
export const shouldShowTour = (pathname: string): boolean => {
  // Não mostrar o tour em páginas de autenticação
  if (pathname === "/login" || pathname.includes("/register")) {
    return false;
  }
  
  try {
    // Verificar se o usuário está autenticado
    const isAuthenticated = localStorage.getItem("auth") === "true" || 
                          localStorage.getItem("token") || 
                          localStorage.getItem("usuario-logado") ||
                          localStorage.getItem("user");
    
    if (!isAuthenticated) {
      return false;
    }
    
    // Verificar se o usuário é uma conta de demonstração
    let isDemoAccount = false;
    const userData = localStorage.getItem("user");
    
    if (userData) {
      const user = JSON.parse(userData);
      isDemoAccount = user.isDemoAccount === true || 
                     user.role === "demonstração" || 
                     user.username === "astrus";
    }
    
    // Verificar se o tour já foi concluído
    const tourCompleted = localStorage.getItem("guided-tour-completed") === "true";
    
    // Mostrar tour para todos os usuários autenticados que não completaram o tour,
    // independente de serem demonstração ou não
    return !tourCompleted;
  } catch (error) {
    console.error("Erro ao verificar status do tour:", error);
    return false;
  }
};

export const useGuidedTour = (steps: TourStep[], autoStart = false) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  
  useEffect(() => {
    // Verificar se deve mostrar o tour automaticamente
    if (autoStart && shouldShowTour(location.pathname)) {
      // Pequeno atraso para garantir que a página foi carregada
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [autoStart, location.pathname]);
  
  const openTour = () => setIsOpen(true);
  const closeTour = () => setIsOpen(false);
  
  return { isOpen, openTour, closeTour };
};

export default GuidedTour; 