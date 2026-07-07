'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/cn';

export interface ChipInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

const COMMIT_KEYS = new Set(['Enter', 'Tab', ',']);

/**
 * 可复用 chip 输入：
 *   - 输入文本 → Enter / Tab / 逗号 → 添加成 chip
 *   - 重复值自动忽略
 *   - 空输入按 Backspace 删最后一个 chip
 *   - 点击 ✕ 移除指定 chip
 *   - Blur 时 commit 未提交的输入
 */
export function ChipInput({
  value,
  onChange,
  placeholder,
  id,
  disabled,
  className
}: ChipInputProps) {
  const t = useTranslations('chipInput');
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function commit(raw: string) {
    const v = raw.trim();
    if (!v) return;
    if (value.includes(v)) {
      setInput('');
      return;
    }
    onChange([...value, v]);
    setInput('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (COMMIT_KEYS.has(e.key)) {
      if (input.trim()) {
        e.preventDefault();
        commit(input);
      } else if (e.key === 'Tab') {
        // 空输入按 Tab 不拦截，让焦点跳走
        return;
      }
    } else if (e.key === 'Backspace' && input === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  // 全角逗号"，"走中文输入法时 keydown 收到的是 Process，拦不到——
  // 在 onChange 里统一按半角/全角逗号切分提交
  function handleChange(raw: string) {
    if (!/[,，]/.test(raw)) {
      setInput(raw);
      return;
    }
    const parts = raw.split(/[,，]/);
    const remainder = parts.pop() ?? '';
    const additions = Array.from(
      new Set(parts.map((p) => p.trim()).filter(Boolean))
    ).filter((p) => !value.includes(p));
    if (additions.length > 0) {
      onChange([...value, ...additions]);
    }
    setInput(remainder);
  }

  function removeAt(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className={cn(
        'flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1 text-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
    >
      {value.map((chip, i) => (
        <Badge key={`${chip}-${i}`} variant="secondary" className="gap-1 pr-1">
          <span>{chip}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeAt(i);
            }}
            aria-label={t('removeAria', { chip })}
            className="ml-0.5 rounded-sm transition-colors hover:bg-muted-foreground/20"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={input}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => commit(input)}
        placeholder={value.length === 0 ? placeholder : undefined}
        disabled={disabled}
        className="min-w-[120px] flex-1 bg-transparent py-1 outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
