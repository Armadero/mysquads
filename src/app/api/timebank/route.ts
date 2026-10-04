import { NextResponse } from "next/server";
import { queryAll, execute, transaction } from "@/lib/db";
import { handleApiError, badRequest } from "@/lib/api/responses";
import { requireCoordinator } from "@/lib/auth/guards";
import { parse, isValid, differenceInDays } from "date-fns";

// Next.js / Turbopack polyfills for pdf.js / pdf-parse (server-side usage)
const g = globalThis as unknown as {
    DOMMatrix?: unknown;
    ImageData?: unknown;
    Path2D?: unknown;
};
if (typeof g.DOMMatrix === "undefined") g.DOMMatrix = class DOMMatrix {};
if (typeof g.ImageData === "undefined") g.ImageData = class ImageData {};
if (typeof g.Path2D === "undefined") g.Path2D = class Path2D {};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse: (buf: Buffer) => Promise<{ text: string }> = require("pdf-parse/lib/pdf-parse.js");

interface TimeBankEntryRow {
    id: number;
    name: string;
    photoUrl: string | null;
    balanceHours: number;
    date: string;
    expirationDate: string;
    collaboratorId: number;
}

/** Saldo (em módulo) a partir do qual a entrada é considerada crítica. */
const HIGH_BALANCE_HOURS = 40;
/** Janela de expiração (em dias) que dispara alerta. */
const EXPIRING_WINDOW_DAYS = 30;

interface CollaboratorRow {
    id: number;
    name: string;
}

interface ParsedEntry {
    collabName: string;
    date: Date;
    expiration: Date;
    balance: number;
}

// Regex patterns based on the PDF layout produced by the HR system.
// Header example: "207 - ANA PAULA MATTJE"
const HEADER_REGEX = /^\d+\s*-\s*(.+)$/;
// Entry example: "04/02/202600000:0704/07/2026" / "16/02/202600008:00-16/07/2026"
// Groups: (1) event date, (2) HH:MM, (3) optional "-" negative flag, (4) expiration date
const ENTRY_REGEX =
    /^(\d{2}\/\d{2}\/\d{4})\d+?(\d{1,3}:\d{2})(-)? (\d{2}\/\d{2}\/\d{4})$/;

function parseEntries(text: string): ParsedEntry[] {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const entries: ParsedEntry[] = [];
    let currentCollaboratorName = "";

    for (const line of lines) {
        const headerMatch = line.match(HEADER_REGEX);
        if (headerMatch) {
            currentCollaboratorName = headerMatch[1].trim();
            continue;
        }

        if (!currentCollaboratorName) continue;

        const entryMatch = line.match(ENTRY_REGEX);
        if (!entryMatch) continue;

        const [, dateStr, timeStr, negativeFlag, expirationStr] = entryMatch;
        const date = parse(dateStr, "dd/MM/yyyy", new Date());
        const expiration = parse(expirationStr, "dd/MM/yyyy", new Date());

        if (!isValid(date) || !isValid(expiration)) continue;

        const [hoursStr, minutesStr] = timeStr.split(":");
        const hours = parseInt(hoursStr, 10);
        const minutes = parseInt(minutesStr, 10);
        let decimalBalance = hours + minutes / 60;
        if (negativeFlag) decimalBalance = -decimalBalance;

        entries.push({
            collabName: currentCollaboratorName,
            date,
            expiration,
            balance: decimalBalance,
        });
    }

    return entries;
}

function findCollaborator(
    collaborators: CollaboratorRow[],
    name: string
): CollaboratorRow | undefined {
    const target = name.trim().toLowerCase();
    return collaborators.find((c) => {
        const candidate = c.name.trim().toLowerCase();
        return (
            candidate === target ||
            candidate.includes(target) ||
            target.includes(candidate)
        );
    });
}

/**
 * GET /api/timebank
 *
 * Devolve os alertas já formatados para a tela ({ name, balance, daysLeft }).
 * Antes eram devolvidas as linhas cruas da tabela, e a tela quebrava lendo
 * `alert.name` — que não existia — assim que houvesse qualquer lançamento.
 */
export async function GET() {
    try {
        const session = await requireCoordinator();

        const entries = queryAll<TimeBankEntryRow>(
            `SELECT t.id, t.collaboratorId, t.date, t.expirationDate, t.balanceHours,
                    c.name, c.photoUrl
             FROM TimeBankEntry t
             JOIN Collaborator c ON t.collaboratorId = c.id
             WHERE c.coordinatorId = ?
             ORDER BY t.expirationDate ASC`,
            [session.sub]
        );

        const today = new Date();

        const alerts = entries
            .map((e) => {
                const daysLeft = differenceInDays(new Date(e.expirationDate), today);
                const expiring = daysLeft >= 0 && daysLeft <= EXPIRING_WINDOW_DAYS;
                const highBalance = Math.abs(e.balanceHours) >= HIGH_BALANCE_HOURS;

                return {
                    id: e.id,
                    collaboratorId: e.collaboratorId,
                    name: e.name,
                    photoUrl: e.photoUrl,
                    // Arredonda para 1 casa: 8.333333333h ficava ilegível na tabela
                    balance: Math.round(e.balanceHours * 10) / 10,
                    daysLeft,
                    date: e.date,
                    expirationDate: e.expirationDate,
                    expiring,
                    highBalance,
                };
            })
            .filter((a) => a.expiring || a.highBalance)
            .sort((a, b) => a.daysLeft - b.daysLeft);

        return NextResponse.json(alerts);
    } catch (err) {
        return handleApiError("GET /api/timebank", err);
    }
}

export async function POST(req: Request) {
    try {
        const session = await requireCoordinator();

        const formData = await req.formData();
        const file = formData.get("file");
        if (!(file instanceof File)) {
            return badRequest("Nenhum arquivo enviado.");
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const pdfData = await pdfParse(buffer);
        const parsedEntries = parseEntries(pdfData.text);

        const activeCollaborators = queryAll<CollaboratorRow>(
            "SELECT id, name FROM Collaborator WHERE coordinatorId = ?",
            [session.sub]
        );
        const collabIds = activeCollaborators.map((c) => c.id);

        // Match parsed entries against active collaborators
        const newEntries = parsedEntries
            .map((entry) => {
                const match = findCollaborator(activeCollaborators, entry.collabName);
                if (!match) return null;
                return {
                    collaboratorId: match.id,
                    date: entry.date.toISOString(),
                    expirationDate: entry.expiration.toISOString(),
                    balanceHours: entry.balance,
                };
            })
            .filter((e): e is NonNullable<typeof e> => e !== null);

        // Atomic replace: delete prior snapshot for this coordinator's collaborators, then insert new
        transaction(() => {
            if (collabIds.length > 0) {
                const placeholders = collabIds.map(() => "?").join(",");
                execute(
                    `DELETE FROM TimeBankEntry WHERE collaboratorId IN (${placeholders})`,
                    collabIds
                );
            }
            for (const entry of newEntries) {
                execute(
                    `INSERT INTO TimeBankEntry (collaboratorId, date, expirationDate, balanceHours)
                     VALUES (?, ?, ?, ?)`,
                    [entry.collaboratorId, entry.date, entry.expirationDate, entry.balanceHours]
                );
            }
        });

        const ignored = parsedEntries.length - newEntries.length;
        return NextResponse.json({
            success: true,
            message:
                `${parsedEntries.length} lançamento(s) lido(s) no PDF, ` +
                `${newEntries.length} vinculado(s) a colaboradores ativos` +
                (ignored > 0 ? ` — ${ignored} sem colaborador correspondente.` : "."),
        });
    } catch (err) {
        return handleApiError("POST /api/timebank", err);
    }
}
