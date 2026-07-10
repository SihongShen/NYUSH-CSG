import { NextResponse } from 'next/server';
import { getCourse, updateCourseClassification } from '@/lib/db/courses';
import { listReviewsForCourseIds } from '@/lib/db/reviews';
import { getUser, requireUser } from '@/lib/auth/session';
import {
  isValidMajor,
  isValidMinor,
  isValidCoreType
} from '@/lib/constants/majors';

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

/**
 * PATCH /api/courses/[id] — 编辑课程分类（major / minor / core / GE）。
 * 社区共同维护：任何登录用户可改，与"登录用户可建课"同一信任级别；
 * 其余字段（课号 / 课名等）不接受，DB 列级权限双重兜底。
 */

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((s): s is string => typeof s === 'string')
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const major_required = asStringArray(body.major_required).filter(isValidMajor);
  const major_elective = asStringArray(body.major_elective).filter(isValidMajor);
  const minor = asStringArray(body.minor).filter(isValidMinor);
  const core_type = asStringArray(body.core_type).filter(isValidCoreType);
  const is_general_elective = body.is_general_elective === true;

  const hasClassification =
    major_required.length > 0 ||
    major_elective.length > 0 ||
    minor.length > 0 ||
    core_type.length > 0 ||
    is_general_elective;
  if (!hasClassification) {
    return NextResponse.json(
      {
        error: 'validation',
        fields: { classification: '至少需要选择一个分类（含 General Elective）' }
      },
      { status: 400 }
    );
  }

  try {
    const found = await updateCourseClassification(id, {
      major_required,
      major_elective,
      minor,
      core_type,
      is_general_elective
    });
    if (!found) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PATCH /api/courses/[id] error', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
