import { createContext, useContext } from "react";
import type { Lang, TranslationKey } from "./translations";
import { translations } from "./translations";

export { translations, type Lang, type TranslationKey } from "./translations";

export interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

export const I18nContext = createContext<I18nContextType>({
  lang: "en",
  setLang: () => {},
  t: (key) => key,
});

export function useI18n() {
  return useContext(I18nContext);
}

export function createT(lang: Lang) {
  return (key: TranslationKey, vars?: Record<string, string | number>): string => {
    const entry = translations[key];
    if (!entry) return key;
    let text = entry[lang] || entry["en"] || key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        text = text.replace(`{${k}}`, String(v)) as typeof text;
      }
    }
    return text;
  };
}
