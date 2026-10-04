import { NextResponse } from "next/server";
import { queryOne, execute } from "@/lib/db";
import { FeedbackSchema } from "@/lib/schemas";
import { handleApiError, notFound } from "@/lib/api/responses";
import { requireCoordinator } from "@/lib/auth/guards";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: RouteContext) {
    try {
        const session = await requireCoordinator();
        const { id } = await params;
        const parsed = FeedbackSchema.parse(await req.json());

        const { changes } = execute(
            `UPDATE Feedback
             SET date = ?, content = ?, tag = ?, type = ?, origin = ?, collaboratorId = ?,
                 updated_at = datetime('now')
             WHERE id = ? AND coordinatorId = ?`,
            [
                new Date(parsed.date).toISOString(),
                parsed.content,
                parsed.tag ?? null,
                parsed.type,
                parsed.origin,
                parsed.collaboratorId,
                id,
                session.sub,
            ]
        );
        if (changes === 0) return notFound("Feedback not found");

        const feedback = queryOne(
            "SELECT * FROM Feedback WHERE id = ? AND coordinatorId = ?",
            [id, session.sub]
        );
        return NextResponse.json(feedback);
    } catch (err) {
        return handleApiError("PUT /api/feedback/:id", err);
    }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
    try {
        const session = await requireCoordinator();
        const { id } = await params;

        const { changes } = execute(
            "DELETE FROM Feedback WHERE id = ? AND coordinatorId = ?",
            [id, session.sub]
        );
        if (changes === 0) return notFound("Feedback not found");

        return NextResponse.json({ success: true });
    } catch (err) {
        return handleApiError("DELETE /api/feedback/:id", err);
    }
}
