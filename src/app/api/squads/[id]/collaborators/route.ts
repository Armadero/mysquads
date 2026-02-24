import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).type !== "COORDINATOR") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { collaboratorIds } = await req.json(); // Array of strings

    // Verify squad belongs to coordinator
    const squad = await prisma.squad.findFirst({
        where: { id: params.id, coordinatorId: (session.user as any).id }
    });

    if (!squad) return NextResponse.json({ error: "Squad not found" }, { status: 404 });

    // Start Transaction to replace members
    await prisma.$transaction([
        prisma.squadCollaborator.deleteMany({
            where: { squadId: params.id }
        }),
        prisma.squadCollaborator.createMany({
            data: collaboratorIds.map((collabId: string) => ({
                squadId: params.id,
                collaboratorId: collabId
            }))
        })
    ]);

    return NextResponse.json({ success: true });
}

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).type !== "COORDINATOR") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { collaboratorId } = await req.json();

    // Verify squad belongs to coordinator
    const squad = await prisma.squad.findFirst({
        where: { id: params.id, coordinatorId: (session.user as any).id }
    });

    if (!squad) return NextResponse.json({ error: "Squad not found" }, { status: 404 });

    // Add collaborator if not already in squad
    const assignment = await prisma.squadCollaborator.upsert({
        where: {
            squadId_collaboratorId: {
                squadId: params.id,
                collaboratorId
            }
        },
        update: {},
        create: {
            squadId: params.id,
            collaboratorId
        }
    });

    return NextResponse.json(assignment);
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).type !== "COORDINATOR") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { collaboratorId } = await req.json();

    await prisma.squadCollaborator.deleteMany({
        where: {
            squadId: params.id,
            collaboratorId
        }
    });

    return NextResponse.json({ success: true });
}
