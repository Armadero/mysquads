/**
 * Shared helpers for API route responses.
 *
 * These wrappers standardise error handling across every /api/* route
 * so we don't repeat the same `try/catch + z.ZodError + console.error`
 * boilerplate in dozens of files.
 */
import { NextResponse } from "next/server";
import { z } from "zod";

export function unauthorized(message = "Unauthorized") {
    return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Forbidden") {
    return NextResponse.json({ error: message }, { status: 403 });
}

export function badRequest(message: string, details?: unknown) {
    return NextResponse.json(
        details !== undefined ? { error: message, details } : { error: message },
        { status: 400 }
    );
}

export function notFound(message = "Not found") {
    return NextResponse.json({ error: message }, { status: 404 });
}

export function serverError(message = "Internal Server Error") {
    return NextResponse.json({ error: message }, { status: 500 });
}

/**
 * Standard error handler for API routes.
 *
 * - ZodError → 400 with issue list
 * - SyntaxError (invalid JSON) → 400
 * - Response (thrown from `requireSession` helpers) → pass through
 * - everything else → logged and 500
 */
export function handleApiError(routeTag: string, error: unknown): NextResponse {
    if (error instanceof z.ZodError) {
        return badRequest("Validation Error", error.issues);
    }
    if (error instanceof SyntaxError) {
        return badRequest("Invalid JSON body");
    }
    if (error instanceof Response) {
        // Pre-built response (e.g. from `requireSession`)
        return error as NextResponse;
    }
    console.error(`[${routeTag}]`, error);
    return serverError();
}
