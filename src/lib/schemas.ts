import { z } from "zod";

export const CollaboratorSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Valid email required").optional().nullable().or(z.literal("")),
    matricula: z.string().optional().nullable().or(z.literal("")),
    address: z.string().min(5, "Address must be at least 5 characters").optional().nullable().or(z.literal("")),
    deliveryAddress: z.string().min(5, "Delivery address must be at least 5 characters").optional().nullable().or(z.literal("")),
    photoUrl: z.string().optional().nullable(),
    admissionDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid admission date" }),
    birthDate: z.string().refine((val) => val === "" || !isNaN(Date.parse(val)), { message: "Invalid birth date" }).nullable().optional(),
    resignationDate: z.string().refine((val) => val === "" || !isNaN(Date.parse(val)), { message: "Invalid resignation date" }).nullable().optional(),
    hasChildren: z.boolean().optional().default(false),
    whatsapp: z.string().min(8, "WhatsApp number is too short").optional().nullable().or(z.literal("")),
    contractType: z.enum(["CLT", "THIRD_PARTY"]).optional().default("CLT"),
    seniority: z.enum(["JUNIOR", "PLENO", "SENIOR", "SPECIALIST"]).optional().default("JUNIOR"),
    devType: z.enum(["NOT_APPLICABLE", "BACKEND", "FRONTEND", "FULLSTACK", "TECH_LEAD"]).optional().default("NOT_APPLICABLE"),
    roleId: z.string().min(1, "Role is required").nullable().optional(),
});

export const EventSchema = z.object({
    title: z.string().optional(),
    startDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid start date" }),
    endDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid end date" }),
    collaboratorIds: z.array(z.string()).min(1, "At least one collaborator required"),
});

export const FeedbackSchema = z.object({
    date: z.string().min(1, "A data é obrigatória"),
    content: z.string().min(1, "O conteúdo é obrigatório"),
    tag: z.string().optional(),
    type: z.enum(["POSITIVE", "NEGATIVE", "NEUTRAL"]),
    origin: z.enum(["COLLABORATOR_REQUEST", "PERIODIC", "PEER_REQUEST", "CONFLICT"]),
    collaboratorId: z.string().min(1, "O colaborador é obrigatório")
});
