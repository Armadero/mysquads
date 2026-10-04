import { NextResponse } from "next/server";
import { queryAll } from "@/lib/db";
import { differenceInDays } from "date-fns";
import { getYearUTC, isSameMonthUTC, yearsSince } from "@/lib/utils";
import { handleApiError } from "@/lib/api/responses";
import { requireUser } from "@/lib/auth/guards";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Role {
    id: number;
    name: string;
    defaultColor: string;
}

interface Squad {
    id: number;
    name: string;
    memberCount: number;
}

interface TimeBankEntry {
    balanceHours: number;
    expirationDate: string;
}

interface Collaborator {
    id: number;
    name: string;
    admissionDate: string;
    birthDate: string | null;
    deliveryAddress: string | null;
    photoUrl: string | null;
    roleId: number | null;
    role: Role | null;
    squads: Squad[];
    events: { eventId: number }[];
    timeBankEntries: TimeBankEntry[];
}

interface CollabSummary {
    id: number;
    name: string;
    deliveryAddress: string | null;
    role: Role | null;
    photoUrl: string | null;
    squads: Squad[];
}

// ─── Metric builders ──────────────────────────────────────────────────────────

function buildCoordinatorMetrics(coordinatorId: string | number) {
    // One query per relation (was: N+1 per collaborator)
    const rawCollabs = queryAll<Record<string, unknown>>(
        `SELECT c.*,
                CASE WHEN r.id IS NOT NULL
                     THEN json_object('id', r.id, 'name', r.name, 'defaultColor', r.defaultColor)
                     ELSE NULL
                END as role
         FROM Collaborator c
         LEFT JOIN Role r ON c.roleId = r.id
         WHERE c.coordinatorId = ?`,
        [coordinatorId]
    );

    const collabIds = rawCollabs.map((c) => c.id as number);

    const squadMap = new Map<number, Squad[]>();
    const eventMap = new Map<number, { eventId: number }[]>();
    const timebankMap = new Map<number, TimeBankEntry[]>();

    if (collabIds.length > 0) {
        const placeholders = collabIds.map(() => "?").join(",");

        const squadRows = queryAll<{ collaboratorId: number } & Squad>(
            `SELECT sc.collaboratorId, s.*, 0 as memberCount
             FROM SquadCollaborator sc
             JOIN Squad s ON sc.squadId = s.id
             WHERE sc.collaboratorId IN (${placeholders})`,
            collabIds
        );
        for (const row of squadRows) {
            const list = squadMap.get(row.collaboratorId) || [];
            list.push(row);
            squadMap.set(row.collaboratorId, list);
        }

        const eventRows = queryAll<{ collaboratorId: number; eventId: number }>(
            `SELECT collaboratorId, eventId FROM IntegrationEventCollaborator
             WHERE collaboratorId IN (${placeholders})`,
            collabIds
        );
        for (const row of eventRows) {
            const list = eventMap.get(row.collaboratorId) || [];
            list.push({ eventId: row.eventId });
            eventMap.set(row.collaboratorId, list);
        }

        const timebankRows = queryAll<
            { collaboratorId: number } & TimeBankEntry
        >(
            `SELECT collaboratorId, balanceHours, expirationDate FROM TimeBankEntry
             WHERE collaboratorId IN (${placeholders})`,
            collabIds
        );
        for (const row of timebankRows) {
            const list = timebankMap.get(row.collaboratorId) || [];
            list.push({
                balanceHours: row.balanceHours,
                expirationDate: row.expirationDate,
            });
            timebankMap.set(row.collaboratorId, list);
        }
    }

    const collabList: Collaborator[] = rawCollabs.map((c) => {
        const id = c.id as number;
        return {
            id,
            name: c.name as string,
            admissionDate: c.admissionDate as string,
            birthDate: (c.birthDate as string) || null,
            deliveryAddress: (c.deliveryAddress as string) || null,
            photoUrl: (c.photoUrl as string) || null,
            roleId: (c.roleId as number) || null,
            role: c.role ? (JSON.parse(c.role as string) as Role) : null,
            squads: squadMap.get(id) || [],
            events: eventMap.get(id) || [],
            timeBankEntries: timebankMap.get(id) || [],
        };
    });

    const squadList = queryAll<Squad>(
        `SELECT s.id, s.name, COUNT(sc.id) as memberCount
         FROM Squad s
         LEFT JOIN SquadCollaborator sc ON sc.squadId = s.id
         WHERE s.coordinatorId = ?
         GROUP BY s.id`,
        [coordinatorId]
    );

    const roleList = queryAll<Role>(
        `SELECT id, name, defaultColor FROM Role WHERE coordinatorId = ?`,
        [coordinatorId]
    );

    const today = new Date();

    // Datas são gravadas como meia-noite UTC — ler em UTC evita o off-by-one
    // que jogava o dia 1º de cada mês para o mês anterior em fusos negativos.
    const companyAnniversaries = collabList.filter((c) => {
        const year = getYearUTC(c.admissionDate);
        return (
            isSameMonthUTC(c.admissionDate, today) &&
            year !== null &&
            year < today.getUTCFullYear()
        );
    });

    const birthdays = collabList.filter((c) => isSameMonthUTC(c.birthDate, today));

    const roleDistribution = roleList.map((r) => ({
        name: r.name,
        count: collabList.filter((c) => c.roleId === r.id).length,
    }));

    const squadSizes = squadList.map((s) => ({
        name: s.name,
        count: s.memberCount || 0,
    }));

    const toSummary = (c: Collaborator): CollabSummary => ({
        id: c.id,
        name: c.name,
        deliveryAddress: c.deliveryAddress,
        role: c.role,
        photoUrl: c.photoUrl,
        squads: c.squads,
    });

    const noIntegration = collabList
        .filter((c) => c.events.length === 0)
        .map((c) => {
            const years = yearsSince(c.admissionDate, today);
            return {
                ...toSummary(c),
                years,
                color: years >= 2 ? "red" : years >= 1 ? "yellow" : "normal",
            };
        });

    const highTimebank: (CollabSummary & { balance: number })[] = [];
    const expiringTimebank: (CollabSummary & {
        daysLeft: number;
        balance: number;
        expiration: string;
    })[] = [];

    for (const c of collabList) {
        const summary = toSummary(c);
        for (const entry of c.timeBankEntries) {
            // 1 casa decimal: o valor bruto (8.333333333333) vazava direto
            // para os cartões de alerta do painel.
            const balance = Math.round(entry.balanceHours * 10) / 10;

            if (Math.abs(entry.balanceHours) >= 40) {
                highTimebank.push({ ...summary, balance });
            }
            const daysLeft = differenceInDays(
                new Date(entry.expirationDate),
                today
            );
            if (daysLeft >= 0 && daysLeft <= 30) {
                expiringTimebank.push({
                    ...summary,
                    daysLeft,
                    balance,
                    expiration: entry.expirationDate,
                });
            }
        }
    }

    return {
        totalCollaborators: collabList.length,
        companyAnniversaries: companyAnniversaries.map((c) => ({
            ...toSummary(c),
            admissionDate: c.admissionDate,
        })),
        birthdays: birthdays.map((c) => ({
            ...toSummary(c),
            birthDate: c.birthDate,
        })),
        roleDistribution,
        squadSizes,
        noIntegration,
        highTimebank,
        expiringTimebank,
    };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET() {
    try {
        const session = await requireUser();

        if (session.type === "COORDINATOR") {
            const metrics = buildCoordinatorMetrics(session.sub);
            return NextResponse.json({ metrics, coordinatorMode: true });
        }

        // MANAGER: aggregate over linked coordinators
        const links = queryAll<{ coordinatorId: number; coordinatorName: string }>(
            `SELECT l.coordinatorId, u.name as coordinatorName
             FROM ManagerCoordinatorLink l
             JOIN User u ON l.coordinatorId = u.id
             WHERE l.managerId = ? AND l.status = 'APPROVED'`,
            [session.sub]
        );

        const managerMetrics = links.map((link) => ({
            coordinatorName: link.coordinatorName || "Unknown",
            metrics: buildCoordinatorMetrics(link.coordinatorId),
        }));

        return NextResponse.json({ managerMetrics, coordinatorMode: false });
    } catch (err) {
        return handleApiError("GET /api/dashboard", err);
    }
}
