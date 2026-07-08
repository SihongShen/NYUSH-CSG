import { NextResponse } from 'next/server';
import { getCourse } from '@/lib/db/courses';
import { listReviewsForCourseIds } from '@/lib/db/reviews';
import { getUser } from '@/lib/auth/session';

/**
 * GET /api/courses/[id] — 课程详情 + 该课（含等同课组）全部评价，一次请求返回。
 *
 * 先查课程：不存在直接 404（避免用坏 id 去查评价触发 500）；课程存在后，
 * 复用 getCourse 已解析好的等同课组（course.id + equivalents），不重复解析。
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
    const [course, user] = await Promise.all([getCourse(id), getUser()]);
    if (!course) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    const groupIds = [course.id, ...course.equivalents.map((e) => e.id)];
    const reviews = await listReviewsForCourseIds(groupIds, user?.id ?? null);
    return NextResponse.json({ ...course, reviews });
  } catch (err) {
    console.error('GET /api/courses/[id] error', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
