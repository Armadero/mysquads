import { NextResponse } from "next/server";
import { queryOne, execute } from "@/lib/db";
import { SquadSchema } from "@/lib/schemas";
import { handleApiError, notFound } from "@/lib/api/responses";
import { requireCoordinator } from "@/lib/auth/guards";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: RouteContext) {
    try {
        const session = await requireCoordinator();
        const { id } = await params;
        const parsed = SquadSchema.parse(await req.json());

        const { changes } = execute(
            `UPDATE Squad
             SET name = ?, jiraLink = ?, confluenceLink = ?, sprintStart = ?, sprintDays = ?
             WHERE id = ? AND coordinatorId = ?`,
            [
                parsed.name,
                parsed.jiraLink || null,
                parsed.confluenceLink || null,
                parsed.sprintStart ? new Date(parsed.sprintStart).toISOString() : null,
                parsed.sprintDays,
                id,
                session.sub,
            ]
        );
        if (changes === 0) return notFound("Squad not found");

        const squad = queryOne(
            "SELECT * FROM Squad WHERE id = ? AND coordinatorId = ?",
            [id, session.sub]
        );
        return NextResponse.json(squad);
    } catch (err) {
        return handleApiError("PUT /api/squads/:id", err);
    }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
    try {
        const session = await requireCoordinator();
        const { id } = await params;

        // SQLite CASCADE handles deleting SquadCollaborator rows
        const { changes } = execute(
            "DELETE FROM Squad WHERE id = ? AND coordinatorId = ?",
            [id, session.sub]
        );
        if (changes === 0) return notFound("Squad not found");

        return NextResponse.json({ success: true });
    } catch (err) {
        return handleApiError("DELETE /api/squads/:id", err);
    }
}
