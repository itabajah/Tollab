'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Settings, GraduationCap, Palette, Moon, Sun, Monitor, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDataStore, useProfileStore, useUIStore } from '@/stores';
import { TECHNION_FACULTIES } from '@/lib/cheesefork';
import { isRTL, type Locale } from '@/i18n';
import { cn } from '@/lib/utils';
import type { ThemeMode, ColorTheme } from '@/types';

const THEME_OPTIONS: { value: ThemeMode; icon: React.ReactNode; labelKey: string }[] = [
  { value: 'light', icon: <Sun className="h-4 w-4" />, labelKey: 'nav.themeLight' },
  { value: 'dark', icon: <Moon className="h-4 w-4" />, labelKey: 'nav.themeDark' },
  { value: 'system', icon: <Monitor className="h-4 w-4" />, labelKey: 'nav.themeSystem' },
];

const COLOR_THEMES: { value: ColorTheme; labelKey: string }[] = [
  { value: 'colorful', labelKey: 'settings.colorful' },
  { value: 'single', labelKey: 'settings.singleColor' },
  { value: 'mono', labelKey: 'settings.monochrome' },
];

const DEGREE_TYPES = [
  { value: 'bachelor', labelKey: 'onboarding.degreeBachelor' },
  { value: 'master', labelKey: 'onboarding.degreeMaster' },
  { value: 'phd', labelKey: 'onboarding.degreePhd' },
  { value: 'other', labelKey: 'onboarding.degreeOther' },
];

export function SettingsModal() {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const dir = isRTL(locale) ? 'rtl' : 'ltr';

  const { data, updateSettings } = useDataStore();
  const { getActiveProfile, updateProfile } = useProfileStore();
  const { settingsModalOpen, closeSettingsModal } = useUIStore();

  const profile = getActiveProfile();
  const settings = data.settings;

  // Local state for form
  const [localProfile, setLocalProfile] = useState({
    name: profile?.name || '',
    faculty: profile?.faculty || '',
    degree: profile?.degree || '',
    cpGoal: profile?.cpGoal || 120,
    startYear: profile?.startYear || new Date().getFullYear(),
  });

  const [localSettings, setLocalSettings] = useState({
    theme: settings.theme,
    colorTheme: settings.colorTheme,
    showCompleted: settings.showCompleted,
    showWatchedRecordings: settings.showWatchedRecordings,
  });

  // Update local state when profile/settings change
  useEffect(() => {
    if (profile) {
      setLocalProfile({
        name: profile.name || '',
        faculty: profile.faculty || '',
        degree: profile.degree || '',
        cpGoal: profile.cpGoal || 120,
        startYear: profile.startYear || new Date().getFullYear(),
      });
    }
  }, [profile]);

  useEffect(() => {
    setLocalSettings({
      theme: settings.theme,
      colorTheme: settings.colorTheme,
      showCompleted: settings.showCompleted,
      showWatchedRecordings: settings.showWatchedRecordings,
    });
  }, [settings]);

  const handleSave = () => {
    if (profile) {
      updateProfile(profile.id, {
        name: localProfile.name,
        faculty: localProfile.faculty,
        degree: localProfile.degree,
        cpGoal: localProfile.cpGoal,
        startYear: localProfile.startYear,
      });
    }

    updateSettings({
      theme: localSettings.theme,
      colorTheme: localSettings.colorTheme,
      showCompleted: localSettings.showCompleted,
      showWatchedRecordings: localSettings.showWatchedRecordings,
    });

    closeSettingsModal();
  };

  // Faculty options
  const facultyOptions = Object.entries(TECHNION_FACULTIES)
    .map(([key, value]) => ({
      value: key,
      label: locale === 'he' ? value.he : locale === 'ar' ? value.ar : value.en,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, locale));

  // Year options
  const yearOptions = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  return (
    <Dialog open={settingsModalOpen} onOpenChange={(open) => !open && closeSettingsModal()}>
      <DialogContent className="max-w-lg" dir={dir}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('settings.title')}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="profile" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              {t('settings.profile')}
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              {t('settings.appearance')}
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4 mt-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="profileName">{t('settings.profileName')}</Label>
              <Input
                id="profileName"
                value={localProfile.name}
                onChange={(e) => setLocalProfile({ ...localProfile, name: e.target.value })}
              />
            </div>

            {/* Faculty */}
            <div className="space-y-2">
              <Label>{t('course.faculty')}</Label>
              <Select
                value={localProfile.faculty}
                onValueChange={(value) => setLocalProfile({ ...localProfile, faculty: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('onboarding.selectFaculty')} />
                </SelectTrigger>
                <SelectContent>
                  {facultyOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Degree */}
            <div className="space-y-2">
              <Label>{t('onboarding.stepDegree')}</Label>
              <Select
                value={localProfile.degree}
                onValueChange={(value) => setLocalProfile({ ...localProfile, degree: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('onboarding.selectDegree')} />
                </SelectTrigger>
                <SelectContent>
                  {DEGREE_TYPES.map((deg) => (
                    <SelectItem key={deg.value} value={deg.value}>
                      {t(deg.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* CP Goal */}
            <div className="space-y-2">
              <Label htmlFor="cpGoal" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                {t('onboarding.cpGoal')}
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="cpGoal"
                  type="number"
                  min={1}
                  max={500}
                  value={localProfile.cpGoal}
                  onChange={(e) =>
                    setLocalProfile({ ...localProfile, cpGoal: parseInt(e.target.value) || 0 })
                  }
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">{t('common.points')}</span>
              </div>
            </div>

            {/* Start Year */}
            <div className="space-y-2">
              <Label>{t('onboarding.startYear')}</Label>
              <Select
                value={String(localProfile.startYear)}
                onValueChange={(value) =>
                  setLocalProfile({ ...localProfile, startYear: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-4 mt-4">
            {/* Theme */}
            <div className="space-y-2">
              <Label>{t('nav.theme')}</Label>
              <div className="flex gap-2">
                {THEME_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    variant={localSettings.theme === opt.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLocalSettings({ ...localSettings, theme: opt.value })}
                    className="flex-1"
                  >
                    {opt.icon}
                    <span className={dir === 'rtl' ? 'mr-2' : 'ml-2'}>{t(opt.labelKey)}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Color Theme */}
            <div className="space-y-2">
              <Label>{t('settings.colorTheme')}</Label>
              <Select
                value={localSettings.colorTheme}
                onValueChange={(value) =>
                  setLocalSettings({ ...localSettings, colorTheme: value as ColorTheme })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLOR_THEMES.map((ct) => (
                    <SelectItem key={ct.value} value={ct.value}>
                      {t(ct.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Show Completed */}
            <div className="flex items-center justify-between py-2">
              <Label htmlFor="showCompleted" className="cursor-pointer">
                {t('settings.showCompleted')}
              </Label>
              <input
                type="checkbox"
                id="showCompleted"
                checked={localSettings.showCompleted}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, showCompleted: e.target.checked })
                }
                className="h-4 w-4"
              />
            </div>

            {/* Show Watched */}
            <div className="flex items-center justify-between py-2">
              <Label htmlFor="showWatched" className="cursor-pointer">
                {t('settings.showWatched')}
              </Label>
              <input
                type="checkbox"
                id="showWatched"
                checked={localSettings.showWatchedRecordings}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, showWatchedRecordings: e.target.checked })
                }
                className="h-4 w-4"
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={closeSettingsModal}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave}>{t('common.save')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
