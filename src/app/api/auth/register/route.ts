import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { queryOne, execute, transaction } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth/session";
import { RegisterSchema } from "@/lib/schemas";
import { badRequest, handleApiError } from "@/lib/api/responses";

const DEFAULT_COORDINATOR_ROLES = [
    { name: "SCRUM_MASTER", defaultColor: "#7C3AED", qtyPerSquad: 1, maxSquads: 2, multipleSquads: 1, order: 1 },
    { name: "SYSTEM_ANALYST", defaultColor: "#2563EB", qtyPerSquad: 1, maxSquads: 2, multipleSquads: 1, order: 2 },
    { name: "DEVELOPER", defaultColor: "#16A34A", qtyPerSquad: 1, maxSquads: 1, multipleSquads: 0, order: 3 },
    { name: "QA_ANALYST", defaultColor: "#EA580C", qtyPerSquad: 1, maxSquads: 2, multipleSquads: 1, order: 4 },
] as const;

export async function POST(req: Request) {
    try {
        const parsed = RegisterSchema.parse(await req.json());

        const existing = queryOne("SELECT id FROM User WHERE email = ?", [parsed.email]);
        if (existing) return badRequest("Este email já está em uso.");

        const hashedPassword = await bcrypt.hash(parsed.password, 12);

        let userId = "";

        // Wrap user + default roles in a transaction so a partial failure
        // doesn't leave an orphaned user without roles.
        transaction(() => {
            const { lastInsertRowid } = execute(
                `INSERT INTO User (email, password, name, type, created_at, updated_at)
                 VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
                [parsed.email, hashedPassword, parsed.name, parsed.type]
            );
            userId = String(lastInsertRowid);

            if (parsed.type === "COORDINATOR") {
                for (const role of DEFAULT_COORDINATOR_ROLES) {
                    execute(
                        `INSERT INTO Role
                            (name, defaultColor, qtyPerSquad, maxSquads, multipleSquads, "order", coordinatorId, created_at, updated_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
                        [
                            role.name,
                            role.defaultColor,
                            role.qtyPerSquad,
                            role.maxSquads,
                            role.multipleSquads,
                            role.order,
                            userId,
                        ]
                    );
                }
            }
        });

        const res = NextResponse.json(
            { id: userId, email: parsed.email, name: parsed.name, type: parsed.type },
            { status: 201 }
        );

        await setSessionCookie(res, {
            sub: userId,
            email: parsed.email,
            name: parsed.name,
            type: parsed.type,
        });

        return res;
    } catch (err) {
        return handleApiError("POST /api/auth/register", err);
    }
}
