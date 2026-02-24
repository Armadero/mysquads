import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.type !== "COORDINATOR")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const entries = await prisma.timeBankEntry.findMany({
        where: { collaborator: { coordinatorId: session.user.id } },
        include: { collaborator: { select: { id: true, name: true } } },
        orderBy: { expirationDate: "asc" }
    });

    return NextResponse.json(entries);
}
