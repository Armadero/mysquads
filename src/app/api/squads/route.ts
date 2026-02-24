import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const SquadSchema = z.object({
    name: z.string().min(1, "Name is required"),
    jiraLink: z.string().url("Invalid URL").optional().or(z.literal("")),
    confluenceLink: z.string().url("Invalid URL").optional().or(z.literal("")),
    sprintStart: z.string().optional().nullable(),
    sprintDays: z.number().int().min(1).optional().default(14),
});

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

    const squads = await prisma.squad.findMany({
        where: { coordinatorId: { in: coordinatorIds } },
        include: {
            collaborators: {
                include: { collaborator: { include: { role: true } } }
            }
        }
    });

    const flattened = squads.map((s) => ({
        ...s,
        collaborators: s.collaborators.map((c) => ({ ...c.collaborator }))
    }));

    return NextResponse.json(flattened);
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.type !== "COORDINATOR")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const data = await req.json();
        const parsed = SquadSchema.parse(data);

        const squad = await prisma.squad.create({
            data: {
                name: parsed.name,
                jiraLink: parsed.jiraLink || null,
                confluenceLink: parsed.confluenceLink || null,
                sprintStart: parsed.sprintStart ? new Date(parsed.sprintStart) : null,
                sprintDays: parsed.sprintDays,
                coordinatorId: session.user.id
            }
        });

        return NextResponse.json(squad, { status: 201 });
    } catch (error: unknown) {
        if (error instanceof z.ZodError)
            return NextResponse.json({ error: "Validation Error", details: error.issues }, { status: 400 });
        console.error("[POST /api/squads]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
