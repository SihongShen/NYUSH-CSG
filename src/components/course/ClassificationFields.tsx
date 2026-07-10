'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { CORE_TYPES, MAJORS, MINORS } from '@/lib/constants/majors';
import { cn } from '@/utils/cn';
import type { CoreType } from '@/types';

/** 分类五元组的表单值（core_type 放宽成 string[] 方便受控组件用） */
export interface ClassificationValue {
  major_required: string[];
  major_elective: string[];
  minor: string[];
  core_type: string[];
  is_general_elective: boolean;
}

export function hasAnyClassification(v: ClassificationValue): boolean {
  return (
    v.major_required.length > 0 ||
    v.major_elective.length > 0 ||
    v.minor.length > 0 ||
    v.core_type.length > 0 ||
    v.is_general_elective
  );
}

export function toClassificationPayload(v: ClassificationValue) {
  return {
    major_required: v.major_required,
    major_elective: v.major_elective,
    minor: v.minor,
    core_type: v.core_type as CoreType[],
    is_general_elective: v.is_general_elective
  };
}

/**
 * 课程分类勾选组（Major Required / Elective / Minor / Core / GE）。
 * 建课弹窗和分类编辑弹窗共用。
 */
export function ClassificationFields({
  value,
  onChange,
  error
}: {
  value: ClassificationValue;
  onChange: (next: ClassificationValue) => void;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <CollapsibleCheckList
        title="Major Required"
        options={MAJORS}
        selected={value.major_required}
        onChange={(next) => onChange({ ...value, major_required: next })}
      />
      <CollapsibleCheckList
        title="Major Elective"
        options={MAJORS}
        selected={value.major_elective}
        onChange={(next) => onChange({ ...value, major_elective: next })}
      />
      <CollapsibleCheckList
        title="Minor"
        options={MINORS}
        selected={value.minor}
        onChange={(next) => onChange({ ...value, minor: next })}
      />
      <CollapsibleCheckList
        title="Core Type"
        options={[...CORE_TYPES]}
        selected={value.core_type}
        onChange={(next) => onChange({ ...value, core_type: next })}
      />
      <label className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 hover:bg-accent">
        <Checkbox
          checked={value.is_general_elective}
          onCheckedChange={(v) =>
            onChange({ ...value, is_general_elective: v === true })
          }
        />
        <span className="text-sm font-medium">General Electives</span>
      </label>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function CollapsibleCheckList({
  title,
  options,
  selected,
  onChange
}: {
  title: string;
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  function toggle(value: string, on: boolean) {
    onChange(
      on
        ? Array.from(new Set([...selected, value]))
        : selected.filter((v) => v !== value)
    );
  }

  return (
    <div className="rounded-md border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium hover:bg-accent"
        aria-expanded={open}
      >
        <span>
          {title}
          {selected.length > 0 && (
            <span className="ml-2 text-muted-foreground">
              ({selected.length})
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>
      {open && (
        // 限高 + 自带滚动 + 两列：长列表（19 个 major）不再被弹窗底部裁掉
        <div className="grid max-h-56 grid-cols-1 gap-x-3 gap-y-1 overflow-y-auto border-t px-3 py-2 sm:grid-cols-2">
          {options.map((opt) => (
            <label
              key={opt}
              className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-accent"
            >
              <Checkbox
                checked={selected.includes(opt)}
                onCheckedChange={(v) => toggle(opt, v === true)}
              />
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
