import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        const isAuth = !!req.nextauth.token;
        const isAuthPage = req.nextUrl.pathname.startsWith('/login') || req.nextUrl.pathname.startsWith('/register');
        const isApiAuth = req.nextUrl.pathname.startsWith('/api/auth') || req.nextUrl.pathname.startsWith('/api/register');

        if (isApiAuth) return NextResponse.next();

        if (isAuthPage) {
            if (isAuth) {
                return NextResponse.redirect(new URL('/dashboard', req.url));
            }
            return null;
        }

        if (!isAuth) {
            return NextResponse.redirect(new URL('/login', req.url));
        }
    },
    {
        callbacks: {
            authorized: () => true // Let the middleware function handle the logic
        },
    }
);

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
