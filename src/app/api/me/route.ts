import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/session';
import { createClient } from '@/lib/db/supabase';

// ============================================================================
// GET /api/me
//   返回当前用户的基本信息（含 anonymous_id），未登录返回 401
//   profile 页用：即使用户还没写过评价，也能渲染 AnonymousIdBadge
// ============================================================================

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('get_anonymous_id', {
      p_user_id: user.id
    });
    if (error) throw error;

    return NextResponse.json({
      id: user.id,
      email: user.email ?? null,
      anonymous_id: (data as string | null) ?? null
    });
  } catch (err) {
    console.error('GET /api/me error', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
