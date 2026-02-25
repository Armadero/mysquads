import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { FeedbackSchema } from "@/lib/schemas";
import { z } from "zod";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.user_metadata?.type !== "COORDINATOR")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { id } = await params;
        const data = await req.json();
        const parsed = FeedbackSchema.parse(data);

        const { data: feedback, error } = await supabase
            .from('Feedback')
            .update({
                date: new Date(parsed.date).toISOString(),
                content: parsed.content,
                tag: parsed.tag,
                type: parsed.type,
                origin: parsed.origin,
                collaboratorId: parsed.collaboratorId
            })
            .eq('id', id)
            .eq('coordinatorId', user.id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(feedback);
    } catch (error: unknown) {
        if (error instanceof z.ZodError)
            return NextResponse.json({ error: "Validation Error", details: error.issues }, { status: 400 });
        console.error("[PUT /api/feedback/:id]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.user_metadata?.type !== "COORDINATOR")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { id } = await params;
        const { error } = await supabase
            .from('Feedback')
            .delete()
            .eq('id', id)
            .eq('coordinatorId', user.id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("[DELETE /api/feedback/:id]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
