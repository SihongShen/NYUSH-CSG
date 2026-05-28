import { NextResponse } from 'next/server';
import { getCourse } from '@/lib/db/courses';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  try {
    const course = await getCourse(id);
    if (!course) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json(course);
  } catch (err) {
    console.error('GET /api/courses/[id] error', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
