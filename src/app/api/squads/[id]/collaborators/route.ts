import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.user_metadata?.type !== "COORDINATOR") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { collaboratorIds } = await req.json(); // Array of strings

    // Verify squad belongs to coordinator
    const { data: squad, error: squadError } = await supabase
        .from("Squad")
        .select("id")
        .eq("id", id)
        .eq("coordinatorId", user.id)
        .single();

    if (squadError || !squad) {
        return NextResponse.json({ error: "Squad not found" }, { status: 404 });
    }

    // Replace members
    const { error: deleteError } = await supabase
        .from("SquadCollaborator")
        .delete()
        .eq("squadId", id);

    if (deleteError) {
        console.error("[PUT /api/squads/:id/collaborators] deleteError", deleteError);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }

    if (collaboratorIds && collaboratorIds.length > 0) {
        const inserts = collaboratorIds.map((collabId: string) => ({
            squadId: id,
            collaboratorId: collabId
        }));

        const { error: insertError } = await supabase
            .from("SquadCollaborator")
            .insert(inserts);

        if (insertError) {
            console.error("[PUT /api/squads/:id/collaborators] insertError", insertError);
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
        }
    }

    return NextResponse.json({ success: true });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.user_metadata?.type !== "COORDINATOR") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { collaboratorId } = await req.json();

    // Verify squad belongs to coordinator
    const { data: squad, error: squadError } = await supabase
        .from("Squad")
        .select("id")
        .eq("id", id)
        .eq("coordinatorId", user.id)
        .single();

    if (squadError || !squad) {
        return NextResponse.json({ error: "Squad not found" }, { status: 404 });
    }

    // Add collaborator if not already in squad
    const { data: existing } = await supabase
        .from("SquadCollaborator")
        .select("id")
        .eq("squadId", id)
        .eq("collaboratorId", collaboratorId)
        .single();

    if (!existing) {
        const { error: insertError } = await supabase
            .from("SquadCollaborator")
            .insert({
                squadId: id,
                collaboratorId
            });

        if (insertError) {
            console.error("[POST /api/squads/:id/collaborators] insertError", insertError);
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
        }
    }

    // You can fetch and return the assignment if needed, we'll return a simple success
    return NextResponse.json({ success: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.user_metadata?.type !== "COORDINATOR") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { collaboratorId } = await req.json();

    const { error } = await supabase
        .from("SquadCollaborator")
        .delete()
        .eq("squadId", id)
        .eq("collaboratorId", collaboratorId);

    if (error) {
        console.error("[DELETE /api/squads/:id/collaborators]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
