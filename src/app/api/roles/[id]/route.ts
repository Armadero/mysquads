import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const RoleTypeEnum = z.enum([
    "SCRUM_MASTER",
    "SYSTEM_ANALYST",
    "PRODUCT_OWNER",
    "DEVELOPER",
    "QA_ANALYST",
    "SPECIALIST",
    "BUSINESS_ANALYST",
    "PRODUCT_MANAGER"
]);

const RoleUpdateSchema = z.object({
    name: RoleTypeEnum,
    defaultColor: z.string().optional(),
    qtyPerSquad: z.number().int().min(1).default(1),
    maxSquads: z.number().int().min(1).optional(),
    multipleSquads: z.boolean().optional().default(false),
    order: z.number().int().optional().default(0),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.user_metadata?.type !== "COORDINATOR") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const data = await req.json();
        const parsed = RoleUpdateSchema.parse(data);

        const { data: role, error } = await supabase
            .from("Role")
            .update({
                name: parsed.name,
                defaultColor: parsed.defaultColor,
                qtyPerSquad: parsed.qtyPerSquad,
                maxSquads: parsed.maxSquads,
                multipleSquads: parsed.multipleSquads,
                order: parsed.order,
            })
            .eq("id", id)
            .eq("coordinatorId", user.id) // RLS handles this, but explicit is good
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(role);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Validation Error", details: error.issues }, { status: 400 });
        }
        console.error("[PUT /api/roles/:id]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.user_metadata?.type !== "COORDINATOR") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { error } = await supabase
            .from("Role")
            .delete()
            .eq("id", id)
            .eq("coordinatorId", user.id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[DELETE /api/roles/:id]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
