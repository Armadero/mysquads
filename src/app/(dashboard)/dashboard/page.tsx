"use client";
import { useState, useEffect } from "react";
import { Search, CheckCircle, XCircle, Clock, Users, Gift, Cake, AlertTriangle, ArrowUpRight, ArrowRight } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
const roleTypeLabels: Record<string, string> = {
    SCRUM_MASTER: "Scrum Master",
    SYSTEM_ANALYST: "Analista de Sistemas",
    PRODUCT_OWNER: "Product Owner",
    DEVELOPER: "Desenvolvedor",
    QA_ANALYST: "Analista de Teste",
    SPECIALIST: "Especialista",
    BUSINESS_ANALYST: "Analista de Negócios",
    PRODUCT_MANAGER: "Product Manager"
};

export default function DashboardPage() {
    const supabase = createClient();
    const [user, setUser] = useState<any>(null);
    const [links, setLinks] = useState<{ id: string; status: string; coordinator?: { name: string; email: string }; manager?: { name: string; email: string } }[]>([]);
    const [search, setSearch] = useState("");
    const [coordinators, setCoordinators] = useState<{ id: string; name: string; email: string }[]>([]);
    const [dashboardData, setDashboardData] = useState<{ metrics?: Record<string, any>; managerMetrics?: { coordinatorName: string; metrics: Record<string, any> }[]; coordinatorMode?: boolean } | null>(null);
    const [requestFeedback, setRequestFeedback] = useState<{ id: string; success: boolean; message: string } | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        fetchUser();
    }, [supabase.auth]);

    useEffect(() => {
        if (!user) return;
        fetchLinks();
        fetchDashboard();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    const fetchLinks = async () => {
        const res = await fetch("/api/links");
        if (res.ok) setLinks(await res.json());
    };

    const fetchDashboard = async () => {
        const res = await fetch("/api/dashboard");
        if (res.ok) setDashboardData(await res.json());
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
            const data = await res.json();
            setRequestFeedback({ id: coordinatorId, success: false, message: data.error || "Erro ao enviar solicitação." });
            setTimeout(() => setRequestFeedback(null), 3000);
        }
    };

    const updateLink = async (id: string, status: string) => {
        const res = await fetch("/api/links", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, status }),
        });
        if (res.ok) fetchLinks();
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderMetrics = (metrics: Record<string, any>, title?: string, key?: string) => {
        if (!metrics) return null;
        return (
            <div className="space-y-6 mt-8" key={key}>
                {title && (
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-zinc-800 dark:text-white">{title}</h2>
                        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800"></div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard
                        label="Total Colaboradores"
                        value={metrics.totalCollaborators}
                        icon={<Users size={20} />}
                        color="blue"
                        href="/collaborators"
                    />
                    <MetricCard
                        label="Aniv. de Empresa"
                        value={metrics.companyAnniversaries.length}
                        icon={<Gift size={20} />}
                        color="green"
                        href="/collaborators-list?type=company-anniversary"
                        items={metrics.companyAnniversaries.map((c: any) => c.name)}
                    />
                    <MetricCard
                        label="Aniversariantes"
                        value={metrics.birthdays.length}
                        icon={<Cake size={20} />}
                        color="purple"
                        href="/collaborators-list?type=birthday"
                        items={metrics.birthdays.map((c: any) => c.name)}
                    />
                    <MetricCard
                        label="Alertas Banco"
                        value={metrics.expiringTimebank.length}
                        icon={<AlertTriangle size={20} />}
                        color="red"
                        href="/collaborators-list?type=timebank-alerts"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
                        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/30">
                            <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-500">Distribuição de Papéis</h3>
                            <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">{metrics.totalCollaborators} Total</span>
                        </div>
                        <div className="p-4 flex-1">
                            <ul className="space-y-3">
                                {metrics.roleDistribution.map((r: any) => (
                                    <li key={r.name} className="flex justify-between items-center group">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
                                                {roleTypeLabels[r.name] || r.name}
                                            </span>
                                        </div>
                                        <span className="text-xs font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">{r.count}</span>
                                    </li>
                                ))}
                                {metrics.roleDistribution.length === 0 && <li className="text-zinc-400 text-sm italic text-center py-4">Nenhum papel registrado.</li>}
                            </ul>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
                        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/30">
                            <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-500">Squads Ativos</h3>
                            <Link href="/squads" className="text-[10px] font-bold text-blue-600 hover:underline px-2 py-1">Gerenciar</Link>
                        </div>
                        <div className="p-4 flex-1">
                            <ul className="space-y-3">
                                {metrics.squadSizes.map((s: any) => (
                                    <li key={s.name} className="flex justify-between items-center group">
                                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">{s.name}</span>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-12 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500" style={{ width: `${Math.min((s.count / 6) * 100, 100)}%` }}></div>
                                            </div>
                                            <span className="text-[10px] font-bold text-zinc-500">{s.count}</span>
                                        </div>
                                    </li>
                                ))}
                                {metrics.squadSizes.length === 0 && <li className="text-zinc-400 text-sm italic text-center py-4">Nenhum squad registrado.</li>}
                            </ul>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
                        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/30">
                            <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-500">Alertas de Atenção</h3>
                            <Clock size={14} className="text-zinc-400" />
                        </div>
                        <div className="p-4 flex-1 overflow-y-auto max-h-[220px]">
                            <div className="space-y-2">
                                {metrics.expiringTimebank.map((tb: any, i: number) => (
                                    <AlertItem key={`expiring-${i}-${tb.name}`} type="error" title={tb.name} description={`${tb.balance}h (vence em ${tb.daysLeft}d)`} photoUrl={tb.photoUrl} />
                                ))}
                                {metrics.highTimebank.map((tb: any, i: number) => (
                                    <AlertItem key={`high-${i}-${tb.name}`} type="error" title={tb.name} description={`${tb.balance}h acumulado`} photoUrl={tb.photoUrl} />
                                ))}
                                {metrics.noIntegration.map((ni: any, i: number) => (
                                    <AlertItem key={`noint-${i}-${ni.name}`} type="error" title={ni.name} description={`Sem integração (${ni.years}a)`} photoUrl={ni.photoUrl} />
                                ))}
                                {metrics.expiringTimebank.length === 0 && metrics.highTimebank.length === 0 && metrics.noIntegration.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-8 text-zinc-400">
                                        <CheckCircle size={32} strokeWidth={1.5} className="mb-2 text-green-500 opacity-20" />
                                        <p className="text-xs font-medium italic">Tudo sob controle por aqui.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (!user) return null;

    const isManager = user.user_metadata?.type === "MANAGER";

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Olá, {user.user_metadata?.name?.split(' ')[0] || 'usuário'} 👋</h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Aqui está o resumo atual das suas equipes.</p>
                </div>
                {isManager && (
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 rounded-full shadow-sm">
                        <ShieldAlert size={14} /> MODO GERENTE
                    </div>
                )}
            </div>

            {isManager ? (
                <div className="space-y-10">
                    {dashboardData && dashboardData.managerMetrics && dashboardData.managerMetrics.length > 0 ? (
                        <>
                            {(() => {
                                // Aggregate all metrics across all approved coordinators
                                const aggregated = dashboardData.managerMetrics.reduce((acc, curr) => {
                                    const m = curr.metrics;
                                    acc.totalCollaborators += m.totalCollaborators || 0;
                                    acc.companyAnniversaries = [...acc.companyAnniversaries, ...(m.companyAnniversaries || [])];
                                    acc.birthdays = [...acc.birthdays, ...(m.birthdays || [])];
                                    acc.expiringTimebank = [...acc.expiringTimebank, ...(m.expiringTimebank || [])];
                                    acc.highTimebank = [...acc.highTimebank, ...(m.highTimebank || [])];
                                    acc.noIntegration = [...acc.noIntegration, ...(m.noIntegration || [])];

                                    // Aggregate roleDistribution by name
                                    (m.roleDistribution || []).forEach((role: any) => {
                                        const existing = acc.roleDistribution.find((r: any) => r.name === role.name);
                                        if (existing) {
                                            existing.count += role.count;
                                        } else {
                                            acc.roleDistribution.push({ name: role.name, count: role.count });
                                        }
                                    });

                                    // Aggregate squadSizes by name
                                    (m.squadSizes || []).forEach((squad: any) => {
                                        const existing = acc.squadSizes.find((s: any) => s.name === squad.name);
                                        if (existing) {
                                            existing.count += squad.count;
                                        } else {
                                            acc.squadSizes.push({ name: squad.name, count: squad.count });
                                        }
                                    });

                                    return acc;
                                }, {
                                    totalCollaborators: 0,
                                    companyAnniversaries: [] as any[],
                                    birthdays: [] as any[],
                                    expiringTimebank: [] as any[],
                                    highTimebank: [] as any[],
                                    noIntegration: [] as any[],
                                    roleDistribution: [] as any[],
                                    squadSizes: [] as any[]
                                });

                                // Sort distributions descending by count
                                aggregated.roleDistribution.sort((a, b) => b.count - a.count);
                                aggregated.squadSizes.sort((a, b) => b.count - a.count);

                                return renderMetrics(aggregated, "Visão Geral da Gerência", "aggregated-overview");
                            })()}

                            <div className="space-y-8 pb-10 mt-12 pt-12 border-t border-zinc-200 dark:border-zinc-800">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Visão dos Coordenadores</h2>
                                    <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{dashboardData.managerMetrics.length}</span>
                                </div>
                                {dashboardData.managerMetrics.map((mm) => renderMetrics(mm.metrics as Record<string, any>, mm.coordinatorName, mm.coordinatorName))}
                            </div>
                        </>
                    ) : (
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-dotted border-zinc-300 dark:border-zinc-800 p-20 text-center flex flex-col items-center">
                            <Users size={48} className="text-zinc-200 mb-4" />
                            <h3 className="text-lg font-bold text-zinc-700 dark:text-zinc-300 mb-2">Nenhum Coordenador Vinculado</h3>
                            <p className="text-zinc-400 font-medium mb-6">Você precisa buscar e solicitar acesso aos coordenadores para visualizar as métricas.</p>
                            <Link href="/connections" className="bg-blue-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
                                Buscar Coordenadores
                            </Link>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-8 pb-10">
                    {links.length > 0 && (
                        <section className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                                <Gift size={120} />
                            </div>
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-lg font-bold text-zinc-800 dark:text-white">Solicitações Pendentes</h2>
                                    <span className="bg-orange-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full animate-pulse">{links.length}</span>
                                </div>
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Precisa de atenção</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {links.map(link => (
                                    <div key={link.id} className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-700 flex flex-col gap-3 group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold text-xs shrink-0">
                                                {link.manager?.name?.[0]?.toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-bold text-zinc-800 dark:text-zinc-100 truncate">{link.manager?.name}</div>
                                                <div className="text-[10px] text-zinc-500 truncate">{link.manager?.email}</div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 mt-2">
                                            <button onClick={() => updateLink(link.id, 'APPROVED')} className="flex-1 bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white text-[10px] font-bold py-2 rounded-lg hover:opacity-90 transition-all">Autorizar</button>
                                            <button onClick={() => updateLink(link.id, 'REJECTED')} className="flex-1 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 text-[10px] font-bold py-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all">Negar</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {dashboardData && dashboardData.metrics && renderMetrics(dashboardData.metrics as Record<string, any>, "Métricas da Equipe")}
                </div>
            )}
        </div>
    );
}

function MetricCard({ label, value, icon, color, items, href }: { label: string, value: number, icon: any, color: string, items?: string[], href?: string }) {
    const colorMap: any = {
        blue: "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30",
        green: "bg-green-50 text-green-600 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30",
        orange: "bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-900/30",
        purple: "bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-900/30",
        red: `bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30 ${value > 0 ? "animate-pulse" : ""}`,
        gray: "bg-zinc-50 text-zinc-400 border-zinc-100 dark:bg-zinc-800/50 dark:text-zinc-500 dark:border-zinc-800"
    };

    const CardContent = () => (
        <>
            <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{label}</span>
                <div className="p-2 bg-white/50 dark:bg-black/20 rounded-lg group-hover:rotate-12 transition-transform">{icon}</div>
            </div>
            <div className="flex items-end justify-between">
                <span className="text-3xl font-bold tracking-tighter">{value}</span>
                {href ? <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" /> : <ArrowUpRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
            </div>
            {items && items.length > 0 && (
                <div className="mt-3 pt-3 border-t border-current/10 space-y-1">
                    {items.slice(0, 3).map((item, i) => (
                        <div key={i} className="text-[10px] font-bold truncate flex items-center gap-1.5 opacity-80">
                            <div className="w-1 h-1 rounded-full bg-current"></div>
                            {item}
                        </div>
                    ))}
                    {items.length > 3 && <div className="text-[9px] font-black uppercase opacity-40 mt-1">+ {items.length - 3} mais</div>}
                </div>
            )}
        </>
    );

    const baseClass = `p-5 rounded-2xl border shadow-sm ${colorMap[color] || colorMap.blue} bg-white dark:bg-zinc-900 group transition-all duration-300 flex flex-col`;
    const interactiveClass = href ? "hover:scale-[1.02] cursor-pointer hover:shadow-md" : "";

    if (href) {
        return (
            <Link href={href} className={`${baseClass} ${interactiveClass}`}>
                <CardContent />
            </Link>
        );
    }

    return (
        <div className={baseClass}>
            <CardContent />
        </div>
    );
}

function AlertItem({ type, title, description, photoUrl }: { type: 'error' | 'warning' | 'info', title: string, description: string, photoUrl?: string }) {
    const styles = {
        error: "bg-red-50 border-red-100 text-red-700 dark:bg-red-900/10 dark:border-red-900/30 dark:text-red-400",
        warning: "bg-orange-50 border-orange-100 text-orange-700 dark:bg-orange-900/10 dark:border-orange-900/30 dark:text-orange-400",
        info: "bg-blue-50 border-blue-100 text-blue-700 dark:bg-blue-900/10 dark:border-blue-900/30 dark:text-blue-400"
    };

    const initials = title.substring(0, 2).toUpperCase();

    return (
        <div className={`p-2 border rounded-xl text-xs flex justify-between items-center group hover:scale-[1.01] transition-all overflow-hidden ${styles[type]}`}>
            <div className="flex items-center gap-2 min-w-0 flex-1">
                {photoUrl ? (
                    <img src={photoUrl} alt={title} className="w-6 h-6 rounded-full object-cover border border-current opacity-80" />
                ) : (
                    <div className="w-6 h-6 rounded-full bg-current/10 flex items-center justify-center font-bold text-[8px] opacity-60">
                        {initials}
                    </div>
                )}
                <span className="font-black uppercase truncate">{title}</span>
            </div>
            <span className="font-bold opacity-70 shrink-0 ml-2 bg-white/20 px-2 py-0.5 rounded shadow-sm">{description}</span>
        </div>
    );
}

function ShieldAlert({ size = 20 }: { size?: number }) {
    return <AlertTriangle size={size} />;
}

function ShieldCheck({ size = 20, strokeWidth = 2, className = "" }: { size?: number, strokeWidth?: number, className?: string }) {
    return <CheckCircle size={size} strokeWidth={strokeWidth} className={className} />;
}
