'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores';

export function ConfirmDialog() {
  const { activeModal, modalData, closeModal } = useUIStore();

  if (activeModal !== 'confirm' || !modalData) return null;

  const data = modalData as {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'default' | 'destructive';
    onConfirm: () => void;
    onCancel?: () => void;
  };

  const handleConfirm = () => {
    data.onConfirm();
    closeModal();
  };

  const handleCancel = () => {
    data.onCancel?.();
    closeModal();
  };

  return (
    <Dialog open={true} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[425px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>{data.title}</DialogTitle>
          {data.message && <DialogDescription>{data.message}</DialogDescription>}
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:justify-start">
          <Button
            variant={data.variant || 'default'}
            onClick={handleConfirm}
          >
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
