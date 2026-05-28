'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { CORE_TYPES, MAJORS, MINORS } from '@/lib/constants/majors';
import { useUrlState } from '@/hooks/useUrlState';
import { cn } from '@/utils/cn';

export function CourseFilterPanel() {
  const { getArray, get, set } = useUrlState();
  const selectedMajors = getArray('major');
  const selectedMinors = getArray('minor');
  const selectedCoreTypes = getArray('core');
  const onlyGeneralElective = get('ge') === '1';

  function toggle(key: 'major' | 'minor' | 'core', value: string, on: boolean) {
    const current =
      key === 'major'
        ? selectedMajors
        : key === 'minor'
          ? selectedMinors
          : selectedCoreTypes;
    const next = on
      ? Array.from(new Set([...current, value]))
      : current.filter((v) => v !== value);
    set(key, next);
  }

  return (
    <aside className="space-y-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-2">
      <CollapsibleGroup
        title="Major"
        selectedCount={selectedMajors.length}
        defaultOpen={false}
      >
        {MAJORS.map((m) => (
          <FilterCheckbox
            key={m}
            id={`maj-${m}`}
            label={m}
            checked={selectedMajors.includes(m)}
            onChange={(v) => toggle('major', m, v)}
          />
        ))}
      </CollapsibleGroup>

      <Separator />

      <CollapsibleGroup
        title="Minor"
        selectedCount={selectedMinors.length}
        defaultOpen={false}
      >
        {MINORS.map((m) => (
          <FilterCheckbox
            key={m}
            id={`min-${m}`}
            label={m}
            checked={selectedMinors.includes(m)}
            onChange={(v) => toggle('minor', m, v)}
          />
        ))}
      </CollapsibleGroup>

      <Separator />

      <StaticGroup title="Core Type">
        {CORE_TYPES.map((c) => (
          <FilterCheckbox
            key={c}
            id={`core-${c}`}
            label={c}
            checked={selectedCoreTypes.includes(c)}
            onChange={(v) => toggle('core', c, v)}
          />
        ))}
      </StaticGroup>

      <Separator />

      <FilterCheckbox
        id="ge"
        label="General Electives"
        checked={onlyGeneralElective}
        onChange={(v) => set('ge', v ? '1' : null)}
      />
    </aside>
  );
}

/** 可折叠的筛选组，默认收起；选中数大于 0 时在标题右侧显示数量。 */
function CollapsibleGroup({
  title,
  selectedCount,
  defaultOpen = false,
  children
}: {
  title: string;
  selectedCount: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded px-1 py-1 hover:bg-accent"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
          {selectedCount > 0 && (
            <span className="ml-2 normal-case text-foreground">
              ({selectedCount})
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
      {open && <div className="mt-2 space-y-1.5">{children}</div>}
    </div>
  );
}

/** 不可折叠的筛选组（Core Type 用这个），标题始终在、内容始终展开。 */
function StaticGroup({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-3 px-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function FilterCheckbox({
  id,
  label,
  checked,
  onChange
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-2 rounded px-1 py-1 hover:bg-accent"
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
        className="mt-0.5"
      />
      <span className="text-sm leading-tight">{label}</span>
    </label>
  );
}
