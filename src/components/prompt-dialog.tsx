'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUIStore } from '@/stores';

export function PromptDialog() {
  const { activeModal, modalData, closeModal } = useUIStore();
  const [value, setValue] = useState('');

  if (activeModal !== 'prompt' || !modalData) return null;

  const data = modalData as {
    title: string;
    message?: string;
    placeholder?: string;
    defaultValue?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: (value: string) => void;
    onCancel?: () => void;
  };

  const handleConfirm = () => {
    data.onConfirm(value || data.defaultValue || '');
    closeModal();
    setValue('');
  };

  const handleCancel = () => {
    data.onCancel?.();
    closeModal();
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    }
  };

  return (
    <Dialog open={true} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[425px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>{data.title}</DialogTitle>
          {data.message && <DialogDescription>{data.message}</DialogDescription>}
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="prompt-input" className="sr-only">
              {data.title}
            </Label>
            <Input
              id="prompt-input"
              placeholder={data.placeholder}
              defaultValue={data.defaultValue}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
        </div>
        <DialogFooter className="flex gap-2 sm:justify-start">
          <Button onClick={handleConfirm}>
            {data.confirmLabel || 'אישור'}
          </Button>
          <Button variant="outline" onClick={handleCancel}>
            {data.cancelLabel || 'ביטול'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
