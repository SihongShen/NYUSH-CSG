'use client';

import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/common/LoadingButton';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  /** 默认 t('common.actions.confirm') */
  confirmLabel?: string;
  /** 默认 t('common.actions.cancel') */
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = 'default',
  loading = false,
  onConfirm
}: ConfirmDialogProps) {
  const tCommon = useTranslations('common');
  const confirm = confirmLabel ?? tCommon('actions.confirm');
  const cancel = cancelLabel ?? tCommon('actions.cancel');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancel}
          </Button>
          <LoadingButton
            variant={variant}
            loading={loading}
            onClick={() => void onConfirm()}
          >
            {confirm}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
