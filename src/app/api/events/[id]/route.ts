import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EventSchema } from "@/lib/schemas";
import { z } from "zod";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.type !== "COORDINATOR")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { id } = await params;
        const data = await req.json();
        const parsed = EventSchema.parse(data);

        // Update basic info and sync collaborators atomically
        await prisma.$transaction([
            prisma.integrationEvent.update({
                where: { id, coordinatorId: session.user.id },
                data: {
                    startDate: new Date(parsed.startDate),
                    endDate: new Date(parsed.endDate),
                }
            }),
            prisma.integrationEventCollaborator.deleteMany({
                where: { eventId: id }
            }),
            prisma.integrationEventCollaborator.createMany({
                data: parsed.collaboratorIds.map((collabId: string) => ({
                    eventId: id,
                    collaboratorId: collabId
                }))
            })
        ]);

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        if (error instanceof z.ZodError)
            return NextResponse.json({ error: "Validation Error", details: error.issues }, { status: 400 });
        console.error("[PUT /api/events/:id]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.type !== "COORDINATOR")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { id } = await params;

        await prisma.$transaction([
            prisma.integrationEventCollaborator.deleteMany({ where: { eventId: id } }),
            prisma.integrationEvent.delete({ where: { id, coordinatorId: session.user.id } })
        ]);

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("[DELETE /api/events/:id]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
