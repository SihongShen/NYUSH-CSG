import { NextResponse } from 'next/server';
import { getCourse } from '@/lib/db/courses';
import { listReviewsForCourse } from '@/lib/db/reviews';
import { getUser } from '@/lib/auth/session';

/**
 * GET /api/courses/[id] — 课程详情 + 该课（含等同课组）全部评价，一次请求返回。
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  try {
    const user = await getUser();
    const [course, reviews] = await Promise.all([
      getCourse(id),
      listReviewsForCourse(id, user?.id ?? null)
    ]);
    if (!course) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ...course, reviews });
  } catch (err) {
    console.error('GET /api/courses/[id] error', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
