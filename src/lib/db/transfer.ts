/**
 * Transferência de squads e colaboradores entre coordenadores.
 *
 * Cargos (Role) pertencem a um coordenador, então ao mover um colaborador o
 * cargo é remapeado por nome para o coordenador de destino (criado se não
 * existir). Vínculos que só fazem sentido dentro do coordenador de origem
 * (outros squads, eventos de integração e campanhas de presentes) são
 * desfeitos; feedbacks acompanham o colaborador.
 */
import { queryAll, queryOne, execute, transaction } from "@/lib/db";

export class TransferError extends Error {}

export interface TransferTarget {
    id: number;
    name: string | null;
    email: string;
}

/** Resolve o coordenador de destino pelo e-mail (não é permitido listar pares). */
export function resolveTargetCoordinator(
    email: string,
    fromCoordinatorId: string | number
): TransferTarget {
    const target = queryOne<TransferTarget>(
        `SELECT id, name, email FROM User
         WHERE type = 'COORDINATOR' AND lower(email) = lower(?)`,
        [email.trim()]
    );
    if (!target) throw new TransferError("Coordenador de destino não encontrado.");
    if (String(target.id) === String(fromCoordinatorId))
        throw new TransferError("O destino deve ser outro coordenador.");
    return target;
}

function mapRole(
    roleId: number,
    toCoordinatorId: number,
    cache: Map<number, number>
): number {
    const cached = cache.get(roleId);
    if (cached) return cached;

    const role = queryOne<{
        name: string;
        defaultColor: string;
        qtyPerSquad: number;
        maxSquads: number;
        multipleSquads: number;
        order: number;
    }>(
        `SELECT name, defaultColor, qtyPerSquad, maxSquads, multipleSquads, "order"
         FROM Role WHERE id = ?`,
        [roleId]
    );
    if (!role) throw new TransferError("Cargo do colaborador não encontrado.");

    const existing = queryOne<{ id: number }>(
        "SELECT id FROM Role WHERE coordinatorId = ? AND name = ?",
        [toCoordinatorId, role.name]
    );
    let newId: number;
    if (existing) {
        newId = existing.id;
    } else {
        newId = Number(
            execute(
                `INSERT INTO Role (name, defaultColor, qtyPerSquad, maxSquads, multipleSquads, "order", coordinatorId)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    role.name,
                    role.defaultColor,
                    role.qtyPerSquad,
                    role.maxSquads,
                    role.multipleSquads,
                    role.order,
                    toCoordinatorId,
                ]
            ).lastInsertRowid
        );
    }
    cache.set(roleId, newId);
    return newId;
}

/** Move colaboradores (já validados como pertencentes à origem) para o destino. */
function moveCollaborators(
    collaboratorIds: number[],
    fromCoordinatorId: number,
    toCoordinatorId: number,
    keepSquadId?: number
) {
    const roleCache = new Map<number, number>();
    for (const cid of collaboratorIds) {
        const collab = queryOne<{ roleId: number }>(
            "SELECT roleId FROM Collaborator WHERE id = ? AND coordinatorId = ?",
            [cid, fromCoordinatorId]
        );
        if (!collab) continue;

        execute(
            `UPDATE Collaborator SET coordinatorId = ?, roleId = ?, updated_at = datetime('now')
             WHERE id = ?`,
            [toCoordinatorId, mapRole(collab.roleId, toCoordinatorId, roleCache), cid]
        );
        execute(
            `DELETE FROM SquadCollaborator
             WHERE collaboratorId = ? AND squadId != ?
               AND squadId IN (SELECT id FROM Squad WHERE coordinatorId = ?)`,
            [cid, keepSquadId ?? -1, fromCoordinatorId]
        );
        execute(
            `DELETE FROM IntegrationEventCollaborator
             WHERE collaboratorId = ?
               AND eventId IN (SELECT id FROM IntegrationEvent WHERE coordinatorId = ?)`,
            [cid, fromCoordinatorId]
        );
        execute(
            `DELETE FROM GiftCampaignCollaborator
             WHERE collaboratorId = ?
               AND campaignId IN (SELECT id FROM GiftCampaign WHERE coordinatorId = ?)`,
            [cid, fromCoordinatorId]
        );
        execute("UPDATE Feedback SET coordinatorId = ? WHERE collaboratorId = ?", [
            toCoordinatorId,
            cid,
        ]);
    }
}

export function transferCollaborator(
    collaboratorId: string | number,
    fromCoordinatorId: string | number,
    target: TransferTarget
): boolean {
    const from = Number(fromCoordinatorId);
    const owned = queryOne(
        "SELECT id FROM Collaborator WHERE id = ? AND coordinatorId = ?",
        [collaboratorId, from]
    );
    if (!owned) return false;
    transaction(() => moveCollaborators([Number(collaboratorId)], from, target.id));
    return true;
}

/** Transfere o squad e todos os seus colaboradores. Retorna a quantidade movida. */
export function transferSquad(
    squadId: string | number,
    fromCoordinatorId: string | number,
    target: TransferTarget
): number | null {
    const from = Number(fromCoordinatorId);
    const squad = queryOne(
        "SELECT id FROM Squad WHERE id = ? AND coordinatorId = ?",
        [squadId, from]
    );
    if (!squad) return null;

    let moved = 0;
    transaction(() => {
        const members = (
            getMembers(squadId) as { collaboratorId: number }[]
        ).map((m) => m.collaboratorId);
        execute(
            "UPDATE Squad SET coordinatorId = ?, updated_at = datetime('now') WHERE id = ?",
            [target.id, squadId]
        );
        moveCollaborators(members, from, target.id, Number(squadId));
        moved = members.length;
    });
    return moved;
}

function getMembers(squadId: string | number) {
    return queryAll("SELECT collaboratorId FROM SquadCollaborator WHERE squadId = ?", [
        squadId,
    ]);
}
