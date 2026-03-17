import { ReactNode } from "react";

export const SecondaryButton = ({
  children,
  onClick,
  size = "small",
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  size?: "big" | "small";
  disabled?: boolean;
}) => {
  const baseClasses =
    "cursor-pointer border-2 border-transparent text-black font-medium rounded-full flex items-center justify-center transition-all duration-300 ease-out transform";

  const sizeClasses =
    size === "small" ? "text-sm px-8 py-2.5" : "text-lg px-12 py-4";

  const stateClasses = disabled
    ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200"
    : "bg-white border-slate-800 hover:border-primary-700 hover:text-primary-700 hover:shadow-glow hover:-translate-y-0.5 active:translate-y-0 active:shadow-md";

  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`${baseClasses} ${sizeClasses} ${stateClasses}`}
    >
      {children}
    </div>
  );
};
