import { NextResponse } from "next/server";
import { queryAll, execute } from "@/lib/db";
import { FeedbackSchema } from "@/lib/schemas";
import { handleApiError } from "@/lib/api/responses";
import {
    requireCoordinator,
    requireUser,
    resolveReadableCoordinatorIds,
} from "@/lib/auth/guards";

interface FeedbackRow {
    id: number;
    collaborator: string;
    coordinator: string;
    [key: string]: unknown;
}

export async function GET() {
    try {
        const session = await requireUser();
        const coordinatorIds = resolveReadableCoordinatorIds(session);
        if (coordinatorIds.length === 0) return NextResponse.json([]);

        const placeholders = coordinatorIds.map(() => "?").join(",");

        const feedbacks = queryAll<FeedbackRow>(
            `SELECT f.*,
                    json_object(
                        'id', c.id, 'name', c.name, 'photoUrl', c.photoUrl,
                        'role', CASE WHEN r.id IS NOT NULL THEN json_object('name', r.name) ELSE NULL END
                    ) as collaborator,
                    json_object('name', u.name) as coordinator
             FROM Feedback f
             JOIN Collaborator c ON f.collaboratorId = c.id
             LEFT JOIN Role r ON c.roleId = r.id
             JOIN User u ON f.coordinatorId = u.id
             WHERE f.coordinatorId IN (${placeholders})
             ORDER BY f.date DESC`,
            coordinatorIds
        );

        return NextResponse.json(
            feedbacks.map((f) => ({
                ...f,
                collaborator: JSON.parse(f.collaborator),
                coordinator: JSON.parse(f.coordinator),
            }))
        );
    } catch (err) {
        return handleApiError("GET /api/feedback", err);
    }
}

export async function POST(req: Request) {
    try {
        const session = await requireCoordinator();
        const parsed = FeedbackSchema.parse(await req.json());

        const result = execute(
            `INSERT INTO Feedback (date, content, tag, type, origin, collaboratorId, coordinatorId)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                new Date(parsed.date).toISOString(),
                parsed.content,
                parsed.tag ?? null,
                parsed.type,
                parsed.origin,
                parsed.collaboratorId,
                session.sub,
            ]
        );

        const feedback = queryAll(
            "SELECT * FROM Feedback WHERE id = ?",
            [Number(result.lastInsertRowid)]
        )[0];

        return NextResponse.json(feedback, { status: 201 });
    } catch (err) {
        return handleApiError("POST /api/feedback", err);
    }
}
