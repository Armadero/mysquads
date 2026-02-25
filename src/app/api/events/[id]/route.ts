import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { EventSchema } from "@/lib/schemas";
import { z } from "zod";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.user_metadata?.type !== "COORDINATOR") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const data = await req.json();
        const parsed = EventSchema.parse(data);

        // Update basic info
        const { error: eventError } = await supabase
            .from("IntegrationEvent")
            .update({
                startDate: new Date(parsed.startDate).toISOString(),
                endDate: new Date(parsed.endDate).toISOString(),
            })
            .eq("id", id)
            .eq("coordinatorId", user.id); // Security: must be owner

        if (eventError) throw eventError;

        // Sync collaborators
        const { error: deleteError } = await supabase
            .from("IntegrationEventCollaborator")
            .delete()
            .eq("eventId", id);

        if (deleteError) throw deleteError;

        if (parsed.collaboratorIds.length > 0) {
            const inserts = parsed.collaboratorIds.map((collabId: string) => ({
                eventId: id,
                collaboratorId: collabId
            }));

            const { error: insertError } = await supabase
                .from("IntegrationEventCollaborator")
                .insert(inserts);

            if (insertError) throw insertError;
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Validation Error", details: error.issues }, { status: 400 });
        }
        console.error("[PUT /api/events/:id]", error);
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
        // If ON DELETE CASCADE is set in Supabase, this single call is enough.
        const { error } = await supabase
            .from("IntegrationEvent")
            .delete()
            .eq("id", id)
            .eq("coordinatorId", user.id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[DELETE /api/events/:id]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
