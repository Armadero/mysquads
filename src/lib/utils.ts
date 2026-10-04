import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converte o corpo de erro das rotas /api/* em uma frase legível.
 *
 * Erros de validação chegam como `{ error: "Validation Error", details: [...] }`
 * e as telas mostravam só o "Validation Error" cru, sem dizer qual campo
 * reprovou. Aqui listamos os campos problemáticos.
 */
export function describeApiError(
  body: unknown,
  fallback = "Não foi possível concluir a operação."
): string {
  if (!body || typeof body !== "object") return fallback;

  const { error, details } = body as { error?: string; details?: unknown };

  if (Array.isArray(details) && details.length > 0) {
    const fields = details
      .map((issue) => {
        const { path, message } = (issue ?? {}) as {
          path?: unknown[];
          message?: string;
        };
        const field = Array.isArray(path) && path.length > 0 ? path.join(".") : null;
        return field ? `${field}: ${message ?? "valor inválido"}` : message;
      })
      .filter(Boolean);

    if (fields.length > 0) return `Verifique os campos — ${fields.join("; ")}`;
  }

  return error || fallback;
}

/* ────────────────────────────────────────────────────────────────
 * Datas
 *
 * As datas de negócio (nascimento, admissão, desligamento, feedback)
 * são armazenadas como "YYYY-MM-DDT00:00:00.000Z", ou seja, meia-noite
 * em UTC. Em fusos negativos (America/Sao_Paulo = UTC-3) o construtor
 * new Date(...) combinado com getMonth()/getDate()/toLocaleDateString()
 * devolve o DIA ANTERIOR. Ex.: "1987-04-01T00:00:00.000Z" era exibido
 * como 31/03/1987 e contado como março nos filtros de aniversariantes.
 *
 * Os helpers abaixo sempre leem os componentes em UTC, mantendo a data
 * exatamente como foi cadastrada, independente do fuso do usuário.
 * ──────────────────────────────────────────────────────────────── */

/** Converte um valor de data (string ISO, Date ou null) em Date, ou null. */
function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Formata como DD/MM/AAAA lendo os componentes em UTC. */
export function formatDate(value: string | Date | null | undefined, fallback = "-"): string {
  const d = toDate(value);
  if (!d) return fallback;
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

/** Formata como DD/MM (sem ano) lendo os componentes em UTC. */
export function formatDayMonth(value: string | Date | null | undefined, fallback = "-"): string {
  const d = toDate(value);
  if (!d) return fallback;
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}`;
}

/** Mês (0-11) da data, lido em UTC. Retorna null se a data for inválida. */
export function getMonthUTC(value: string | Date | null | undefined): number | null {
  const d = toDate(value);
  return d ? d.getUTCMonth() : null;
}

/** Dia do mês (1-31) da data, lido em UTC. */
export function getDayUTC(value: string | Date | null | undefined): number | null {
  const d = toDate(value);
  return d ? d.getUTCDate() : null;
}

/** Ano da data, lido em UTC. */
export function getYearUTC(value: string | Date | null | undefined): number | null {
  const d = toDate(value);
  return d ? d.getUTCFullYear() : null;
}

/**
 * Anos completos entre uma data e hoje (idade / tempo de casa), em UTC.
 * Subtrai 1 quando o aniversário ainda não ocorreu no ano corrente.
 */
export function yearsSince(value: string | Date | null | undefined, reference: Date = new Date()): number {
  const d = toDate(value);
  if (!d) return 0;

  let years = reference.getUTCFullYear() - d.getUTCFullYear();
  const monthDiff = reference.getUTCMonth() - d.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && reference.getUTCDate() < d.getUTCDate())) {
    years--;
  }
  return years;
}

/** True se a data cai no mesmo mês (UTC) da referência — usado nos aniversariantes do mês. */
export function isSameMonthUTC(value: string | Date | null | undefined, reference: Date = new Date()): boolean {
  const month = getMonthUTC(value);
  return month !== null && month === reference.getUTCMonth();
}
