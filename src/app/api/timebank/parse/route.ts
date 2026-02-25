import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.user_metadata?.type !== "COORDINATOR") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const collaboratorId = formData.get("collaboratorId") as string;

        if (!file || !collaboratorId) return NextResponse.json({ error: "Missing file or collaborator" }, { status: 400 });

        const fileBuffer = Buffer.from(await file.arrayBuffer());
        let simulatedHours = 0;

        // Determine logic
        if (typeof Buffer !== "undefined" && fileBuffer) {
            try {
                // By doing a strictly dynamic require inside the function, NextJS build ignores it
                const pdfParse = require("pdf-parse/lib/pdf-parse.js");
                const data = await pdfParse(fileBuffer);
                simulatedHours = data.numpages * 2.5; // Stupid simple stub 
            } catch (e) {
                console.log("PDF parse failed natively", e);
            }
        }

        const parsedEntries = [];
        const simulatedDate = new Date();
        const simulatedExp = new Date();
        simulatedExp.setDate(simulatedDate.getDate() + 25); // Expires in 25 days (alert trigger)

        parsedEntries.push({
            date: new Date().toISOString(),
            expirationDate: simulatedExp.toISOString(),
            balanceHours: 10.5,
            collaboratorId
        });

        // Save to DB
        if (parsedEntries.length > 0) {
            const { error: insertError } = await supabase
                .from("TimeBankEntry")
                .insert(parsedEntries);

            if (insertError) throw insertError;
        }

        return NextResponse.json({ success: true, count: parsedEntries.length });
    } catch (error) {
        console.error("[POST /api/timebank/parse]", error);
        return NextResponse.json({ error: "Failed to parse PDF" }, { status: 500 });
    }
}
