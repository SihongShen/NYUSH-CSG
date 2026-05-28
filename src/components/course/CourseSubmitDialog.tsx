'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ChevronDown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ChipInput } from '@/components/common/ChipInput';
import { LoadingButton } from '@/components/common/LoadingButton';
import { useCampus } from '@/components/providers/CampusProvider';
import {
  CORE_TYPES,
  MAJORS,
  MINORS,
  type CoreType
} from '@/lib/constants/majors';
import { cn } from '@/utils/cn';
import type { CampusCode } from '@/types';

const CAMPUS_NAMES: Record<CampusCode, string> = {
  SH: 'Shanghai',
  NY: 'New York',
  AD: 'Abu Dhabi'
};

export interface CourseSubmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CourseSubmitDialog({
  open,
  onOpenChange
}: CourseSubmitDialogProps) {
  const router = useRouter();
  const { campus } = useCampus();
  const t = useTranslations('course.submit');
  const tCommon = useTranslations('common');

  const [code, setCode] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [majorRequired, setMajorRequired] = useState<string[]>([]);
  const [majorElective, setMajorElective] = useState<string[]>([]);
  const [minor, setMinor] = useState<string[]>([]);
  const [coreType, setCoreType] = useState<string[]>([]);
  const [isGE, setIsGE] = useState(false);
  const [lectureProfs, setLectureProfs] = useState<string[]>([]);
  const [recitationTAs, setRecitationTAs] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function resetForm() {
    setCode('');
    setNameEn('');
    setMajorRequired([]);
    setMajorElective([]);
    setMinor([]);
    setCoreType([]);
    setIsGE(false);
    setLectureProfs([]);
    setRecitationTAs([]);
    setErrors({});
  }

  function handleOpenChange(next: boolean) {
    if (!next && !submitting) resetForm();
    onOpenChange(next);
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!code.trim()) errs.code = t('validation.codeRequired');
    if (nameEn.trim().length < 3) errs.name_en = t('validation.nameTooShort');
    if (
      majorRequired.length === 0 &&
      majorElective.length === 0 &&
      minor.length === 0 &&
      coreType.length === 0 &&
      !isGE
    ) {
      errs.classification = t('validation.classificationRequired');
    }
    if (lectureProfs.length === 0) {
      errs.lecture_professors = t('validation.lectureProfRequired');
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    const res = await fetch('/api/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: code.trim(),
        name_en: nameEn.trim(),
        home_campus: campus,
        major_required: majorRequired,
        major_elective: majorElective,
        minor,
        core_type: coreType as CoreType[],
        is_general_elective: isGE,
        lecture_professors: lectureProfs,
        recitation_tas: recitationTAs
      })
    });
    setSubmitting(false);

    if (res.status === 201) {
      const { id } = (await res.json()) as { id: string };
      toast.success(t('toasts.success'));
      handleOpenChange(false);
      router.push(`/courses/${id}`);
      return;
    }

    if (res.status === 409) {
      const data = (await res.json()) as { existing_id: string };
      toast.error(t('toasts.duplicate'), {
        action: {
          label: t('toasts.viewExisting'),
          onClick: () => {
            onOpenChange(false);
            router.push(`/courses/${data.existing_id}`);
          }
        },
        duration: 10000
      });
      return;
    }

    if (res.status === 400) {
      const data = (await res.json()) as { fields?: Record<string, string> };
      if (data.fields) {
        setErrors(data.fields);
        toast.error(tCommon('toasts.validateForm'));
      } else {
        toast.error(t('toasts.submitGenericError'));
      }
      return;
    }

    if (res.status === 401) {
      toast.error(tCommon('toasts.loginRequired'));
      return;
    }

    toast.error(t('toasts.submitFailedRetry'));
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* -mx-3 px-3 给 overflow 容器留 12px 左右边距，避免 focus ring 被裁剪 */}
          <div className="-mx-3 max-h-[60vh] space-y-5 overflow-y-auto px-3">
            {/* ─────────── 基本信息 ─────────── */}
            <Section>
              <Field id="code" label={t('fields.code')} error={errors.code}>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={t('fields.codePlaceholder')}
                  disabled={submitting}
                  className="h-9"
                />
              </Field>

              <Field
                id="name-en"
                label={t('fields.nameEn')}
                error={errors.name_en}
              >
                <Input
                  id="name-en"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder={t('fields.nameEnPlaceholder')}
                  disabled={submitting}
                  className="h-9"
                />
              </Field>

              <div className="space-y-1.5">
                <Label>{t('fields.campus')}</Label>
                <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm">
                  {CAMPUS_NAMES[campus]}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('fields.campusHint')}
                </p>
              </div>
            </Section>

            {/* ─────────── 课程分类 ─────────── */}
            <Section>
              <Label>{t('fields.classification')}</Label>
              <div className="space-y-2">
                <CollapsibleCheckList
                  title="Major Required"
                  options={MAJORS}
                  selected={majorRequired}
                  onChange={setMajorRequired}
                />
                <CollapsibleCheckList
                  title="Major Elective"
                  options={MAJORS}
                  selected={majorElective}
                  onChange={setMajorElective}
                />
                <CollapsibleCheckList
                  title="Minor"
                  options={MINORS}
                  selected={minor}
                  onChange={setMinor}
                />
                <CollapsibleCheckList
                  title="Core Type"
                  options={[...CORE_TYPES]}
                  selected={coreType}
                  onChange={setCoreType}
                />
                <label className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 hover:bg-accent">
                  <Checkbox
                    checked={isGE}
                    onCheckedChange={(v) => setIsGE(v === true)}
                  />
                  <span className="text-sm font-medium">General Electives</span>
                </label>
              </div>
              {errors.classification && (
                <p className="text-xs text-destructive">{errors.classification}</p>
              )}
            </Section>

            {/* ─────────── 授课老师 ─────────── */}
            <Section>
              <Field
                id="lecture"
                label={t('fields.lectureProf')}
                error={errors.lecture_professors}
                hint={t('fields.chipHint')}
              >
                <ChipInput
                  id="lecture"
                  value={lectureProfs}
                  onChange={setLectureProfs}
                  placeholder={t('fields.lectureProfPlaceholder')}
                  disabled={submitting}
                />
              </Field>

              <Field id="reci" label={t('fields.recitationTA')}>
                <ChipInput
                  id="reci"
                  value={recitationTAs}
                  onChange={setRecitationTAs}
                  placeholder={t('fields.recitationTAPlaceholder')}
                  disabled={submitting}
                />
              </Field>
            </Section>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              {tCommon('actions.cancel')}
            </Button>
            <LoadingButton
              type="submit"
              loading={submitting}
              loadingText={tCommon('states.submitting')}
              className="bg-nyu-violet text-nyu-violet-foreground hover:bg-nyu-violet/90"
            >
              {t('buttons.submit')}
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// 内部辅助组件
// ---------------------------------------------------------------------------

function Section({ children }: { children: ReactNode }) {
  return <div className="space-y-3">{children}</div>;
}

function Field({
  id,
  label,
  hint,
  error,
  children
}: {
  id?: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
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
        <div className="space-y-1 border-t px-3 py-2">
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
