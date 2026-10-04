import { NextResponse } from "next/server";
import { queryAll } from "@/lib/db";
import { handleApiError } from "@/lib/api/responses";
import { requireManager } from "@/lib/auth/guards";

/**
 * GET /api/coordinators?q=...
 *
 * Lists coordinators a MANAGER can request a link to.
 * Only MANAGERs may call this endpoint; COORDINATORS cannot enumerate peers.
 */
export async function GET(req: Request) {
    try {
        await requireManager();

        const { searchParams } = new URL(req.url);
        const search = (searchParams.get("q") || "").trim();

        const coordinators = search
            ? queryAll(
                  `SELECT id, name, email FROM User
                   WHERE type = 'COORDINATOR' AND (name LIKE ? OR email LIKE ?)
                   ORDER BY name ASC`,
                  [`%${search}%`, `%${search}%`]
              )
            : queryAll(
                  `SELECT id, name, email FROM User WHERE type = 'COORDINATOR'
                   ORDER BY name ASC`
              );

        return NextResponse.json(coordinators);
    } catch (err) {
        return handleApiError("GET /api/coordinators", err);
    }
}
