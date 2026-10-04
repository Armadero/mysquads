import { NextResponse } from "next/server";
import { queryAll, queryOne, execute, transaction } from "@/lib/db";
import { AddCollaboratorSchema, MarkSentSchema, IdSchema } from "@/lib/schemas";
import { handleApiError, notFound } from "@/lib/api/responses";
import { requireCoordinator } from "@/lib/auth/guards";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string }> };

interface CollaboratorRow {
    role: string | null;
    [key: string]: unknown;
}

function assertCampaignOwnership(campaignId: string, coordinatorId: string) {
    const campaign = queryOne<{ id: number }>(
        "SELECT id FROM GiftCampaign WHERE id = ? AND coordinatorId = ?",
        [campaignId, coordinatorId]
    );
    return !!campaign;
}

// GET: list collaborators in a campaign
export async function GET(_req: Request, { params }: RouteContext) {
    try {
        const session = await requireCoordinator();
        const { id } = await params;

        if (!assertCampaignOwnership(id, session.sub))
            return notFound("Campaign not found");

        const collaborators = queryAll<CollaboratorRow>(
            `SELECT col.id, col.name, col.cpf,
                    col.cep_entrega, col.logradouro_entrega, col.numero_entrega,
                    col.complemento_entrega, col.bairro_entrega, col.cidade_entrega, col.estado_entrega,
                    col.photoUrl,
                    gcc.sent, gcc.sentAt,
                    CASE WHEN r.id IS NOT NULL
                         THEN json_object('id', r.id, 'name', r.name, 'defaultColor', r.defaultColor)
                         ELSE NULL
                    END as role
             FROM GiftCampaignCollaborator gcc
             JOIN Collaborator col ON gcc.collaboratorId = col.id
             LEFT JOIN Role r ON col.roleId = r.id
             WHERE gcc.campaignId = ?
             ORDER BY col.name ASC`,
            [id]
        );

        return NextResponse.json(
            collaborators.map((col) => ({
                ...col,
                role: col.role ? JSON.parse(col.role) : null,
            }))
        );
    } catch (err) {
        return handleApiError("GET /api/gift-campaigns/:id/collaborators", err);
    }
}

// POST: add one or many collaborators to campaign
export async function POST(req: Request, { params }: RouteContext) {
    try {
        const session = await requireCoordinator();
        const { id } = await params;

        if (!assertCampaignOwnership(id, session.sub))
            return notFound("Campaign not found");

        const data = await req.json();

        if (Array.isArray(data)) {
            const parsed = z.array(AddCollaboratorSchema).parse(data);
            transaction(() => {
                for (const item of parsed) {
                    execute(
                        "INSERT OR IGNORE INTO GiftCampaignCollaborator (campaignId, collaboratorId) VALUES (?, ?)",
                        [id, item.collaboratorId]
                    );
                }
            });
            return NextResponse.json({ success: true });
        }

        const parsed = AddCollaboratorSchema.parse(data);
        execute(
            "INSERT OR IGNORE INTO GiftCampaignCollaborator (campaignId, collaboratorId) VALUES (?, ?)",
            [id, parsed.collaboratorId]
        );
        return NextResponse.json({ success: true }, { status: 201 });
    } catch (err) {
        return handleApiError("POST /api/gift-campaigns/:id/collaborators", err);
    }
}

// PATCH: mark collaborator as sent / not sent
export async function PATCH(req: Request, { params }: RouteContext) {
    try {
        const session = await requireCoordinator();
        const { id } = await params;

        if (!assertCampaignOwnership(id, session.sub))
            return notFound("Campaign not found");

        const parsed = MarkSentSchema.parse(await req.json());

        execute(
            `UPDATE GiftCampaignCollaborator
             SET sent = ?, sentAt = ?
             WHERE campaignId = ? AND collaboratorId = ?`,
            [
                parsed.sent ? 1 : 0,
                parsed.sent ? new Date().toISOString() : null,
                id,
                parsed.collaboratorId,
            ]
        );

        return NextResponse.json({ success: true });
    } catch (err) {
        return handleApiError("PATCH /api/gift-campaigns/:id/collaborators", err);
    }
}

// DELETE: remove collaborator from campaign
export async function DELETE(req: Request, { params }: RouteContext) {
    try {
        const session = await requireCoordinator();
        const { id } = await params;

        if (!assertCampaignOwnership(id, session.sub))
            return notFound("Campaign not found");

        const { collaboratorId } = z
            .object({ collaboratorId: IdSchema })
            .parse(await req.json());

        execute(
            "DELETE FROM GiftCampaignCollaborator WHERE campaignId = ? AND collaboratorId = ?",
            [id, collaboratorId]
        );
        return NextResponse.json({ success: true });
    } catch (err) {
        return handleApiError("DELETE /api/gift-campaigns/:id/collaborators", err);
    }
}
