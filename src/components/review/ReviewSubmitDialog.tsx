'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { ReviewForm } from './ReviewForm';
import type { Professor } from '@/types';

export interface ReviewSubmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  professors: Professor[];
  /** 提交成功后由父级负责关闭 dialog + 刷新数据 */
  onSubmitted: () => void;
}

/**
 * 课程详情页"写评价"弹窗。
 * 跟 CourseSubmitDialog 风格一致；内部直接复用 ReviewForm，不引入新逻辑。
 */
export function ReviewSubmitDialog({
  open,
  onOpenChange,
  courseId,
  professors,
  onSubmitted
}: ReviewSubmitDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>写评价</DialogTitle>
          <DialogDescription>
            选教授 + 学期，写下你的真实感受（中英任填其一）。
          </DialogDescription>
        </DialogHeader>
        {/* 长表单时给个内部滚动，避免在小屏顶到边 */}
        <div className="-mx-3 max-h-[65vh] overflow-y-auto px-3">
          <ReviewForm
            courseId={courseId}
            professors={professors}
            onCancel={() => onOpenChange(false)}
            onSubmitted={onSubmitted}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
