import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.type !== "MANAGER") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('q') || '';

    const coordinators = await prisma.user.findMany({
        where: {
            type: "COORDINATOR",
            OR: [
                { name: { contains: search } },
                { email: { contains: search } }
            ]
        },
        select: { id: true, name: true, email: true }
    });

    return NextResponse.json(coordinators);
}
