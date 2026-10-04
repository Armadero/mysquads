import { NextResponse } from "next/server";
import { queryOne, execute } from "@/lib/db";
import { CollaboratorSchema } from "@/lib/schemas";
import { updateCollaborator } from "@/lib/db/collaborators";
import { badRequest, handleApiError, notFound } from "@/lib/api/responses";
import { requireCoordinator } from "@/lib/auth/guards";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: RouteContext) {
    try {
        const session = await requireCoordinator();
        const { id } = await params;
        const parsed = CollaboratorSchema.parse(await req.json());

        if (parsed.matricula) {
            const dup = queryOne(
                `SELECT id FROM Collaborator WHERE matricula = ? AND id != ?`,
                [parsed.matricula, id]
            );
            if (dup) {
                return badRequest(
                    "Esta matrícula já está em uso por outro colaborador."
                );
            }
        }

        const { changes } = updateCollaborator(id, parsed, session.sub);
        if (changes === 0) return notFound("Collaborator not found");

        const collab = queryOne(`SELECT * FROM Collaborator WHERE id = ?`, [id]);
        return NextResponse.json(collab);
    } catch (err) {
        return handleApiError("PUT /api/collaborators/:id", err);
    }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
    try {
        const session = await requireCoordinator();
        const { id } = await params;

        const { changes } = execute(
            `DELETE FROM Collaborator WHERE id = ? AND coordinatorId = ?`,
            [id, session.sub]
        );
        if (changes === 0) return notFound("Collaborator not found");

        return NextResponse.json({ success: true });
    } catch (err) {
        return handleApiError("DELETE /api/collaborators/:id", err);
    }
}
