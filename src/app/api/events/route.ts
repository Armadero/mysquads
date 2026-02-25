import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { EventSchema } from "@/lib/schemas";
import { z } from "zod";

export async function GET(_req: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.user_metadata?.type !== "COORDINATOR") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: events, error } = await supabase
        .from("IntegrationEvent")
        .select(`
      *,
      collaborators:IntegrationEventCollaborator(
        collaborator:Collaborator(*)
      )
    `)
        .eq("coordinatorId", user.id)
        .order("startDate", { ascending: false });

    if (error) {
        console.error("[GET /api/events]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }

    return NextResponse.json(events || []);
}

export async function POST(req: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.user_metadata?.type !== "COORDINATOR") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const data = await req.json();
        const parsed = EventSchema.parse(data);

        // 1. Create the event
        const { data: event, error: eventError } = await supabase
            .from("IntegrationEvent")
            .insert({
                startDate: new Date(parsed.startDate).toISOString(),
                endDate: new Date(parsed.endDate).toISOString(),
                coordinatorId: user.id,
            })
            .select()
            .single();

        if (eventError) throw eventError;

        // 2. Attach the collaborators directly
        if (parsed.collaboratorIds && parsed.collaboratorIds.length > 0) {
            const inserts = parsed.collaboratorIds.map((id: string) => ({
                eventId: event.id,
                collaboratorId: id
            }));

            const { error: attachError } = await supabase
                .from("IntegrationEventCollaborator")
                .insert(inserts);

            if (attachError) throw attachError;
        }

        return NextResponse.json(event);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Validation Error", details: error.issues }, { status: 400 });
        }
        console.error("[POST /api/events]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
