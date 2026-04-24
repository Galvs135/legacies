import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enUS from "./locales/en-US/common.json";
import esES from "./locales/es-ES/common.json";
import ptBR from "./locales/pt-BR/common.json";

const STORAGE_KEY = "legalytics-language";

const fallbackLng = "pt-BR";
const storedLanguage = localStorage.getItem(STORAGE_KEY);
const initialLanguage = storedLanguage || fallbackLng;

void i18n.use(initReactI18next).init({
  resources: {
    "pt-BR": { translation: ptBR },
    "en-US": { translation: enUS },
    "es-ES": { translation: esES }
  },
  lng: initialLanguage,
  fallbackLng,
  interpolation: {
    escapeValue: false
  }
});

i18n.on("languageChanged", (lng: string) => {
  localStorage.setItem(STORAGE_KEY, lng);
});

export { i18n };
