import { NextResponse, type NextRequest } from 'next/server';

import { auth0 } from '@/lib/auth0';

/**
 * Middleware to handle authentication using Auth0
 */
export async function middleware(request: NextRequest) {
  const authRes = await auth0.middleware(request);

  // authentication routes, let the middleware handle it
  if (request.nextUrl.pathname.startsWith('/auth')) {
    return authRes;
  }

  const { origin } = new URL(request.url);
  const session = await auth0.getSession(request);

  // user does not have a session
  if (!session) {
    // For API routes, return JSON instead of redirect so clients can handle 401
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // For pages, redirect to login (use 303 to switch to GET)
    return NextResponse.redirect(new URL('/auth/login', origin), 303);
  }

  return authRes;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!_next/static|_next/image|images|favicon.[ico|png]|sitemap.xml|robots.txt|$).*)',
  ],
};
