import { NextResponse } from "next/server";
import { queryOne, execute } from "@/lib/db";
import { RoleSchema } from "@/lib/schemas";
import { badRequest, handleApiError, notFound } from "@/lib/api/responses";
import { requireCoordinator } from "@/lib/auth/guards";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: RouteContext) {
    try {
        const session = await requireCoordinator();
        const { id } = await params;
        const parsed = RoleSchema.parse(await req.json());

        const { changes } = execute(
            `UPDATE Role
             SET name = ?, defaultColor = ?, qtyPerSquad = ?, maxSquads = ?,
                 multipleSquads = ?, "order" = ?
             WHERE id = ? AND coordinatorId = ?`,
            [
                parsed.name,
                parsed.defaultColor ?? null,
                parsed.qtyPerSquad,
                parsed.maxSquads,
                parsed.multipleSquads ? 1 : 0,
                parsed.order,
                id,
                session.sub,
            ]
        );
        if (changes === 0) return notFound("Role not found");

        const role = queryOne(
            "SELECT * FROM Role WHERE id = ? AND coordinatorId = ?",
            [id, session.sub]
        );
        return NextResponse.json(role);
    } catch (err) {
        return handleApiError("PUT /api/roles/:id", err);
    }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
    try {
        const session = await requireCoordinator();
        const { id } = await params;

        // Collaborator.roleId é ON DELETE RESTRICT: apagar um cargo em uso
        // estourava a FK e devolvia um 500 genérico. Checamos antes para
        // devolver uma mensagem que o coordenador consegue agir sobre.
        const inUse = queryOne<{ total: number }>(
            "SELECT COUNT(*) as total FROM Collaborator WHERE roleId = ?",
            [id]
        );
        if (inUse && inUse.total > 0) {
            return badRequest(
                `Este cargo está vinculado a ${inUse.total} colaborador(es). ` +
                    "Altere o cargo dessas pessoas antes de removê-lo."
            );
        }

        const { changes } = execute(
            "DELETE FROM Role WHERE id = ? AND coordinatorId = ?",
            [id, session.sub]
        );
        if (changes === 0) return notFound("Role not found");

        return NextResponse.json({ success: true });
    } catch (err) {
        return handleApiError("DELETE /api/roles/:id", err);
    }
}
