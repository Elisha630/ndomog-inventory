import { useState, useEffect } from "react";

export type ThemeMode = "light" | "dark";

const THEME_MODE_KEY = "app-theme-mode";
const HIGH_CONTRAST_KEY = "app-high-contrast";

export const useTheme = () => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(THEME_MODE_KEY);
    return (saved as ThemeMode) || "dark";
  });

  const [highContrast, setHighContrastState] = useState<boolean>(() => {
    const saved = localStorage.getItem(HIGH_CONTRAST_KEY);
    return saved === "true";
  });

  useEffect(() => {
    // Apply theme mode
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(themeMode);
    localStorage.setItem(THEME_MODE_KEY, themeMode);
  }, [themeMode]);

  useEffect(() => {
    // Apply high contrast
    const root = document.documentElement;
    if (highContrast) {
      root.classList.add("high-contrast");
    } else {
      root.classList.remove("high-contrast");
    }
    localStorage.setItem(HIGH_CONTRAST_KEY, String(highContrast));
  }, [highContrast]);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
  };

  const toggleThemeMode = () => {
    setThemeModeState((prev) => (prev === "light" ? "dark" : "light"));
  };

  const setHighContrast = (enabled: boolean) => {
    setHighContrastState(enabled);
  };

  const toggleHighContrast = () => {
    setHighContrastState((prev) => !prev);
  };

  return {
    themeMode,
    setThemeMode,
    toggleThemeMode,
    highContrast,
    setHighContrast,
    toggleHighContrast,
  };
};

// Initialize theme on app load
export const initTheme = () => {
  const savedMode = localStorage.getItem(THEME_MODE_KEY) as ThemeMode;
  const savedHighContrast = localStorage.getItem(HIGH_CONTRAST_KEY) === "true";
  const root = document.documentElement;

  // Apply theme mode
  root.classList.remove("light", "dark");
  root.classList.add(savedMode || "dark");

  // Apply high contrast
  if (savedHighContrast) {
    root.classList.add("high-contrast");
  }
};
