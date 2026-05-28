import { NextResponse } from 'next/server';
import { getCourses } from '@/lib/db/courses';
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const campusRaw = searchParams.get('campus');
  const campus = campusRaw && isCampus(campusRaw) ? campusRaw : undefined;

  const q = searchParams.get('q')?.trim() || undefined;

  // app 层校验：只接受合法 major / minor / core 值
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
