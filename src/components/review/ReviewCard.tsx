'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Pencil, RotateCcw, ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ReviewForm } from './ReviewForm';
import { cn } from '@/utils/cn';
import { formatProfessorName } from '@/utils/format';
import { siteName } from '@/lib/constants/sites';
import type { ReviewWithAuthor, VoteValue } from '@/types';

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

  // 投票：本地乐观更新，失败回滚
  const [myVote, setMyVote] = useState<VoteValue>(review.my_vote);
  const [upvotes, setUpvotes] = useState(review.upvotes);
  const [downvotes, setDownvotes] = useState(review.downvotes);
  const [voting, setVoting] = useState(false);
  // 防双击：state 更新是异步的，快速连点能穿过 voting 检查，用 ref 同步上锁
  const votingRef = useRef(false);

  // 列表 refetch 后组件按 key 复用、本地 state 不会重建——用服务器数据覆盖，
  // 避免别人新投的票 / 恢复后的状态一直显示旧值
  useEffect(() => {
    setMyVote(review.my_vote);
    setUpvotes(review.upvotes);
    setDownvotes(review.downvotes);
  }, [review.my_vote, review.upvotes, review.downvotes]);

  async function handleVote(target: 1 | -1) {
    if (votingRef.current) return;
    votingRef.current = true;

    const next: VoteValue = myVote === target ? 0 : target;   // 再点一次 = 撤票

    const prev = { myVote, upvotes, downvotes };
    setMyVote(next);
    setUpvotes(upvotes + (next === 1 ? 1 : 0) - (prev.myVote === 1 ? 1 : 0));
    setDownvotes(
      downvotes + (next === -1 ? 1 : 0) - (prev.myVote === -1 ? 1 : 0)
    );

    setVoting(true);
    const res = await fetch(`/api/reviews/${review.id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vote: next })
    });
    setVoting(false);
    votingRef.current = false;

    if (!res.ok) {
      setMyVote(prev.myVote);
      setUpvotes(prev.upvotes);
      setDownvotes(prev.downvotes);
      toast.error(t('voteFailed'));
    }
  }

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
        <div className="min-w-0 space-y-0.5">
          {/* 第一行：用户名（黑色，大一号） */}
          <p className="truncate font-mono text-base font-semibold text-foreground">
            {review.author_anonymous_id ?? t('deletedAuthor')}
          </p>
          {/* 第二行：教授 · 学期 · 校区（小一号） */}
          <p className="flex flex-wrap items-baseline gap-x-2 text-sm text-muted-foreground">
            <span className="text-foreground/80">
              {formatProfessorName(review.professor_name_en)}
            </span>
            <span>·</span>
            <span>{review.semester}</span>
            <span>·</span>
            <span>{siteName(review.site)}</span>
          </p>
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

      {!deleted && (
        // 最后一行：点赞 / 点踩靠最右
        <div className="mt-3 flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleVote(1)}
            disabled={isOwnReview || voting}
            aria-label={t('upvote')}
            className={cn(
              'h-7 gap-1 px-2 text-xs',
              myVote === 1 && 'text-nyu-violet'
            )}
          >
            <ThumbsUp
              className={cn('h-3.5 w-3.5', myVote === 1 && 'fill-current')}
            />
            {upvotes > 0 && upvotes}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleVote(-1)}
            disabled={isOwnReview || voting}
            aria-label={t('downvote')}
            className={cn(
              'h-7 gap-1 px-2 text-xs',
              myVote === -1 && 'text-destructive'
            )}
          >
            <ThumbsDown
              className={cn('h-3.5 w-3.5', myVote === -1 && 'fill-current')}
            />
            {downvotes > 0 && downvotes}
          </Button>
        </div>
      )}

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
