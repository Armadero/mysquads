/**
 * Rótulos exibidos na interface para os enums do domínio.
 *
 * Os mesmos mapas estavam copiados em quatro telas (painel, cargos, squads,
 * colaboradores) e faltavam em outras — a listagem de colaboradores mostrava
 * "DEVELOPER" cru. Centralizar evita que voltem a divergir.
 */

export const roleTypeLabels: Record<string, string> = {
    SCRUM_MASTER: "Scrum Master",
    SYSTEM_ANALYST: "Analista de Sistemas",
    PRODUCT_OWNER: "Product Owner",
    DEVELOPER: "Desenvolvedor",
    QA_ANALYST: "Analista de Teste",
    SPECIALIST: "Especialista",
    BUSINESS_ANALYST: "Analista de Negócios",
    PRODUCT_MANAGER: "Product Manager",
};

export const seniorityLabels: Record<string, string> = {
    JUNIOR: "Júnior",
    PLENO: "Pleno",
    SENIOR: "Sênior",
    SPECIALIST: "Especialista",
};

export const contractTypeLabels: Record<string, string> = {
    CLT: "CLT",
    THIRD_PARTY: "Terceirizado / PJ",
};

export const devTypeLabels: Record<string, string> = {
    NOT_APPLICABLE: "Não Aplicável",
    BACKEND: "Back-end",
    FRONTEND: "Front-end",
    FULLSTACK: "Full Stack",
    TECH_LEAD: "Tech Lead",
};

/** Rótulo de um cargo, com fallback para o valor cru quando desconhecido. */
export function roleLabel(name?: string | null, fallback = "Sem cargo"): string {
    if (!name) return fallback;
    return roleTypeLabels[name] || name;
}
