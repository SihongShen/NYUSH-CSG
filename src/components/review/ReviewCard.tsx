'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ReviewForm } from './ReviewForm';
import { cn } from '@/utils/cn';
import type { ReviewWithAuthor } from '@/types';

export interface ReviewCardProps {
  review: ReviewWithAuthor;
  isOwnReview: boolean;
  onUpdated: () => void;
  /** 可选：在卡片顶部额外展示一行课程信息（profile 页用） */
  course?: { id: string; code: string; name_en: string };
  /** 可选：给了就让"编辑"变成跳转链接（profile 页跳回课程详情）。
   *  没给则保持原地切到 ReviewForm 的行为（课程详情页用）。 */
  editHref?: string;
}

export function ReviewCard({
  review,
  isOwnReview,
  onUpdated,
  course,
  editHref
}: ReviewCardProps) {
  const t = useTranslations('review.card');
  const tActions = useTranslations('review.actions');
  const tCommon = useTranslations('common');
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/reviews/${review.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_visible: false })
    });
    setDeleting(false);
    if (res.ok) {
      toast.success(tActions('deleteSuccess'));
      setDeleteOpen(false);
      onUpdated();
    } else {
      toast.error(tCommon('toasts.deleteFailed'));
    }
  }

  async function handleRestore() {
    const res = await fetch(`/api/reviews/${review.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_visible: true })
    });
    if (res.ok) {
      toast.success(tActions('restoreSuccess'));
      onUpdated();
    } else {
      toast.error(tCommon('toasts.restoreFailed'));
    }
  }

  if (editing) {
    return (
      <Card className="px-5 py-4">
        <ReviewForm
          courseId={review.course_id}
          initialReview={review}
          onCancel={() => setEditing(false)}
          onSubmitted={() => {
            setEditing(false);
            onUpdated();
          }}
        />
      </Card>
    );
  }

  const deleted = !review.is_visible;

  return (
    <Card className={cn('px-5 py-4', deleted && 'opacity-60')}>
      {course && (
        <div className="mb-2 flex flex-wrap items-baseline gap-x-2 text-sm">
          <Link
            href={`/courses/${course.id}`}
            className="font-mono font-semibold text-foreground hover:underline"
          >
            {course.code}
          </Link>
          <span className="text-muted-foreground">{course.name_en}</span>
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
          <span className="font-mono text-xs text-muted-foreground">
            {review.author_anonymous_id ?? t('deletedAuthor')}
          </span>
          <span className="text-muted-foreground">·</span>
          <span>{review.professor_name_en}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{review.semester}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{review.site}</span>
        </div>

        {isOwnReview && (
          <div className="flex shrink-0 items-center gap-1">
            {deleted ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRestore}
                className="h-7 gap-1 text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {tCommon('actions.restore')}
              </Button>
            ) : (
              <>
                {editHref ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="h-7 gap-1 text-xs"
                  >
                    <Link href={editHref}>
                      <Pencil className="h-3.5 w-3.5" />
                      {tCommon('actions.edit')}
                    </Link>
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing(true)}
                    className="h-7 gap-1 text-xs"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {tCommon('actions.edit')}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteOpen(true)}
                  className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {tCommon('actions.delete')}
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {deleted && (
        <p className="mt-2 text-xs text-destructive">{t('deletedStatus')}</p>
      )}

      <div className="mt-3 space-y-2 text-sm">
        {review.content_zh && (
          <p className="whitespace-pre-wrap">{review.content_zh}</p>
        )}
        {review.content_en && (
          <p
            className={cn(
              'whitespace-pre-wrap',
              review.content_zh && 'text-muted-foreground'
            )}
          >
            {review.content_en}
          </p>
        )}
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t('confirmDeleteTitle')}
        description={t('confirmDeleteDesc')}
        confirmLabel={tCommon('actions.delete')}
        variant="destructive"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </Card>
  );
}
