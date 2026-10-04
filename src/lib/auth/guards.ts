/**
 * Route-level auth guards.
 *
 * These helpers replace the `if (!session || session.type !== "COORDINATOR") return 401`
 * boilerplate that was copy-pasted across every /api/* route.
 *
 * Each helper throws a NextResponse (401) when the requirement isn't met,
 * letting callers pair them with `handleApiError` to keep route bodies
 * declarative.
 */
import { NextResponse } from "next/server";
import { getSession, SessionPayload } from "@/lib/auth/session";
import { queryAll } from "@/lib/db";

function throwUnauthorized(): never {
    throw NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/** Require any authenticated user. */
export async function requireUser(): Promise<SessionPayload> {
    const session = await getSession();
    if (!session) throwUnauthorized();
    return session;
}

/** Require a COORDINATOR. */
export async function requireCoordinator(): Promise<SessionPayload> {
    const session = await requireUser();
    if (session.type !== "COORDINATOR") throwUnauthorized();
    return session;
}

/** Require a MANAGER. */
export async function requireManager(): Promise<SessionPayload> {
    const session = await requireUser();
    if (session.type !== "MANAGER") throwUnauthorized();
    return session;
}

/**
 * Resolve the set of coordinator IDs a given session can read from.
 *
 * - COORDINATOR → themselves
 * - MANAGER     → every coordinator they've been approved to see
 *
 * Returns an empty array if the manager has no approved links yet.
 */
export function resolveReadableCoordinatorIds(
    session: SessionPayload
): string[] {
    if (session.type === "COORDINATOR") return [String(session.sub)];

    const links = queryAll<{ coordinatorId: number | string }>(
        `SELECT DISTINCT coordinatorId FROM ManagerCoordinatorLink
         WHERE managerId = ? AND status = 'APPROVED'`,
        [session.sub]
    );
    return links.map((l) => String(l.coordinatorId));
}
