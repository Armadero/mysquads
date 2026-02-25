import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const SquadSchema = z.object({
    name: z.string().min(1, "Name is required"),
    jiraLink: z.string().url("Invalid URL").optional().or(z.literal("")),
    confluenceLink: z.string().url("Invalid URL").optional().or(z.literal("")),
    sprintStart: z.string().optional().nullable(),
    sprintDays: z.number().int().min(1).optional().default(14),
});

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let coordinatorIds: string[] = [];
    const type = user.user_metadata?.type;

    if (type === "COORDINATOR") {
        coordinatorIds = [user.id];
    } else if (type === "MANAGER") {
        const { data: links } = await supabase
            .from("ManagerCoordinatorLink")
            .select("coordinatorId")
            .eq("managerId", user.id)
            .eq("status", "APPROVED");

        if (links) {
            coordinatorIds = links.map(link => link.coordinatorId);
        }
    } else {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (coordinatorIds.length === 0) {
        return NextResponse.json([]);
    }

    const { data: squads, error } = await supabase
        .from("Squad")
        .select(`
      *,
      collaborators:SquadCollaborator(
        collaborator:Collaborator(
          *,
          role:Role(*)
        )
      )
    `)
        .in("coordinatorId", coordinatorIds);

    if (error) {
        console.error("[GET /api/squads]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }

    const flattened = (squads || []).map((s: any) => ({
        ...s,
        collaborators: (s.collaborators || []).map((c: any) => ({ ...c.collaborator }))
    }));

    return NextResponse.json(flattened);
}

export async function POST(req: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.user_metadata?.type !== "COORDINATOR") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const data = await req.json();
        const parsed = SquadSchema.parse(data);

        const { data: squad, error } = await supabase
            .from("Squad")
            .insert({
                name: parsed.name,
                jiraLink: parsed.jiraLink || null,
                confluenceLink: parsed.confluenceLink || null,
                sprintStart: parsed.sprintStart ? new Date(parsed.sprintStart).toISOString() : null,
                sprintDays: parsed.sprintDays,
                coordinatorId: user.id
            })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(squad, { status: 201 });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Validation Error", details: error.issues }, { status: 400 });
        }
        console.error("[POST /api/squads]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
