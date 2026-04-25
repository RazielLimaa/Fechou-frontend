import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { resources, type AppLocale } from "./resources";

const SUPPORTED_LOCALES = Object.keys(resources) as AppLocale[];

function resolveInitialLocale(): AppLocale {
  const storedLocale =
    typeof window === "undefined" ? null : window.localStorage.getItem("fechou_locale");
  if (SUPPORTED_LOCALES.includes(storedLocale as AppLocale)) {
    return storedLocale as AppLocale;
  }

  const configuredLocale = import.meta.env.VITE_APP_LOCALE;
  if (SUPPORTED_LOCALES.includes(configuredLocale as AppLocale)) {
    return configuredLocale as AppLocale;
  }

  return "en";
}

void i18n.use(initReactI18next).init({
  resources,
  lng: resolveInitialLocale(),
  fallbackLng: "en",
  supportedLngs: SUPPORTED_LOCALES,
  interpolation: {
    escapeValue: false,
  },
  returnNull: false,
});

export default i18n;
