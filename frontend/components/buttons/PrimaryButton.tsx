import { ReactNode } from "react";

export const PrimaryButton = ({
  children,
  onClick,
  size = "small",
  loading = false,
  disabled = false,
  variant = "default",
  className = "",
}: {
  children: ReactNode;
  onClick: () => void;
  size?: "big" | "small" | "medium";
  loading?: boolean;
  disabled?: boolean;
  variant?: "default" | "gradient" | "dark" | "outline";
  className?: string;
}) => {
  const baseClasses =
    "cursor-pointer text-white rounded-full text-center flex justify-center items-center transition-all duration-300 font-semibold relative overflow-hidden group";

  const sizeClasses = {
    small: "text-sm px-8 py-2.5",
    medium: "text-base px-10 py-3",
    big: "text-xl px-12 py-4",
  };

  const variantClasses = {
    default:
      "bg-gradient-primary hover:bg-gradient-hover hover:shadow-glow hover:scale-105 active:scale-95",
    gradient:
      "bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 hover:from-orange-400 hover:via-red-400 hover:to-pink-400 hover:shadow-glow-lg hover:scale-105 active:scale-95",
    dark: "bg-gradient-dark hover:shadow-strong hover:scale-105 active:scale-95",
    outline:
      "bg-transparent border-2 border-primary-500 text-primary-600 hover:bg-primary-500 hover:text-white hover:shadow-glow hover:scale-105 active:scale-95",
  };

  const disabledClasses = "opacity-50 cursor-not-allowed pointer-events-none";

  return (
    <div
      onClick={!loading && !disabled ? onClick : undefined}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${disabled ? disabledClasses : ""} ${className}`}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <span
        className={
          loading ? "opacity-0" : "opacity-100 flex items-center gap-2"
        }
      >
        {children}
      </span>
      {/* Shine effect on hover */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
    </div>
  );
};
