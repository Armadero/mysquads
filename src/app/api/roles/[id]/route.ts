import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const RoleUpdateSchema = z.object({
    name: z.string().min(1, "Name is required"),
    defaultColor: z.string().optional(),
    qtyPerSquad: z.number().int().min(1).default(1),
    maxSquads: z.number().int().min(1).optional(),
    multipleSquads: z.boolean().optional().default(false),
    order: z.number().int().optional().default(0),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || session.user.type !== "COORDINATOR")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const data = await req.json();
        const parsed = RoleUpdateSchema.parse(data);

        const role = await prisma.role.update({
            where: { id, coordinatorId: session.user.id },
            data: {
                name: parsed.name,
                defaultColor: parsed.defaultColor,
                qtyPerSquad: parsed.qtyPerSquad,
                maxSquads: parsed.maxSquads,
                multipleSquads: parsed.multipleSquads,
                order: parsed.order,
            }
        });

        return NextResponse.json(role);
    } catch (error: unknown) {
        if (error instanceof z.ZodError)
            return NextResponse.json({ error: "Validation Error", details: error.issues }, { status: 400 });
        console.error("[PUT /api/roles/:id]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || session.user.type !== "COORDINATOR")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        await prisma.role.delete({
            where: { id, coordinatorId: session.user.id }
        });

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("[DELETE /api/roles/:id]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
