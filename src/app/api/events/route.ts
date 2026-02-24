import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EventSchema } from "@/lib/schemas";

export async function GET(_req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.type !== "COORDINATOR") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const events = await prisma.integrationEvent.findMany({
        where: { coordinatorId: session.user.id },
        include: {
            collaborators: { include: { collaborator: true } }
        },
        orderBy: { startDate: "desc" }
    });

    return NextResponse.json(events);
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.type !== "COORDINATOR") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const data = await req.json();
        const parsed = EventSchema.parse(data);

        const event = await prisma.integrationEvent.create({
            data: {
                startDate: new Date(parsed.startDate),
                endDate: new Date(parsed.endDate),
                coordinatorId: session.user.id,
                collaborators: {
                    create: parsed.collaboratorIds.map((id: string) => ({ collaboratorId: id }))
                }
            }
        });

        return NextResponse.json(event);
    } catch (error: any) {
        if (error.name === "ZodError") {
            return NextResponse.json({ error: "Validation Error", details: error.issues }, { status: 400 });
        }
        console.error(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
