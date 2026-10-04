import { NextResponse } from "next/server";
import { queryAll, queryOne, execute } from "@/lib/db";
import { RoleSchema } from "@/lib/schemas";
import { handleApiError } from "@/lib/api/responses";
import { requireCoordinator } from "@/lib/auth/guards";

export async function GET() {
    try {
        const session = await requireCoordinator();

        const roles = queryAll(
            `SELECT * FROM Role WHERE coordinatorId = ? ORDER BY "order" ASC, id ASC`,
            [session.sub]
        );

        return NextResponse.json(roles);
    } catch (err) {
        return handleApiError("GET /api/roles", err);
    }
}

export async function POST(req: Request) {
    try {
        const session = await requireCoordinator();
        const parsed = RoleSchema.parse(await req.json());

        const result = execute(
            `INSERT INTO Role (name, defaultColor, qtyPerSquad, maxSquads, multipleSquads, "order", coordinatorId)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                parsed.name,
                parsed.defaultColor,
                parsed.qtyPerSquad,
                parsed.maxSquads,
                parsed.multipleSquads ? 1 : 0,
                parsed.order,
                session.sub,
            ]
        );

        const newRole = queryOne(
            "SELECT * FROM Role WHERE id = ?",
            [Number(result.lastInsertRowid)]
        );

        return NextResponse.json(newRole, { status: 201 });
    } catch (err) {
        return handleApiError("POST /api/roles", err);
    }
}
