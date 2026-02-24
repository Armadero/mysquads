"use client";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { Search, ArrowRight, ShieldCheck } from "lucide-react";

export default function ConnectionsPage() {
    const { data: session } = useSession();
    const [links, setLinks] = useState<{ id: string; status: string; coordinator?: { name: string; email: string } }[]>([]);
    const [search, setSearch] = useState("");
    const [coordinators, setCoordinators] = useState<{ id: string; name: string; email: string }[]>([]);
    const [requestFeedback, setRequestFeedback] = useState<{ id: string; success: boolean; message: string } | null>(null);

    useEffect(() => {
        if (!session || session.user.type !== "MANAGER") return;
        fetchLinks();
    }, [session]);

    const fetchLinks = async () => {
        const res = await fetch("/api/links");
        if (res.ok) setLinks(await res.json());
    };

    const searchCoordinators = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch(`/api/coordinators?q=${encodeURIComponent(search)}`);
        if (res.ok) setCoordinators(await res.json());
    };

    const requestLink = async (coordinatorId: string) => {
        const res = await fetch("/api/links", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ coordinatorId }),
        });
        if (res.ok) {
            setRequestFeedback({ id: coordinatorId, success: true, message: "Solicitação enviada com sucesso!" });
            setTimeout(() => setRequestFeedback(null), 3000);
            fetchLinks();
        } else {
            setRequestFeedback({ id: coordinatorId, success: false, message: "Falha na solicitação." });
            setTimeout(() => setRequestFeedback(null), 3000);
        }
    };

    if (!session || session.user.type !== "MANAGER") return null;

    const pendingConnections = links.filter(link => link.status !== 'APPROVED');
    const activeConnections = links.filter(link => link.status === 'APPROVED');

    return (
        <div className="animate-in fade-in duration-500 w-full h-[calc(100vh-180px)] flex flex-col overflow-hidden">
            {/* Header com estilo Modern SaaS */}
            <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#E2E8F0] pb-4 mb-4 gap-4 shrink-0">
                <div>
                    <h1 className="text-[24px] font-bold text-[#2D3E50] leading-tight">Coordenadores</h1>
                    <p className="text-[14px] text-[#718096] mt-1 font-normal">Conecte-se com coordenadores para visualizar seus indicadores e squads.</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F5F7FA] rounded-[6px] text-[12px] font-medium text-[#4A5568] border border-[#E2E8F0]">
                    <ShieldCheck size={14} className="text-[#4A90E2]" /> GERENCIAMENTO DE ACESSOS
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1 min-h-0 overflow-hidden">
                {/* Painel de busca: Soft White Card */}
                <section className="lg:col-span-4 bg-white p-6 rounded-[6px] border border-[#E2E8F0] shadow-[0_2px_8px_rgba(0,0,0,0.05)] flex flex-col overflow-hidden">
                    <h2 className="text-[18px] font-semibold text-[#2D3E50] mb-4 flex items-center gap-2 shrink-0">
                        Conexão
                    </h2>

                    <form onSubmit={searchCoordinators} className="space-y-3 mb-6 shrink-0">
                        <div>
                            <label className="text-[12px] font-medium text-[#718096] mb-1.5 block uppercase tracking-wider">NOME DO COORDENADOR</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Ex: Ana Silva..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full bg-white border border-[#E2E8F0] p-2.5 rounded-[4px] text-[14px] text-[#4A5568] focus:outline-none focus:border-[#4A90E2] focus:ring-1 focus:ring-[#4A90E2]/20 transition-all placeholder:text-[#CBD5E0]"
                                />
                                <button type="submit" className="absolute right-2 top-1.5 p-1 text-[#718096] hover:text-[#4A90E2] transition-colors">
                                    <Search size={18} />
                                </button>
                            </div>
                        </div>
                        <button type="submit" className="w-full bg-[#4A90E2] hover:bg-[#357ABD] text-white font-bold py-2.5 rounded-[6px] text-[12px] transition-all shadow-sm">
                            BUSCAR AGORA
                        </button>
                    </form>

                    <div className="space-y-3 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                        {coordinators.map(c => (
                            <div key={c.id} className="p-4 border border-[#F1F5F9] rounded-[6px] hover:border-[#4A90E2]/20 hover:bg-[#F8FAFC] transition-all group">
                                <div className="flex flex-col gap-3">
                                    <div className="min-w-0">
                                        <div className="font-semibold text-[14px] text-[#2D3E50]">{c.name}</div>
                                        <div className="text-[12px] text-[#718096] truncate">{c.email}</div>
                                    </div>
                                    <button
                                        onClick={() => requestLink(c.id)}
                                        disabled={links.some(l => l.coordinator?.email === c.email)}
                                        className="w-full py-1.5 text-[11px] font-bold text-[#4A90E2] border border-[#4A90E2]/10 rounded-[4px] hover:bg-[#4A90E2] hover:text-white transition-all disabled:opacity-20 flex items-center justify-center gap-2"
                                    >
                                        SOLICITAR ACESSO <ArrowRight size={12} />
                                    </button>
                                </div>
                                {requestFeedback?.id === c.id && (
                                    <div className={`mt-2 text-[10px] font-bold text-center ${requestFeedback.success ? "text-[#48BB78]" : "text-[#F56565]"}`}>
                                        {requestFeedback.message}
                                    </div>
                                )}
                            </div>
                        ))}
                        {coordinators.length === 0 && search && <div className="text-[#A0AEC0] text-[12px] text-center py-12 italic">Nenhum resultado.</div>}
                        {!search && <div className="text-[#CBD5E0] text-[10px] font-medium uppercase tracking-widest text-center py-12 border-2 border-dashed border-[#F1F5F9] rounded-[6px]">Aguardando termo...</div>}
                    </div>
                </section>

                <div className="lg:col-span-8 flex flex-col gap-6 h-full overflow-hidden">
                    {/* Ativos */}
                    <section className="bg-white p-6 rounded-[6px] border border-[#E2E8F0] shadow-[0_2px_8px_rgba(0,0,0,0.05)] flex flex-col overflow-hidden min-h-0 flex-1">
                        <div className="flex items-center justify-between mb-4 shrink-0">
                            <h2 className="text-[18px] font-semibold text-[#2D3E50]">Meus Coordenadores</h2>
                            <div className="px-2 py-0.5 bg-[#EBF8F2] text-[#48BB78] text-[10px] font-bold rounded-full">
                                {activeConnections.length} ATIVOS
                            </div>
                        </div>
                        <div className="space-y-4 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                            {activeConnections.map(link => (
                                <div key={link.id} className="p-4 bg-[#F5F7FA] border border-[#E2E8F0] rounded-[6px] flex items-center justify-between group hover:bg-white transition-all hover:shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-white border border-[#E2E8F0] text-[#4A90E2] font-bold rounded-full flex items-center justify-center shadow-sm">
                                            {link.coordinator?.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-[14px] text-[#2D3E50]">{link.coordinator?.name}</div>
                                            <div className="text-[12px] text-[#718096]">{link.coordinator?.email}</div>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold text-[#48BB78] italic">CONECTADO</span>
                                </div>
                            ))}
                            {activeConnections.length === 0 && <div className="text-[#A0AEC0] text-[13px] text-center py-12 border-2 border-dashed border-[#F5F7FA] rounded-[6px]">Sem conexões aprovadas.</div>}
                        </div>
                    </section>

                    {/* Pendentes/Rejeitadas - EXIBIR APENAS SE TIVER ITENS */}
                    {pendingConnections.length > 0 && (
                        <section className="bg-white p-6 rounded-[6px] border border-[#E2E8F0] shadow-[0_2px_8px_rgba(0,0,0,0.05)] flex flex-col overflow-hidden min-h-0 max-h-[40%] shrink-0">
                            <h2 className="text-[18px] font-semibold text-[#2D3E50] mb-4 shrink-0">Status de Solicitações</h2>
                            <div className="space-y-4 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                                {pendingConnections.map(link => (
                                    <div key={link.id} className="p-4 border border-[#F1F5F9] rounded-[6px] flex items-center justify-between bg-white text-zinc-800">
                                        <div>
                                            <div className="font-semibold text-[14px] text-[#2D3E50]">{link.coordinator?.name}</div>
                                            <div className="text-[12px] text-[#718096]">{link.coordinator?.email}</div>
                                        </div>
                                        <div className={`text-[10px] font-bold px-3 py-1 rounded-[4px] border ${link.status === 'REJECTED'
                                            ? 'bg-[#FFF5F5] text-[#F56565] border border-[#F56565]/10'
                                            : 'bg-[#FFFAF0] text-[#ED8936] border border-[#ED8936]/10'
                                            }`}>
                                            {link.status === 'REJECTED' ? 'CONEXÃO RECUSADA' : 'EM PROCESSAMENTO'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}
