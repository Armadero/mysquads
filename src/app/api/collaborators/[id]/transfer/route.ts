import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, handleApiError, notFound } from "@/lib/api/responses";
import { requireCoordinator } from "@/lib/auth/guards";
import {
    TransferError,
    resolveTargetCoordinator,
    transferCollaborator,
} from "@/lib/db/transfer";

type RouteContext = { params: Promise<{ id: string }> };

const TransferSchema = z.object({ targetEmail: z.string().trim().min(1).max(254) });

// POST: transfere um colaborador para outro coordenador
export async function POST(req: Request, { params }: RouteContext) {
    try {
        const session = await requireCoordinator();
        const { id } = await params;
        const { targetEmail } = TransferSchema.parse(await req.json());

        const target = resolveTargetCoordinator(targetEmail, session.sub);
        if (!transferCollaborator(id, session.sub, target))
            return notFound("Collaborator not found");

        return NextResponse.json({ success: true });
    } catch (err) {
        if (err instanceof TransferError) return badRequest(err.message);
        return handleApiError("POST /api/collaborators/:id/transfer", err);
    }
}
