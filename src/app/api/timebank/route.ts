import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Next.js Turbopack edge polyfills for pdf.js / pdf-parse
if (typeof globalThis.DOMMatrix === 'undefined') {
    (globalThis as any).DOMMatrix = class DOMMatrix { };
}
if (typeof globalThis.ImageData === 'undefined') {
    (globalThis as any).ImageData = class ImageData { };
}
if (typeof globalThis.Path2D === 'undefined') {
    (globalThis as any).Path2D = class Path2D { };
}

const pdfParse = require("pdf-parse/lib/pdf-parse.js");
import { parse, isValid } from "date-fns";

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.user_metadata?.type !== "COORDINATOR")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: entries, error } = await supabase
        .from('TimeBankEntry')
        .select(`
            *,
            collaborator:Collaborator!inner(id, name, coordinatorId)
        `)
        .eq('collaborator.coordinatorId', user.id)
        .order('expirationDate', { ascending: true });

    if (error) {
        console.error("Error fetching timebank entries", error);
        return NextResponse.json({ error: "Failed to fetch entries" }, { status: 500 });
    }

    return NextResponse.json(entries || []);
}

export async function POST(req: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.user_metadata?.type !== "COORDINATOR") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const pdfData = await pdfParse(buffer);
        const fullText = pdfData.text;

        const lines = fullText.split('\n').map((l: string) => l.trim()).filter(Boolean);

        // Regex patterns based on extracted layout
        // Example: "207 - ANA PAULA MATTJE"
        const headerRegex = /^\d+\s*-\s*(.+)$/;

        // Example: "04/02/202600000:0704/07/2026" or "16/02/202600008:00-16/07/2026"
        // Groups: 1(Event Date), 2(hh:mm), 3(Negative flag '-'), 4(Expiration Date)
        const entryRegex = /^(\d{2}\/\d{2}\/\d{4})\d+?(\d{1,3}:\d{2})(-)? (\d{2}\/\d{2}\/\d{4})$/;

        let currentCollaboratorName = "";
        const parsedEntries: { collabName: string, date: Date, expiration: Date, balance: number }[] = [];

        for (const line of lines) {
            const headerMatch = line.match(headerRegex);
            if (headerMatch) {
                currentCollaboratorName = headerMatch[1].trim();
                continue;
            }

            if (currentCollaboratorName) {
                const entryMatch = line.match(entryRegex);
                if (entryMatch) {
                    const dateStr = entryMatch[1];
                    const timeStr = entryMatch[2]; // "HH:MM"
                    const isNegative = !!entryMatch[3]; // "-"
                    const expirationStr = entryMatch[4];

                    const date = parse(dateStr, "dd/MM/yyyy", new Date());
                    const expiration = parse(expirationStr, "dd/MM/yyyy", new Date());

                    if (isValid(date) && isValid(expiration)) {
                        const [hoursStr, minutesStr] = timeStr.split(':');
                        const hours = parseInt(hoursStr, 10);
                        const minutes = parseInt(minutesStr, 10);

                        let decimalBalance = hours + (minutes / 60);
                        if (isNegative) {
                            decimalBalance = -decimalBalance;
                        }

                        parsedEntries.push({
                            collabName: currentCollaboratorName,
                            date,
                            expiration,
                            balance: decimalBalance
                        });
                    }
                }
            }
        }

        // Fetch all active collaborators for this coordinator
        const { data: activeCollaborators } = await supabase
            .from('Collaborator')
            .select('id, name')
            .eq('coordinatorId', user.id);

        const collabIds = activeCollaborators?.map(c => c.id) || [];

        // Delete previous entries entirely so the document acts as a fresh truth snapshot
        if (collabIds.length > 0) {
            await supabase
                .from('TimeBankEntry')
                .delete()
                .in('collaboratorId', collabIds);
        }

        const newEntries = [];

        for (const entry of parsedEntries) {
            // Fuzzy search exact or case-insensitive match for the name
            const matchingCollab = activeCollaborators?.find(
                col => col.name.trim().toLowerCase() === entry.collabName.trim().toLowerCase() ||
                    col.name.trim().toLowerCase().includes(entry.collabName.trim().toLowerCase()) ||
                    entry.collabName.trim().toLowerCase().includes(col.name.trim().toLowerCase())
            );

            if (matchingCollab) {
                newEntries.push({
                    collaboratorId: matchingCollab.id,
                    date: entry.date.toISOString(),
                    expirationDate: entry.expiration.toISOString(),
                    balanceHours: entry.balance
                });
            }
        }

        if (newEntries.length > 0) {
            await supabase
                .from('TimeBankEntry')
                .insert(newEntries);
        }

        return NextResponse.json({
            success: true,
            message: `Processed ${parsedEntries.length} entries, saved ${newEntries.length} valid active entries.`
        });

    } catch (error) {
        console.error("PDF Processing error: ", error);
        return NextResponse.json({ error: "Failed to process PDF" }, { status: 500 });
    }
}



