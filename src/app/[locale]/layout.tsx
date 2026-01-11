import type { Metadata } from "next";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { routing, isRTL, type Locale } from "@/i18n";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  
  const titles: Record<string, { title: string; description: string }> = {
    en: {
      title: "Tollab - Academic Planner",
      description: "Course management system for Technion students"
    },
    he: {
      title: "טולאב - ניהול לימודים",
      description: "מערכת לניהול קורסים, הקלטות ומטלות לסטודנטים בטכניון"
    },
    ar: {
      title: "طلّاب - مخطط أكاديمي",
      description: "نظام إدارة المقررات لطلاب التخنيون"
    }
  };

  const meta = titles[locale] || titles.en;

  return {
    title: meta.title,
    description: meta.description,
    icons: {
      icon: "/favicon.ico",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  // Validate locale
  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  // Get messages for the locale
  const messages = await getMessages();
  
  const dir = isRTL(locale as Locale) ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background`}
      >
        <NextIntlClientProvider messages={messages}>
          {children}
          <Toaster position={dir === 'rtl' ? 'bottom-left' : 'bottom-right'} dir={dir} richColors closeButton />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
