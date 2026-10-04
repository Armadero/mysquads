import { NextResponse } from "next/server";
import { queryAll, queryOne, execute } from "@/lib/db";
import { SquadSchema } from "@/lib/schemas";
import { handleApiError } from "@/lib/api/responses";
import {
    requireCoordinator,
    requireUser,
    resolveReadableCoordinatorIds,
} from "@/lib/auth/guards";

interface SquadRow {
    id: number;
    [key: string]: unknown;
}

interface SquadCollaboratorRow {
    id: number;
    role: string | null;
    [key: string]: unknown;
}

export async function GET() {
    try {
        const session = await requireUser();
        const coordinatorIds = resolveReadableCoordinatorIds(session);
        if (coordinatorIds.length === 0) return NextResponse.json([]);

        const placeholders = coordinatorIds.map(() => "?").join(",");
        const squads = queryAll<SquadRow>(
            `SELECT * FROM Squad WHERE coordinatorId IN (${placeholders}) ORDER BY name ASC`,
            coordinatorIds
        );

        if (squads.length === 0) return NextResponse.json([]);

        // Bulk-fetch collaborators for all squads and group in memory (avoids N+1)
        const squadIds = squads.map((s) => s.id);
        const squadPlaceholders = squadIds.map(() => "?").join(",");

        const allCollaborators = queryAll<SquadCollaboratorRow & { squadId: number }>(
            `SELECT sc.squadId, c.*,
                    CASE WHEN r.id IS NOT NULL
                         THEN json_object(
                            'id', r.id, 'name', r.name, 'defaultColor', r.defaultColor,
                            'maxSquads', r.maxSquads, 'multipleSquads', r.multipleSquads,
                            'order', r."order"
                         )
                         ELSE NULL
                    END as role
             FROM SquadCollaborator sc
             JOIN Collaborator c ON sc.collaboratorId = c.id
             LEFT JOIN Role r ON c.roleId = r.id
             WHERE sc.squadId IN (${squadPlaceholders})`,
            squadIds
        );

        const bySquad = new Map<number, SquadCollaboratorRow[]>();
        for (const row of allCollaborators) {
            const { squadId, ...rest } = row;
            const parsed: SquadCollaboratorRow = {
                ...rest,
                role: rest.role ? JSON.parse(rest.role as string) : null,
            };
            const list = bySquad.get(squadId);
            if (list) list.push(parsed);
            else bySquad.set(squadId, [parsed]);
        }

        const enriched = squads.map((s) => ({
            ...s,
            collaborators: bySquad.get(s.id) ?? [],
        }));

        return NextResponse.json(enriched);
    } catch (err) {
        return handleApiError("GET /api/squads", err);
    }
}

export async function POST(req: Request) {
    try {
        const session = await requireCoordinator();
        const parsed = SquadSchema.parse(await req.json());

        const { lastInsertRowid } = execute(
            `INSERT INTO Squad (name, jiraLink, confluenceLink, sprintStart, sprintDays, coordinatorId)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                parsed.name,
                parsed.jiraLink || null,
                parsed.confluenceLink || null,
                parsed.sprintStart ? new Date(parsed.sprintStart).toISOString() : null,
                parsed.sprintDays,
                session.sub,
            ]
        );

        const squad = queryOne(
            "SELECT * FROM Squad WHERE id = ?",
            [Number(lastInsertRowid)]
        );

        return NextResponse.json(squad, { status: 201 });
    } catch (err) {
        return handleApiError("POST /api/squads", err);
    }
}
