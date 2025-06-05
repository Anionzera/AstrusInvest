import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedContainerProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  animation?: "fadeIn" | "slideUp" | "slideIn" | "scale" | "none";
  once?: boolean;
}

const animations = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
  slideIn: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },
  none: {
    initial: {},
    animate: {},
    exit: {},
  },
};

export function AnimatedContainer({
  children,
  className,
  delay = 0,
  duration = 0.5,
  animation = "fadeIn",
  once = false,
}: AnimatedContainerProps) {
  const selectedAnimation = animations[animation];

  return (
    <motion.div
      initial={selectedAnimation.initial}
      animate={selectedAnimation.animate}
      exit={selectedAnimation.exit}
      transition={{
        delay,
        duration,
        ease: "easeOut",
      }}
      viewport={{ once }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedList({
  children,
  className,
  staggerDelay = 0.1,
  animation = "fadeIn",
  once = false,
}: {
  children: React.ReactNode[];
  className?: string;
  staggerDelay?: number;
  animation?: "fadeIn" | "slideUp" | "slideIn" | "scale" | "none";
  once?: boolean;
}) {
  const selectedAnimation = animations[animation];

  return (
    <div className={className}>
      <AnimatePresence>
        {React.Children.map(children, (child, i) => (
          <motion.div
            key={i}
            initial={selectedAnimation.initial}
            animate={selectedAnimation.animate}
            exit={selectedAnimation.exit}
            transition={{
              delay: i * staggerDelay,
              duration: 0.5,
              ease: "easeOut",
            }}
            viewport={{ once }}
          >
            {child}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function AnimatedSection({
  children,
  className,
  delay = 0,
  duration = 0.5,
  animation = "fadeIn",
  once = true,
}: AnimatedContainerProps) {
  const selectedAnimation = animations[animation];

  return (
    <motion.section
      initial={selectedAnimation.initial}
      whileInView={selectedAnimation.animate}
      viewport={{ once }}
      transition={{
        delay,
        duration,
        ease: "easeOut",
      }}
      className={cn(className)}
    >
      {children}
    </motion.section>
  );
}
