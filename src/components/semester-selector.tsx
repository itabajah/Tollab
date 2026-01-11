'use client';

import { useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Plus, Trash2, Calendar, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useDataStore, useUIStore } from '@/stores';
import { useSemesters } from '@/hooks/use-cheesefork';
import { formatSemesterCode } from '@/lib/cheesefork';
import { isRTL, type Locale } from '@/i18n';

export function SemesterSelector() {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const dir = isRTL(locale) ? 'rtl' : 'ltr';

  const { data, activeSemesterId, setActiveSemester, addSemester, deleteSemester } = useDataStore();
  const { openConfirmModal, openPromptModal } = useUIStore();
  
  // Fetch available semesters from Cheesefork
  const { semesters: cheeseforkSemesters, loading: semestersLoading, currentSemesterCode } = useSemesters();
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const semesters = data.semesters;
  const currentSemester = semesters.find((s) => s.id === activeSemesterId) || semesters[0];

  // Get formatted semester name based on locale
  const formatSemester = (code: string) => {
    return formatSemesterCode(code, locale as 'en' | 'he' | 'ar');
  };

  // Filter out semesters that are already added
  const availableSemesters = useMemo(() => {
    const existingNames = new Set(semesters.map((s) => s.name.toLowerCase()));
    return cheeseforkSemesters.filter((s) => {
      const enName = formatSemesterCode(s.code, 'en').toLowerCase();
      const heName = formatSemesterCode(s.code, 'he').toLowerCase();
      const arName = formatSemesterCode(s.code, 'ar').toLowerCase();
      return !existingNames.has(enName) && !existingNames.has(heName) && !existingNames.has(arName);
    });
  }, [cheeseforkSemesters, semesters]);

  // Generate default semester name based on current date
  const generateDefaultSemesterName = () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    
    // Winter: Oct-Feb, Spring: Mar-Jun, Summer: Jul-Sep
    let semesterType: string;
    let academicYear: string;
    
    if (month >= 10 || month <= 2) {
      // Winter semester
      semesterType = t('semester.winter');
      const startYear = month >= 10 ? year : year - 1;
      academicYear = `${startYear}/${startYear + 1}`;
    } else if (month >= 3 && month <= 6) {
      // Spring semester
      semesterType = t('semester.spring');
      academicYear = `${year - 1}/${year}`;
    } else {
      // Summer semester
      semesterType = t('semester.summer');
      academicYear = `${year - 1}/${year}`;
    }
    
    return `${semesterType} ${academicYear}`;
  };

  const handleQuickAddSemester = (code: string) => {
    const name = formatSemester(code);
    addSemester(name, code);
    setQuickAddOpen(false);
  };

  const handleAddSemester = () => {
    const defaultName = generateDefaultSemesterName();

    openPromptModal({
      title: t('semester.newTitle'),
      message: t('semester.newMessage'),
      placeholder: t('semester.newPlaceholder'),
      defaultValue: defaultName,
      confirmLabel: t('common.create'),
      onConfirm: (name) => {
        if (name.trim()) {
          addSemester(name.trim());
        }
      },
    });
  };

  const handleDeleteSemester = () => {
    if (!currentSemester) return;

    openConfirmModal({
      title: t('semester.deleteTitle'),
      message: t('semester.deleteMessage', { name: currentSemester.name }),
      confirmLabel: t('common.delete'),
      variant: 'destructive',
      onConfirm: () => {
        deleteSemester(currentSemester.id);
      },
    });
  };

  return (
    <div className="flex items-center gap-2" dir={dir}>
      <Select
        value={currentSemester?.id || ''}
        onValueChange={(value) => setActiveSemester(value)}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder={t('semester.select')} />
        </SelectTrigger>
        <SelectContent>
          {semesters.length === 0 ? (
            <SelectItem value="empty" disabled>
              {t('semester.noSemesters')}
            </SelectItem>
          ) : (
            semesters.map((semester) => (
              <SelectItem key={semester.id} value={semester.id}>
                {semester.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {/* Quick-add from Cheesefork semesters */}
      <Popover open={quickAddOpen} onOpenChange={setQuickAddOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="icon" 
            title={t('semester.add')}
            disabled={semestersLoading}
          >
            {semestersLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span className="sr-only">{t('semester.add')}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align={dir === 'rtl' ? 'end' : 'start'} dir={dir}>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              {t('semester.add')}
            </p>
            {availableSemesters.length > 0 ? (
              <>
                {availableSemesters.slice(0, 5).map((sem) => (
                  <Button
                    key={sem.code}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'w-full justify-start gap-2',
                      sem.code === currentSemesterCode && 'bg-primary/10 text-primary'
                    )}
                    onClick={() => handleQuickAddSemester(sem.code)}
                  >
                    <Calendar className="h-4 w-4" />
                    {formatSemester(sem.code)}
                    {sem.code === currentSemesterCode && (
                      <span className="text-xs text-muted-foreground">
                        ({t('common.today').split(' ')[0]})
                      </span>
                    )}
                  </Button>
                ))}
                <div className="border-t my-2" />
              </>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={() => {
                setQuickAddOpen(false);
                handleAddSemester();
              }}
            >
              <Plus className="h-4 w-4" />
              {t('semester.customName')}
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {currentSemester && (
        <Button
          variant="outline"
          size="icon"
          onClick={handleDeleteSemester}
          title={t('semester.delete')}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">{t('semester.delete')}</span>
        </Button>
      )}
    </div>
  );
}
