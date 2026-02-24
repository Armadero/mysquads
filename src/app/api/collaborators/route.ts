import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CollaboratorSchema } from "@/lib/schemas";
import { z } from "zod";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let coordinatorIds: string[] = [];

    if (session.user.type === "COORDINATOR") {
        coordinatorIds = [session.user.id];
    } else if (session.user.type === "MANAGER") {
        const links = await prisma.managerCoordinatorLink.findMany({
            where: { managerId: session.user.id, status: "APPROVED" },
            select: { coordinatorId: true }
        });
        coordinatorIds = links.map(link => link.coordinatorId);
    } else {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (coordinatorIds.length === 0) {
        return NextResponse.json([]);
    }

    const collabs = await prisma.collaborator.findMany({
        where: { coordinatorId: { in: coordinatorIds } },
        include: {
            role: { select: { id: true, name: true, defaultColor: true } },
            squads: { select: { squadId: true } },
            events: { select: { eventId: true } }
        }
    });

    return NextResponse.json(collabs);
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.type !== "COORDINATOR")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const data = await req.json();
        const parsed = CollaboratorSchema.parse(data);
        const { email: collabEmail, roleId, ...rest } = parsed;

        const collab = await prisma.collaborator.create({
            data: {
                ...rest,
                email: collabEmail ?? null,
                coordinatorId: session.user.id,
                admissionDate: new Date(parsed.admissionDate),
                birthDate: parsed.birthDate ? new Date(parsed.birthDate) : null,
                resignationDate: parsed.resignationDate ? new Date(parsed.resignationDate) : null,
                roleId: roleId as string
            }
        });

        return NextResponse.json(collab, { status: 201 });
    } catch (error: unknown) {
        if (error instanceof z.ZodError)
            return NextResponse.json({ error: "Validation Error", details: error.issues }, { status: 400 });
        console.error("[POST /api/collaborators]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
