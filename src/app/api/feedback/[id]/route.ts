import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FeedbackSchema } from "@/lib/schemas";
import { z } from "zod";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.type !== "COORDINATOR")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { id } = await params;
        const data = await req.json();
        const parsed = FeedbackSchema.parse(data);

        const feedback = await prisma.feedback.update({
            where: { id, coordinatorId: session.user.id },
            data: {
                date: new Date(parsed.date),
                content: parsed.content,
                tag: parsed.tag,
                type: parsed.type,
                origin: parsed.origin,
                collaboratorId: parsed.collaboratorId
            }
        });

        return NextResponse.json(feedback);
    } catch (error: unknown) {
        if (error instanceof z.ZodError)
            return NextResponse.json({ error: "Validation Error", details: error.issues }, { status: 400 });
        console.error("[PUT /api/feedback/:id]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.type !== "COORDINATOR")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { id } = await params;
        await prisma.feedback.delete({
            where: { id, coordinatorId: session.user.id }
        });

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("[DELETE /api/feedback/:id]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
