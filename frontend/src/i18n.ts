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
import enPolicies from "@/locales/en/policies.json";
import enProfile from "@/locales/en/profile.json";
import enMessages from "@/locales/en/messages.json";

// Import Thai translations
import thCommon from "@/locales/th/common.json";
import thAuth from "@/locales/th/auth.json";
import thNavigation from "@/locales/th/navigation.json";
import thExplore from "@/locales/th/explore.json";
import thListings from "@/locales/th/listings.json";
import thPolicies from "@/locales/th/policies.json";
import thProfile from "@/locales/th/profile.json";
import thMessages from "@/locales/th/messages.json";

const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    navigation: enNavigation,
    explore: enExplore,
    listings: enListings,
    policies: enPolicies,
    profile: enProfile,
    messages: enMessages,
  },
  th: {
    common: thCommon,
    auth: thAuth,
    navigation: thNavigation,
    explore: thExplore,
    listings: thListings,
    policies: thPolicies,
    profile: thProfile,
    messages: thMessages,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    defaultNS: "common",
    ns: ["common", "auth", "navigation", "explore", "listings", "policies", "profile", "messages"],
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

export default i18n;

