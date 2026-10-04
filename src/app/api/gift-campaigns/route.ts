import { NextResponse } from "next/server";
import { queryAll, execute } from "@/lib/db";
import { CampaignSchema } from "@/lib/schemas";
import { handleApiError } from "@/lib/api/responses";
import { requireCoordinator } from "@/lib/auth/guards";

interface CampaignRow {
    id: number;
    [key: string]: unknown;
}

interface CollaboratorRow {
    role: string | null;
    sent: number | boolean;
    [key: string]: unknown;
}

export async function GET() {
    try {
        const session = await requireCoordinator();

        const campaigns = queryAll<CampaignRow>(
            "SELECT * FROM GiftCampaign WHERE coordinatorId = ? ORDER BY created_at DESC",
            [session.sub]
        );

        const enriched = campaigns.map((c) => {
            const gifts = queryAll(
                `SELECT g.* FROM GiftCampaignGift gcg
                 JOIN Gift g ON gcg.giftId = g.id
                 WHERE gcg.campaignId = ?`,
                [c.id]
            );
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
                [c.id]
            );
            const totalSent = collaborators.filter((col) => col.sent).length;
            return {
                ...c,
                gifts,
                collaborators: collaborators.map((col) => ({
                    ...col,
                    role: col.role ? JSON.parse(col.role) : null,
                })),
                totalSent,
                totalCollaborators: collaborators.length,
            };
        });

        return NextResponse.json(enriched);
    } catch (err) {
        return handleApiError("GET /api/gift-campaigns", err);
    }
}

export async function POST(req: Request) {
    try {
        const session = await requireCoordinator();
        const parsed = CampaignSchema.parse(await req.json());

        const result = execute(
            "INSERT INTO GiftCampaign (name, description, coordinatorId) VALUES (?, ?, ?)",
            [parsed.name, parsed.description ?? null, session.sub]
        );

        const campaign = queryAll(
            "SELECT * FROM GiftCampaign WHERE id = ?",
            [Number(result.lastInsertRowid)]
        )[0];

        return NextResponse.json(
            {
                ...campaign,
                gifts: [],
                collaborators: [],
                totalSent: 0,
                totalCollaborators: 0,
            },
            { status: 201 }
        );
    } catch (err) {
        return handleApiError("POST /api/gift-campaigns", err);
    }
}
