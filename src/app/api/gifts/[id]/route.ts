import { NextResponse } from "next/server";
import { queryOne, execute } from "@/lib/db";
import { GiftSchema } from "@/lib/schemas";
import { handleApiError, notFound } from "@/lib/api/responses";
import { requireCoordinator } from "@/lib/auth/guards";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: RouteContext) {
    try {
        const session = await requireCoordinator();
        const { id } = await params;
        const parsed = GiftSchema.parse(await req.json());

        const { changes } = execute(
            `UPDATE Gift
             SET name = ?, description = ?, updated_at = datetime('now')
             WHERE id = ? AND coordinatorId = ?`,
            [parsed.name, parsed.description ?? null, id, session.sub]
        );
        if (changes === 0) return notFound("Gift not found");

        const gift = queryOne(
            "SELECT * FROM Gift WHERE id = ? AND coordinatorId = ?",
            [id, session.sub]
        );
        return NextResponse.json(gift);
    } catch (err) {
        return handleApiError("PUT /api/gifts/:id", err);
    }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
    try {
        const session = await requireCoordinator();
        const { id } = await params;

        const { changes } = execute(
            "DELETE FROM Gift WHERE id = ? AND coordinatorId = ?",
            [id, session.sub]
        );
        if (changes === 0) return notFound("Gift not found");

        return NextResponse.json({ success: true });
    } catch (err) {
        return handleApiError("DELETE /api/gifts/:id", err);
    }
}
