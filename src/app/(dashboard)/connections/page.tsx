"use client";
import { useState, useEffect, useCallback } from "react";
import { Search, ArrowRight, ShieldCheck, Users, Loader2 } from "lucide-react";
import { useSession } from "@/lib/hooks/use-session";
import { PageLoader, AccessDenied } from "@/components/ui/page-state";
import { describeApiError } from "@/lib/utils";

type Link = {
    id: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    coordinator?: { id: string; name: string; email: string };
};

type Coordinator = { id: string; name: string; email: string };

export default function ConnectionsPage() {
    const { user, loading: sessionLoading } = useSession();
    const [links, setLinks] = useState<Link[]>([]);
    const [search, setSearch] = useState("");
    const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
    const [searched, setSearched] = useState(false);
    const [searching, setSearching] = useState(false);
    const [requestFeedback, setRequestFeedback] = useState<{ id: string; success: boolean; message: string } | null>(null);

    const isManager = user?.type === "MANAGER";

    const fetchLinks = useCallback(async () => {
        const res = await fetch("/api/links");
        if (res.ok) setLinks(await res.json());
    }, []);

    useEffect(() => {
        if (!isManager) return;
        fetchLinks();
    }, [isManager, fetchLinks]);

    const searchCoordinators = async (e: React.FormEvent) => {
        e.preventDefault();
        setSearching(true);
        try {
            const res = await fetch(`/api/coordinators?q=${encodeURIComponent(search)}`);
            if (res.ok) setCoordinators(await res.json());
            setSearched(true);
        } finally {
            setSearching(false);
        }
    };

    const requestLink = async (coordinatorId: string) => {
        const res = await fetch("/api/links", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ coordinatorId }),
        });

        if (res.ok) {
            setRequestFeedback({ id: coordinatorId, success: true, message: "Solicitação enviada!" });
            fetchLinks();
        } else {
            // Antes qualquer falha virava "Falha na solicitação", escondendo o
            // motivo real (ex.: já existe uma solicitação para este coordenador).
            const data = await res.json().catch(() => ({}));
            setRequestFeedback({
                id: coordinatorId,
                success: false,
                message: describeApiError(data, "Falha na solicitação."),
            });
        }
        setTimeout(() => setRequestFeedback(null), 4000);
    };

    if (sessionLoading) return <PageLoader label="Carregando conexões..." />;
    if (!user) return null;
    if (!isManager) {
        return <AccessDenied message="Esta área está disponível apenas para gerentes." />;
    }

    const pendingConnections = links.filter(l => l.status !== "APPROVED");
    const activeConnections = links.filter(l => l.status === "APPROVED");
    // Um coordenador já solicitado não pode ser solicitado de novo.
    const requestedIds = new Set(
        links.filter(l => l.status !== "REJECTED").map(l => String(l.coordinator?.id))
    );

    const STATUS_BADGE: Record<string, { label: string; className: string }> = {
        REJECTED: {
            label: "Conexão recusada",
            className: "bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30",
        },
        PENDING: {
            label: "Aguardando aprovação",
            className: "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30",
        },
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20 font-sans">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Coordenadores</h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Conecte-se com coordenadores para visualizar seus indicadores e squads.
                    </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-bold text-zinc-500 uppercase tracking-tighter shadow-sm">
                    <ShieldCheck size={14} className="text-blue-500" /> Gerenciamento de acessos
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Busca */}
                <section className="lg:col-span-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                    <div className="p-4 bg-zinc-50/50 dark:bg-zinc-800/30 border-b border-zinc-100 dark:border-zinc-800">
                        <h2 className="font-bold text-xs uppercase tracking-wider text-zinc-500">Nova conexão</h2>
                    </div>

                    <div className="p-5 space-y-4">
                        <form onSubmit={searchCoordinators} className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                    Nome ou e-mail
                                </label>
                                <div className="relative">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder="Ex: Ana Silva..."
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        className="w-full pl-10 pr-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={searching}
                                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2 rounded-lg text-sm transition-all shadow-md shadow-blue-500/10"
                            >
                                {searching ? <><Loader2 size={14} className="animate-spin" /> Buscando...</> : "Buscar"}
                            </button>
                        </form>

                        <div className="space-y-2">
                            {coordinators.map(c => {
                                const alreadyRequested = requestedIds.has(String(c.id));
                                return (
                                    <div
                                        key={c.id}
                                        className="p-3 border border-zinc-100 dark:border-zinc-800 rounded-lg hover:border-blue-200 dark:hover:border-blue-900 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-all space-y-2"
                                    >
                                        <div className="min-w-0">
                                            <div className="font-bold text-sm text-zinc-800 dark:text-zinc-100 truncate">{c.name}</div>
                                            <div className="text-xs text-zinc-500 truncate">{c.email}</div>
                                        </div>
                                        <button
                                            onClick={() => requestLink(c.id)}
                                            disabled={alreadyRequested}
                                            className="w-full flex items-center justify-center gap-2 py-1.5 text-[11px] font-bold rounded-md border transition-all
                                                border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400
                                                hover:bg-blue-600 hover:text-white hover:border-blue-600
                                                disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-blue-600"
                                        >
                                            {alreadyRequested ? "JÁ SOLICITADO" : <>SOLICITAR ACESSO <ArrowRight size={12} /></>}
                                        </button>
                                        {requestFeedback?.id === c.id && (
                                            <div className={`text-[10px] font-bold text-center ${requestFeedback.success ? "text-green-600" : "text-red-500"}`}>
                                                {requestFeedback.message}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {searched && coordinators.length === 0 && (
                                <p className="text-xs text-zinc-400 italic text-center py-8">Nenhum coordenador encontrado.</p>
                            )}
                            {!searched && (
                                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-300 dark:text-zinc-600 text-center py-8 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-lg">
                                    Busque para começar
                                </p>
                            )}
                        </div>
                    </div>
                </section>

                {/* Conexões */}
                <div className="lg:col-span-8 space-y-6">
                    <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                        <div className="p-4 bg-zinc-50/50 dark:bg-zinc-800/30 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                            <h2 className="font-bold text-xs uppercase tracking-wider text-zinc-500">Meus coordenadores</h2>
                            <span className="text-[10px] font-black bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 px-2 py-0.5 rounded-full border border-green-100 dark:border-green-900/30">
                                {activeConnections.length} ativo(s)
                            </span>
                        </div>

                        <div className="p-5 space-y-2">
                            {activeConnections.map(link => (
                                <div
                                    key={link.id}
                                    className="flex items-center justify-between gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 rounded-lg hover:bg-white dark:hover:bg-zinc-800 hover:shadow-sm transition-all"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center shrink-0">
                                            {link.coordinator?.name?.[0]?.toUpperCase() || "?"}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-bold text-sm text-zinc-800 dark:text-zinc-100 truncate">{link.coordinator?.name}</div>
                                            <div className="text-xs text-zinc-500 truncate">{link.coordinator?.email}</div>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-tighter text-green-600 dark:text-green-400 shrink-0">
                                        Conectado
                                    </span>
                                </div>
                            ))}

                            {activeConnections.length === 0 && (
                                <div className="py-14 text-center flex flex-col items-center">
                                    <div className="w-14 h-14 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-3 text-zinc-300 dark:text-zinc-600">
                                        <Users size={26} />
                                    </div>
                                    <p className="text-zinc-500 font-medium italic text-sm">Nenhuma conexão aprovada ainda.</p>
                                    <p className="text-xs text-zinc-400 mt-1">Busque um coordenador ao lado e solicite acesso.</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {pendingConnections.length > 0 && (
                        <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                            <div className="p-4 bg-zinc-50/50 dark:bg-zinc-800/30 border-b border-zinc-100 dark:border-zinc-800">
                                <h2 className="font-bold text-xs uppercase tracking-wider text-zinc-500">Status das solicitações</h2>
                            </div>
                            <div className="p-5 space-y-2">
                                {pendingConnections.map(link => {
                                    const badge = STATUS_BADGE[link.status] || STATUS_BADGE.PENDING;
                                    return (
                                        <div
                                            key={link.id}
                                            className="flex items-center justify-between gap-3 p-3 border border-zinc-100 dark:border-zinc-800 rounded-lg"
                                        >
                                            <div className="min-w-0">
                                                <div className="font-bold text-sm text-zinc-800 dark:text-zinc-100 truncate">{link.coordinator?.name}</div>
                                                <div className="text-xs text-zinc-500 truncate">{link.coordinator?.email}</div>
                                            </div>
                                            <span className={`shrink-0 text-[10px] font-black uppercase tracking-tighter px-2.5 py-1 rounded-md border ${badge.className}`}>
                                                {badge.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}
