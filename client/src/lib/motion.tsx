import { useEffect, useRef } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  useReducedMotion,
  type Variants,
  type Transition,
} from "framer-motion";

// ---------- Easing & timing -----------------------------------------------

export const ease = [0.2, 0.8, 0.3, 1] as const; // smooth, slightly snappy

export const baseTransition: Transition = {
  duration: 0.45,
  ease,
};

// ---------- Stagger containers --------------------------------------------

export const staggerContainer = (
  staggerChildren = 0.06,
  delayChildren = 0
): Variants => ({
  hidden: {},
  visible: {
    transition: { staggerChildren, delayChildren },
  },
});

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: baseTransition,
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: baseTransition },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: baseTransition },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: baseTransition },
};

// ---------- Page transition wrapper ---------------------------------------

export function PageTransition({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease }}
    >
      {children}
    </motion.div>
  );
}

// ---------- Animated number rollup ----------------------------------------
//
// Smoothly ticks from 0 → value when mounted (or value changes).
// Renders as a span; `format` lets callers transform the value (toLocaleString,
// percentage, etc.).
interface NumberRollProps {
  value: number;
  duration?: number;
  format?: (v: number) => string;
  className?: string;
}

export function NumberRoll({
  value,
  duration = 1.1,
  format = (v) => Math.round(v).toLocaleString(),
  className,
}: NumberRollProps) {
  const reduce = useReducedMotion();
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, format);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (reduce) {
      if (ref.current) ref.current.textContent = format(value);
      return;
    }
    const controls = animate(motionValue, value, { duration, ease });
    const unsub = rounded.on("change", (latest) => {
      if (ref.current) ref.current.textContent = latest;
    });
    return () => {
      controls.stop();
      unsub();
    };
  }, [value, duration, format, motionValue, rounded, reduce]);

  return <span ref={ref} className={className}>{format(0)}</span>;
}

// ---------- Animated horizontal bar ---------------------------------------

export function AnimatedBar({
  percentage,
  color,
  className = "",
  delay = 0,
}: {
  percentage: number;
  color: string;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={`h-full ${className}`}
      style={{ backgroundColor: color }}
      initial={reduce ? false : { width: 0 }}
      animate={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
      transition={{ duration: 0.9, ease, delay }}
    />
  );
}

// ---------- Re-export motion for convenience ------------------------------

export { motion, useReducedMotion };
