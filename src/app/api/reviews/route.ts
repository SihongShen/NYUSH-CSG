import { NextResponse } from 'next/server';
import { createReview, listReviewsForUser } from '@/lib/db/reviews';
import { getUser, requireUser } from '@/lib/auth/session';
import { HOURLY_LIMITS, isOverHourlyLimit } from '@/lib/db/rate-limit';
import { isValidSemester } from '@/lib/constants/semesters';
import { isValidSite } from '@/lib/constants/sites';
import { reviewContentError, reviewContentMessage } from '@/lib/constants/reviews';

// ============================================================================
// GET /api/reviews?user_id=me
//   当前登录用户的所有评价（含软删）。一门课的评价改由
//   GET /api/courses/[id] 一并返回，这里不再提供 course_id 分支。
// ============================================================================

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('user_id') !== 'me') {
    return NextResponse.json({ error: 'user_id_required' }, { status: 400 });
  }

  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const items = await listReviewsForUser(user.id);
    return NextResponse.json({ items });
  } catch (error) {
    console.error('GET /api/reviews?user_id=me error', error);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}

// ============================================================================
// POST /api/reviews
// ============================================================================

function strField(body: Record<string, unknown>, key: string): string {
  return typeof body[key] === 'string' ? (body[key] as string).trim() : '';
}

export async function POST(request: Request) {
  // Auth
  let userId: string;
  try {
    const user = await requireUser();
    userId = user.id;
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Parse
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  // Validate
  const fields: Record<string, string> = {};

  const course_id = strField(body, 'course_id');
  if (!course_id) fields.course_id = '课程 ID 不能为空';

  const professor_id = strField(body, 'professor_id') || undefined;
  const new_professor_name = strField(body, 'new_professor_name');
  if (!professor_id && !new_professor_name) {
    fields.professor = '请选择教授或填写新教授名';
  }

  const semester = strField(body, 'semester');
  if (!isValidSemester(semester)) fields.semester = '学期不合法';

  // site 可选（study-away 场景选具体 site）；不传由 DB 层默认 course.home_campus
  const site = strField(body, 'site');
  if (site && !isValidSite(site)) fields.site = '校区不合法';

  const content_zh = strField(body, 'content_zh');
  const content_en = strField(body, 'content_en');
  const contentErr = reviewContentMessage(
    reviewContentError(content_zh, content_en)
  );
  if (contentErr) fields.content = contentErr;

  if (Object.keys(fields).length > 0) {
    return NextResponse.json({ error: 'validation', fields }, { status: 400 });
  }

  // 速率限制：每人每小时最多 N 条
  try {
    if (
      await isOverHourlyLimit('reviews', 'user_id', userId, HOURLY_LIMITS.reviews)
    ) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }
  } catch (err) {
    console.error('POST /api/reviews rate-limit check error', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }

  // Create
  try {
    const result = await createReview(
      {
        course_id,
        professor_id,
        new_professor_name: new_professor_name || undefined,
        semester,
        site: site || undefined,
        content_zh: content_zh || undefined,
        content_en: content_en || undefined
      },
      userId
    );
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    // Postgres UNIQUE 约束 23505
    const e = err as { code?: string };
    if (e?.code === '23505') {
      return NextResponse.json(
        {
          error: 'duplicate',
          message: '已经为这个教授 + 学期的组合写过评价'
        },
        { status: 409 }
      );
    }
    if (err instanceof Error && err.message === 'course_not_found') {
      return NextResponse.json({ error: 'course_not_found' }, { status: 404 });
    }
    console.error('POST /api/reviews error', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
