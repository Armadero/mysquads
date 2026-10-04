"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Clock, X, Search, Pencil, Trash2, AlertCircle } from "lucide-react";
import { FormModal } from "@/components/ui/form-modal";
import { formatDayMonth, getYearUTC, describeApiError } from "@/lib/utils";
import { useSession } from "@/lib/hooks/use-session";
import { PageLoader, AccessDenied } from "@/components/ui/page-state";
import { roleLabel } from "@/lib/labels";

export default function EventsPage() {
    const { user, loading: sessionLoading, isCoordinator } = useSession();
    const [events, setEvents] = useState<any[]>([]);
    const [collaborators, setCollaborators] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [editingEvent, setEditingEvent] = useState<any>(null);

    // Form state
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedCollabIds, setSelectedCollabIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [comboOpen, setComboOpen] = useState(false);
    const comboRef = useRef<HTMLDivElement>(null);

    const fetchEvents = useCallback(async () => {
        const res = await fetch("/api/events");
        if (res.ok) setEvents(await res.json());
    }, []);

    const fetchCollaborators = useCallback(async () => {
        const res = await fetch("/api/collaborators");
        if (res.ok) setCollaborators(await res.json());
    }, []);

    useEffect(() => {
        if (!user || !isCoordinator) return;
        fetchEvents();
        fetchCollaborators();
    }, [user, isCoordinator, fetchEvents, fetchCollaborators]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedCollabIds.length === 0) return;

        // A API não valida a ordem das datas; sem isso dava para salvar um
        // evento terminando antes de começar.
        if (endDate < startDate) {
            setError("A data de término não pode ser anterior à de início.");
            return;
        }

        setLoading(true);
        setError("");

        const method = editingEvent ? "PUT" : "POST";
        const url = editingEvent ? `/api/events/${editingEvent.id}` : "/api/events";

        try {
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    startDate,
                    endDate,
                    collaboratorIds: selectedCollabIds
                })
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(describeApiError(data, "Não foi possível salvar a integração."));
                return;
            }

            handleCancel();
            fetchEvents();
            fetchCollaborators();
        } catch {
            setError("Erro de conexão com o servidor.");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (event: any) => {
        setEditingEvent(event);
        setStartDate(event.startDate.split('T')[0]);
        setEndDate(event.endDate.split('T')[0]);
        setSelectedCollabIds(event.collaborators.map((ec: any) => String(ec.id)));
        setError("");
        setIsCreating(true);
    };

    const handleCancel = () => {
        setIsCreating(false);
        setEditingEvent(null);
        setStartDate("");
        setEndDate("");
        setSelectedCollabIds([]);
        setSearchQuery("");
        setComboOpen(false);
        setError("");
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir esta integração?")) return;

        const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
        if (res.ok) {
            fetchEvents();
            fetchCollaborators();
        }
    };

    const addCollaborator = (id: string) => {
        setSelectedCollabIds(prev =>
            prev.map(String).includes(String(id)) ? prev : [...prev, String(id)]
        );
        setSearchQuery("");
        setComboOpen(false);
    };

    const removeCollaborator = (id: string) => {
        setSelectedCollabIds(prev => prev.filter(i => String(i) !== String(id)));
    };

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
                setComboOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    if (sessionLoading) return <PageLoader label="Carregando integrações..." />;
    if (!user) return null;
    if (!isCoordinator) return <AccessDenied />;

    // Eligible collaborators: never participated OR already in this event (edit mode)
    const eligible = collaborators.filter(c => {
        const hasNoEvents = !c.events || c.events.length === 0;
        const inCurrentEvent = editingEvent && editingEvent.collaborators.some((ec: any) => String(ec.id) === String(c.id));
        return hasNoEvents || inCurrentEvent;
    });

    // Already selected collaborator objects
    const selectedCollabs = eligible.filter(c => selectedCollabIds.map(String).includes(String(c.id)));

    // Dropdown suggestions: eligible, not yet selected, matching search
    const suggestions = eligible.filter(c =>
        !selectedCollabIds.map(String).includes(String(c.id)) &&
        (c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.role?.name || "").toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const INPUT = "w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all";
    const LABEL = "block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5";

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20 font-sans">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Integração de Eventos</h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Sincronize a base de dados com os eventos da agenda.</p>
                </div>
                <button
                    onClick={() => { setError(""); setIsCreating(true); }}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-md shadow-blue-500/10 transition-all"
                >
                    <Plus size={18} /> Adicionar Integração
                </button>
            </div>

            <FormModal
                open={isCreating}
                onClose={handleCancel}
                title={editingEvent ? "Editar Integração" : "Nova Integração"}
                size="md"
                dismissable={!loading}
                footer={
                    <>
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading || selectedCollabIds.length === 0 || !startDate || !endDate}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {loading ? "Salvando..." : (editingEvent ? "Salvar" : "Confirmar")}
                        </button>
                    </>
                }
            >
                    <div className="px-6 py-5 space-y-5">
                        {error && (
                            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs font-semibold rounded-lg animate-in fade-in duration-200">
                                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Datas */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={LABEL}>Início</label>
                                <input
                                    required
                                    type="date"
                                    className={INPUT}
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className={LABEL}>Término</label>
                                <input
                                    required
                                    type="date"
                                    className={INPUT}
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Equipe — combobox */}
                        <div>
                            <label className={LABEL}>
                                Colaboradores
                                {selectedCollabIds.length > 0 && (
                                    <span className="ml-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full normal-case tracking-normal">
                                        {selectedCollabIds.length}
                                    </span>
                                )}
                            </label>

                            {/* Combobox input */}
                            <div ref={comboRef} className="relative">
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder="Buscar e adicionar colaborador..."
                                        className={`${INPUT} pl-8`}
                                        value={searchQuery}
                                        onChange={e => { setSearchQuery(e.target.value); setComboOpen(true); }}
                                        onFocus={() => setComboOpen(true)}
                                    />
                                </div>

                                {/* Dropdown */}
                                {comboOpen && (
                                    <div className="absolute z-20 w-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                                        {suggestions.length === 0 ? (
                                            <div className="px-4 py-3 text-xs text-zinc-400 text-center">
                                                {searchQuery ? "Nenhum resultado." : "Todos os colaboradores já foram adicionados."}
                                            </div>
                                        ) : (
                                            suggestions.map((c, idx) => (
                                                <div
                                                    key={c.id}
                                                    onMouseDown={() => addCollaborator(String(c.id))}
                                                    className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors
                                                        ${idx !== 0 ? "border-t border-zinc-50 dark:border-zinc-800" : ""}`}
                                                >
                                                    <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-500 overflow-hidden shrink-0">
                                                        {c.photoUrl
                                                            ? <img src={c.photoUrl} alt={c.name} className="w-full h-full object-cover" />
                                                            : c.name.substring(0, 2).toUpperCase()
                                                        }
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-100 truncate">{c.name}</div>
                                                        <div className="text-[10px] text-zinc-400">{roleLabel(c.role?.name, "Sem cargo")}</div>
                                                    </div>
                                                    <Plus size={13} className="text-blue-500 shrink-0" />
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Selected collaborators list */}
                            {selectedCollabs.length > 0 && (
                                <div className="mt-2 border border-zinc-100 dark:border-zinc-800 rounded-lg overflow-hidden">
                                    {selectedCollabs.map((c, idx) => (
                                        <div
                                            key={c.id}
                                            className={`flex items-center gap-2.5 px-3 py-2.5
                                                ${idx !== 0 ? "border-t border-zinc-50 dark:border-zinc-800" : ""}`}
                                        >
                                            <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-[10px] font-bold text-blue-600 overflow-hidden shrink-0">
                                                {c.photoUrl
                                                    ? <img src={c.photoUrl} alt={c.name} className="w-full h-full object-cover" />
                                                    : c.name.substring(0, 2).toUpperCase()
                                                }
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-100 truncate">{c.name}</div>
                                                <div className="text-[10px] text-zinc-400">{roleLabel(c.role?.name, "Sem cargo")}</div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeCollaborator(String(c.id))}
                                                className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-zinc-400 hover:text-red-500 shrink-0"
                                            >
                                                <X size={13} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
            </FormModal>

            <div className="space-y-4">
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                                    <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Evento</th>
                                    <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Período</th>
                                    <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Equipe</th>
                                    <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {events.map(event => (
                                    <tr key={event.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-tighter">
                                                    EVT
                                                </div>
                                                <span className="font-bold text-sm text-zinc-800 dark:text-zinc-100">{event.title || "Integração de Novos Membros"}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs text-zinc-800 dark:text-zinc-200 font-bold">
                                                    {formatDayMonth(event.startDate)} - {formatDayMonth(event.endDate)}
                                                </span>
                                                <span className="text-[10px] text-zinc-400 font-medium">{getYearUTC(event.startDate)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex -space-x-2">
                                                {/* BUG FIX: collaborators são flat (ec.name), não nested (ec.collaborator.name) */}
                                                {event.collaborators.slice(0, 3).map((ec: any) => (
                                                    <div key={ec.id} title={ec.name} className="w-6 h-6 rounded-full border-2 border-white dark:border-zinc-900 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[8px] font-black text-zinc-500 uppercase overflow-hidden">
                                                        {ec.photoUrl ? (
                                                            <img src={ec.photoUrl} alt={ec.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            (ec.name || "?").substring(0, 1)
                                                        )}
                                                    </div>
                                                ))}
                                                {event.collaborators.length > 3 && (
                                                    <div className="w-6 h-6 rounded-full border-2 border-white dark:border-zinc-900 bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-[8px] font-black text-zinc-600">
                                                        +{event.collaborators.length - 3}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(event)}
                                                    className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-all"
                                                    title="Editar"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(event.id)}
                                                    className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {events.length === 0 && (
                            <div className="py-20 text-center flex flex-col items-center">
                                <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4 text-zinc-300 dark:text-zinc-600">
                                    <Clock size={32} />
                                </div>
                                <p className="text-zinc-500 font-medium italic">Nenhum evento processado até agora.</p>
                                <button onClick={() => { setError(""); setIsCreating(true); }} className="mt-4 text-sm font-bold text-blue-600 hover:underline">Agendar primeiro</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
