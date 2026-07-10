'use client';

import { useEffect, useState } from 'react';
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
import { LoadingButton } from '@/components/common/LoadingButton';
import {
  ClassificationFields,
  hasAnyClassification,
  toClassificationPayload,
  type ClassificationValue
} from './ClassificationFields';
import type { CourseDetail } from '@/types';

export interface CourseEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: CourseDetail;
  /** 保存成功后回调（父组件 refetch 课程数据） */
  onSaved: () => void;
}

/**
 * 编辑课程分类（major / minor / core / GE）。
 * 社区共同维护：任何登录用户可改（与"登录用户可建课"同一信任级别）；
 * 课号、课名等其他字段不可编辑（DB 列级权限兜底）。
 */
export function CourseEditDialog({
  open,
  onOpenChange,
  course,
  onSaved
}: CourseEditDialogProps) {
  const t = useTranslations('course.edit');
  const tSubmit = useTranslations('course.submit');
  const tCommon = useTranslations('common');

  const [value, setValue] = useState<ClassificationValue>(() =>
    fromCourse(course)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // 每次打开时从当前课程数据重新播种（course refetch 后保持同步）
  useEffect(() => {
    if (open) {
      setValue(fromCourse(course));
      setError(undefined);
    }
  }, [open, course]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hasAnyClassification(value)) {
      setError(tSubmit('validation.classificationRequired'));
      return;
    }

    setSaving(true);
    const res = await fetch(`/api/courses/${course.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toClassificationPayload(value))
    });
    setSaving(false);

    if (res.ok) {
      toast.success(t('toasts.success'));
      onOpenChange(false);
      onSaved();
      return;
    }
    if (res.status === 401) {
      toast.error(tCommon('toasts.loginRequired'));
      return;
    }
    toast.error(t('toasts.failed'));
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description', { code: course.code })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="-mx-3 max-h-[60vh] space-y-2 overflow-y-auto px-3 pb-3">
            <ClassificationFields
              value={value}
              onChange={setValue}
              error={error}
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              {tCommon('actions.cancel')}
            </Button>
            <LoadingButton
              type="submit"
              loading={saving}
              loadingText={tCommon('states.submitting')}
              className="bg-nyu-violet text-nyu-violet-foreground hover:bg-nyu-violet/90"
            >
              {tCommon('actions.save')}
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function fromCourse(course: CourseDetail): ClassificationValue {
  return {
    major_required: course.major_required ?? [],
    major_elective: course.major_elective ?? [],
    minor: course.minor ?? [],
    core_type: course.core_type ?? [],
    is_general_elective: course.is_general_elective
  };
}
