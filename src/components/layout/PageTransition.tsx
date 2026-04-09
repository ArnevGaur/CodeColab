import { type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface PageTransitionProps {
  children: ReactNode;
}

const PageTransition = ({ children }: PageTransitionProps) => {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <>{children}</>;
  }

  return (
    <motion.div
      className="min-h-screen"
      initial={{ opacity: 0, y: 18, scale: 0.992, filter: "blur(14px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -10, scale: 1.006, filter: "blur(10px)" }}
      transition={{ duration: 0.68, ease: [0.22, 1, 0.36, 1] }}
      style={{ willChange: "transform, opacity, filter" }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
