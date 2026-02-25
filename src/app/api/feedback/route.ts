import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { FeedbackSchema } from "@/lib/schemas";
import { z } from "zod";

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || (user.user_metadata?.type !== "COORDINATOR" && user.user_metadata?.type !== "MANAGER"))
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        let feedbacks = [];

        if (user.user_metadata?.type === "COORDINATOR") {
            const { data } = await supabase
                .from('Feedback')
                .select(`
                    *,
                    collaborator:Collaborator!collaboratorId(id, name, photoUrl, role:Role(name)),
                    coordinator:User!coordinatorId(name)
                `)
                .eq('coordinatorId', user.id)
                .order('date', { ascending: false });
            feedbacks = data || [];
        } else {
            // MANAGER: Find approved coordinators
            const { data: links } = await supabase
                .from('ManagerCoordinatorLink')
                .select('coordinatorId')
                .eq('managerId', user.id)
                .eq('status', 'APPROVED');

            const coordinatorIds = links?.map(l => l.coordinatorId) || [];

            if (coordinatorIds.length > 0) {
                const { data } = await supabase
                    .from('Feedback')
                    .select(`
                        *,
                        collaborator:Collaborator!collaboratorId(id, name, photoUrl, role:Role(name)),
                        coordinator:User!coordinatorId(name)
                    `)
                    .in('coordinatorId', coordinatorIds)
                    .order('date', { ascending: false });
                feedbacks = data || [];
            }
        }

        return NextResponse.json(feedbacks);
    } catch (error) {
        console.error("[GET /api/feedback]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.user_metadata?.type !== "COORDINATOR")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const data = await req.json();
        const parsed = FeedbackSchema.parse(data);

        const { data: feedback, error } = await supabase
            .from('Feedback')
            .insert({
                date: new Date(parsed.date).toISOString(),
                content: parsed.content,
                tag: parsed.tag,
                type: parsed.type,
                origin: parsed.origin,
                collaboratorId: parsed.collaboratorId,
                coordinatorId: user.id
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(feedback, { status: 201 });
    } catch (error: unknown) {
        if (error instanceof z.ZodError)
            return NextResponse.json({ error: "Erro de Validação", details: error.issues }, { status: 400 });
        console.error("[POST /api/feedback]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
