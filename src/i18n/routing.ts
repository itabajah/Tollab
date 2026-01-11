import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  // List of all supported locales
  locales: ['en', 'he', 'ar'],
  
  // Default locale when no locale is detected
  defaultLocale: 'en',
  
  // Locale prefix strategy
  localePrefix: 'as-needed'
});

export type Locale = (typeof routing.locales)[number];

// RTL locales
export const rtlLocales: Locale[] = ['he', 'ar'];

export function isRTL(locale: Locale): boolean {
  return rtlLocales.includes(locale);
}
