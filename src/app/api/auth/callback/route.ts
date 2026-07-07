import { NextResponse } from 'next/server';
import { createClient } from '@/lib/db/supabase';
import { isAllowedEmail } from '@/lib/auth/validate';

/**
 * OAuth 回调：Google → Supabase → 这里。
 *
 * 失败一律跳回 /login 并带 error 参数（LoginForm 负责翻译显示）：
 *   ?error=auth    授权失败 / 用户取消 / hook 拒绝 / code 交换失败
 *   ?error=domain  非 @nyu.edu 账号（应用层双保险，正常被 hook 挡在前面）
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  // Supabase 侧失败（用户取消授权、hook 拒绝等）不会带 code，只带 error 参数
  if (!code) {
    return NextResponse.redirect(new URL('/login?error=auth', url.origin));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('auth callback: exchangeCodeForSession failed', error);
    return NextResponse.redirect(new URL('/login?error=auth', url.origin));
  }

  // 双保险：hd 参数和 before_user_created hook 之外，应用层再校验一次域名
  const email = data.user?.email ?? '';
  if (!isAllowedEmail(email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/login?error=domain', url.origin));
  }

  return NextResponse.redirect(new URL('/', url.origin));
}
