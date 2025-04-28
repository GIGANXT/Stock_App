import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This middleware protects routes that require authentication
// and redirects unauthenticated users to the sign-in page.
export default function middleware(req: NextRequest) {
  // Check for any of the possible Clerk cookie names
  const hasClerkCookie = 
    req.cookies.has('__clerk_db_jwt') || 
    req.cookies.has('__session') || 
    req.cookies.has('__clerk_session');
  
  // Define protected routes
  const isProtectedRoute = 
    req.nextUrl.pathname.startsWith('/dashboard') || 
    req.nextUrl.pathname.startsWith('/onboarding') ||
    req.nextUrl.pathname.startsWith('/settings');
  
  // Redirect to login if accessing protected route without auth
  if (isProtectedRoute && !hasClerkCookie) {
    // Use the correct sign-in URL path
    const signInUrl = new URL('/auth/sign-in', req.url);
    // Add the redirect URL as a parameter to return after sign-in
    signInUrl.searchParams.set('redirect_url', req.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }
  
  return NextResponse.next();
}

// Configure which paths this middleware will run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones we want to exclude
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
  ],
};