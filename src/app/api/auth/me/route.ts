import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { unauthorized } from "@/lib/api/responses";

export async function GET() {
    const session = await getSession();
    if (!session) return unauthorized();

    return NextResponse.json({
        id: session.sub,
        email: session.email,
        name: session.name,
        type: session.type,
    });
}
