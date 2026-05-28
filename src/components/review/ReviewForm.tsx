'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { LoadingButton } from '@/components/common/LoadingButton';
import {
  SEASONS,
  SELECTABLE_YEARS,
  formatSemester,
  type Season
} from '@/lib/constants/semesters';
import type { Professor, ReviewWithAuthor } from '@/types';

const NEW_PROF = '__new__';

export interface ReviewFormProps {
  courseId: string;
  professors?: Professor[]; // 仅新建模式用；编辑模式不需要
  initialReview?: ReviewWithAuthor; // 编辑模式
  onCancel: () => void;
  onSubmitted: () => void;
}

const DEFAULT_YEAR = SELECTABLE_YEARS[1]; // 当前年（数组排序：next, current, ...）

export function ReviewForm({
  courseId,
  professors = [],
  initialReview,
  onCancel,
  onSubmitted
}: ReviewFormProps) {
  const isEdit = !!initialReview;

  const [profValue, setProfValue] = useState<string>(
    professors.length > 0 ? professors[0].id : NEW_PROF
  );
  const [newProfName, setNewProfName] = useState('');
  const [year, setYear] = useState<number>(DEFAULT_YEAR);
  const [season, setSeason] = useState<Season>('Fall');
  const [contentZh, setContentZh] = useState(initialReview?.content_zh ?? '');
  const [contentEn, setContentEn] = useState(initialReview?.content_en ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const useNewProf = profValue === NEW_PROF || professors.length === 0;

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!isEdit) {
      if (useNewProf && !newProfName.trim()) {
        errs.professor = '请填写新教授名';
      } else if (!useNewProf && !profValue) {
        errs.professor = '请选择教授';
      }
    }
    if (!contentZh.trim() && !contentEn.trim()) {
      errs.content = '中文和英文评价至少填一个';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);

    if (isEdit) {
      const res = await fetch(`/api/reviews/${initialReview.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_zh: contentZh.trim() || null,
          content_en: contentEn.trim() || null
        })
      });
      setSubmitting(false);

      if (res.ok) {
        toast.success('评价已更新');
        onSubmitted();
        return;
      }
      if (res.status === 400) {
        const data = (await res.json()) as { fields?: Record<string, string> };
        if (data.fields) setErrors(data.fields);
        toast.error('请检查表单');
        return;
      }
      toast.error('更新失败');
      return;
    }

    // 新建
    const payload: Record<string, unknown> = {
      course_id: courseId,
      semester: formatSemester(year, season),
      content_zh: contentZh.trim() || undefined,
      content_en: contentEn.trim() || undefined
    };
    if (useNewProf) {
      payload.new_professor_name = newProfName.trim();
    } else {
      payload.professor_id = profValue;
    }

    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    setSubmitting(false);

    if (res.ok) {
      toast.success('评价已提交');
      onSubmitted();
      return;
    }
    if (res.status === 409) {
      toast.error('已经为这个教授 + 学期组合写过评价');
      return;
    }
    if (res.status === 400) {
      const data = (await res.json()) as { fields?: Record<string, string> };
      if (data.fields) setErrors(data.fields);
      toast.error('请检查表单');
      return;
    }
    toast.error('提交失败');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!isEdit && (
        <>
          <div className="space-y-1.5">
            <Label>教授 *</Label>
            {professors.length > 0 ? (
              <Select value={profValue} onValueChange={setProfValue}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {professors.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name_en}
                    </SelectItem>
                  ))}
                  <SelectItem value={NEW_PROF}>+ 添加新教授</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className="text-xs text-muted-foreground">
                这门课还没有教授记录，请填写下方
              </p>
            )}
            {useNewProf && (
              <Input
                value={newProfName}
                onChange={(e) => setNewProfName(e.target.value)}
                placeholder="新教授名"
                disabled={submitting}
                className="mt-2 h-9"
              />
            )}
            {errors.professor && (
              <p className="text-xs text-destructive">{errors.professor}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>年份 *</Label>
              <Select
                value={String(year)}
                onValueChange={(v) => setYear(parseInt(v, 10))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SELECTABLE_YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>学期 *</Label>
              <Select
                value={season}
                onValueChange={(v) => setSeason(v as Season)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEASONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="zh">中文评价</Label>
        <Textarea
          id="zh"
          value={contentZh}
          onChange={(e) => setContentZh(e.target.value)}
          placeholder="可选"
          disabled={submitting}
          rows={4}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="en">English Review</Label>
        <Textarea
          id="en"
          value={contentEn}
          onChange={(e) => setContentEn(e.target.value)}
          placeholder="Optional"
          disabled={submitting}
          rows={4}
        />
      </div>

      {errors.content && (
        <p className="text-xs text-destructive">{errors.content}</p>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={submitting}
        >
          取消
        </Button>
        <LoadingButton
          type="submit"
          loading={submitting}
          loadingText={isEdit ? '更新中...' : '提交中...'}
          className="bg-nyu-violet text-nyu-violet-foreground hover:bg-nyu-violet/90"
        >
          {isEdit ? '更新' : '提交'}
        </LoadingButton>
      </div>
    </form>
  );
}
