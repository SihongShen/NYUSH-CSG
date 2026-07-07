import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { createServerClient } from '@supabase/ssr';
import { routing } from '../i18n';

const intlMiddleware = createIntlMiddleware(routing);

const PUBLIC_PATH_PREFIXES = ['/login', '/register', '/reset-password'];

function stripLocalePrefix(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}`) return '/';
    if (pathname.startsWith(`/${locale}/`)) return pathname.slice(locale.length + 1);
  }
  return pathname;
}

function isPublicPath(pathname: string): boolean {
  const stripped = stripLocalePrefix(pathname);
  return PUBLIC_PATH_PREFIXES.some(
    p => stripped === p || stripped.startsWith(`${p}/`)
  );
}

export async function middleware(request: NextRequest) {
  const intlResponse = intlMiddleware(request);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return intlResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          intlResponse.cookies.set(name, value, options)
        );
      }
    }
  });
  let user = null;
  let authReachable = true;
  try {
    const { data, error } = await supabase.auth.getUser();
    user = data.user;
    // 5xx / 无 status = 网络或服务端不可达；4xx (JWT expired 等) 才是真"未登录"
    if (error && (!error.status || error.status >= 500)) {
      authReachable = false;
    }
  } catch {
    authReachable = false;
  }

  // auth 不可达时放行 —— 让下游 hook 自己报错，避免把 DB 故障误判成"用户被登出"
  if (authReachable && !user && !isPublicPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    const locale = routing.locales.find(
      (l) =>
        request.nextUrl.pathname === `/${l}` ||
        request.nextUrl.pathname.startsWith(`/${l}/`)
    );
    url.pathname = locale ? `/${locale}/login` : '/login';
    return NextResponse.redirect(url);
  }

  return intlResponse;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
