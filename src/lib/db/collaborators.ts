/**
 * Collaborator persistence helpers.
 *
 * The Collaborator table has ~30 columns, so duplicating the INSERT/UPDATE
 * SQL across `POST` and `PUT` routes is error-prone. Building param tuples
 * from a single field map keeps them in sync and collapses what was a
 * 60-line SQL call into 3.
 */
import type { CollaboratorInput } from "@/lib/schemas";
import { execute } from "@/lib/db";

type SQLiteParam = null | number | string;

/**
 * Columns written on both insert and update. Order matters: it matches
 * the placeholder order in the statements below.
 */
const WRITABLE_COLUMNS = [
    "name",
    "email",
    "matricula",
    "photoUrl",
    "admissionDate",
    "birthDate",
    "resignationDate",
    "hasChildren",
    "whatsapp",
    "contractType",
    "seniority",
    "devType",
    "roleId",
    "sexo",
    "cpf",
    "cep_residencia",
    "logradouro_residencia",
    "numero_residencia",
    "complemento_residencia",
    "bairro_residencia",
    "cidade_residencia",
    "estado_residencia",
    "cep_entrega",
    "logradouro_entrega",
    "numero_entrega",
    "complemento_entrega",
    "bairro_entrega",
    "cidade_entrega",
    "estado_entrega",
] as const;

function toISO(v: string | null | undefined): string | null {
    if (!v) return null;
    return new Date(v).toISOString();
}

function toNull<T>(v: T | undefined | ""): T | null {
    if (v === undefined || v === "") return null;
    return v;
}

/** Build the parameter list for INSERT / UPDATE (order matches WRITABLE_COLUMNS). */
function buildParams(input: CollaboratorInput): SQLiteParam[] {
    return [
        input.name,
        toNull(input.email) ?? null,
        toNull(input.matricula) ?? null,
        input.photoUrl ?? null,
        toISO(input.admissionDate) ?? "",
        toISO(input.birthDate ?? null),
        toISO(input.resignationDate ?? null),
        input.hasChildren ? 1 : 0,
        toNull(input.whatsapp) ?? null,
        input.contractType ?? "CLT",
        input.seniority ?? "JUNIOR",
        input.devType ?? "NOT_APPLICABLE",
        input.roleId ? Number(input.roleId) : null,
        input.sexo ?? null,
        toNull(input.cpf) ?? null,
        toNull(input.cep_residencia) ?? null,
        toNull(input.logradouro_residencia) ?? null,
        toNull(input.numero_residencia) ?? null,
        toNull(input.complemento_residencia) ?? null,
        toNull(input.bairro_residencia) ?? null,
        toNull(input.cidade_residencia) ?? null,
        toNull(input.estado_residencia) ?? null,
        toNull(input.cep_entrega) ?? null,
        toNull(input.logradouro_entrega) ?? null,
        toNull(input.numero_entrega) ?? null,
        toNull(input.complemento_entrega) ?? null,
        toNull(input.bairro_entrega) ?? null,
        toNull(input.cidade_entrega) ?? null,
        toNull(input.estado_entrega) ?? null,
    ];
}

export function insertCollaborator(
    input: CollaboratorInput,
    coordinatorId: string | number
): { lastInsertRowid: number | bigint } {
    const cols = WRITABLE_COLUMNS.map((c) => `"${c}"`).join(", ");
    const placeholders = WRITABLE_COLUMNS.map(() => "?").join(", ");
    return execute(
        `INSERT INTO Collaborator (${cols}, coordinatorId, created_at, updated_at)
         VALUES (${placeholders}, ?, datetime('now'), datetime('now'))`,
        [...buildParams(input), Number(coordinatorId)]
    );
}

export function updateCollaborator(
    id: string | number,
    input: CollaboratorInput,
    coordinatorId: string | number
): { changes: number } {
    const setClause = WRITABLE_COLUMNS.map((c) => `"${c}" = ?`).join(", ");
    return execute(
        `UPDATE Collaborator SET ${setClause}, updated_at = datetime('now')
         WHERE id = ? AND coordinatorId = ?`,
        [...buildParams(input), id, coordinatorId]
    );
}
