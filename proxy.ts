import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

// Paths that never need an auth check — passed straight through.
// /login is intentionally NOT here so logged-in users get redirected away.
function isAlwaysPublic(pathname: string) {
  return (
    pathname === '/' ||
    pathname === '/register' ||          // self-registration — no auth required
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico'
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 1. Static / truly public paths — no Supabase call ─────────────────────
  if (isAlwaysPublic(pathname)) {
    return NextResponse.next({ request });
  }

  // ── 2. Build proxy Supabase client (cookies threaded manually) ────────────
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // ── 3. Verify session (also refreshes an expired JWT) ─────────────────────
  let user: { id: string } | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Supabase unreachable — fail open so the page can handle it
    return NextResponse.next({ request });
  }

  // ── 4. Unauthenticated user on a protected route → /login ─────────────────
  if (!user) {
    if (pathname === '/login') {
      return response;
    }
    const dest = request.nextUrl.clone();
    dest.pathname = '/login';
    return NextResponse.redirect(dest);
  }

  // ── 5. Fetch role + password-change flag (only for authenticated requests) ──
  let role: string | undefined;
  let mustChangePassword = false;
  try {
    const { data: profile } = await supabase
      .from('users')
      .select('role, must_change_password')
      .eq('id', user.id)
      .single();
    role = profile?.role;
    mustChangePassword = profile?.must_change_password ?? false;
  } catch {
    // DB unreachable — fail open
    return response;
  }

  // ── 6. Logged-in user hitting /login → redirect to their dashboard ─────────
  if (pathname === '/login') {
    const dest = request.nextUrl.clone();
    dest.pathname = role === 'admin' ? '/admin/dashboard' : '/agent/certificates';
    return NextResponse.redirect(dest);
  }

  // ── 7. Cross-role enforcement ─────────────────────────────────────────────
  if (pathname.startsWith('/admin') && role !== 'admin') {
    const dest = request.nextUrl.clone();
    dest.pathname = '/agent/certificates';
    return NextResponse.redirect(dest);
  }

  if (pathname.startsWith('/agent') && role !== 'dealer') {
    const dest = request.nextUrl.clone();
    dest.pathname = '/admin/dashboard';
    return NextResponse.redirect(dest);
  }

  // ── 8. Dealers with must_change_password must set a new password first ────
  if (role === 'dealer' && mustChangePassword && pathname !== '/change-password') {
    const dest = request.nextUrl.clone();
    dest.pathname = '/change-password';
    return NextResponse.redirect(dest);
  }

  // ── 9. All checks passed ───────────────────────────────────────────────────
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
