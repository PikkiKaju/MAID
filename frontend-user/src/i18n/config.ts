import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import plTranslations from '../messages/pl.json';
import enTranslations from '../messages/en.json';

const savedLanguage = localStorage.getItem('maid-language') || 'pl';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      pl: {
        translation: plTranslations,
      },
      en: {
        translation: enTranslations,
      },
    },
    lng: savedLanguage,
    fallbackLng: 'pl',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;

