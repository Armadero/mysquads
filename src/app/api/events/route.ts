import { NextResponse } from "next/server";
import { queryAll, execute, transaction } from "@/lib/db";
import { EventSchema } from "@/lib/schemas";
import { handleApiError } from "@/lib/api/responses";
import { requireCoordinator } from "@/lib/auth/guards";

interface EventRow {
    id: number;
    [key: string]: unknown;
}

export async function GET() {
    try {
        const session = await requireCoordinator();

        // Fetch events and their attached collaborators in one go using json_group_array
        const events = queryAll<EventRow & { collaborators: string | null }>(
            `SELECT e.*,
                    (
                      SELECT json_group_array(
                        json_object(
                          'id', c.id, 'name', c.name, 'photoUrl', c.photoUrl,
                          'roleId', c.roleId
                        )
                      )
                      FROM IntegrationEventCollaborator iec
                      JOIN Collaborator c ON iec.collaboratorId = c.id
                      WHERE iec.eventId = e.id
                    ) AS collaborators
             FROM IntegrationEvent e
             WHERE e.coordinatorId = ?
             ORDER BY e.startDate DESC`,
            [session.sub]
        );

        const enriched = events.map((e) => ({
            ...e,
            collaborators: e.collaborators ? JSON.parse(e.collaborators) : [],
        }));

        return NextResponse.json(enriched);
    } catch (err) {
        return handleApiError("GET /api/events", err);
    }
}

export async function POST(req: Request) {
    try {
        const session = await requireCoordinator();
        const parsed = EventSchema.parse(await req.json());

        let eventId: number | bigint = 0;

        transaction(() => {
            const result = execute(
                `INSERT INTO IntegrationEvent (startDate, endDate, coordinatorId)
                 VALUES (?, ?, ?)`,
                [
                    new Date(parsed.startDate).toISOString(),
                    new Date(parsed.endDate).toISOString(),
                    session.sub,
                ]
            );
            eventId = result.lastInsertRowid;

            for (const collabId of parsed.collaboratorIds) {
                execute(
                    `INSERT INTO IntegrationEventCollaborator (eventId, collaboratorId)
                     VALUES (?, ?)`,
                    [eventId as number | bigint, collabId]
                );
            }
        });

        const event = queryAll(
            "SELECT * FROM IntegrationEvent WHERE id = ?",
            [Number(eventId)]
        )[0];

        return NextResponse.json(event, { status: 201 });
    } catch (err) {
        return handleApiError("POST /api/events", err);
    }
}
