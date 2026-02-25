import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.user_metadata?.type !== "COORDINATOR") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();

    const { data: squad, error } = await supabase
        .from("Squad")
        .update({
            name: data.name,
            jiraLink: data.jiraLink || null,
            confluenceLink: data.confluenceLink || null,
            sprintStart: data.sprintStart ? new Date(data.sprintStart).toISOString() : null,
            sprintDays: Number(data.sprintDays) || 14,
        })
        .eq("id", id)
        .eq("coordinatorId", user.id)
        .select()
        .single();

    if (error) {
        console.error("[PUT /api/squads/:id]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }

    return NextResponse.json(squad);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.user_metadata?.type !== "COORDINATOR") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete relations first
    const { error: collabError } = await supabase
        .from("SquadCollaborator")
        .delete()
        .eq("squadId", id);

    if (collabError) {
        console.error("[DELETE /api/squads/:id] collabError", collabError);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }

    const { error } = await supabase
        .from("Squad")
        .delete()
        .eq("id", id)
        .eq("coordinatorId", user.id);

    if (error) {
        console.error("[DELETE /api/squads/:id]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}

