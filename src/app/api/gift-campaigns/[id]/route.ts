import { NextResponse } from "next/server";
import { queryOne, execute } from "@/lib/db";
import { CampaignSchema } from "@/lib/schemas";
import { handleApiError, notFound } from "@/lib/api/responses";
import { requireCoordinator } from "@/lib/auth/guards";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: RouteContext) {
    try {
        const session = await requireCoordinator();
        const { id } = await params;
        const parsed = CampaignSchema.parse(await req.json());

        const { changes } = execute(
            `UPDATE GiftCampaign
             SET name = ?, description = ?, updated_at = datetime('now')
             WHERE id = ? AND coordinatorId = ?`,
            [parsed.name, parsed.description ?? null, id, session.sub]
        );
        if (changes === 0) return notFound("Campaign not found");

        const campaign = queryOne(
            "SELECT * FROM GiftCampaign WHERE id = ? AND coordinatorId = ?",
            [id, session.sub]
        );
        return NextResponse.json(campaign);
    } catch (err) {
        return handleApiError("PUT /api/gift-campaigns/:id", err);
    }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
    try {
        const session = await requireCoordinator();
        const { id } = await params;

        const { changes } = execute(
            "DELETE FROM GiftCampaign WHERE id = ? AND coordinatorId = ?",
            [id, session.sub]
        );
        if (changes === 0) return notFound("Campaign not found");

        return NextResponse.json({ success: true });
    } catch (err) {
        return handleApiError("DELETE /api/gift-campaigns/:id", err);
    }
}
