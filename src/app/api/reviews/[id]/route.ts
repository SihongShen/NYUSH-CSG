import { NextResponse } from 'next/server';
import {
  restoreReview,
  softDeleteReview,
  updateReview
} from '@/lib/db/reviews';
import { requireUser } from '@/lib/auth/session';

/**
 * PATCH /api/reviews/[id]
 *
 * 根据 body 内容分发三种操作（互斥）：
 *   { is_visible: false } → 软删
 *   { is_visible: true }  → 恢复
 *   { content_zh, content_en } → 改内容
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let userId: string;
  try {
    const user = await requireUser();
    userId = user.id;
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  // 1. 软删 / 恢复
  if (typeof body.is_visible === 'boolean') {
    try {
      if (body.is_visible) {
        await restoreReview(id, userId);
      } else {
        await softDeleteReview(id, userId);
      }
      return NextResponse.json({ ok: true });
    } catch (err) {
      if (err instanceof Error && err.message === 'review_not_found') {
        return NextResponse.json({ error: 'not_found' }, { status: 404 });
      }
      console.error('PATCH /api/reviews/[id] visibility error', err);
      return NextResponse.json({ error: 'internal' }, { status: 500 });
    }
  }

  // 2. 改内容
  const content_zh =
    typeof body.content_zh === 'string' ? body.content_zh.trim() : '';
  const content_en =
    typeof body.content_en === 'string' ? body.content_en.trim() : '';

  if (!content_zh && !content_en) {
    return NextResponse.json(
      {
        error: 'validation',
        fields: { content: '中文和英文评价至少填一个' }
      },
      { status: 400 }
    );
  }

  try {
    await updateReview(
      id,
      {
        content_zh: content_zh || undefined,
        content_en: content_en || undefined
      },
      userId
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === 'review_not_found') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    console.error('PATCH /api/reviews/[id] update error', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
