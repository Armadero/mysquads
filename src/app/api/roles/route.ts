import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const RoleSchema = z.object({
    name: z.string().min(1, "Name is required"),
    defaultColor: z.string().optional().default("#cccccc"),
    qtyPerSquad: z.number().int().min(1).default(1),
    maxSquads: z.number().int().min(1).optional().default(1),
    multipleSquads: z.boolean().optional().default(false),
    order: z.number().int().optional().default(0),
});

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.type !== "COORDINATOR")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const roles = await prisma.role.findMany({
        where: { coordinatorId: session.user.id }
    });

    return NextResponse.json(roles);
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.type !== "COORDINATOR")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const data = await req.json();
        const parsed = RoleSchema.parse(data);

        const role = await prisma.role.create({
            data: {
                name: parsed.name,
                defaultColor: parsed.defaultColor,
                qtyPerSquad: parsed.qtyPerSquad,
                maxSquads: parsed.maxSquads,
                multipleSquads: parsed.multipleSquads,
                order: parsed.order,
                coordinatorId: session.user.id
            }
        });

        return NextResponse.json(role, { status: 201 });
    } catch (error: unknown) {
        if (error instanceof z.ZodError)
            return NextResponse.json({ error: "Validation Error", details: error.issues }, { status: 400 });
        console.error("[POST /api/roles]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
