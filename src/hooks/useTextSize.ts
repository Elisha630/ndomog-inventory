import { useState, useEffect } from "react";

export type TextSize = "small" | "normal" | "large" | "extra-large";

const TEXT_SIZE_KEY = "app-text-size";

const textSizeValues: Record<TextSize, number> = {
  small: 14,
  normal: 16,
  large: 18,
  "extra-large": 22,
};

const textSizeLabels: Record<TextSize, string> = {
  small: "Small",
  normal: "Normal",
  large: "Large",
  "extra-large": "Extra Large",
};

export const useTextSize = () => {
  const [textSize, setTextSizeState] = useState<TextSize>(() => {
    const saved = localStorage.getItem(TEXT_SIZE_KEY);
    return (saved as TextSize) || "normal";
  });

  useEffect(() => {
    // Apply text size to document root
    document.documentElement.style.fontSize = `${textSizeValues[textSize]}px`;
    localStorage.setItem(TEXT_SIZE_KEY, textSize);
  }, [textSize]);

  const setTextSize = (size: TextSize) => {
    setTextSizeState(size);
  };

  return {
    textSize,
    setTextSize,
    textSizeValues,
    textSizeLabels,
  };
};

// Initialize text size on app load
export const initTextSize = () => {
  const saved = localStorage.getItem(TEXT_SIZE_KEY) as TextSize;
  if (saved && textSizeValues[saved]) {
    document.documentElement.style.fontSize = `${textSizeValues[saved]}px`;
  }
};
