import { NextResponse } from "next/server";
import { queryAll, queryOne } from "@/lib/db";
import { handleApiError, notFound } from "@/lib/api/responses";
import { requireCoordinator } from "@/lib/auth/guards";

type RouteContext = { params: Promise<{ id: string }> };

interface CampaignRow {
    id: number;
    name: string;
}

interface ExportRow {
    name: string | null;
    cpf: string | null;
    cep_entrega: string | null;
    logradouro_entrega: string | null;
    numero_entrega: string | null;
    complemento_entrega: string | null;
    bairro_entrega: string | null;
    cidade_entrega: string | null;
    estado_entrega: string | null;
    sent: number | boolean | null;
    sentAt: string | null;
}

function escapeCSV(val: unknown): string {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

export async function GET(_req: Request, { params }: RouteContext) {
    try {
        const session = await requireCoordinator();
        const { id } = await params;

        const campaign = queryOne<CampaignRow>(
            "SELECT id, name FROM GiftCampaign WHERE id = ? AND coordinatorId = ?",
            [id, session.sub]
        );
        if (!campaign) return notFound("Campaign not found");

        const collaborators = queryAll<ExportRow>(
            `SELECT col.name, col.cpf,
                    col.cep_entrega, col.logradouro_entrega, col.numero_entrega,
                    col.complemento_entrega, col.bairro_entrega, col.cidade_entrega, col.estado_entrega,
                    gcc.sent, gcc.sentAt
             FROM GiftCampaignCollaborator gcc
             JOIN Collaborator col ON gcc.collaboratorId = col.id
             WHERE gcc.campaignId = ?
             ORDER BY col.name ASC`,
            [id]
        );

        const headers = [
            "Nome",
            "CPF",
            "CEP Entrega",
            "Logradouro Entrega",
            "Número Entrega",
            "Complemento Entrega",
            "Bairro Entrega",
            "Cidade Entrega",
            "Estado Entrega",
            "Enviado",
            "Data Envio",
        ];

        const rows = collaborators.map((col) => [
            escapeCSV(col.name),
            escapeCSV(col.cpf),
            escapeCSV(col.cep_entrega),
            escapeCSV(col.logradouro_entrega),
            escapeCSV(col.numero_entrega),
            escapeCSV(col.complemento_entrega),
            escapeCSV(col.bairro_entrega),
            escapeCSV(col.cidade_entrega),
            escapeCSV(col.estado_entrega),
            col.sent ? "Sim" : "Não",
            escapeCSV(col.sentAt),
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map((r) => r.join(",")),
        ].join("\n");

        // Add BOM for Excel UTF-8 compatibility
        const csvWithBom = "\uFEFF" + csvContent;

        const safeName = campaign.name
            .replace(/[^a-zA-Z0-9\s]/g, "")
            .replace(/\s+/g, "_");

        return new NextResponse(csvWithBom, {
            status: 200,
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="campanha_${safeName}.csv"`,
            },
        });
    } catch (err) {
        return handleApiError("GET /api/gift-campaigns/:id/export", err);
    }
}
