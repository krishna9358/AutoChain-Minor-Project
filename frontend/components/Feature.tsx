"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";

interface FeatureProps {
  title: string;
  subtitle: string;
  icon?: ReactNode;
  variant?: "default" | "highlight" | "dark";
  delay?: number;
}

export const Feature = ({
  title,
  subtitle,
  icon,
  variant = "default",
  delay = 0,
}: FeatureProps) => {
  const baseClasses = "relative overflow-hidden transition-all duration-300";

  const variantClasses = {
    default: "group",
    highlight:
      "bg-[#e3ecf6] px-4 py-3 rounded-xl border border-primary-100 shadow-sm hover:shadow-glow hover:scale-105",
    dark: "bg-slate-800/50 px-4 py-3 rounded-xl border border-slate-700 hover:border-primary-500/50",
  };

  const checkColor = {
    default: "text-primary-600",
    highlight: "text-primary-700",
    dark: "text-primary-400",
  };

  const titleColor = {
    default: "text-slate-900",
    highlight: "text-slate-900",
    dark: "text-white",
  };

  const subtitleColor = {
    default: "text-slate-600",
    highlight: "text-slate-700",
    dark: "text-slate-400",
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`${baseClasses} ${variantClasses[variant]}`}
    >
      <div className="flex items-start gap-3">
        {icon ? (
          <div className="flex-shrink-0 p-2 bg-primary-100 rounded-lg group-hover:scale-110 transition-transform duration-300">
            {icon}
          </div>
        ) : (
          <div
            className={`flex-shrink-0 p-1.5 rounded-full ${variant === "dark" ? "bg-primary-500/20" : "bg-primary-100"} ${checkColor[variant]} group-hover:scale-110 transition-transform duration-300`}
          >
            {variant === "highlight" ? (
              <Sparkles className="w-5 h-5" />
            ) : (
              <Check className="w-5 h-5" />
            )}
          </div>
        )}

        <div className="flex flex-col justify-center">
          <div className={`flex items-center gap-2`}>
            <span className={`font-semibold ${titleColor[variant]} text-base`}>
              {title}
            </span>
            {variant === "highlight" && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  delay: delay + 0.3,
                  type: "spring",
                  stiffness: 200,
                }}
                className="px-2 py-0.5 bg-[#1e9df1] text-white text-[10px] font-bold rounded-full"
              >
                NEW
              </motion.span>
            )}
          </div>
          <span className={`${subtitleColor[variant]} text-sm mt-0.5`}>
            {subtitle}
          </span>
        </div>

        {/* Hover effect gradient */}
        {variant === "highlight" && (
          <div className="absolute inset-0 bg-[#1e9df1]/5 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out pointer-events-none" />
        )}
      </div>
    </motion.div>
  );
};

// Feature Card Component for sections
interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  delay?: number;
  href?: string;
}

export const FeatureCard = ({
  icon,
  title,
  description,
  delay = 0,
  href,
}: FeatureCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="relative group bg-white rounded-2xl p-6 shadow-medium hover:shadow-glow border border-slate-200 hover:border-primary-300 transition-all duration-300 cursor-pointer"
    >
      {/* Gradient border effect on hover */}
      <div className="absolute inset-0 rounded-2xl bg-[#1e9df1] opacity-0 group-hover:opacity-10 transition-opacity duration-300 -z-10 blur-sm" />

      <div className="relative z-10">
        <div className="w-14 h-14 bg-[#1e9df1] rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-glow">
          {icon}
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-primary-700 transition-colors">
          {title}
        </h3>

        <p className="text-slate-600 leading-relaxed">{description}</p>

        {href && (
          <div className="mt-4 flex items-center text-primary-600 font-semibold group-hover:translate-x-2 transition-transform duration-300">
            Learn more
            <svg
              className="w-5 h-5 ml-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Stats Feature Component
interface StatsFeatureProps {
  value: string;
  label: string;
  suffix?: string;
  delay?: number;
}

export const StatsFeature = ({
  value,
  label,
  suffix = "+",
  delay = 0,
}: StatsFeatureProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay, type: "spring", stiffness: 200 }}
      className="text-center"
    >
      <div className="text-4xl md:text-5xl font-bold text-[#1e9df1] mb-2">
        {value}
        <span className="text-primary-600">{suffix}</span>
      </div>
      <div className="text-slate-600 font-medium">{label}</div>
    </motion.div>
  );
};
