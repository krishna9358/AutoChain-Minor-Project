"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const saved = localStorage.getItem("autochain-theme") as Theme;
    const t = saved || "dark";
    setThemeState(t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  const applyTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem("autochain-theme", t);
    document.documentElement.setAttribute("data-theme", t);
  };

  const toggleTheme = () => applyTheme(theme === "dark" ? "light" : "dark");
  const setTheme = (t: Theme) => applyTheme(t);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
