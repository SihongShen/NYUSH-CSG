import { NextResponse } from 'next/server';
import { createClient } from '@/lib/db/supabase';
import {
  buildEmail,
  isAllowedEmail,
  isValidNetId,
  isValidPassword
} from '@/lib/auth/validate';

export async function POST(request: Request) {
  let body: { netid?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const netid = (body.netid ?? '').trim();
  const password = body.password ?? '';

  if (!isValidNetId(netid)) {
    return NextResponse.json({ error: 'invalidNetid' }, { status: 400 });
  }
  if (!isValidPassword(password)) {
    return NextResponse.json({ error: 'passwordTooShort' }, { status: 400 });
  }

  const email = buildEmail(netid);
  if (!isAllowedEmail(email)) {
    return NextResponse.json({ error: 'emailNotAllowed' }, { status: 400 });
  }

  const supabase = await createClient();
  const origin = new URL(request.url).origin;
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/api/auth/callback` }
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
