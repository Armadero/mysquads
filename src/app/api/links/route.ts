import { NextResponse } from "next/server";
import { queryAll, queryOne, execute } from "@/lib/db";
import { LinkRequestSchema, LinkUpdateSchema } from "@/lib/schemas";
import { handleApiError, notFound, badRequest } from "@/lib/api/responses";
import {
    requireCoordinator,
    requireManager,
    requireUser,
} from "@/lib/auth/guards";

interface LinkRow {
    id: number;
    coordinator?: string;
    manager?: string;
    [key: string]: unknown;
}

export async function POST(req: Request) {
    try {
        const session = await requireManager();
        const parsed = LinkRequestSchema.parse(await req.json());

        // Prevent duplicate pending/approved request
        const existing = queryOne<{ id: number; status: string }>(
            `SELECT id, status FROM ManagerCoordinatorLink
             WHERE managerId = ? AND coordinatorId = ?`,
            [session.sub, parsed.coordinatorId]
        );
        if (existing && existing.status !== "REJECTED") {
            return badRequest("Link request already exists");
        }

        const result = execute(
            `INSERT INTO ManagerCoordinatorLink (managerId, coordinatorId, status)
             VALUES (?, ?, 'PENDING')`,
            [session.sub, parsed.coordinatorId]
        );

        const link = queryOne(
            "SELECT * FROM ManagerCoordinatorLink WHERE id = ?",
            [Number(result.lastInsertRowid)]
        );

        return NextResponse.json(link, { status: 201 });
    } catch (err) {
        return handleApiError("POST /api/links", err);
    }
}

export async function GET() {
    try {
        const session = await requireUser();

        if (session.type === "MANAGER") {
            const links = queryAll<LinkRow>(
                `SELECT l.*, json_object('id', u.id, 'name', u.name, 'email', u.email) as coordinator
                 FROM ManagerCoordinatorLink l
                 JOIN User u ON l.coordinatorId = u.id
                 WHERE l.managerId = ?`,
                [session.sub]
            );

            return NextResponse.json(
                links.map((l) => ({
                    ...l,
                    coordinator: l.coordinator ? JSON.parse(l.coordinator) : null,
                }))
            );
        }

        const links = queryAll<LinkRow>(
            `SELECT l.*, json_object('id', u.id, 'name', u.name, 'email', u.email) as manager
             FROM ManagerCoordinatorLink l
             JOIN User u ON l.managerId = u.id
             WHERE l.coordinatorId = ? AND l.status = 'PENDING'`,
            [session.sub]
        );

        return NextResponse.json(
            links.map((l) => ({
                ...l,
                manager: l.manager ? JSON.parse(l.manager) : null,
            }))
        );
    } catch (err) {
        return handleApiError("GET /api/links", err);
    }
}

export async function PUT(req: Request) {
    try {
        const session = await requireCoordinator();
        const parsed = LinkUpdateSchema.parse(await req.json());

        const { changes } = execute(
            `UPDATE ManagerCoordinatorLink
             SET status = ?
             WHERE id = ? AND coordinatorId = ?`,
            [parsed.status, parsed.id, session.sub]
        );
        if (changes === 0) return notFound("Link not found");

        const link = queryOne(
            "SELECT * FROM ManagerCoordinatorLink WHERE id = ? AND coordinatorId = ?",
            [parsed.id, session.sub]
        );
        return NextResponse.json(link);
    } catch (err) {
        return handleApiError("PUT /api/links", err);
    }
}
