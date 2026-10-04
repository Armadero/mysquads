import { NextResponse } from "next/server";
import { queryOne, execute, transaction } from "@/lib/db";
import { IdSchema } from "@/lib/schemas";
import { handleApiError, notFound } from "@/lib/api/responses";
import { requireCoordinator } from "@/lib/auth/guards";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string }> };

function assertSquadOwnership(squadId: string, coordinatorId: string) {
    const squad = queryOne<{ id: number }>(
        "SELECT id FROM Squad WHERE id = ? AND coordinatorId = ?",
        [squadId, coordinatorId]
    );
    return !!squad;
}

const ReplaceSchema = z.object({
    collaboratorIds: z.array(IdSchema).default([]),
});

const SingleSchema = z.object({
    collaboratorId: IdSchema,
});

// PUT: replace the full set of collaborators on a squad
export async function PUT(req: Request, { params }: RouteContext) {
    try {
        const session = await requireCoordinator();
        const { id } = await params;

        if (!assertSquadOwnership(id, session.sub))
            return notFound("Squad not found");

        const { collaboratorIds } = ReplaceSchema.parse(await req.json());

        transaction(() => {
            execute("DELETE FROM SquadCollaborator WHERE squadId = ?", [id]);
            for (const collabId of collaboratorIds) {
                execute(
                    "INSERT INTO SquadCollaborator (squadId, collaboratorId) VALUES (?, ?)",
                    [id, collabId]
                );
            }
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        return handleApiError("PUT /api/squads/:id/collaborators", err);
    }
}

// POST: add a single collaborator (no-op if already assigned)
export async function POST(req: Request, { params }: RouteContext) {
    try {
        const session = await requireCoordinator();
        const { id } = await params;

        if (!assertSquadOwnership(id, session.sub))
            return notFound("Squad not found");

        const { collaboratorId } = SingleSchema.parse(await req.json());

        execute(
            "INSERT OR IGNORE INTO SquadCollaborator (squadId, collaboratorId) VALUES (?, ?)",
            [id, collaboratorId]
        );

        return NextResponse.json({ success: true });
    } catch (err) {
        return handleApiError("POST /api/squads/:id/collaborators", err);
    }
}

// DELETE: remove a collaborator
export async function DELETE(req: Request, { params }: RouteContext) {
    try {
        const session = await requireCoordinator();
        const { id } = await params;

        if (!assertSquadOwnership(id, session.sub))
            return notFound("Squad not found");

        const { collaboratorId } = SingleSchema.parse(await req.json());

        execute(
            "DELETE FROM SquadCollaborator WHERE squadId = ? AND collaboratorId = ?",
            [id, collaboratorId]
        );

        return NextResponse.json({ success: true });
    } catch (err) {
        return handleApiError("DELETE /api/squads/:id/collaborators", err);
    }
}
