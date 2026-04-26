import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { AppLocale } from "../i18n/resources";

type LanguageToggleProps = {
  compact?: boolean;
  className?: string;
};

export function LanguageToggle({ compact = false, className }: LanguageToggleProps) {
  const { i18n } = useTranslation();
  const currentLocale: AppLocale = i18n.resolvedLanguage === "pt-BR" ? "pt-BR" : "en";
  const nextLocale: AppLocale = currentLocale === "en" ? "pt-BR" : "en";
  const label = currentLocale === "en" ? "PT" : "EN";

  const handleToggle = async () => {
    window.localStorage.setItem("fechou_locale", nextLocale);
    await i18n.changeLanguage(nextLocale);
  };

  return (
    <motion.button
      type="button"
      onClick={handleToggle}
      whileHover={{ scale: 1.04, borderColor: "rgba(255,102,0,0.38)", color: "#fff" }}
      whileTap={{ scale: 0.97 }}
      aria-label={currentLocale === "en" ? "Switch language to Portuguese" : "Trocar idioma para ingles"}
      title={currentLocale === "en" ? "Portugues" : "English"}
      className={className}
      style={{
        height: compact ? 30 : 32,
        minWidth: compact ? 38 : 44,
        padding: compact ? "0 8px" : "0 10px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.045)",
        border: "1px solid rgba(255,255,255,0.09)",
        color: "rgba(255,255,255,0.52)",
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: "0.12em",
        cursor: "pointer",
        fontFamily: "inherit",
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      {label}
    </motion.button>
  );
}
