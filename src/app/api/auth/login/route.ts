import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { queryOne } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth/session";
import { LoginSchema } from "@/lib/schemas";
import { handleApiError, unauthorized } from "@/lib/api/responses";

export async function POST(req: Request) {
    try {
        const parsed = LoginSchema.parse(await req.json());

        const user = queryOne<{
            id: string | number;
            email: string;
            password: string;
            name: string | null;
            type: "COORDINATOR" | "MANAGER";
        }>(
            "SELECT id, email, password, name, type FROM User WHERE email = ?",
            [parsed.email]
        );

        if (!user) return unauthorized("Credenciais inválidas.");

        const valid = await bcrypt.compare(parsed.password, user.password);
        if (!valid) return unauthorized("Credenciais inválidas.");

        const res = NextResponse.json({
            id: user.id,
            email: user.email,
            name: user.name,
            type: user.type,
        });

        await setSessionCookie(res, {
            sub: String(user.id),
            email: user.email,
            name: user.name,
            type: user.type,
        });

        return res;
    } catch (err) {
        return handleApiError("POST /api/auth/login", err);
    }
}
