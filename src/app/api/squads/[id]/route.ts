import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).type !== "COORDINATOR") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await req.json();

    const squad = await prisma.squad.update({
        where: { id: params.id, coordinatorId: (session.user as any).id },
        data: {
            name: data.name,
            jiraLink: data.jiraLink,
            confluenceLink: data.confluenceLink,
            sprintStart: data.sprintStart ? new Date(data.sprintStart) : null,
            sprintDays: Number(data.sprintDays) || 14,
        }
    });

    return NextResponse.json(squad);
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).type !== "COORDINATOR") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Delete relations first
    await prisma.squadCollaborator.deleteMany({
        where: { squadId: params.id }
    });

    await prisma.squad.delete({
        where: { id: params.id, coordinatorId: (session.user as any).id }
    });

    return NextResponse.json({ success: true });
}
