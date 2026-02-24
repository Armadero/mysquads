import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FeedbackSchema } from "@/lib/schemas";
import { z } from "zod";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.type !== "COORDINATOR" && session.user.type !== "MANAGER"))
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        let feedbacks = [];

        if (session.user.type === "COORDINATOR") {
            feedbacks = await prisma.feedback.findMany({
                where: { coordinatorId: session.user.id },
                include: {
                    collaborator: {
                        select: {
                            id: true,
                            name: true,
                            photoUrl: true,
                            role: { select: { name: true } }
                        }
                    },
                    coordinator: { select: { name: true } }
                },
                orderBy: { date: 'desc' }
            });
        } else {
            // MANAGER: Find approved coordinators
            const links = await prisma.managerCoordinatorLink.findMany({
                where: { managerId: session.user.id, status: "APPROVED" },
                select: { coordinatorId: true }
            });
            const coordinatorIds = links.map(l => l.coordinatorId);

            feedbacks = await prisma.feedback.findMany({
                where: { coordinatorId: { in: coordinatorIds } },
                include: {
                    collaborator: {
                        select: {
                            id: true,
                            name: true,
                            photoUrl: true,
                            role: { select: { name: true } }
                        }
                    },
                    coordinator: { select: { name: true } }
                },
                orderBy: { date: 'desc' }
            });
        }

        return NextResponse.json(feedbacks);
    } catch (error) {
        console.error("[GET /api/feedback]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.type !== "COORDINATOR")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const data = await req.json();
        const parsed = FeedbackSchema.parse(data);

        const feedback = await prisma.feedback.create({
            data: {
                date: new Date(parsed.date),
                content: parsed.content,
                tag: parsed.tag,
                type: parsed.type,
                origin: parsed.origin,
                collaboratorId: parsed.collaboratorId,
                coordinatorId: session.user.id
            }
        });

        return NextResponse.json(feedback, { status: 201 });
    } catch (error: unknown) {
        if (error instanceof z.ZodError)
            return NextResponse.json({ error: "Erro de Validação", details: error.issues }, { status: 400 });
        console.error("[POST /api/feedback]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
