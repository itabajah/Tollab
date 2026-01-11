'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDataStore, useUIStore } from '@/stores';
import { isRTL, type Locale } from '@/i18n';

export function SemesterSelector() {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const dir = isRTL(locale) ? 'rtl' : 'ltr';

  const { data, activeSemesterId, setActiveSemester, addSemester, deleteSemester } = useDataStore();
  const { openConfirmModal, openPromptModal } = useUIStore();

  const semesters = data.semesters;
  const currentSemester = semesters.find((s) => s.id === activeSemesterId) || semesters[0];

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

      <Button variant="outline" size="icon" onClick={handleAddSemester} title={t('semester.add')}>
        <Plus className="h-4 w-4" />
        <span className="sr-only">{t('semester.add')}</span>
      </Button>

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
