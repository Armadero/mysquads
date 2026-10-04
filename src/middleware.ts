import { type NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";

// Public routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/register", "/"];
const AUTH_ROUTES = ["/login", "/register"];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip API routes (they handle their own auth)
    if (pathname.startsWith("/api/")) {
        return NextResponse.next();
    }

    const session = await getSessionFromRequest(request);

    // If authenticated user visits login/register → redirect to dashboard
    if (session && AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // If unauthenticated user visits a protected route → redirect to login
    if (!session && !PUBLIC_ROUTES.includes(pathname)) {
        const loginUrl = new URL("/login", request.url);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static, _next/image (Next.js internals)
         * - favicon.ico and static assets
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
