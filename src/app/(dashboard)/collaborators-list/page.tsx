"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ChevronLeft, Users, Gift, Cake, AlertTriangle, MoreHorizontal, Download, Mail, Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function CollaboratorsListContent() {
    const supabase = createClient();
    const [user, setUser] = useState<any>(null);
    const searchParams = useSearchParams();
    const router = useRouter();
    const type = searchParams.get("type");
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        fetchUser();
    }, [supabase.auth]);

    useEffect(() => {
        if (user && type) {
            fetchListData();
        }
    }, [user, type]);

    const fetchListData = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/dashboard");
            if (res.ok) {
                const dashboard = await res.json();
                const metrics = dashboard.metrics || (dashboard.managerMetrics?.[0]?.metrics);

                if (metrics) {
                    if (type === "company-anniversary") setData(metrics.companyAnniversaries);
                    else if (type === "birthday") setData(metrics.birthdays);
                    else if (type === "timebank-alerts") setData(metrics.expiringTimebank);
                }
            }
        } catch (error) {
            console.error("Error fetching list:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleExportCSV = () => {
        if (data.length === 0) return;

        // Headers
        const headers = ["Nome", "Cargo", "Equipe/Squads", "Informação", "Endereço de Entrega"];

        // Rows
        const rows = data.map(item => {
            const squads = item.squads?.map((s: any) => s?.name).filter(Boolean).join(", ") || "Nenhum";
            const info = type === "timebank-alerts"
                ? `${item.balance}h (em ${item.daysLeft}d)`
                : type === "company-anniversary"
                    ? new Date(item.admissionDate).toLocaleDateString('pt-BR')
                    : new Date(item.birthDate).toLocaleDateString('pt-BR');

            return [
                item.name,
                item.role?.name || "Sem cargo",
                squads,
                info,
                item.deliveryAddress || "Não informado"
            ].map(val => `"${val.toString().replace(/"/g, '""')}"`).join(",");
        });

        const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `colaboradores_${type}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getHeaderInfo = () => {
        switch (type) {
            case "company-anniversary":
                return { title: "Listagem: Aniversários de Empresa", description: "Colaboradores celebrando marcos de carreira este mês.", icon: <Gift className="text-green-600" /> };
            case "birthday":
                return { title: "Listagem: Aniversariantes", description: "Colaboradores que fazem aniversário este mês.", icon: <Cake className="text-purple-600" /> };
            case "timebank-alerts":
                return { title: "Listagem: Alertas de Banco", description: "Colaboradores com saldo para expirar em breve.", icon: <AlertTriangle className="text-red-600" /> };
            default:
                return { title: "Listagem de Colaboradores", description: "Visualização detalhada da equipe.", icon: <Users className="text-blue-600" /> };
        }
    };

    const info = getHeaderInfo();

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors group">
                        <ChevronLeft size={20} className="text-zinc-500 group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white uppercase tracking-tight">{info.title}</h1>
                            {info.icon}
                        </div>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">{info.description}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExportCSV}
                        disabled={data.length === 0}
                        className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download size={14} /> Exportar Lista
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-zinc-50/50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Colaborador</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Cargo</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Equipe / Squads</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">{type === "timebank-alerts" ? "Saldo / Prazo" : "Data"}</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
                        {data.map((item) => (
                            <tr key={item.id} className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        {item.photoUrl ? (
                                            <img src={item.photoUrl} alt={item.name} className="w-8 h-8 rounded-full object-cover border border-zinc-200 dark:border-zinc-700" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500">
                                                {item.name.substring(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="font-bold text-sm text-zinc-800 dark:text-zinc-200">{item.name}</div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{item.role?.name || "Sem cargo"}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1">
                                        {item.squads && item.squads.length > 0 ? (
                                            item.squads.map((s: any, i: number) => (
                                                <span key={i} className="text-[9px] font-black px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 uppercase tracking-tighter">
                                                    {s?.name || "N/A"}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-[10px] italic text-zinc-400">Nenhum</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {type === "timebank-alerts" ? (
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-red-600">{item.balance}h</span>
                                            <span className="text-[10px] text-zinc-400 italic">expira em {item.daysLeft} dias</span>
                                        </div>
                                    ) : (
                                        <span className="text-xs font-bold text-zinc-500">
                                            {type === "company-anniversary"
                                                ? new Date(item.admissionDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                                                : new Date(item.birthDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                                            }
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button title="Enviar Notificação" className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-all">
                                            <Bell size={14} />
                                        </button>
                                        <button title="Enviar E-mail" className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-all">
                                            <Mail size={14} />
                                        </button>
                                        <button title="Mais Opções" className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-all">
                                            <MoreHorizontal size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-20 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <Users size={40} className="text-zinc-200 dark:text-zinc-800" />
                                        <div className="text-zinc-400 dark:text-zinc-600 italic text-sm font-medium">Nenhum colaborador nesta lista.</div>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function CollaboratorsListPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center py-20 text-zinc-500 text-sm font-bold uppercase tracking-widest animate-pulse">Carregando lista...</div>}>
            <CollaboratorsListContent />
        </Suspense>
    );
}
