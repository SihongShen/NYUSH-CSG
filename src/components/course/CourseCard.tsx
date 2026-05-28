import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Course } from '@/types';

export interface CourseCardProps {
  course: Course;
  // 评价数（接评价后从聚合查询传进来；当前未接，默认 0）
  reviewCount?: number;
}

export function CourseCard({ course, reviewCount = 0 }: CourseCardProps) {
  const t = useTranslations('course.card');
  return (
    <Link
      href={`/courses/${course.id}`}
      className="block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="px-5 py-3 transition-colors hover:bg-accent/30">
        {/* 顶行：code + name 横排，右侧评价数 */}
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="min-w-0 text-base leading-snug">
            <span className="font-semibold">{course.code}</span>
            <span className="ml-8 text-foreground">{course.name_en}</span>
          </h3>
          <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
            {reviewCount > 0
              ? t('reviewCount', { count: reviewCount })
              : t('noReviews')}
          </span>
        </div>

        {/* 分类按维度分行：每行一种分类，有内容才显示 */}
        <ul className="mt-2 space-y-1 text-sm">
          <ClassificationRow
            label="Major Required"
            values={course.major_required}
          />
          <ClassificationRow
            label="Major Elective"
            values={course.major_elective}
          />
          <ClassificationRow label="Minor" values={course.minor} />
          <ClassificationRow label="Core" values={course.core_type} />
          {course.is_general_elective && (
            <li className="pt-1">
              <Badge variant="outline">General Elective</Badge>
            </li>
          )}
        </ul>
      </Card>
    </Link>
  );
}

function ClassificationRow({
  label,
  values
}: {
  label: string;
  values: readonly string[];
}) {
  if (!values || values.length === 0) return null;
  return (
    <li className="flex flex-wrap items-baseline gap-x-1">
      <span className="shrink-0 text-xs uppercase tracking-wide text-muted-foreground">
        {label}:
      </span>
      <span className="text-foreground">{values.join(', ')}</span>
    </li>
  );
}
