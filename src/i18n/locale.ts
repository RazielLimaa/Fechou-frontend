import i18n from "./index";

export type FechouLocale = "en" | "pt-BR";

export function normalizeFechouLocale(language?: string | null): FechouLocale {
  return language === "pt-BR" ? "pt-BR" : "en";
}

export function getActiveFechouLocale(): FechouLocale {
  return normalizeFechouLocale(i18n.resolvedLanguage ?? i18n.language);
}

export function getFechouLocaleHeaders(locale: FechouLocale = getActiveFechouLocale()) {
  return { "X-Fechou-Locale": locale };
}
