import { NextResponse } from "next/server";
import { queryOne, execute } from "@/lib/db";
import { AddGiftSchema, IdSchema } from "@/lib/schemas";
import { handleApiError, notFound } from "@/lib/api/responses";
import { requireCoordinator } from "@/lib/auth/guards";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string }> };

function assertCampaignOwnership(campaignId: string, coordinatorId: string) {
    const campaign = queryOne<{ id: number }>(
        "SELECT id FROM GiftCampaign WHERE id = ? AND coordinatorId = ?",
        [campaignId, coordinatorId]
    );
    return !!campaign;
}

// POST: add gift to campaign
export async function POST(req: Request, { params }: RouteContext) {
    try {
        const session = await requireCoordinator();
        const { id } = await params;

        if (!assertCampaignOwnership(id, session.sub))
            return notFound("Campaign not found");

        const parsed = AddGiftSchema.parse(await req.json());

        execute(
            "INSERT OR IGNORE INTO GiftCampaignGift (campaignId, giftId) VALUES (?, ?)",
            [id, parsed.giftId]
        );

        return NextResponse.json({ success: true }, { status: 201 });
    } catch (err) {
        return handleApiError("POST /api/gift-campaigns/:id/gifts", err);
    }
}

// DELETE: remove gift from campaign
export async function DELETE(req: Request, { params }: RouteContext) {
    try {
        const session = await requireCoordinator();
        const { id } = await params;

        if (!assertCampaignOwnership(id, session.sub))
            return notFound("Campaign not found");

        const { giftId } = z
            .object({ giftId: IdSchema })
            .parse(await req.json());

        execute(
            "DELETE FROM GiftCampaignGift WHERE campaignId = ? AND giftId = ?",
            [id, giftId]
        );
        return NextResponse.json({ success: true });
    } catch (err) {
        return handleApiError("DELETE /api/gift-campaigns/:id/gifts", err);
    }
}
