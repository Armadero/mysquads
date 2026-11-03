"use client";
import React, { useState, useEffect, useCallback } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Plus, Trash2, Users, Layout, GripVertical, ChevronRight, Monitor, ExternalLink, Pencil, AlertCircle, ArrowRightLeft, CheckCircle } from "lucide-react";
import { FormModal } from "@/components/ui/form-modal";
import { TransferModal } from "@/components/ui/transfer-modal";
import { useSession } from "@/lib/hooks/use-session";
import { PageLoader } from "@/components/ui/page-state";
import { describeApiError } from "@/lib/utils";
import { roleTypeLabels } from "@/lib/labels";

const EMPTY_SQUAD_FORM = {
    id: null as string | number | null,
    name: "",
    jiraLink: "",
    confluenceLink: "",
    sprintStart: "",
    sprintDays: 14,
};

export default function SquadsPage() {
    const { user, loading: sessionLoading, isCoordinator } = useSession();
    const [squads, setSquads] = useState<any[]>([]);
    const [collaborators, setCollaborators] = useState<any[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [form, setForm] = useState({ ...EMPTY_SQUAD_FORM });
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);
    const [view, setView] = useState<'LIST' | 'EDIT'>('LIST');
    const [transferSquad, setTransferSquad] = useState<any>(null);
    const [notice, setNotice] = useState("");
    const [selectedSquadId, setSelectedSquadId] = useState<string | number | null>(null);

    const fetchSquads = useCallback(async () => {
        const res = await fetch("/api/squads", { cache: "no-store" });
        if (res.ok) setSquads(await res.json());
    }, []);

    const fetchCollaborators = useCallback(async () => {
        const res = await fetch("/api/collaborators", { cache: "no-store" });
        if (res.ok) setCollaborators(await res.json());
    }, []);

    useEffect(() => {
        if (!user) return;
        fetchSquads();
        fetchCollaborators();
    }, [user, fetchSquads, fetchCollaborators]);

    const openCreateForm = () => {
        setForm({ ...EMPTY_SQUAD_FORM });
        setFormError("");
        setIsFormOpen(true);
    };

    /** Abre o formulário já preenchido — antes só era possível criar squads:
     *  nome, links do Jira/Confluence e sprint ficavam congelados na criação. */
    const openEditForm = (squad: any) => {
        setForm({
            id: squad.id,
            name: squad.name || "",
            jiraLink: squad.jiraLink || "",
            confluenceLink: squad.confluenceLink || "",
            sprintStart: squad.sprintStart ? String(squad.sprintStart).split("T")[0] : "",
            sprintDays: squad.sprintDays ?? 14,
        });
        setFormError("");
        setIsFormOpen(true);
    };

    const saveSquad = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setFormError("");

        const editing = form.id != null;
        try {
            const res = await fetch(editing ? `/api/squads/${form.id}` : "/api/squads", {
                method: editing ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: form.name,
                    jiraLink: form.jiraLink || null,
                    confluenceLink: form.confluenceLink || null,
                    sprintStart: form.sprintStart || null,
                    sprintDays: Number(form.sprintDays) || 14,
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                // A criação falhava em silêncio quando um link era inválido —
                // o modal simplesmente não fechava.
                setFormError(describeApiError(data, "Não foi possível salvar o squad."));
                return;
            }

            setIsFormOpen(false);
            setForm({ ...EMPTY_SQUAD_FORM });
            fetchSquads();
        } catch {
            setFormError("Erro de conexão com o servidor.");
        } finally {
            setSaving(false);
        }
    };

    const deleteSquad = async (id: string) => {
        if (!confirm("Remover este squad? Os membros ficarão sem equipe.")) return;
        const res = await fetch(`/api/squads/${id}`, { method: "DELETE" });
        if (res.ok) {
            if (String(selectedSquadId) === String(id)) {
                setSelectedSquadId(null);
                setView("LIST");
            }
            fetchSquads();
            fetchCollaborators();
        }
    };

    const onDragEnd = async (result: any) => {
        const { destination, source, draggableId } = result;

        if (!destination || (destination.droppableId === source.droppableId)) return;

        const isMovingToList = destination.droppableId === "unassigned";
        const squadId = isMovingToList ? source.droppableId : destination.droppableId;

        if (squadId === 'none' || squadId === 'unassigned') return;

        // --- OPTIMISTIC UPDATE START ---
        // Capture current state
        const prevSquads = [...squads];
        const prevCollabs = [...collaborators];

        // BUG FIX: @hello-pangea/dnd converte draggableId para string internamente,
        // mas os IDs do SQLite são números — comparar com String() para evitar c.id !== "1" (número !== string)
        const collabToMove = collaborators.find(c => String(c.id) === String(draggableId)) ||
            squads.flatMap(s => s.collaborators).find(c => String(c.id) === String(draggableId));

        if (!collabToMove) return;

        // Update local state immediately
        setSquads(current => current.map(s => {
            if (isMovingToList && String(s.id) === String(source.droppableId)) {
                return { ...s, collaborators: s.collaborators.filter((c: any) => String(c.id) !== String(draggableId)) };
            }
            if (!isMovingToList && String(s.id) === String(destination.droppableId)) {
                // Avoid duplicates in optimistic state
                if (s.collaborators.some((c: any) => String(c.id) === String(draggableId))) return s;
                return { ...s, collaborators: [...s.collaborators, collabToMove] };
            }
            return s;
        }));
        // --- OPTIMISTIC UPDATE END ---

        try {
            const res = await fetch(`/api/squads/${squadId}/collaborators`, {
                method: isMovingToList ? "DELETE" : "POST",
                headers: { "Content-Type": "application/json" },
                // Usar o ID original do objeto para garantir o tipo correto na API
                body: JSON.stringify({ collaboratorId: collabToMove.id })
            });

            if (!res.ok) {
                // Rollback on failure
                setSquads(prevSquads);
                setCollaborators(prevCollabs);
                console.error("Failed to move member:", await res.text());
            } else {
                // Refresh data to confirm server state
                await Promise.all([fetchSquads(), fetchCollaborators()]);
            }
        } catch (error) {
            // Rollback on error
            setSquads(prevSquads);
            setCollaborators(prevCollabs);
            console.error("Drag-and-drop error:", error);
        }
    };

    if (sessionLoading) return <PageLoader label="Carregando squads..." />;
    if (!user) return null;

    // Derived state for the lists
    const selectedSquad = squads.find(s => String(s.id) === String(selectedSquadId));

    // A collaborator is available if:
    // 1. Not already a member of the current squad
    // 2. Their role allows multiple squads AND they haven't reached the maxSquads limit
    const unassignedCollabs = collaborators
        .filter(c => {
            // Exclude if already in this squad
            const isInCurrentSquad = selectedSquad?.collaborators.some((m: any) => String(m.id) === String(c.id));
            if (isInCurrentSquad) return false;

            const currentSquadCount = c.squads?.length || 0;
            const multipleSquads = c.role?.multipleSquads === 1 || c.role?.multipleSquads === true;
            const maxSquads = multipleSquads ? (c.role?.maxSquads || 1) : 1;

            return currentSquadCount < maxSquads;
        })
        .sort((a, b) => (a.role?.order || 0) - (b.role?.order || 0));

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20 font-sans">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Squads</h1>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">Veja as equipes e organização de membros.</p>
                        </div>
                        {isCoordinator && (
                            <button
                                onClick={openCreateForm}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-md shadow-blue-500/10 transition-all"
                            >
                                <Plus size={18} /> Adicionar Squad
                            </button>
                        )}
                    </div>

                    <TransferModal
                        open={transferSquad != null}
                        onClose={() => setTransferSquad(null)}
                        title="Transferir Squad"
                        description={`O squad "${transferSquad?.name ?? ""}" e seus ${transferSquad?.collaborators?.length ?? 0} colaborador(es) passarão para outro coordenador. Os colaboradores serão removidos de outros squads seus.`}
                        endpoint={`/api/squads/${transferSquad?.id}/transfer`}
                        onDone={(data) => {
                            const n = data?.collaboratorsMoved ?? 0;
                            setNotice(`Squad "${transferSquad?.name ?? ""}" transferido com sucesso (${n} colaborador${n === 1 ? "" : "es"}).`);
                            fetchSquads();
                            fetchCollaborators();
                        }}
                    />

                    {notice && (
                                    <div role="status" className="flex items-center justify-between gap-2 p-3 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold rounded-lg">
                                        <span className="flex items-center gap-2"><CheckCircle size={14} className="shrink-0" />{notice}</span>
                                        <button type="button" onClick={() => setNotice("")} className="text-green-700/70 hover:text-green-700 dark:text-green-400/70 dark:hover:text-green-400" aria-label="Fechar aviso">&times;</button>
                                    </div>
                                )}

                    <FormModal
                        open={isFormOpen}
                        onClose={() => setIsFormOpen(false)}
                        title={form.id != null ? "Editar Squad" : "Novo Squad"}
                        size="md"
                        dismissable={!saving}
                    >
                        <div className="p-6">
                            <form onSubmit={saveSquad} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Nome</label>
                                    <input
                                        required
                                        autoFocus
                                        className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        placeholder="Ex: Squad Delta"
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                    />
                                </div>
                                {/* BUG FIX: campos adicionais que eram suportados pela API mas não tinham input */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1 col-span-2">
                                        <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Link do Jira</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="url"
                                                className="flex-1 px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                placeholder="https://..."
                                                value={form.jiraLink}
                                                onChange={e => setForm({ ...form, jiraLink: e.target.value })}
                                            />
                                            <a
                                                href={form.jiraLink || "#"}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={e => { if (!form.jiraLink) e.preventDefault(); }}
                                                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md border transition-all whitespace-nowrap
                                                    ${form.jiraLink
                                                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                                                        : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-300 dark:text-zinc-600 cursor-not-allowed"
                                                    }`}
                                            >
                                                <ExternalLink size={13} /> Acessar
                                            </a>
                                        </div>
                                    </div>
                                    <div className="space-y-1 col-span-2">
                                        <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Link do Confluence</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="url"
                                                className="flex-1 px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                placeholder="https://..."
                                                value={form.confluenceLink}
                                                onChange={e => setForm({ ...form, confluenceLink: e.target.value })}
                                            />
                                            <a
                                                href={form.confluenceLink || "#"}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={e => { if (!form.confluenceLink) e.preventDefault(); }}
                                                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md border transition-all whitespace-nowrap
                                                    ${form.confluenceLink
                                                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                                                        : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-300 dark:text-zinc-600 cursor-not-allowed"
                                                    }`}
                                            >
                                                <ExternalLink size={13} /> Acessar
                                            </a>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Início do Sprint</label>
                                        <input
                                            type="date"
                                            className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                            value={form.sprintStart}
                                            onChange={e => setForm({ ...form, sprintStart: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Duração do Sprint (dias)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                            value={form.sprintDays}
                                            onChange={e => setForm({ ...form, sprintDays: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                {formError && (
                                    <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs font-semibold rounded-lg animate-in fade-in duration-200">
                                        <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                        <span>{formError}</span>
                                    </div>
                                )}

                                <div className="flex justify-end gap-2 pt-2">
                                    <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">Cancelar</button>
                                    <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-60 transition-all">
                                        {saving ? "Salvando..." : form.id != null ? "Salvar alterações" : "Criar Squad"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </FormModal>

                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                                        <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Nome do Squad</th>
                                        <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-center">Membros</th>
                                        <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Composição</th>
                                        {isCoordinator && <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-right">Ações</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                    {squads.map(squad => (
                                        <tr key={squad.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                        <Layout size={18} />
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="font-bold text-sm text-zinc-800 dark:text-zinc-100">{squad.name}</span>
                                                        {(squad.jiraLink || squad.confluenceLink) && (
                                                            <div className="flex items-center gap-2">
                                                                {squad.jiraLink && (
                                                                    <a
                                                                        href={squad.jiraLink}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        onClick={e => e.stopPropagation()}
                                                                        className="flex items-center gap-1 text-[10px] font-semibold text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                                                        title="Abrir Jira"
                                                                    >
                                                                        <ExternalLink size={10} /> Jira
                                                                    </a>
                                                                )}
                                                                {squad.jiraLink && squad.confluenceLink && (
                                                                    <span className="text-zinc-200 dark:text-zinc-700 text-xs">•</span>
                                                                )}
                                                                {squad.confluenceLink && (
                                                                    <a
                                                                        href={squad.confluenceLink}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        onClick={e => e.stopPropagation()}
                                                                        className="flex items-center gap-1 text-[10px] font-semibold text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                                                        title="Abrir Confluence"
                                                                    >
                                                                        <ExternalLink size={10} /> Confluence
                                                                    </a>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-xs font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-md">{squad.collaborators.length}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex -space-x-1.5 overflow-hidden">
                                                    {[...squad.collaborators]
                                                        .sort((a, b) => (a.role?.order || 0) - (b.role?.order || 0))
                                                        .slice(0, 5)
                                                        .map((c: any) => (
                                                            <div
                                                                key={c.id}
                                                                title={`${c.name} (${c.role ? roleTypeLabels[c.role.name as string] || c.role.name : 'Membro'})`}
                                                                className="w-7 h-7 rounded-full border-2 border-white dark:border-zinc-900 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-black text-zinc-500 uppercase shadow-sm overflow-hidden"
                                                                style={{ borderColor: c.role?.defaultColor ? `${c.role.defaultColor}40` : undefined }}
                                                            >
                                                                {c.photoUrl ? (
                                                                    <img src={c.photoUrl} alt={c.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    c.name?.[0] || ""
                                                                )}
                                                            </div>
                                                        ))}
                                                    {squad.collaborators.length > 5 && (
                                                        <div className="w-7 h-7 rounded-full border-2 border-white dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-[8px] font-black text-zinc-400 shadow-sm">
                                                            +{squad.collaborators.length - 5}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            {isCoordinator && (
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            onClick={() => { setSelectedSquadId(squad.id); setView('EDIT'); }}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-all"
                                                            title="Gerenciar membros"
                                                        >
                                                            MEMBROS <ChevronRight size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => openEditForm(squad)}
                                                            className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-all"
                                                            title="Editar dados do squad"
                                                        >
                                                            <Pencil size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => setTransferSquad(squad)}
                                                            className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-all"
                                                            title="Transferir squad e colaboradores"
                                                        >
                                                            <ArrowRightLeft size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => deleteSquad(squad.id)}
                                                            className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {squads.length === 0 && (
                                <div className="py-20 text-center flex flex-col items-center">
                                    <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4 text-zinc-300 dark:text-zinc-600">
                                        <Layout size={32} />
                                    </div>
                                    <p className="text-zinc-500 font-medium italic">Nenhum squad foi criado ainda.</p>
                                    {isCoordinator && <button onClick={openCreateForm} className="mt-4 text-sm font-bold text-blue-600 hover:underline">Adicionar o primeiro</button>}
                                </div>
                            )}
                        </div>
                    </div>

            <FormModal
                open={view === 'EDIT'}
                onClose={() => setView('LIST')}
                title={selectedSquad?.name || "Squad"}
                subtitle="Arraste os colaboradores para formar ou alterar a equipe."
                size="full"
            >
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="flex flex-col gap-8 p-6">
                        <div className="flex flex-col lg:flex-row gap-8 items-start">
                            {/* Available side list */}
                            {isCoordinator && (
                                <div className="w-full lg:w-80 flex-shrink-0 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col h-auto max-h-[60vh]">
                                    <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 flex justify-between items-center text-zinc-500">
                                        <h2 className="font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                                            <Users size={14} className="text-blue-500" /> Disponíveis
                                        </h2>
                                        <span className="bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-black px-2 py-0.5 rounded-full">{unassignedCollabs.length}</span>
                                    </div>
                                    <Droppable droppableId="unassigned" isDropDisabled={!isCoordinator}>
                                        {(provided, snapshot) => (
                                            <div
                                                {...provided.droppableProps}
                                                ref={provided.innerRef}
                                                className={`p-4 flex-1 overflow-y-auto space-y-2 min-h-[200px] transition-all scrollbar-thin ${snapshot.isDraggingOver ? 'bg-blue-50/30' : ''}`}
                                            >
                                                {unassignedCollabs.map((collab, index) => (
                                                    <DraggableItem key={collab.id} collab={collab} index={index} isDragDisabled={!isCoordinator} allSquads={squads} />
                                                ))}
                                                {provided.placeholder}
                                                {unassignedCollabs.length === 0 && (
                                                    <div className="py-10 text-center text-xs text-zinc-400 font-medium italic border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">Todos alocados</div>
                                                )}
                                            </div>
                                        )}
                                    </Droppable>
                                </div>
                            )}

                            {/* Squad Droppable Area */}
                            <div className="flex-1 w-full bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 min-h-[400px] flex flex-col shadow-sm">
                                <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/30 dark:bg-zinc-800/20">
                                    <h3 className="font-bold text-zinc-800 dark:text-white flex items-center gap-2">
                                        Membros da Equipe
                                        <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-400 text-[10px] font-black px-2 py-0.5 rounded-full">
                                            {selectedSquad?.collaborators.length || 0}
                                        </span>
                                    </h3>
                                </div>

                                {/* BUG FIX: droppableId deve ser string — IDs do SQLite são números */}
                <Droppable droppableId={selectedSquadId ? String(selectedSquadId) : 'none'} isDropDisabled={!isCoordinator}>
                                    {(provided, snapshot) => (
                                        <div
                                            {...provided.droppableProps}
                                            ref={provided.innerRef}
                                            className={`p-8 flex-1 transition-colors relative ${snapshot.isDraggingOver ? 'bg-blue-50/20' : ''}`}
                                        >
                                            <div className="space-y-8">
                                                {(() => {
                                                    const members = [...(selectedSquad?.collaborators || [])];
                                                    const grouped = members.reduce((acc: any, collab: any) => {
                                                        const roleId = collab.roleId || 'no-role';
                                                        if (!acc[roleId]) acc[roleId] = { role: collab.role, members: [] };
                                                        acc[roleId].members.push(collab);
                                                        return acc;
                                                    }, {});

                                                    const sortedRoleGroups = Object.values(grouped).sort((a: any, b: any) =>
                                                        (a.role?.order || 0) - (b.role?.order || 0)
                                                    );

                                                    return sortedRoleGroups.map(({ role, members: roleMembers }: any) => (
                                                        <div key={role?.id || 'no-role'} className="space-y-4">
                                                            <div className="flex items-center gap-2 border-b border-zinc-50 dark:border-zinc-800 pb-2">
                                                                <div className="w-1 h-3 rounded-full" style={{ backgroundColor: role?.defaultColor || "#CBD5E1" }}></div>
                                                                <h4 className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                                                                    {role ? roleTypeLabels[role.name as string] || role.name : "Sem Cargo"} • {roleMembers.length}
                                                                </h4>
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                                                {roleMembers.map((collab: any) => {
                                                                    const flatIndex = (selectedSquad?.collaborators || []).findIndex((c: any) => c.id === collab.id);
                                                                    return <DraggableItem key={collab.id} collab={collab} index={flatIndex} isDragDisabled={!isCoordinator} />;
                                                                })}
                                                            </div>
                                                        </div>
                                                    ));
                                                })()}
                                            </div>
                                            {provided.placeholder}

                                            {(!selectedSquad?.collaborators || selectedSquad.collaborators.length === 0) && !snapshot.isDraggingOver && (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-300 dark:text-zinc-700 pointer-events-none">
                                                    <Monitor size={48} strokeWidth={1} className="mb-4 opacity-10" />
                                                    <p className="text-xs font-bold uppercase tracking-widest italic opacity-30">Arraste colaboradores para este squad</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        </div>
                    </div>
                </DragDropContext>
            </FormModal>
        </div>
    );
}

function DraggableItem({ collab, index, isDragDisabled, allSquads }: { collab: any, index: number, isDragDisabled?: boolean, allSquads?: any[] }) {
    // Squads where this collaborator already belongs (for multi-squad roles)
    const otherSquads = allSquads
        ? allSquads.filter(s => s.collaborators?.some((m: any) => String(m.id) === String(collab.id)))
        : [];

    return (
        // BUG FIX: draggableId deve ser string — @hello-pangea/dnd converte para string internamente,
        // causando mismatch com IDs numéricos do SQLite no onDragEnd
        <Draggable draggableId={String(collab.id)} index={index} isDragDisabled={isDragDisabled}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`p-3 bg-white dark:bg-zinc-800 border rounded-xl flex items-center justify-between shadow-sm transition-all group
                        ${snapshot.isDragging
                            ? 'border-blue-500 shadow-xl shadow-blue-500/10 scale-105 z-50 ring-2 ring-blue-500/20'
                            : 'border-zinc-100 dark:border-zinc-700/50 hover:border-zinc-300 dark:hover:border-zinc-600'
                        }`}
                >
                    <div className="flex items-center gap-3 overflow-hidden">
                        {!isDragDisabled && <GripVertical size={14} className="text-zinc-300 dark:text-zinc-600 shrink-0" />}

                        {collab.photoUrl ? (
                            <img src={collab.photoUrl} alt={collab.name} className="w-8 h-8 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 shrink-0" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center font-bold text-blue-600 dark:text-blue-400 text-[10px] shrink-0">
                                {collab.name?.[0]?.toUpperCase() || ""}
                            </div>
                        )}

                        <div className="min-w-0 flex-1">
                            <div className="font-bold text-sm text-zinc-800 dark:text-zinc-200 truncate">{collab.name}</div>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: collab.role?.defaultColor || "#CBD5E1" }}></div>
                                <span className="text-[10px] font-bold text-zinc-500 uppercase truncate">{collab.role ? roleTypeLabels[collab.role.name as string] || collab.role.name : "Colaborador"}</span>
                                {otherSquads.length > 0 && (
                                    <span
                                        className="text-[9px] font-semibold bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded-full leading-tight"
                                        title={otherSquads.map(s => s.name).join(", ")}
                                    >
                                        {otherSquads.length === 1 ? otherSquads[0].name : `${otherSquads.length} squads`}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Draggable>
    );
}
