import { NextResponse } from "next/server";
import { queryAll, queryOne } from "@/lib/db";
import { CollaboratorSchema } from "@/lib/schemas";
import { insertCollaborator } from "@/lib/db/collaborators";
import { badRequest, handleApiError } from "@/lib/api/responses";
import {
    requireCoordinator,
    requireUser,
    resolveReadableCoordinatorIds,
} from "@/lib/auth/guards";

interface CollaboratorRow {
    id: number | string;
    role: string | null;
    [key: string]: unknown;
}

export async function GET() {
    try {
        const session = await requireUser();
        const coordinatorIds = resolveReadableCoordinatorIds(session);
        if (coordinatorIds.length === 0) return NextResponse.json([]);

        const placeholders = coordinatorIds.map(() => "?").join(",");

        // Pull collaborators + their related squads and events in ONE query per
        // category using a group_concat, avoiding the old N+1 pattern.
        const collabs = queryAll<CollaboratorRow>(
            `SELECT
                c.*,
                CASE WHEN r.id IS NOT NULL
                     THEN json_object(
                        'id', r.id, 'name', r.name, 'defaultColor', r.defaultColor,
                        'maxSquads', r.maxSquads, 'multipleSquads', r.multipleSquads,
                        'order', r."order"
                     )
                     ELSE NULL
                END AS role,
                (SELECT json_group_array(json_object('squadId', sc.squadId))
                   FROM SquadCollaborator sc WHERE sc.collaboratorId = c.id) AS squads,
                (SELECT json_group_array(json_object('eventId', iec.eventId))
                   FROM IntegrationEventCollaborator iec WHERE iec.collaboratorId = c.id) AS events
             FROM Collaborator c
             LEFT JOIN Role r ON c.roleId = r.id
             WHERE c.coordinatorId IN (${placeholders})`,
            coordinatorIds
        );

        const parsed = collabs.map((c) => ({
            ...c,
            role: c.role ? JSON.parse(c.role as string) : null,
            squads: c.squads ? JSON.parse(c.squads as string) : [],
            events: c.events ? JSON.parse(c.events as string) : [],
        }));

        return NextResponse.json(parsed);
    } catch (err) {
        return handleApiError("GET /api/collaborators", err);
    }
}

export async function POST(req: Request) {
    try {
        const session = await requireCoordinator();
        const parsed = CollaboratorSchema.parse(await req.json());

        if (parsed.matricula) {
            const dup = queryOne(
                `SELECT id FROM Collaborator WHERE matricula = ?`,
                [parsed.matricula]
            );
            if (dup) {
                return badRequest(
                    "Esta matrícula já está em uso por outro colaborador."
                );
            }
        }

        const { lastInsertRowid } = insertCollaborator(parsed, session.sub);
        const collab = queryOne(
            `SELECT * FROM Collaborator WHERE id = ?`,
            [Number(lastInsertRowid)]
        );
        return NextResponse.json(collab, { status: 201 });
    } catch (err) {
        return handleApiError("POST /api/collaborators", err);
    }
}
