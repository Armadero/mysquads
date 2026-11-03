import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, handleApiError, notFound } from "@/lib/api/responses";
import { requireCoordinator } from "@/lib/auth/guards";
import {
    TransferError,
    resolveTargetCoordinator,
    transferSquad,
} from "@/lib/db/transfer";

type RouteContext = { params: Promise<{ id: string }> };

const TransferSchema = z.object({ targetEmail: z.string().trim().min(1).max(254) });

// POST: transfere o squad e seus colaboradores para outro coordenador
export async function POST(req: Request, { params }: RouteContext) {
    try {
        const session = await requireCoordinator();
        const { id } = await params;
        const { targetEmail } = TransferSchema.parse(await req.json());

        const target = resolveTargetCoordinator(targetEmail, session.sub);
        const moved = transferSquad(id, session.sub, target);
        if (moved === null) return notFound("Squad not found");

        return NextResponse.json({ success: true, collaboratorsMoved: moved });
    } catch (err) {
        if (err instanceof TransferError) return badRequest(err.message);
        return handleApiError("POST /api/squads/:id/transfer", err);
    }
}
