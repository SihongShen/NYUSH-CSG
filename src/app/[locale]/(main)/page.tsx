'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCampus } from '@/components/providers/CampusProvider';
import { useCourses } from '@/hooks/useCourses';
import { useUrlState } from '@/hooks/useUrlState';
import { CourseFilterPanel } from '@/components/course/CourseFilterPanel';
import { CourseGrid } from '@/components/course/CourseGrid';
import {
  isValidCoreType,
  isValidMajor,
  isValidMinor
} from '@/lib/constants/majors';

export default function HomePage() {
  const { campus } = useCampus();
  const { get, getArray } = useUrlState();

  const q = get('q');
  const majors = getArray('major').filter(isValidMajor);
  const minors = getArray('minor').filter(isValidMinor);
  const core_types = getArray('core').filter(isValidCoreType);
  const only_general_elective = get('ge') === '1';

  const { data, loading, error } = useCourses({
    campus,
    q: q || undefined,
    majors: majors.length ? majors : undefined,
    minors: minors.length ? minors : undefined,
    core_types: core_types.length ? core_types : undefined,
    only_general_elective
  });

  const showingCount = data?.items.length ?? 0;
  const total = data?.total ?? 0;
  const hasFilter =
    !!q ||
    majors.length > 0 ||
    minors.length > 0 ||
    core_types.length > 0 ||
    only_general_elective;

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">课程列表</h1>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            asChild
            className="bg-nyu-violet text-nyu-violet-foreground hover:bg-nyu-violet/90 focus-visible:ring-nyu-violet/40 shadow-sm"
          >
            <Link href="/courses/new">
              <Plus className="mr-1 h-4 w-4" />
              添加课程
            </Link>
          </Button>
          {!loading && data && (
            <span className="whitespace-nowrap text-sm text-muted-foreground">
              {hasFilter ? `匹配 ${total} 门` : `共 ${total} 门`}
              {total > showingCount && ` · 显示前 ${showingCount}`}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[220px_1fr]">
        <CourseFilterPanel />
        <CourseGrid
          courses={data?.items ?? null}
          loading={loading}
          error={error}
        />
      </div>
    </main>
  );
}
