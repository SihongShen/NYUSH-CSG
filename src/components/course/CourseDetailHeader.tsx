'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { formatProfessorName } from '@/utils/format';
import { siteName } from '@/lib/constants/sites';
import type { CourseDetail } from '@/types';

export interface CourseDetailHeaderProps {
  course: CourseDetail;
}

export function CourseDetailHeader({ course }: CourseDetailHeaderProps) {
  const t = useTranslations('course.detail');
  return (
    <div>
      <h1 className="mt-3 text-2xl leading-tight">
        <span className="font-semibold">{course.code}</span>
        <span className="ml-2 text-foreground">{course.name_en}</span>
      </h1>

      <ul className="mt-3 space-y-1 text-sm">
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

      {course.professors.length > 0 && (
        <p className="mt-3 text-sm">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            {t('professorsLabel')}
          </span>
          <span className="ml-1">
            {course.professors
              .map((p) => formatProfessorName(p.name_en))
              .join(' · ')}
          </span>
        </p>
      )}

      {course.equivalents.length > 0 && (
        <p className="mt-2 text-sm">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            {t('equivalentsLabel')}
          </span>
          <span className="ml-1 inline-flex flex-wrap gap-x-2">
            {course.equivalents.map((eq) => (
              <Link
                key={eq.id}
                href={`/courses/${eq.id}`}
                className="font-mono hover:underline"
              >
                {eq.code}
                <span className="ml-1 text-xs text-muted-foreground">
                  ({siteName(eq.home_campus)})
                </span>
              </Link>
            ))}
          </span>
        </p>
      )}
    </div>
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
