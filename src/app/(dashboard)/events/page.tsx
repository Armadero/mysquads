"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Calendar, Plus, History, CheckCircle, Clock, AlertCircle, X, ChevronRight, Activity, UserPlus, Users, Search, UserMinus, Pencil, Trash2 } from "lucide-react";

export default function EventsPage() {
    const { data: session } = useSession();
    const [events, setEvents] = useState<any[]>([]);
    const [collaborators, setCollaborators] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [editingEvent, setEditingEvent] = useState<any>(null);

    // Form state
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedCollabIds, setSelectedCollabIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (session) {
            fetchEvents();
            fetchCollaborators();
        }
    }, [session]);

    const fetchEvents = async () => {
        const res = await fetch("/api/events");
        if (res.ok) setEvents(await res.json());
    };

    const fetchCollaborators = async () => {
        const res = await fetch("/api/collaborators");
        if (res.ok) setCollaborators(await res.json());
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedCollabIds.length === 0) return;

        setLoading(true);
        const method = editingEvent ? "PUT" : "POST";
        const url = editingEvent ? `/api/events/${editingEvent.id}` : "/api/events";

        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                startDate,
                endDate,
                collaboratorIds: selectedCollabIds
            })
        });

        if (res.ok) {
            setStartDate("");
            setEndDate("");
            setSelectedCollabIds([]);
            setEditingEvent(null);
            setIsCreating(false);
            fetchEvents();
            fetchCollaborators(); // Refresh newcomers list
        }
        setLoading(false);
    };

    const handleEdit = (event: any) => {
        setEditingEvent(event);
        setStartDate(event.startDate.split('T')[0]);
        setEndDate(event.endDate.split('T')[0]);
        setSelectedCollabIds(event.collaborators.map((ec: any) => ec.collaborator.id));
        setIsCreating(true);
    };

    const handleCancel = () => {
        setIsCreating(false);
        setEditingEvent(null);
        setStartDate("");
        setEndDate("");
        setSelectedCollabIds([]);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir esta integração?")) return;

        const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
        if (res.ok) {
            fetchEvents();
            fetchCollaborators();
        }
    };

    const toggleCollaborator = (id: string) => {
        setSelectedCollabIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    if (!session?.user || (session.user as any).type !== "COORDINATOR") return null;

    // Filter newcomers (no previous integration events)
    // When editing, we also include collaborators ALREADY in that event
    const newcomers = collaborators.filter(c => {
        const hasNoEvents = !c.events || c.events.length === 0;
        const inCurrentEvent = editingEvent && editingEvent.collaborators.some((ec: any) => ec.collaborator.id === c.id);
        const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.role?.name || "").toLowerCase().includes(searchQuery.toLowerCase());
        return (hasNoEvents || inCurrentEvent) && matchesSearch;
    });

    const INPUT = "w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all";
    const LABEL = "block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5";

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20 font-sans">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Integração de Eventos</h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Sincronize a base de dados com os eventos da agenda.</p>
                </div>
                {!isCreating && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-md shadow-blue-500/10 transition-all"
                    >
                        <Plus size={18} /> Adicionar Integração
                    </button>
                )}
            </div>

            {isCreating && (
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-lg overflow-hidden lg:grid lg:grid-cols-2 lg:divide-x lg:divide-zinc-100 lg:dark:divide-zinc-800">
                    <div className="p-6 space-y-6">
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="font-bold text-sm uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                                {editingEvent ? "Editar Integração" : "Dados do Evento"}
                            </h2>
                            <button onClick={handleCancel} className="lg:hidden p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors">
                                <X size={16} className="text-zinc-400" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className={LABEL}>Data de Início</label>
                                    <input
                                        required
                                        type="date"
                                        className={INPUT}
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className={LABEL}>Data de Término</label>
                                    <input
                                        required
                                        type="date"
                                        className={INPUT}
                                        value={endDate}
                                        onChange={e => setEndDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-xl flex gap-3">
                                <AlertCircle size={20} className="text-amber-500 shrink-0" />
                                <div className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed font-medium">
                                    Apenas colaboradores que <strong>nunca</strong> participaram de outra integração estão disponíveis na lista.
                                </div>
                            </div>
                        </div>

                        <div className="hidden lg:flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                            <button type="button" onClick={handleCancel} className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">Cancelar</button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading || selectedCollabIds.length === 0 || !startDate || !endDate}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-all shadow-md shadow-blue-500/10 disabled:opacity-50"
                            >
                                {loading ? "Processando..." : (editingEvent ? "Salvar Alterações" : "Confirmar Agendamento")}
                            </button>
                        </div>
                    </div>

                    <div className="p-6 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col h-[500px]">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-bold text-sm uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Selecionar Equipe ({selectedCollabIds.length})</h2>
                            <button onClick={handleCancel} className="hidden lg:block p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors">
                                <X size={16} className="text-zinc-400" />
                            </button>
                        </div>

                        <div className="relative mb-4">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                            <input
                                type="text"
                                placeholder="Buscar novos colaboradores..."
                                className={`${INPUT} pl-10`}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {newcomers.map(c => (
                                <div
                                    key={c.id}
                                    onClick={() => toggleCollaborator(c.id)}
                                    className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${selectedCollabIds.includes(c.id)
                                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 shadow-sm"
                                        : "bg-white dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700 hover:border-zinc-200 dark:hover:border-zinc-600"
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold overflow-hidden ${selectedCollabIds.includes(c.id) ? "bg-blue-600 text-white" : "bg-zinc-100 dark:bg-zinc-700 text-zinc-500"
                                            }`}>
                                            {c.photoUrl ? (
                                                <img src={c.photoUrl} alt={c.name} className="w-full h-full object-cover" />
                                            ) : (
                                                c.name.substring(0, 2).toUpperCase()
                                            )}
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-zinc-800 dark:text-zinc-100">{c.name}</div>
                                            <div className="text-[10px] text-zinc-400 uppercase font-black tracking-tighter">{c.role?.name || "Sem Cargo"}</div>
                                        </div>
                                    </div>
                                    {selectedCollabIds.includes(c.id) ? (
                                        <div className="bg-blue-600 text-white p-1 rounded-full"><Users size={12} /></div>
                                    ) : (
                                        <div className="text-zinc-300"><Plus size={14} /></div>
                                    )}
                                </div>
                            ))}
                            {newcomers.length === 0 && (
                                <div className="text-center py-10">
                                    <p className="text-xs text-zinc-400 italic">Nenhum novo colaborador disponível.</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 lg:hidden text-center">
                            <button
                                onClick={handleSubmit}
                                disabled={loading || selectedCollabIds.length === 0 || !startDate || !endDate}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-all shadow-md shadow-blue-500/10 disabled:opacity-50"
                            >
                                {loading ? "Processando..." : (editingEvent ? "Salvar Alterações" : "Confirmar Agendamento")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                                                <span className="font-bold text-sm text-zinc-800 dark:text-zinc-100">Integração de Novos Membros</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs text-zinc-800 dark:text-zinc-200 font-bold">
                                                    {new Date(event.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - {new Date(event.endDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                                </span>
                                                <span className="text-[10px] text-zinc-400 font-medium">{new Date(event.startDate).getFullYear()}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex -space-x-2">
                                                {event.collaborators.slice(0, 3).map((ec: any, i: number) => (
                                                    <div key={i} title={ec.collaborator.name} className="w-6 h-6 rounded-full border-2 border-white dark:border-zinc-900 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[8px] font-black text-zinc-500 uppercase overflow-hidden">
                                                        {ec.collaborator.photoUrl ? (
                                                            <img src={ec.collaborator.photoUrl} alt={ec.collaborator.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            ec.collaborator.name.substring(0, 1)
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
                                <button onClick={() => setIsCreating(true)} className="mt-4 text-sm font-bold text-blue-600 hover:underline">Agendar primeiro</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
