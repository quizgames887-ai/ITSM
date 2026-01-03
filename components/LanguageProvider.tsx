"use client";

import { useEffect } from "react";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Get language from localStorage or default to English
    const savedLanguage = localStorage.getItem("userLanguage") || "en";
    const direction = savedLanguage === "ar" ? "rtl" : "ltr";
    
    // Apply to document
    document.documentElement.setAttribute("dir", direction);
    document.documentElement.setAttribute("lang", savedLanguage);
  }, []);

  return <>{children}</>;
}
