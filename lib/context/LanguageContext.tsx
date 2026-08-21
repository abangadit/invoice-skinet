"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Locale, translations } from "../i18n/translations";

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: keyof typeof translations["id"]) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("id");

  useEffect(() => {
    const stored = localStorage.getItem("locale");
    if (stored === "id" || stored === "en") {
      setLocaleState(stored as Locale);
    } else {
      // detect system locale
      const lang = navigator.language.split("-")[0];
      if (lang === "en" || lang === "id") {
        setLocaleState(lang as Locale);
      }
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("locale", newLocale);
  };

  const t = (key: keyof typeof translations["id"]): string => {
    const dict = translations[locale] || translations["id"];
    return dict[key] || translations["id"][key] || String(key);
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
