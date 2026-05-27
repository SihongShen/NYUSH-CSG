'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/utils/cn';

const SIZE_CLASS = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-7 w-7'
} as const;

export interface RatingStarsProps {
  value: number;                       // 当前值，0 表示未设置
  max?: number;                        // 默认 5
  size?: keyof typeof SIZE_CLASS;
  readonly?: boolean;                  // 只读模式：纯显示
  onChange?: (next: number) => void;   // 交互模式：点击回调
  className?: string;
}

export function RatingStars({
  value,
  max = 5,
  size = 'md',
  readonly = false,
  onChange,
  className
}: RatingStarsProps) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value;

  return (
    <div
      className={cn('inline-flex items-center gap-0.5', className)}
      onMouseLeave={() => setHover(null)}
      role={readonly ? 'img' : 'radiogroup'}
      aria-label={readonly ? `评分 ${value} / ${max}` : '点击设置评分'}
    >
      {Array.from({ length: max }, (_, i) => {
        const n = i + 1;
        const active = n <= display;
        return (
          <button
            key={n}
            type="button"
            tabIndex={readonly ? -1 : 0}
            onClick={() => !readonly && onChange?.(n)}
            onMouseEnter={() => !readonly && setHover(n)}
            disabled={readonly}
            className={cn(
              'rounded-sm p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              !readonly && 'cursor-pointer hover:scale-110',
              readonly && 'cursor-default'
            )}
            aria-label={`${n} 星`}
          >
            <Star
              className={cn(
                SIZE_CLASS[size],
                active
                  ? 'fill-primary text-primary'
                  : 'fill-transparent text-muted-foreground'
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
