import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CollaboratorSchema } from "@/lib/schemas";
import { z } from "zod";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || session.user.type !== "COORDINATOR")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const data = await req.json();
        const parsed = CollaboratorSchema.parse(data);
        const { email: collabEmail, roleId, ...rest } = parsed;

        const collab = await prisma.collaborator.update({
            where: { id, coordinatorId: session.user.id },
            data: {
                ...rest,
                email: collabEmail ?? null,
                admissionDate: new Date(parsed.admissionDate),
                birthDate: parsed.birthDate ? new Date(parsed.birthDate) : null,
                resignationDate: parsed.resignationDate ? new Date(parsed.resignationDate) : null,
                roleId: roleId as string
            }
        });

        return NextResponse.json(collab);
    } catch (error: unknown) {
        if (error instanceof z.ZodError)
            return NextResponse.json({ error: "Validation Error", details: error.issues }, { status: 400 });
        console.error("[PUT /api/collaborators/:id]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || session.user.type !== "COORDINATOR")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        await prisma.collaborator.delete({
            where: { id, coordinatorId: session.user.id }
        });
        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("[DELETE /api/collaborators/:id]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
