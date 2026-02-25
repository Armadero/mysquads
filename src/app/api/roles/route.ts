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

const RoleSchema = z.object({
    name: RoleTypeEnum,
    defaultColor: z.string().optional().default("#cccccc"),
    qtyPerSquad: z.number().int().min(1).default(1),
    maxSquads: z.number().int().min(1).optional().default(1),
    multipleSquads: z.boolean().optional().default(false),
    order: z.number().int().optional().default(0),
});

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.user_metadata?.type !== "COORDINATOR") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: roles, error } = await supabase
        .from("Role")
        .select("*")
        .eq("coordinatorId", user.id);

    if (error) {
        console.error("[GET /api/roles]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }

    return NextResponse.json(roles);
}

export async function POST(req: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.user_metadata?.type !== "COORDINATOR") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const data = await req.json();
        const parsed = RoleSchema.parse(data);

        const { data: role, error } = await supabase
            .from("Role")
            .insert({
                name: parsed.name,
                defaultColor: parsed.defaultColor,
                qtyPerSquad: parsed.qtyPerSquad,
                maxSquads: parsed.maxSquads,
                multipleSquads: parsed.multipleSquads,
                order: parsed.order,
                coordinatorId: user.id
            })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(role, { status: 201 });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Validation Error", details: error.issues }, { status: 400 });
        }
        console.error("[POST /api/roles]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

