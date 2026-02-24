import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const LinkRequestSchema = z.object({
    coordinatorId: z.string().min(1, "Coordinator ID is required"),
});

const LinkUpdateSchema = z.object({
    id: z.string().min(1),
    status: z.enum(["APPROVED", "REJECTED"]),
});

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.type !== "MANAGER")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const data = await req.json();
        const parsed = LinkRequestSchema.parse(data);

        const link = await prisma.managerCoordinatorLink.create({
            data: {
                managerId: session.user.id,
                coordinatorId: parsed.coordinatorId
            }
        });

        return NextResponse.json(link, { status: 201 });
    } catch (error: unknown) {
        if (error instanceof z.ZodError)
            return NextResponse.json({ error: "Validation Error", details: error.issues }, { status: 400 });
        // Silently handle duplicate link (unique constraint violation)
        return NextResponse.json({ error: "Already requested or error" }, { status: 400 });
    }
}

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (session.user.type === "MANAGER") {
        const links = await prisma.managerCoordinatorLink.findMany({
            where: { managerId: session.user.id },
            include: { coordinator: { select: { id: true, name: true, email: true } } }
        });
        return NextResponse.json(links);
    } else {
        const links = await prisma.managerCoordinatorLink.findMany({
            where: { coordinatorId: session.user.id, status: "PENDING" },
            include: { manager: { select: { id: true, name: true, email: true } } }
        });
        return NextResponse.json(links);
    }
}

export async function PUT(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.type !== "COORDINATOR")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const data = await req.json();
        const parsed = LinkUpdateSchema.parse(data);

        const link = await prisma.managerCoordinatorLink.update({
            where: { id: parsed.id, coordinatorId: session.user.id },
            data: { status: parsed.status }
        });

        return NextResponse.json(link);
    } catch (error: unknown) {
        if (error instanceof z.ZodError)
            return NextResponse.json({ error: "Validation Error", details: error.issues }, { status: 400 });
        console.error("[PUT /api/links]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
