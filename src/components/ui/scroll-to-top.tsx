import React, { useState, useEffect } from "react";
import { ChevronUp } from "lucide-react";
import { Button } from "./button";

interface ScrollToTopProps {
  showBelow?: number;
  className?: string;
}

const ScrollToTop: React.FC<ScrollToTopProps> = ({
  showBelow = 300,
  className = "",
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => {
    if (window.pageYOffset > showBelow) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, [showBelow]);

  return (
    <>
      {isVisible && (
        <Button
          onClick={scrollToTop}
          className={`fixed bottom-6 right-6 p-2 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white z-50 transition-all duration-300 ${className}`}
          size="icon"
          aria-label="Voltar ao topo"
        >
          <ChevronUp className="h-5 w-5" />
        </Button>
      )}
    </>
  );
};

export default ScrollToTop;
