'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

export interface AnonymousIdBadgeProps {
  anonymousId: string;
  showCopy?: boolean;
  /** 显示"换一个"按钮（profile 页开；评价卡片等只读场景关） */
  allowReset?: boolean;
}

export function AnonymousIdBadge({
  anonymousId,
  showCopy = true,
  allowReset = false
}: AnonymousIdBadgeProps) {
  const t = useTranslations('anonymousId');
  const tCommon = useTranslations('common');
  const [copied, setCopied] = useState(false);
  // 重置成功后本地即时更新（不用整页 refetch）
  const [currentId, setCurrentId] = useState(anonymousId);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(currentId);
      setCopied(true);
      toast.success(tCommon('toasts.copied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(tCommon('toasts.copyFailed'));
    }
  }

  async function handleReset() {
    setResetting(true);
    const res = await fetch('/api/me/anonymous-id', { method: 'POST' });
    setResetting(false);

    if (!res.ok) {
      toast.error(t('resetFailed'));
      return;
    }
    const data = (await res.json()) as { anonymous_id: string };
    setCurrentId(data.anonymous_id);
    setResetOpen(false);
    toast.success(t('resetSuccess'));
  }

  return (
    <div className="inline-flex items-center gap-2">
      <Badge variant="secondary" className="font-mono text-sm">
        {currentId}
      </Badge>
      {showCopy && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={handleCopy}
          aria-label={t('copyAria')}
          type="button"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      )}
      {allowReset && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs text-muted-foreground"
          onClick={() => setResetOpen(true)}
          type="button"
        >
          <RefreshCw className="h-3 w-3" />
          {t('resetButton')}
        </Button>
      )}

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title={t('resetConfirmTitle')}
        description={t('resetConfirmDesc')}
        confirmLabel={t('resetButton')}
        loading={resetting}
        onConfirm={handleReset}
      />
    </div>
  );
}
