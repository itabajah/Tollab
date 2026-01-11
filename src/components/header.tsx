'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun, Monitor, Cloud, CloudOff, Loader2, User, LogOut, RefreshCw } from 'lucide-react';
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

export function Header() {
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

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4" dir="rtl">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-primary">טולאב</span>
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
                  <span className="sr-only">סנכרון ענן</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
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
                          סנכרון אחרון: {new Date(lastSynced).toLocaleTimeString('he-IL')}
                        </p>
                      )}
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={forceSync} disabled={isSyncing}>
                      <RefreshCw className="ml-2 h-4 w-4" />
                      סנכרן עכשיו
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={signOut}>
                      <LogOut className="ml-2 h-4 w-4" />
                      התנתק
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem onClick={signIn}>
                    <Cloud className="ml-2 h-4 w-4" />
                    התחבר עם Google
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
            title={`ערכת נושא: ${theme === 'light' ? 'בהיר' : theme === 'dark' ? 'כהה' : 'מערכת'}`}
          >
            {mounted && <ThemeIcon className="h-5 w-5" />}
            <span className="sr-only">החלף ערכת נושא</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
