import { NextResponse } from 'next/server';
import {
  createCourse,
  DuplicateCourseCodeError,
  getCourses
} from '@/lib/db/courses';
import { requireUser } from '@/lib/auth/session';
import {
  isValidMajor,
  isValidMinor,
  isValidCoreType
} from '@/lib/constants/majors';
import type { CampusCode } from '@/types';

const ALLOWED_CAMPUSES: readonly CampusCode[] = ['SH', 'NY', 'AD'];

function isCampus(v: string): v is CampusCode {
  return (ALLOWED_CAMPUSES as readonly string[]).includes(v);
}

function parseIntSafe(v: string | null, fallback: number): number {
  if (!v) return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

function parseCSV(v: string | null): string[] {
  return v?.split(',').filter(Boolean) ?? [];
}

// ============================================================================
// GET — 课程列表 + 过滤 + 分页
// ============================================================================

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const campusRaw = searchParams.get('campus');
  const campus = campusRaw && isCampus(campusRaw) ? campusRaw : undefined;

  const q = searchParams.get('q')?.trim() || undefined;

  const majors = parseCSV(searchParams.get('major')).filter(isValidMajor);
  const minors = parseCSV(searchParams.get('minor')).filter(isValidMinor);
  const core_types = parseCSV(searchParams.get('core')).filter(isValidCoreType);
  const only_general_elective = searchParams.get('ge') === '1';

  const limit = parseIntSafe(searchParams.get('limit'), 20);
  const offset = parseIntSafe(searchParams.get('offset'), 0);

  try {
    const data = await getCourses({
      campus,
      q,
      majors: majors.length ? majors : undefined,
      minors: minors.length ? minors : undefined,
      core_types: core_types.length ? core_types : undefined,
      only_general_elective,
      limit,
      offset
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error('GET /api/courses error', error);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}

// ============================================================================
// POST — 添加课程
// ============================================================================

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((s): s is string => typeof s === 'string')
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function POST(request: Request) {
  // 1. Auth
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // 2. Parse body
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  // 3. Validate
  const fields: Record<string, string> = {};

  const code = typeof body.code === 'string' ? body.code.trim() : '';
  if (!code) fields.code = '课程编号不能为空';

  const name_en = typeof body.name_en === 'string' ? body.name_en.trim() : '';
  if (name_en.length < 3) fields.name_en = '课程名至少 3 个字符';

  const home_campus =
    typeof body.home_campus === 'string' && isCampus(body.home_campus)
      ? body.home_campus
      : undefined;
  if (!home_campus) fields.home_campus = '校区不合法';

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
    fields.classification = '至少需要选择一个分类（含 General Elective）';
  }

  const lecture_professors = asStringArray(body.lecture_professors);
  const recitation_tas = asStringArray(body.recitation_tas);
  if (lecture_professors.length === 0) {
    fields.lecture_professors = '至少需要 1 个 Lecture 教授';
  }

  if (Object.keys(fields).length > 0) {
    return NextResponse.json({ error: 'validation', fields }, { status: 400 });
  }

  // 4. Create
  try {
    const result = await createCourse({
      code,
      name_en,
      home_campus: home_campus!,
      major_required,
      major_elective,
      minor,
      core_type,
      is_general_elective,
      lecture_professors,
      recitation_tas
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof DuplicateCourseCodeError) {
      return NextResponse.json(
        { error: 'duplicate_code', existing_id: err.existingId },
        { status: 409 }
      );
    }
    console.error('POST /api/courses error', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
