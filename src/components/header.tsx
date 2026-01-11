'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { Moon, Sun, Monitor, Cloud, CloudOff, Loader2, User, LogOut, RefreshCw, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDataStore } from '@/stores';
import { useFirebaseSync } from '@/hooks';
import { HeaderTicker } from './header-ticker';
import { cn } from '@/lib/utils';
import { isRTL, type Locale, routing } from '@/i18n';

export function Header() {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const dir = isRTL(locale) ? 'rtl' : 'ltr';

  const { data, updateSettings } = useDataStore();
  const { theme } = data.settings;
  const {
    user,
    isAuthenticated,
    isSyncing,
    lastSynced,
    signIn,
    signOut,
    forceSync,
    isConfigured,
  } = useFirebaseSync();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (theme === 'dark' || (theme === 'system' && systemDark)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme, mounted]);

  const cycleTheme = () => {
    const themes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    updateSettings({ theme: nextTheme });
  };

  const switchLocale = (newLocale: Locale) => {
    // Get the path without locale prefix
    const segments = pathname.split('/');
    if (routing.locales.includes(segments[1] as Locale)) {
      segments[1] = newLocale;
    } else {
      segments.unshift('', newLocale);
    }
    router.push(segments.join('/') || '/');
  };

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  const localeLabels: Record<Locale, string> = {
    en: 'English',
    he: 'עברית',
    ar: 'العربية'
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4" dir={dir}>
        {/* Logo */}
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-primary">{t('app.name')}</span>
          </h1>
        </div>

        {/* Ticker */}
        <div className="hidden md:flex flex-1 max-w-xl mx-8">
          <div className="w-full">
            <HeaderTicker />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Globe className="h-5 w-5" />
                <span className="sr-only">{t('settings.language')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={dir === 'rtl' ? 'start' : 'end'}>
              {routing.locales.map((loc) => (
                <DropdownMenuItem
                  key={loc}
                  onClick={() => switchLocale(loc)}
                  className={cn(locale === loc && 'bg-accent')}
                >
                  {localeLabels[loc]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Cloud Sync */}
          {isConfigured && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'relative',
                    isSyncing && 'animate-pulse'
                  )}
                >
                  {isSyncing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : isAuthenticated ? (
                    <Cloud className="h-5 w-5 text-green-500" />
                  ) : (
                    <CloudOff className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className="sr-only">{t('nav.cloudSync')}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={dir === 'rtl' ? 'start' : 'end'}>
                {isAuthenticated && user ? (
                  <>
                    <div className="px-2 py-1.5 text-sm">
                      <div className="flex items-center gap-2">
                        {user.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt={user.displayName || ''}
                            className="h-6 w-6 rounded-full"
                          />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                        <span className="font-medium">{user.displayName || user.email}</span>
                      </div>
                      {lastSynced && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('nav.lastSync', { time: new Date(lastSynced).toLocaleTimeString(locale) })}
                        </p>
                      )}
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={forceSync} disabled={isSyncing}>
                      <RefreshCw className={cn("h-4 w-4", dir === 'rtl' ? 'ml-2' : 'mr-2')} />
                      {t('nav.syncNow')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={signOut}>
                      <LogOut className={cn("h-4 w-4", dir === 'rtl' ? 'ml-2' : 'mr-2')} />
                      {t('nav.signOut')}
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem onClick={signIn}>
                    <Cloud className={cn("h-4 w-4", dir === 'rtl' ? 'ml-2' : 'mr-2')} />
                    {t('nav.signInGoogle')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={cycleTheme}
            title={`${t('nav.theme')}: ${theme === 'light' ? t('nav.themeLight') : theme === 'dark' ? t('nav.themeDark') : t('nav.themeSystem')}`}
          >
            {mounted && <ThemeIcon className="h-5 w-5" />}
            <span className="sr-only">{t('nav.theme')}</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
