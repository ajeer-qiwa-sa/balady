export default function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  const protectedRoutes = [
    '/dashboard',
    '/add-certificate',
    '/edit-certificate',
    '/certificate',
    '/certificates'
  ];

  const isProtected = protectedRoutes.some(p => pathname === p || pathname.startsWith(p + '/'));

  if (isProtected) {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return Response.redirect(new URL('/', request.url), 302);
    }
  }
}

export const config = {
  matcher: [
    '/dashboard',
    '/dashboard/:path*',
    '/add-certificate',
    '/add-certificate/:path*',
    '/edit-certificate/:path*',
    '/certificate/:path*',
    '/certificates',
    '/certificates/:path*',
  ],
};
