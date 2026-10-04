import { z } from "zod";

// ─── Shared primitives ────────────────────────────────────────────────────────

export const IdSchema = z.union([z.string(), z.number()]).transform((v) =>
    String(v)
);

const optionalString = z.string().optional().nullable().or(z.literal(""));
const optionalISODate = z
    .string()
    .refine((val) => val === "" || !isNaN(Date.parse(val)), {
        message: "Invalid date",
    })
    .nullable()
    .optional();

/**
 * Enum opcional vindo de um <select>.
 *
 * Um select sem seleção envia "" — que não é membro do enum e derrubava o
 * POST/PUT inteiro com "Validation Error". Normalizamos "" (e undefined)
 * para null antes de validar.
 */
function optionalEnum<T extends readonly [string, ...string[]]>(values: T) {
    return z.preprocess(
        (v) => (v === "" || v === undefined ? null : v),
        z.enum(values).nullable()
    );
}

/**
 * Booleano que também aceita o 0/1 devolvido pelo SQLite.
 *
 * As telas de edição reenviam o registro como veio da API, então um campo
 * gravado como INTEGER voltava como 0/1 e quebrava a validação no PUT.
 */
const sqliteBoolean = z
    .union([z.boolean(), z.number(), z.string()])
    .transform((v) => v === true || v === 1 || v === "1" || v === "true");

// ─── Enums ────────────────────────────────────────────────────────────────────

export const RoleTypeEnum = z.enum([
    "SCRUM_MASTER",
    "SYSTEM_ANALYST",
    "PRODUCT_OWNER",
    "DEVELOPER",
    "QA_ANALYST",
    "SPECIALIST",
    "BUSINESS_ANALYST",
    "PRODUCT_MANAGER",
]);
export type RoleType = z.infer<typeof RoleTypeEnum>;

export const ContractTypeEnum = z.enum(["CLT", "THIRD_PARTY"]);
export const SeniorityEnum = z.enum(["JUNIOR", "PLENO", "SENIOR", "SPECIALIST"]);
export const DevTypeEnum = z.enum([
    "NOT_APPLICABLE",
    "BACKEND",
    "FRONTEND",
    "FULLSTACK",
    "TECH_LEAD",
]);
export const SexoEnum = z.enum(["MASCULINO", "FEMININO"]);
export const FeedbackTypeEnum = z.enum(["POSITIVE", "NEGATIVE", "NEUTRAL"]);
export const FeedbackOriginEnum = z.enum([
    "COLLABORATOR_REQUEST",
    "PERIODIC",
    "PEER_REQUEST",
    "CONFLICT",
]);
export const LinkStatusEnum = z.enum(["APPROVED", "REJECTED"]);

// ─── Collaborator ─────────────────────────────────────────────────────────────

export const CollaboratorSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z
        .string()
        .email("Valid email required")
        .optional()
        .nullable()
        .or(z.literal("")),
    matricula: optionalString,
    photoUrl: z.string().optional().nullable(),
    admissionDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid admission date",
    }),
    birthDate: optionalISODate,
    resignationDate: optionalISODate,
    hasChildren: sqliteBoolean.optional().default(false),
    whatsapp: z
        .string()
        .min(8, "WhatsApp number is too short")
        .optional()
        .nullable()
        .or(z.literal("")),
    contractType: ContractTypeEnum.optional().default("CLT"),
    seniority: SeniorityEnum.optional().default("JUNIOR"),
    devType: DevTypeEnum.optional().default("NOT_APPLICABLE"),
    roleId: IdSchema.pipe(z.string().min(1, "Role is required"))
        .nullable()
        .optional(),
    sexo: optionalEnum(["MASCULINO", "FEMININO"]),
    cpf: optionalString,
    // Endereço de residência
    cep_residencia: optionalString,
    logradouro_residencia: optionalString,
    numero_residencia: optionalString,
    complemento_residencia: optionalString,
    bairro_residencia: optionalString,
    cidade_residencia: optionalString,
    estado_residencia: optionalString,
    // Endereço de entrega
    cep_entrega: optionalString,
    logradouro_entrega: optionalString,
    numero_entrega: optionalString,
    complemento_entrega: optionalString,
    bairro_entrega: optionalString,
    cidade_entrega: optionalString,
    estado_entrega: optionalString,
});
export type CollaboratorInput = z.infer<typeof CollaboratorSchema>;

// ─── Event ────────────────────────────────────────────────────────────────────

export const EventSchema = z.object({
    title: z.string().optional(),
    startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid start date",
    }),
    endDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid end date",
    }),
    collaboratorIds: z
        .array(IdSchema)
        .min(1, "At least one collaborator required"),
});
export type EventInput = z.infer<typeof EventSchema>;

// ─── Feedback ─────────────────────────────────────────────────────────────────

export const FeedbackSchema = z.object({
    date: z.string().min(1, "A data é obrigatória"),
    content: z.string().min(1, "O conteúdo é obrigatório"),
    tag: z.string().optional(),
    type: FeedbackTypeEnum,
    origin: FeedbackOriginEnum,
    // Mesmo motivo do LinkRequestSchema: ao editar um feedback a tela reenvia
    // o `collaboratorId` numérico que veio da API.
    collaboratorId: IdSchema.pipe(z.string().min(1, "O colaborador é obrigatório")),
});
export type FeedbackInput = z.infer<typeof FeedbackSchema>;

// ─── Role ─────────────────────────────────────────────────────────────────────

export const RoleSchema = z.object({
    name: RoleTypeEnum,
    defaultColor: z.string().optional().default("#cccccc"),
    qtyPerSquad: z.number().int().min(1).default(1),
    maxSquads: z.number().int().min(1).optional().default(1),
    multipleSquads: sqliteBoolean.optional().default(false),
    order: z.number().int().optional().default(0),
});
export type RoleInput = z.infer<typeof RoleSchema>;

// ─── Squad ────────────────────────────────────────────────────────────────────

/**
 * URL opcional que também aceita null / "".
 * O formulário envia `campo || null` quando o usuário não preenche, e o
 * `.optional()` sozinho rejeitava null — derrubando a criação do squad inteiro.
 */
const optionalUrl = z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    z.string().url("URL inválida").nullable()
);

export const SquadSchema = z.object({
    name: z.string().min(1, "Name is required"),
    jiraLink: optionalUrl,
    confluenceLink: optionalUrl,
    sprintStart: z.string().optional().nullable(),
    sprintDays: z.number().int().min(1).optional().default(14),
});
export type SquadInput = z.infer<typeof SquadSchema>;

// ─── Gift / GiftCampaign ──────────────────────────────────────────────────────

export const GiftSchema = z.object({
    name: z.string().min(1, "Nome é obrigatório"),
    description: z.string().optional().nullable(),
});
export type GiftInput = z.infer<typeof GiftSchema>;

export const CampaignSchema = GiftSchema;
export type CampaignInput = GiftInput;

export const AddCollaboratorSchema = z.object({
    collaboratorId: z.number().int().positive(),
});
export const MarkSentSchema = z.object({
    collaboratorId: z.number().int().positive(),
    sent: z.boolean(),
});
export const AddGiftSchema = z.object({
    giftId: z.number().int().positive(),
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const RegisterSchema = z.object({
    email: z.string().email("Email inválido."),
    password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres."),
    name: z.string().min(1, "Nome é obrigatório."),
    type: z.enum(["COORDINATOR", "MANAGER"]).default("COORDINATOR"),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
    email: z.string().email("Email inválido."),
    password: z.string().min(1, "Senha é obrigatória."),
});
export type LoginInput = z.infer<typeof LoginSchema>;

// ─── Links ────────────────────────────────────────────────────────────────────

export const LinkRequestSchema = z.object({
    // IdSchema (e não z.string()): /api/coordinators devolve `id` como número
    // do SQLite, então toda solicitação de vínculo reprovava na validação e o
    // gerente só via um genérico "Falha na solicitação".
    coordinatorId: IdSchema.pipe(z.string().min(1, "Coordinator ID is required")),
});

export const LinkUpdateSchema = z.object({
    id: IdSchema,
    status: LinkStatusEnum,
});
