'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
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
import { ChipInput } from '@/components/common/ChipInput';
import { LoadingButton } from '@/components/common/LoadingButton';
import { useCampus } from '@/components/providers/CampusProvider';
import {
  ClassificationFields,
  hasAnyClassification,
  toClassificationPayload,
  type ClassificationValue
} from './ClassificationFields';
import { siteName } from '@/lib/constants/sites';

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

  const EMPTY_CLASSIFICATION: ClassificationValue = {
    major_required: [],
    major_elective: [],
    minor: [],
    core_type: [],
    is_general_elective: false
  };

  const [code, setCode] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [shEquivalentCode, setShEquivalentCode] = useState('');
  const [classification, setClassification] =
    useState<ClassificationValue>(EMPTY_CLASSIFICATION);
  const [lectureProfs, setLectureProfs] = useState<string[]>([]);
  const [recitationTAs, setRecitationTAs] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function resetForm() {
    setCode('');
    setNameEn('');
    setShEquivalentCode('');
    setClassification(EMPTY_CLASSIFICATION);
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
    if (!hasAnyClassification(classification)) {
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
        ...toClassificationPayload(classification),
        lecture_professors: lectureProfs,
        recitation_tas: recitationTAs,
        // 非上海校区可关联上海等同课；上海本部建课时不发这个字段
        sh_equivalent_code:
          campus !== 'SH' && shEquivalentCode.trim()
            ? shEquivalentCode.trim()
            : undefined
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
          {/* -mx-3 px-3 给 overflow 容器留 12px 左右边距，pb-3 给底部（TA 输入框）留呼吸空间，避免 focus ring 被裁剪 */}
          <div className="-mx-3 max-h-[60vh] space-y-5 overflow-y-auto px-3 pb-3">
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
                  {siteName(campus)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('fields.campusHint')}
                </p>
              </div>

              {/* 非上海校区：可填上海等同课课号（有则关联，库里没有会自动建上海锚点课） */}
              {campus !== 'SH' && (
                <Field
                  id="sh-equivalent"
                  label={t('fields.shEquivalent')}
                  hint={t('fields.shEquivalentHint')}
                >
                  <Input
                    id="sh-equivalent"
                    value={shEquivalentCode}
                    onChange={(e) => setShEquivalentCode(e.target.value)}
                    placeholder={t('fields.shEquivalentPlaceholder')}
                    disabled={submitting}
                    className="h-9"
                  />
                </Field>
              )}
            </Section>

            {/* ─────────── 课程分类 ─────────── */}
            <Section>
              <Label>{t('fields.classification')}</Label>
              <ClassificationFields
                value={classification}
                onChange={setClassification}
                error={errors.classification}
              />
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

