"use client";
import { useState, useEffect } from "react";
import { MessageSquare, Plus, History, CheckCircle, Clock, AlertCircle, X, Search, Pencil, Trash2, Calendar, User, Tag, ArrowRight, UserPlus, ChevronDown, Filter, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const FEEDBACK_TYPES = {
    POSITIVE: { label: "Positivo", color: "bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-400" },
    NEGATIVE: { label: "Negativo", color: "bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400" },
    NEUTRAL: { label: "Neutro", color: "bg-zinc-50 text-zinc-700 border-zinc-100 dark:bg-zinc-800 dark:text-zinc-400" }
};

const ORIGINS = {
    COLLABORATOR_REQUEST: "Solicitação do colaborador",
    PERIODIC: "Periódico",
    PEER_REQUEST: "Solicitação de colega",
    CONFLICT: "Mediante Conflito"
};

export default function FeedbackPage() {
    const supabase = createClient();
    const [user, setUser] = useState<any>(null);
    const [feedbacks, setFeedbacks] = useState<any[]>([]);
    const [collaborators, setCollaborators] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [editingFeedback, setEditingFeedback] = useState<any>(null);
    const [viewingFeedback, setViewingFeedback] = useState<any>(null);
    const [error, setError] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    // Form state
    const [date, setDate] = useState("");
    const [collaboratorId, setCollaboratorId] = useState("");
    const [content, setContent] = useState("");
    const [tag, setTag] = useState("");
    const [type, setType] = useState<keyof typeof FEEDBACK_TYPES>("NEUTRAL");
    const [origin, setOrigin] = useState<keyof typeof ORIGINS>("PERIODIC");

    const isManager = user?.user_metadata?.type === "MANAGER";
    const isCoordinator = user?.user_metadata?.type === "COORDINATOR";

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        fetchUser();
    }, [supabase.auth]);

    useEffect(() => {
        if (user) {
            fetchFeedbacks();
            if (isCoordinator) fetchCollaborators();
        }
    }, [user, isCoordinator]);

    const fetchFeedbacks = async () => {
        const res = await fetch("/api/feedback");
        if (res.ok) setFeedbacks(await res.json());
    };

    const fetchCollaborators = async () => {
        const res = await fetch("/api/collaborators");
        if (res.ok) setCollaborators(await res.json());
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isManager) return;

        setLoading(true);
        const method = editingFeedback ? "PUT" : "POST";
        const url = editingFeedback ? `/api/feedback/${editingFeedback.id}` : "/api/feedback";

        setError("");
        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ date, collaboratorId, content, tag, type, origin })
        });

        if (res.ok) {
            handleCancel();
            fetchFeedbacks();
        } else {
            const errData = await res.json();
            setError(errData.error || "Erro ao salvar feedback");
        }
        setLoading(false);
    };

    const handleEdit = (fb: any) => {
        if (isManager) return;
        setEditingFeedback(fb);
        setDate(fb.date.split('T')[0]);
        setCollaboratorId(fb.collaboratorId);
        setContent(fb.content);
        setTag(fb.tag || "");
        setType(fb.type);
        setOrigin(fb.origin);
        setIsCreating(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleDelete = async (id: string) => {
        if (isManager) return;
        if (!confirm("Tem certeza que deseja excluir este registro de feedback?")) return;
        const res = await fetch(`/api/feedback/${id}`, { method: "DELETE" });
        if (res.ok) fetchFeedbacks();
    };

    const handleCancel = () => {
        setIsCreating(false);
        setEditingFeedback(null);
        setDate("");
        setCollaboratorId("");
        setContent("");
        setTag("");
        setType("NEUTRAL");
        setOrigin("PERIODIC");
    };

    if (!user || (!isCoordinator && !isManager)) return null;

    const INPUT = "w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all";
    const LABEL = "block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5";

    const filteredFeedbacks = feedbacks.filter(fb =>
        fb.collaborator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fb.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (fb.tag || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (fb.coordinator?.name || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
            {/* Header Padronizado */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Gestão de Feedbacks</h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {isManager ? "Visualize os feedbacks registrados pelos seus coordenadores conectados." : "Registre e acompanhe o desenvolvimento dos colaboradores."}
                    </p>
                </div>
                {isCoordinator && !isCreating && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-md shadow-blue-500/10 transition-all"
                    >
                        <Plus size={18} /> Novo Feedback
                    </button>
                )}
                {isManager && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-bold text-zinc-500 uppercase tracking-tighter shadow-sm">
                        <Clock size={14} className="text-blue-500" /> Modo Visualização
                    </div>
                )}
            </div>

            {/* Form Padronizado */}
            {isCreating && isCoordinator && (
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-lg overflow-hidden animate-in slide-in-from-top duration-300">
                    <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex justify-between items-center">
                        <h2 className="font-bold text-sm uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                            {editingFeedback ? "Editar Registro" : "Registrar Novo Feedback"}
                        </h2>
                        <button onClick={handleCancel} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors">
                            <X size={16} className="text-zinc-400" />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {error && (
                                <div className="md:col-span-3 p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-lg animate-in fade-in zoom-in">
                                    ⚠️ {error}
                                </div>
                            )}
                            <div className="md:col-span-1 space-y-4">
                                <div className="space-y-1">
                                    <label className={LABEL}>Data do Ocorrido</label>
                                    <input required type="date" className={INPUT} value={date} onChange={e => setDate(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <label className={LABEL}>Colaborador</label>
                                    <div className="relative">
                                        <select required className={`${INPUT} appearance-none`} value={collaboratorId} onChange={e => setCollaboratorId(e.target.value)}>
                                            <option value="">Selecione...</option>
                                            {collaborators.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={14} />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className={LABEL}>Tipo de Feedback</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {Object.entries(FEEDBACK_TYPES).map(([key, value]) => (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => setType(key as any)}
                                                className={`py-2 text-[10px] font-bold uppercase rounded-md border transition-all ${type === key ? value.color : "bg-white dark:bg-zinc-800 text-zinc-400 border-zinc-200 dark:border-zinc-700"}`}
                                            >
                                                {value.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className={LABEL}>Origem</label>
                                    <select className={INPUT} value={origin} onChange={e => setOrigin(e.target.value as any)}>
                                        {Object.entries(ORIGINS).map(([key, value]) => (
                                            <option key={key} value={key}>{value}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className={LABEL}>Tag / Contexto</label>
                                    <div className="relative">
                                        <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                                        <input
                                            placeholder="Ex: 1 on 1..."
                                            className={`${INPUT} pl-9`}
                                            value={tag}
                                            onChange={e => setTag(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2 flex flex-col">
                                <div className="flex-1 flex flex-col space-y-1">
                                    <label className={LABEL}>Conteúdo do Feedback</label>
                                    <textarea
                                        required
                                        placeholder="Descreva detalhadamente o feedback..."
                                        className={`${INPUT} flex-1 min-h-[150px] resize-none`}
                                        value={content}
                                        onChange={e => setContent(e.target.value)}
                                    />
                                </div>
                                <div className="flex justify-end gap-3 pt-6 border-t border-zinc-100 dark:border-zinc-800 mt-6">
                                    <button type="button" onClick={handleCancel} className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">Cancelar</button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-all shadow-md shadow-blue-500/10 disabled:opacity-50"
                                    >
                                        {loading ? "Salvando..." : (editingFeedback ? "Atualizar" : "Salvar")}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* Listagem Padronizada (Tabela estilo Colaboradores) */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <div className="p-4 bg-zinc-50/50 dark:bg-zinc-800/30 border-b border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="font-bold text-xs uppercase tracking-wider text-zinc-500">Histórico de Registros ({filteredFeedbacks.length})</h2>
                    <div className="relative w-full md:w-80">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            className={`${INPUT} pl-10`}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Colaborador</th>
                                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Tipo/Label</th>
                                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-center">Data</th>
                                {isManager && <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Coordenador</th>}
                                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Resumo</th>
                                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {filteredFeedbacks.map(fb => (
                                <tr key={fb.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500 overflow-hidden border border-zinc-200 dark:border-zinc-700">
                                                {fb.collaborator.photoUrl ? (
                                                    <img src={fb.collaborator.photoUrl} alt={fb.collaborator.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    fb.collaborator.name.substring(0, 2).toUpperCase()
                                                )}
                                            </div>
                                            <div className="overflow-hidden">
                                                <div className="text-sm font-bold text-zinc-800 dark:text-zinc-100 truncate">{fb.collaborator.name}</div>
                                                <div className="text-[10px] text-zinc-400 uppercase font-black tracking-tighter truncate">{fb.collaborator.role?.name || "Sem Cargo"}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1.5">
                                            <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-tighter ${FEEDBACK_TYPES[fb.type as keyof typeof FEEDBACK_TYPES].color}`}>
                                                {FEEDBACK_TYPES[fb.type as keyof typeof FEEDBACK_TYPES].label}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px] text-zinc-400 uppercase font-bold bg-zinc-100 dark:bg-zinc-800 px-1.5 rounded truncate">
                                                    {ORIGINS[fb.origin as keyof typeof ORIGINS].split(' ')[0]}
                                                </span>
                                                {fb.tag && (
                                                    <span className="text-[10px] text-blue-500 uppercase font-bold bg-blue-50 dark:bg-blue-900/20 px-1.5 rounded truncate max-w-[80px]">
                                                        {fb.tag}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="text-xs font-medium text-zinc-500">{new Date(fb.date).toLocaleDateString()}</div>
                                    </td>
                                    {isManager && (
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 group-hover:text-blue-600 transition-colors">
                                                {fb.coordinator?.name}
                                            </div>
                                        </td>
                                    )}
                                    <td className="px-6 py-4">
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-1 italic max-w-xs transition-all duration-300">
                                            "{fb.content}"
                                        </p>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                            <button onClick={() => setViewingFeedback(fb)} title="Visualizar" className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-all">
                                                <Eye size={16} />
                                            </button>
                                            {isCoordinator && (
                                                <>
                                                    <button onClick={() => handleEdit(fb)} title="Editar" className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-all">
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button onClick={() => handleDelete(fb.id)} title="Excluir" className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredFeedbacks.length === 0 && (
                        <div className="py-20 text-center flex flex-col items-center">
                            <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4 text-zinc-300 dark:text-zinc-600">
                                <MessageSquare size={32} />
                            </div>
                            <p className="text-zinc-500 font-medium italic">Nenhum feedback encontrado.</p>
                            {isCoordinator && (
                                <button onClick={() => setIsCreating(true)} className="mt-4 text-sm font-bold text-blue-600 hover:underline">
                                    Adicionar o primeiro
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Visualização */}
            {viewingFeedback && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/30">
                            <div>
                                <h2 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">Visualizar Feedback</h2>
                                <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest mt-0.5">Detalhes do Registro</p>
                            </div>
                            <button onClick={() => setViewingFeedback(null)} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors text-zinc-400">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 space-y-8">
                            <div className="flex flex-col md:flex-row justify-between gap-6">
                                <div className="flex gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-lg font-bold text-blue-600 overflow-hidden border border-blue-100 dark:border-blue-900/30">
                                        {viewingFeedback.collaborator.photoUrl ? (
                                            <img src={viewingFeedback.collaborator.photoUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            viewingFeedback.collaborator.name.substring(0, 2).toUpperCase()
                                        )}
                                    </div>
                                    <div>
                                        <div className="font-bold text-xl text-zinc-900 dark:text-zinc-100">{viewingFeedback.collaborator.name}</div>
                                        <div className="text-sm text-zinc-500 font-medium">{viewingFeedback.collaborator.role?.name || "Sem Cargo"}</div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <div className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xs font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                                        <Calendar size={14} /> {new Date(viewingFeedback.date).toLocaleDateString()}
                                    </div>
                                    <div className={`mt-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter border ${FEEDBACK_TYPES[viewingFeedback.type as keyof typeof FEEDBACK_TYPES].color}`}>
                                        {FEEDBACK_TYPES[viewingFeedback.type as keyof typeof FEEDBACK_TYPES].label}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                    <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Origem</div>
                                    <div className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{ORIGINS[viewingFeedback.origin as keyof typeof ORIGINS]}</div>
                                </div>
                                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                    <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Tag/Contexto</div>
                                    <div className="text-sm font-bold text-blue-600 flex items-center gap-1">
                                        <Tag size={12} /> {viewingFeedback.tag || "Nenhuma"}
                                    </div>
                                </div>
                                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800 col-span-2">
                                    <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Registrado por</div>
                                    <div className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{viewingFeedback.coordinator?.name}</div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Conteúdo do Feedback</label>
                                <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl italic text-zinc-700 dark:text-zinc-300 leading-relaxed font-serif whitespace-pre-wrap">
                                    "{viewingFeedback.content}"
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex justify-end">
                            <button onClick={() => setViewingFeedback(null)} className="px-6 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-bold rounded-xl transition-transform hover:scale-105 active:scale-95 shadow-lg">
                                FECHAR JANELA
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
