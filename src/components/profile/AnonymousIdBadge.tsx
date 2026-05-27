'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface AnonymousIdBadgeProps {
  anonymousId: string;
  showCopy?: boolean;
}

export function AnonymousIdBadge({ anonymousId, showCopy = true }: AnonymousIdBadgeProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(anonymousId);
      setCopied(true);
      toast.success('已复制');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('复制失败，请手动选中');
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <Badge variant="secondary" className="font-mono text-sm">
        {anonymousId}
      </Badge>
      {showCopy && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={handleCopy}
          aria-label="复制匿名 ID"
          type="button"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      )}
    </div>
  );
}
