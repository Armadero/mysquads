import { NextResponse } from "next/server";
import { queryAll, queryOne, execute } from "@/lib/db";
import { GiftSchema } from "@/lib/schemas";
import { handleApiError } from "@/lib/api/responses";
import { requireCoordinator } from "@/lib/auth/guards";

export async function GET() {
    try {
        const session = await requireCoordinator();

        const gifts = queryAll(
            "SELECT * FROM Gift WHERE coordinatorId = ? ORDER BY name ASC",
            [session.sub]
        );
        return NextResponse.json(gifts);
    } catch (err) {
        return handleApiError("GET /api/gifts", err);
    }
}

export async function POST(req: Request) {
    try {
        const session = await requireCoordinator();
        const parsed = GiftSchema.parse(await req.json());

        const result = execute(
            "INSERT INTO Gift (name, description, coordinatorId) VALUES (?, ?, ?)",
            [parsed.name, parsed.description ?? null, session.sub]
        );

        const gift = queryOne(
            "SELECT * FROM Gift WHERE id = ?",
            [Number(result.lastInsertRowid)]
        );
        return NextResponse.json(gift, { status: 201 });
    } catch (err) {
        return handleApiError("POST /api/gifts", err);
    }
}
