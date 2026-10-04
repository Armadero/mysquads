import { NextResponse } from "next/server";
import { execute, transaction } from "@/lib/db";
import { EventSchema } from "@/lib/schemas";
import { handleApiError, notFound } from "@/lib/api/responses";
import { requireCoordinator } from "@/lib/auth/guards";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: RouteContext) {
    try {
        const session = await requireCoordinator();
        const { id } = await params;
        const parsed = EventSchema.parse(await req.json());

        let changes = 0;

        transaction(() => {
            const result = execute(
                `UPDATE IntegrationEvent
                 SET startDate = ?, endDate = ?, updated_at = datetime('now')
                 WHERE id = ? AND coordinatorId = ?`,
                [
                    new Date(parsed.startDate).toISOString(),
                    new Date(parsed.endDate).toISOString(),
                    id,
                    session.sub,
                ]
            );
            changes = result.changes;
            if (changes === 0) return;

            execute(
                "DELETE FROM IntegrationEventCollaborator WHERE eventId = ?",
                [id]
            );
            for (const collabId of parsed.collaboratorIds) {
                execute(
                    `INSERT INTO IntegrationEventCollaborator (eventId, collaboratorId)
                     VALUES (?, ?)`,
                    [id, collabId]
                );
            }
        });

        if (changes === 0) return notFound("Event not found");
        return NextResponse.json({ success: true });
    } catch (err) {
        return handleApiError("PUT /api/events/:id", err);
    }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
    try {
        const session = await requireCoordinator();
        const { id } = await params;

        const { changes } = execute(
            "DELETE FROM IntegrationEvent WHERE id = ? AND coordinatorId = ?",
            [id, session.sub]
        );
        if (changes === 0) return notFound("Event not found");

        return NextResponse.json({ success: true });
    } catch (err) {
        return handleApiError("DELETE /api/events/:id", err);
    }
}
