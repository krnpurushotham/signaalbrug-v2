/* SignaalBrug v2 — UI strings for the home screen & staff verification (EN + NL).
   Production extends this to all screens (spec: EN/NL/AR with RTL mirroring). */

const LS_LANG = "signaalBrug_lang";

export const TRANSLATIONS = {
  en: {
    // Language selector
    "lang.select": "Language",
    "lang.english": "English",
    "lang.dutch": "Nederlands",

    // Brand & headline
    "brand.headline": "One bridge for every signal.",
    "brand.subtitle": "Web forms, walk-ins, calls, emails, voice notes and appointment requests — consolidated into a single case console, matched to volunteers by skills and language.",
    "brand.channels": "intake channels",
    "brand.languages": "languages on the portal",
    "brand.resolved": "cases resolved",

    // Staff section
    "staff.title": "Staff login",
    "staff.subtitle": "Pick your role — verified with a staff PIN or Google sign-in.",
    "staff.volunteer.title": "Volunteer",
    "staff.volunteer.desc": "Work your queue, log walk-ins, resolve cases",
    "staff.admin.title": "Admin",
    "staff.admin.desc": "Consolidate channels, assign by skill, insights & analytics",

    // Public portal section
    "public.title": "Looking for help?",
    "public.subtitle": "Access the refugee support portal with no login required",
    "public.button": "I'm looking for help",
    "public.button.desc": "Go to the refugee portal — no login needed",

    // QR codes
    "qr.staff": "Staff console",
    "qr.portal": "Refugee portal",
    "qr.hint": "Scan with a phone to follow the demo live — all staff screens work at 375×667 and the app can be added to the home screen.",

    // Footer
    "footer.credit": "Concept for RefugeeHelp / VluchtelingenWerk NL · demo only — no real client data",
    "footer.reset": "Reset demo",

    // Staff verification
    "verify.title": "Verify it's you",
    "verify.subtitle": "Enter your staff PIN or continue with Google.",
    "verify.pin.label": "Staff PIN",
    "verify.pin.hint": "Demo PIN: 1234",
    "verify.pin.error": "Incorrect PIN — use 1234 in this demo.",
    "verify.button": "Verify & sign in",
    "verify.or": "or",
    "verify.google": "Continue with Google",
    "verify.cancel": "Cancel",
  },
  nl: {
    // Language selector
    "lang.select": "Taal",
    "lang.english": "English",
    "lang.dutch": "Nederlands",

    // Brand & headline
    "brand.headline": "Een brug voor elk signaal.",
    "brand.subtitle": "Webformulieren, inloopbezoeken, oproepen, e-mails, spraaknotities en afspraakaanvragen — samengevoegd in één caseconsole, gekoppeld aan vrijwilligers op basis van vaardigheden en taal.",
    "brand.channels": "intakekanalen",
    "brand.languages": "talen op de portal",
    "brand.resolved": "zaken opgelost",

    // Staff section
    "staff.title": "Medewerkerlogin",
    "staff.subtitle": "Kies je rol — geverifieerd met een medewerkers-PIN of Google-login.",
    "staff.volunteer.title": "Vrijwilliger",
    "staff.volunteer.desc": "Werk je wachtrij af, log inloopbezoeken in, los zaken op",
    "staff.admin.title": "Beheerder",
    "staff.admin.desc": "Consolideer kanalen, wijs toe op basis van vaardigheden, inzichten en analytics",

    // Public portal section
    "public.title": "Hulp zoeken?",
    "public.subtitle": "Toegang tot de vluchtelingenondersteuningsportal zonder login",
    "public.button": "Ik zoek hulp",
    "public.button.desc": "Ga naar de vluchtelingenportal — geen login nodig",

    // QR codes
    "qr.staff": "Medewerkersconsole",
    "qr.portal": "Vluchtelingenportal",
    "qr.hint": "Scan met een telefoon om de demo live te volgen — alle medewerkerseigenschappen werken op 375×667 en de app kan aan het startscherm worden toegevoegd.",

    // Footer
    "footer.credit": "Concept voor RefugeeHelp / VluchtelingenWerk NL · alleen demo — geen echte klantgegevens",
    "footer.reset": "Demo opnieuw instellen",

    // Staff verification
    "verify.title": "Verifieer dat jij het bent",
    "verify.subtitle": "Voer je medewerkers-PIN in of ga verder met Google.",
    "verify.pin.label": "Medewerkers-PIN",
    "verify.pin.hint": "Demo-PIN: 1234",
    "verify.pin.error": "Onjuiste PIN — gebruik 1234 in deze demo.",
    "verify.button": "Verifieer & log in",
    "verify.or": "of",
    "verify.google": "Doorgaan met Google",
    "verify.cancel": "Annuleren",
  },
};

export function t(key, lang = "en") {
  return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key] || key;
}

export function getLanguage() {
  try { return localStorage.getItem(LS_LANG) || "en"; } catch { return "en"; }
}

export function setLanguage(lang) {
  try { localStorage.setItem(LS_LANG, lang); } catch { /* private mode */ }
  window.dispatchEvent(new CustomEvent("languagechange", { detail: { lang } }));
}
