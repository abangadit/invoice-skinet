import { NextRequest, NextResponse } from 'next/server';
import { createWebMiddlewareClient } from './lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createWebMiddlewareClient(request, response);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const path = url.pathname;

  // Public paths (tidak perlu auth)
  const isLoginPage = path.startsWith('/login');
  const isForgotPassword = path.startsWith('/forgot-password');
  const isResetPassword = path.startsWith('/reset-password');
  const isAuthCallback = path.startsWith('/auth/callback');
  const isPublicInvoice = path.startsWith('/inv/');
  const isTermsPage = path.startsWith('/terms');
  const isExpiredPage = path.startsWith('/expired');
  const isSuspendedPage = path.startsWith('/suspended');
  const isRegisterPage = path.startsWith('/register');
  const isStaticAsset =
    path.startsWith('/_next') ||
    path.includes('.') ||
    path.startsWith('/api/');

  const isPublicPage = isLoginPage || isForgotPassword || isResetPassword ||
    isAuthCallback || isPublicInvoice || isTermsPage ||
    isExpiredPage || isSuspendedPage || isStaticAsset;

  // /register -> redirect ke /login (self-register dinonaktifkan)
  if (isRegisterPage) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Public pages - lewatkan
  if (isPublicPage) {
    return response;
  }

  // Belum login -> redirect ke /login
  if (!user) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Sudah login + buka /login -> redirect ke /
  if (user && isLoginPage) {
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // Cek status akun dari public.users
  const { data: userProfile } = await supabase
    .from('users')
    .select('role, is_active, expires_at')
    .eq('id', user.id)
    .single();

  if (userProfile) {
    // Akun dinonaktifkan
    if (userProfile.is_active === false) {
      url.pathname = '/suspended';
      return NextResponse.redirect(url);
    }

    // Masa aktif habis (hanya untuk selain superadmin)
    if (
      userProfile.role !== 'superadmin' &&
      userProfile.expires_at &&
      new Date(userProfile.expires_at) < new Date()
    ) {
      url.pathname = '/expired';
      return NextResponse.redirect(url);
    }

    // Route /admin hanya untuk superadmin
    if (path.startsWith('/admin') && userProfile.role !== 'superadmin') {
      url.pathname = '/';
      return NextResponse.redirect(url);
    }

    // Redirect /admin persis ke /admin/dashboard
    if (path === '/admin') {
      url.pathname = '/admin/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
