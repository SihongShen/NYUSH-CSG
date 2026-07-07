import { NextResponse } from 'next/server';
import { setReviewVote } from '@/lib/db/reviews';
import { requireUser } from '@/lib/auth/session';

/**
 * POST /api/reviews/[id]/vote
 * Body: { vote: 1 | -1 | 0 }   （1 赞 / -1 踩 / 0 撤票）
 * 不能给自己的评价投票。
 */
export async function POST(
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

  let body: { vote?: unknown };
  try {
    body = (await request.json()) as { vote?: unknown };
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const vote = body.vote;
  if (vote !== 1 && vote !== -1 && vote !== 0) {
    return NextResponse.json(
      { error: 'validation', fields: { vote: 'vote 必须是 1 / -1 / 0' } },
      { status: 400 }
    );
  }

  try {
    await setReviewVote(id, userId, vote);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === 'review_not_found') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    if (err instanceof Error && err.message === 'cannot_vote_own') {
      return NextResponse.json({ error: 'cannot_vote_own' }, { status: 403 });
    }
    console.error('POST /api/reviews/[id]/vote error', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
