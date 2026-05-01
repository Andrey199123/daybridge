import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect } from "react";

export type ThemeId = "default" | "nebula" | "solar" | "deepspace" | "aurora";

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  backgroundGradient: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
}

const themes: Record<ThemeId, ThemeColors> = {
  default: {
    primary: "#00E0FF",
    secondary: "#6C63FF",
    accent: "#00D4FF",
    background: "#0D1B3D",
    backgroundGradient: "linear-gradient(to bottom right, #0D1B3D, #142850, #0D1B3D)",
    cardBg: "rgba(20, 40, 80, 0.6)",
    textPrimary: "#FFFFFF",
    textSecondary: "rgba(255, 255, 255, 0.7)",
  },
  nebula: {
    primary: "#E040FB",
    secondary: "#FF4081",
    accent: "#C51162",
    background: "#1A0B2E",
    backgroundGradient: "linear-gradient(to bottom right, #1A0B2E, #3D1E6D, #8A2BE2)",
    cardBg: "rgba(138, 43, 226, 0.3)",
    textPrimary: "#FFFFFF",
    textSecondary: "rgba(255, 255, 255, 0.8)",
  },
  solar: {
    primary: "#FF6B35",
    secondary: "#F7931E",
    accent: "#FFC107",
    background: "#1A0F0A",
    backgroundGradient: "linear-gradient(to bottom right, #1A0F0A, #3D1E0F, #5C2A1A)",
    cardBg: "rgba(255, 107, 53, 0.3)",
    textPrimary: "#FFFFFF",
    textSecondary: "rgba(255, 255, 255, 0.8)",
  },
  deepspace: {
    primary: "#1E3A8A",
    secondary: "#0F172A",
    accent: "#3B82F6",
    background: "#000000",
    backgroundGradient: "linear-gradient(to bottom right, #000000, #0F172A, #1E293B)",
    cardBg: "rgba(15, 23, 42, 0.6)",
    textPrimary: "#FFFFFF",
    textSecondary: "rgba(255, 255, 255, 0.6)",
  },
  aurora: {
    primary: "#10B981",
    secondary: "#3B82F6",
    accent: "#06B6D4",
    background: "#0A1F1F",
    backgroundGradient: "linear-gradient(to bottom right, #0A1F1F, #134E4A, #1E40AF)",
    cardBg: "rgba(16, 185, 129, 0.2)",
    textPrimary: "#FFFFFF",
    textSecondary: "rgba(255, 255, 255, 0.8)",
  },
};

export function useActiveTheme() {
  const activeThemeData = useQuery(api.shop.getActiveTheme);
  
  // Extract theme ID from metadata
  const themeId: ThemeId = activeThemeData?.itemName === "Nebula Theme" ? "nebula"
    : activeThemeData?.itemName === "Solar Flare Theme" ? "solar"
    : activeThemeData?.itemName === "Deep Space Theme" ? "deepspace"
    : activeThemeData?.itemName === "Aurora Theme" ? "aurora"
    : "default";

  const theme = themes[themeId];

  // Apply theme to CSS variables
  useEffect(() => {
    if (theme) {
      document.documentElement.style.setProperty('--theme-primary', theme.primary);
      document.documentElement.style.setProperty('--theme-secondary', theme.secondary);
      document.documentElement.style.setProperty('--theme-accent', theme.accent);
      document.documentElement.style.setProperty('--theme-background', theme.background);
      document.documentElement.style.setProperty('--theme-card-bg', theme.cardBg);
      document.documentElement.style.setProperty('--theme-text-primary', theme.textPrimary);
      document.documentElement.style.setProperty('--theme-text-secondary', theme.textSecondary);
    }
  }, [theme]);

  return { themeId, theme, isLoading: activeThemeData === undefined };
}
