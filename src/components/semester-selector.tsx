'use client';

import { Plus, Trash2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDataStore, useUIStore } from '@/stores';
import { SEMESTER_TYPES } from '@/types';

export function SemesterSelector() {
  const { data, activeSemesterId, setActiveSemester, addSemester, deleteSemester } = useDataStore();
  const { openConfirmModal, openPromptModal } = useUIStore();

  const semesters = data.semesters;
  const currentSemester = semesters.find((s) => s.id === activeSemesterId) || semesters[0];

  const handleAddSemester = () => {
    const currentYear = new Date().getFullYear();
    const defaultName = `${SEMESTER_TYPES[0]} ${currentYear}-${currentYear + 1}`;

    openPromptModal({
      title: 'סמסטר חדש',
      message: 'הזן שם לסמסטר החדש',
      placeholder: 'לדוגמה: חורף 2024-2025',
      defaultValue: defaultName,
      confirmLabel: 'צור סמסטר',
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
      title: 'מחיקת סמסטר',
      message: `האם אתה בטוח שברצונך למחוק את "${currentSemester.name}"? פעולה זו לא ניתנת לביטול.`,
      confirmLabel: 'מחק',
      variant: 'destructive',
      onConfirm: () => {
        deleteSemester(currentSemester.id);
      },
    });
  };

  return (
    <div className="flex items-center gap-2" dir="rtl">
      <Select
        value={currentSemester?.id || ''}
        onValueChange={(value) => setActiveSemester(value)}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="בחר סמסטר" />
        </SelectTrigger>
        <SelectContent>
          {semesters.length === 0 ? (
            <SelectItem value="empty" disabled>
              אין סמסטרים
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

      <Button variant="outline" size="icon" onClick={handleAddSemester} title="הוסף סמסטר">
        <Plus className="h-4 w-4" />
        <span className="sr-only">הוסף סמסטר</span>
      </Button>

      {currentSemester && (
        <Button
          variant="outline"
          size="icon"
          onClick={handleDeleteSemester}
          title="מחק סמסטר"
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">מחק סמסטר</span>
        </Button>
      )}
    </div>
  );
}
