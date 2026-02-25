import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CollaboratorSchema } from "@/lib/schemas";
import { z } from "zod";

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let coordinatorIds: string[] = [];

    if (user.user_metadata?.type === "COORDINATOR") {
        coordinatorIds = [user.id];
    } else if (user.user_metadata?.type === "MANAGER") {
        const { data: links } = await supabase
            .from('ManagerCoordinatorLink')
            .select('coordinatorId')
            .eq('managerId', user.id)
            .eq('status', 'APPROVED');
        coordinatorIds = links?.map((link: any) => link.coordinatorId) || [];
    } else {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (coordinatorIds.length === 0) {
        return NextResponse.json([]);
    }

    const { data: collabs } = await supabase
        .from('Collaborator')
        .select(`
            *,
            role:Role(id, name, defaultColor),
            squads:SquadMember(squadId),
            events:CollaboratorEvent(eventId)
        `)
        .in('coordinatorId', coordinatorIds);

    return NextResponse.json(collabs || []);
}

export async function POST(req: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.user_metadata?.type !== "COORDINATOR")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const data = await req.json();
        const parsed = CollaboratorSchema.parse(data);
        const { email: collabEmail, roleId, matricula, ...rest } = parsed;

        const insertData = {
            ...rest,
            email: collabEmail ?? null,
            matricula: matricula || null,
            coordinatorId: user.id,
            admissionDate: new Date(parsed.admissionDate).toISOString(),
            birthDate: parsed.birthDate ? new Date(parsed.birthDate).toISOString() : null,
            resignationDate: parsed.resignationDate ? new Date(parsed.resignationDate).toISOString() : null,
            roleId: roleId as string
        };

        const { data: collab, error } = await supabase
            .from('Collaborator')
            .insert(insertData)
            .select()
            .single();

        if (error) {
            if (error.code === '23505' && error.message.includes('matricula')) {
                return NextResponse.json({ error: "Esta matrícula já está em uso por outro colaborador." }, { status: 400 });
            }
            throw error;
        }

        return NextResponse.json(collab, { status: 201 });
    } catch (error: any) {
        if (error instanceof z.ZodError)
            return NextResponse.json({ error: "Validation Error", details: error.issues }, { status: 400 });
        console.error("[POST /api/collaborators]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
