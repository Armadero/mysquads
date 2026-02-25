import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CollaboratorSchema } from "@/lib/schemas";
import { z } from "zod";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.user_metadata?.type !== "COORDINATOR")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const data = await req.json();
        const parsed = CollaboratorSchema.parse(data);
        const { email: collabEmail, roleId, matricula, ...rest } = parsed;

        const updateData = {
            ...rest,
            email: collabEmail ?? null,
            matricula: matricula || null,
            admissionDate: new Date(parsed.admissionDate).toISOString(),
            birthDate: parsed.birthDate ? new Date(parsed.birthDate).toISOString() : null,
            resignationDate: parsed.resignationDate ? new Date(parsed.resignationDate).toISOString() : null,
            roleId: roleId as string
        };

        const { data: collab, error } = await supabase
            .from('Collaborator')
            .update(updateData)
            .eq('id', id)
            .eq('coordinatorId', user.id)
            .select()
            .single();

        if (error) {
            if (error.code === '23505' && error.message.includes('matricula')) {
                return NextResponse.json({ error: "Esta matrícula já está em uso por outro colaborador." }, { status: 400 });
            }
            throw error;
        }

        return NextResponse.json(collab);
    } catch (error: any) {
        if (error instanceof z.ZodError)
            return NextResponse.json({ error: "Validation Error", details: error.issues }, { status: 400 });
        console.error("[PUT /api/collaborators/:id]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.user_metadata?.type !== "COORDINATOR")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { error } = await supabase
            .from('Collaborator')
            .delete()
            .eq('id', id)
            .eq('coordinatorId', user.id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("[DELETE /api/collaborators/:id]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
