/**
 * i18n Configuration
 * Sets up internationalization with English and Thai support
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Import English translations
import enCommon from "@/locales/en/common.json";
import enAuth from "@/locales/en/auth.json";
import enNavigation from "@/locales/en/navigation.json";
import enExplore from "@/locales/en/explore.json";
import enListings from "@/locales/en/listings.json";
import enDashboard from "@/locales/en/dashboard.json";

// Import Thai translations
import thCommon from "@/locales/th/common.json";
import thAuth from "@/locales/th/auth.json";
import thNavigation from "@/locales/th/navigation.json";
import thExplore from "@/locales/th/explore.json";
import thListings from "@/locales/th/listings.json";
import thDashboard from "@/locales/th/dashboard.json";

const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    navigation: enNavigation,
    explore: enExplore,
    listings: enListings,
    dashboard: enDashboard,
  },
  th: {
    common: thCommon,
    auth: thAuth,
    navigation: thNavigation,
    explore: thExplore,
    listings: thListings,
    dashboard: thDashboard,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    defaultNS: "common",
    ns: ["common", "auth", "navigation", "explore", "listings", "dashboard"],
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

export default i18n;
