import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const LinkRequestSchema = z.object({
    coordinatorId: z.string().min(1, "Coordinator ID is required"),
});

const LinkUpdateSchema = z.object({
    id: z.string().min(1),
    status: z.enum(["APPROVED", "REJECTED"]),
});

export async function POST(req: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.user_metadata?.type !== "MANAGER")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const data = await req.json();
        const parsed = LinkRequestSchema.parse(data);

        const { data: link, error } = await supabase
            .from('ManagerCoordinatorLink')
            .insert({
                managerId: user.id,
                coordinatorId: parsed.coordinatorId
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(link, { status: 201 });
    } catch (error: unknown) {
        if (error instanceof z.ZodError)
            return NextResponse.json({ error: "Validation Error", details: error.issues }, { status: 400 });
        // Silently handle duplicate link (unique constraint violation)
        return NextResponse.json({ error: "Already requested or error" }, { status: 400 });
    }
}

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (user.user_metadata?.type === "MANAGER") {
        const { data: links } = await supabase
            .from('ManagerCoordinatorLink')
            .select(`
                *,
                coordinator:User!coordinatorId(id, name, email)
            `)
            .eq('managerId', user.id);

        return NextResponse.json(links || []);
    } else {
        const { data: links } = await supabase
            .from('ManagerCoordinatorLink')
            .select(`
                *,
                manager:User!managerId(id, name, email)
            `)
            .eq('coordinatorId', user.id)
            .eq('status', 'PENDING');

        return NextResponse.json(links || []);
    }
}

export async function PUT(req: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.user_metadata?.type !== "COORDINATOR")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const data = await req.json();
        const parsed = LinkUpdateSchema.parse(data);

        const { data: link, error } = await supabase
            .from('ManagerCoordinatorLink')
            .update({ status: parsed.status })
            .eq('id', parsed.id)
            .eq('coordinatorId', user.id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(link);
    } catch (error: unknown) {
        if (error instanceof z.ZodError)
            return NextResponse.json({ error: "Validation Error", details: error.issues }, { status: 400 });
        console.error("[PUT /api/links]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
