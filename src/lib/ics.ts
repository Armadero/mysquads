import { getDayUTC, getMonthUTC } from "@/lib/utils";

export interface BirthdayIcsPerson {
    id?: number | string;
    name: string;
    birthDate?: string | Date | null;
}

const pad = (n: number, len = 2) => String(n).padStart(len, "0");

/** Escapa texto conforme RFC 5545 §3.3.11. */
function escapeText(value: string): string {
    return value
        .replace(/\\/g, "\\\\")
        .replace(/;/g, "\;")
        .replace(/,/g, "\\,")
        .replace(/\r?\n/g, "\\n");
}

/** Dobra linhas em 75 octetos (RFC 5545 §3.1), sem quebrar caracteres multibyte. */
function foldLine(line: string): string {
    const encoder = new TextEncoder();
    if (encoder.encode(line).length <= 75) return line;
    const parts: string[] = [];
    let current = "";
    let size = 0;
    for (const ch of line) {
        const chSize = encoder.encode(ch).length;
        // Linhas de continuação começam com um espaço (1 octeto).
        const limit = parts.length === 0 ? 75 : 74;
        if (size + chSize > limit) {
            parts.push(current);
            current = ch;
            size = chSize;
        } else {
            current += ch;
            size += chSize;
        }
    }
    parts.push(current);
    return parts.join("\r\n ");
}

function icsDate(year: number, month: number, day: number): string {
    return `${pad(year, 4)}${pad(month)}${pad(day)}`;
}

/**
 * Gera um calendário iCalendar (.ics) com um evento de dia inteiro, repetido
 * anualmente, para cada aniversariante. Colaboradores sem data de nascimento
 * válida são ignorados. Quem nasceu em 29/02 comemora em 28/02 nos anos não
 * bissextos.
 */
export function buildBirthdaysIcs(
    people: BirthdayIcsPerson[],
    options: { year?: number; now?: Date; calendarName?: string } = {}
): string {
    const now = options.now ?? new Date();
    const year = options.year ?? now.getUTCFullYear();
    const stamp =
        `${icsDate(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate())}` +
        `T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

    const lines: string[] = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//MySquads//Aniversarios//PT-BR",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        `X-WR-CALNAME:${escapeText(options.calendarName ?? "Aniversários MySquads")}`,
    ];

    const seen = new Set<string>();
    people.forEach((p, index) => {
        const month = getMonthUTC(p.birthDate);
        const day = getDayUTC(p.birthDate);
        if (month === null || day === null || !p.name) return;

        const m = month + 1;
        const uid = `birthday-${p.id ?? index}-${pad(m)}${pad(day)}@mysquads`;
        if (seen.has(uid)) return;
        seen.add(uid);

        const leapDay = m === 2 && day === 29;
        // DTSTART precisa ser uma data válida: em ano não bissexto usa 28/02.
        const isLeapYear = new Date(Date.UTC(year, 1, 29)).getUTCMonth() === 1;
        const startDay = leapDay && !isLeapYear ? 28 : day;
        const start = new Date(Date.UTC(year, m - 1, startDay));
        const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

        lines.push(
            "BEGIN:VEVENT",
            `UID:${uid}`,
            `DTSTAMP:${stamp}`,
            `DTSTART;VALUE=DATE:${icsDate(start.getUTCFullYear(), start.getUTCMonth() + 1, start.getUTCDate())}`,
            `DTEND;VALUE=DATE:${icsDate(end.getUTCFullYear(), end.getUTCMonth() + 1, end.getUTCDate())}`,
            leapDay
                ? "RRULE:FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=28,29;BYSETPOS=-1"
                : "RRULE:FREQ=YEARLY",
            `SUMMARY:${escapeText(`🎂 Aniversário de ${p.name}`)}`,
            "TRANSP:TRANSPARENT",
            "END:VEVENT"
        );
    });

    lines.push("END:VCALENDAR");
    return lines.map(foldLine).join("\r\n") + "\r\n";
}
