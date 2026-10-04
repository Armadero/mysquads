"use client";
import { useState, useEffect } from "react";
import {
    Gift, Plus, Pencil, Trash2, X, Search, Package, Users,
    CheckCircle, Circle, Download, ChevronDown, ChevronUp,
    FileText, MapPin, Hash, Clock
} from "lucide-react";
import { FormModal } from "@/components/ui/form-modal";
import { formatDate, getMonthUTC } from "@/lib/utils";
import { useSession } from "@/lib/hooks/use-session";
import { PageLoader, AccessDenied } from "@/components/ui/page-state";
import { roleLabel } from "@/lib/labels";

export default function GiftsPage() {
    const { user, loading: sessionLoading, isCoordinator } = useSession();
    const [tab, setTab] = useState<"gifts" | "campaigns">("campaigns");

    // ─── Gifts state ───
    const [gifts, setGifts] = useState<any[]>([]);
    const [giftLoading, setGiftLoading] = useState(false);
    const [giftError, setGiftError] = useState("");
    const [showGiftForm, setShowGiftForm] = useState(false);
    const [editingGift, setEditingGift] = useState<any>(null);
    const [giftName, setGiftName] = useState("");
    const [giftDescription, setGiftDescription] = useState("");

    // ─── Campaigns state ───
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [collaborators, setCollaborators] = useState<any[]>([]);
    const [campaignLoading, setCampaignLoading] = useState(false);
    const [campaignError, setCampaignError] = useState("");
    const [showCampaignForm, setShowCampaignForm] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState<any>(null);
    const [campaignName, setCampaignName] = useState("");
    const [campaignDescription, setCampaignDescription] = useState("");
    const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
    const [campaignSearch, setCampaignSearch] = useState("");
    const [collaboratorSearch, setCollaboratorSearch] = useState("");
    const [filter, setFilter] = useState<"all" | "pending" | "sent">("all");
    const [showAddMenu, setShowAddMenu] = useState<number | false>(false);
    const [addMenuPos, setAddMenuPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

    // ─── Data fetchers (declared before useEffect to satisfy react-hooks/immutability) ───
    async function fetchGifts() {
        const res = await fetch("/api/gifts");
        if (res.ok) setGifts(await res.json());
    }
    async function fetchCampaigns() {
        const res = await fetch("/api/gift-campaigns");
        if (res.ok) setCampaigns(await res.json());
    }
    async function fetchCollaborators() {
        const res = await fetch("/api/collaborators");
        if (res.ok) setCollaborators(await res.json());
    }

    useEffect(() => {
        // Todas as rotas de brindes exigem COORDINATOR — buscar antes de saber
        // o perfil só produzia uma rajada de 401 para gerentes.
        if (!isCoordinator) return;
        fetchGifts();
        fetchCampaigns();
        fetchCollaborators();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCoordinator]);
    const handleSaveGift = async (e: React.FormEvent) => {
        e.preventDefault();
        setGiftLoading(true);
        setGiftError("");
        const method = editingGift ? "PUT" : "POST";
        const url = editingGift ? `/api/gifts/${editingGift.id}` : "/api/gifts";
        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: giftName, description: giftDescription || null }),
        });
        setGiftLoading(false);
        if (!res.ok) { const err = await res.json(); setGiftError(err.error || "Erro ao salvar brinde."); return; }
        await fetchGifts();
        resetGiftForm();
    };
    const handleDeleteGift = async (id: number) => {
        if (!confirm("Excluir este brinde?")) return;
        await fetch(`/api/gifts/${id}`, { method: "DELETE" });
        await fetchGifts();
    };
    const resetGiftForm = () => { setShowGiftForm(false); setEditingGift(null); setGiftName(""); setGiftDescription(""); setGiftError(""); };
    const startEditGift = (gift: any) => {
        setEditingGift(gift); setGiftName(gift.name); setGiftDescription(gift.description || "");
        setShowGiftForm(true);
    };

    // ─── Campaigns API ───
    const handleSaveCampaign = async (e: React.FormEvent) => {
        e.preventDefault();
        setCampaignLoading(true);
        setCampaignError("");
        const method = editingCampaign ? "PUT" : "POST";
        const url = editingCampaign ? `/api/gift-campaigns/${editingCampaign.id}` : "/api/gift-campaigns";
        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: campaignName, description: campaignDescription || null }),
        });
        setCampaignLoading(false);
        if (!res.ok) { const err = await res.json(); setCampaignError(err.error || "Erro ao salvar campanha."); return; }
        await fetchCampaigns();
        resetCampaignForm();
    };
    const handleDeleteCampaign = async (id: number) => {
        if (!confirm("Excluir esta campanha?")) return;
        await fetch(`/api/gift-campaigns/${id}`, { method: "DELETE" });
        if (selectedCampaignId === id) setSelectedCampaignId(null);
        await fetchCampaigns();
    };
    const resetCampaignForm = () => { setShowCampaignForm(false); setEditingCampaign(null); setCampaignName(""); setCampaignDescription(""); setCampaignError(""); };
    const startEditCampaign = (campaign: any, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setEditingCampaign(campaign); setCampaignName(campaign.name); setCampaignDescription(campaign.description || "");
        setShowCampaignForm(true);
    };

    // ─── Campaign management ───
    const addGiftToCampaign = async (campaignId: number, giftId: number) => {
        await fetch(`/api/gift-campaigns/${campaignId}/gifts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ giftId }) });
        await fetchCampaigns();
    };
    const removeGiftFromCampaign = async (campaignId: number, giftId: number) => {
        await fetch(`/api/gift-campaigns/${campaignId}/gifts`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ giftId }) });
        await fetchCampaigns();
    };
    const addCollaboratorToCampaign = async (campaignId: number, collaboratorId: number) => {
        await fetch(`/api/gift-campaigns/${campaignId}/collaborators`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collaboratorId }) });
        await fetchCampaigns();
    };
    const removeCollaboratorFromCampaign = async (campaignId: number, collaboratorId: number) => {
        await fetch(`/api/gift-campaigns/${campaignId}/collaborators`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collaboratorId }) });
        await fetchCampaigns();
    };
    const toggleSent = async (campaignId: number, collaboratorId: number, currentSent: boolean) => {
        await fetch(`/api/gift-campaigns/${campaignId}/collaborators`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collaboratorId, sent: !currentSent }) });
        await fetchCampaigns();
    };
    const addCollaboratorsByFilter = async (campaignId: number, filterType: string) => {
        const campaign = campaigns.find((c) => c.id === campaignId);
        if (!campaign) return;
        const existingIds = new Set(campaign.collaborators.map((c: any) => c.id));
        const now = new Date();
        const currentMonth = now.getUTCMonth(); // 0-indexed, lido em UTC (datas gravadas como meia-noite UTC)

        let filtered = collaborators.filter((c) => !existingIds.has(c.id));

        const labels: Record<string, string> = {
            all: "todos os colaboradores",
            birthday_month: "aniversariantes do mês",
            anniversary_month: "aniversariantes de empresa do mês",
            dads: "papais",
            moms: "mamães",
        };

        if (filterType === "birthday_month") {
            filtered = filtered.filter((c) => {
                if (!c.birthDate) return false;
                return getMonthUTC(c.birthDate) === currentMonth;
            });
        } else if (filterType === "anniversary_month") {
            filtered = filtered.filter((c) => {
                if (!c.admissionDate) return false;
                return getMonthUTC(c.admissionDate) === currentMonth;
            });
        } else if (filterType === "dads") {
            filtered = filtered.filter((c) => c.sexo === "MASCULINO" && c.hasChildren);
        } else if (filterType === "moms") {
            filtered = filtered.filter((c) => c.sexo === "FEMININO" && c.hasChildren);
        }

        if (filtered.length === 0) {
            alert(`Nenhum colaborador encontrado para "${labels[filterType] || filterType}".`);
            return;
        }
        if (!confirm(`Adicionar ${filtered.length} ${labels[filterType] || "colaboradores"}?`)) return;

        await fetch(`/api/gift-campaigns/${campaignId}/collaborators`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(filtered.map((c) => ({ collaboratorId: c.id }))),
        });
        await fetchCampaigns();
    };
    const exportCSV = (campaignId: number, e?: React.MouseEvent) => {
        e?.stopPropagation();
        window.open(`/api/gift-campaigns/${campaignId}/export`, "_blank");
    };

    // ─── Helpers ───
    const formatAddress = (col: any) => {
        if (!col.logradouro_entrega) return null;
        return [col.logradouro_entrega, col.numero_entrega && `nº ${col.numero_entrega}`, col.bairro_entrega,
            col.cidade_entrega && col.estado_entrega ? `${col.cidade_entrega}/${col.estado_entrega}` : col.cidade_entrega || col.estado_entrega
        ].filter(Boolean).join(", ");
    };

    const filteredCampaigns = campaigns.filter((c) => c.name.toLowerCase().includes(campaignSearch.toLowerCase()));
    const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);
    const campaignCollabIds = new Set((selectedCampaign?.collaborators || []).map((c: any) => c.id));
    const availableCollaborators = collaborators.filter((c) => !campaignCollabIds.has(c.id) && c.name.toLowerCase().includes(collaboratorSearch.toLowerCase()));
    const campaignGiftIds = new Set((selectedCampaign?.gifts || []).map((g: any) => g.id));
    const availableGifts = gifts.filter((g) => !campaignGiftIds.has(g.id));
    const totalSentAll = campaigns.reduce((sum, c) => sum + (c.totalSent || 0), 0);
    const totalCollabsAll = campaigns.reduce((sum, c) => sum + (c.totalCollaborators || 0), 0);
    const filteredCollabsInCampaign = selectedCampaign
        ? selectedCampaign.collaborators.filter((col: any) => filter === "sent" ? !!col.sent : filter === "pending" ? !col.sent : true)
        : [];

    const INPUT = "w-full px-3 py-2.5 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-zinc-900 dark:text-white";
    const LABEL = "block text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5";

    if (sessionLoading) return <PageLoader label="Carregando brindes..." />;
    if (!user) return null;
    if (!isCoordinator) return <AccessDenied />;

    return (
        <div className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-2 duration-500">

            {/* ─── Header ─── */}
            <div className="flex items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Gestão de Brindes</h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        Cadastre brindes, crie campanhas e acompanhe os envios.
                    </p>
                </div>
                {tab === "campaigns" && (
                    <button onClick={() => setShowCampaignForm(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-md shadow-blue-500/10 transition-all flex-shrink-0">
                        <Plus size={16} /> Nova Campanha
                    </button>
                )}
                {tab === "gifts" && (
                    <button onClick={() => setShowGiftForm(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-md shadow-blue-500/10 transition-all flex-shrink-0">
                        <Plus size={16} /> Novo Brinde
                    </button>
                )}
            </div>

            {/* ─── Stats ─── */}
            {tab === "campaigns" && campaigns.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                        { icon: <Package size={18} />, label: "Campanhas", value: campaigns.length, bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-600 dark:text-purple-400" },
                        { icon: <Users size={18} />, label: "Colaboradores", value: totalCollabsAll, bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400" },
                        { icon: <CheckCircle size={18} />, label: "Enviados", value: totalSentAll, bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-600 dark:text-green-400" },
                        { icon: <Clock size={18} />, label: "Pendentes", value: totalCollabsAll - totalSentAll, bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400" },
                    ].map((s, i) => (
                        <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg ${s.bg} ${s.text} flex items-center justify-center flex-shrink-0`}>{s.icon}</div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{s.label}</p>
                                <p className="text-xl font-bold text-zinc-900 dark:text-white">{s.value}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ─── Tabs ─── */}
            <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg w-fit">
                {[
                    { key: "campaigns" as const, icon: <Package size={15} />, label: "Campanhas", count: campaigns.length },
                    { key: "gifts" as const, icon: <Gift size={15} />, label: "Brindes", count: gifts.length },
                ].map((t) => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                            tab === t.key
                                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                        }`}>
                        {t.icon} {t.label}
                        {t.count > 0 && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                tab === t.key ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : "bg-zinc-200 dark:bg-zinc-600 text-zinc-500 dark:text-zinc-300"
                            }`}>{t.count}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* ═════════ GIFTS TAB ═════════ */}
            {tab === "gifts" && (
                <div className="space-y-4">
                    {showGiftForm && (
                        <FormCard title={editingGift ? "Editar Brinde" : "Novo Brinde"} onClose={resetGiftForm}>
                            <form onSubmit={handleSaveGift} className="space-y-4">
                                <div><label className={LABEL}>Nome *</label><input value={giftName} onChange={(e) => setGiftName(e.target.value)} required autoFocus placeholder="Ex: Camiseta, Caneca..." className={INPUT} /></div>
                                <div><label className={LABEL}>Descrição</label><textarea value={giftDescription} onChange={(e) => setGiftDescription(e.target.value)} rows={2} placeholder="Detalhes opcionais..." className={`${INPUT} resize-none`} /></div>
                                {giftError && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2.5 rounded-lg">⚠️ {giftError}</p>}
                                <div className="flex gap-2 justify-end pt-3 border-t border-zinc-100 dark:border-zinc-800">
                                    <button type="button" onClick={resetGiftForm} className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">Cancelar</button>
                                    <button type="submit" disabled={giftLoading} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold disabled:opacity-60 transition-all">{giftLoading ? "Salvando..." : editingGift ? "Salvar" : "Cadastrar"}</button>
                                </div>
                            </form>
                        </FormCard>
                    )}
                    {gifts.length === 0 ? (
                        <EmptyState icon={<Gift size={32} />} title="Nenhum brinde cadastrado" desc="Cadastre brindes para associar às campanhas de envio." cta="Cadastrar primeiro brinde" onClick={() => setShowGiftForm(true)} />
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {gifts.map((gift) => (
                                <div key={gift.id} className="group bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900 transition-all">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3 min-w-0 flex-1">
                                            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                                                <Gift size={16} className="text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold text-zinc-900 dark:text-white text-sm truncate">{gift.name}</p>
                                                <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{gift.description || "Sem descrição"}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => startEditGift(gift)} className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"><Pencil size={13} /></button>
                                            <button onClick={() => handleDeleteGift(gift.id)} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"><Trash2 size={13} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ═════════ CAMPAIGNS TAB ═════════ */}
            {tab === "campaigns" && (
                <div className="space-y-4">
                    {showCampaignForm && (
                        <FormCard title={editingCampaign ? "Editar Campanha" : "Nova Campanha"} onClose={resetCampaignForm}>
                            <form onSubmit={handleSaveCampaign} className="space-y-4">
                                <div><label className={LABEL}>Nome da Campanha *</label><input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} required autoFocus placeholder="Ex: Aniversariantes de Janeiro..." className={INPUT} /></div>
                                <div><label className={LABEL}>Descrição</label><textarea value={campaignDescription} onChange={(e) => setCampaignDescription(e.target.value)} rows={2} placeholder="Descrição opcional..." className={`${INPUT} resize-none`} /></div>
                                {campaignError && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2.5 rounded-lg">⚠️ {campaignError}</p>}
                                <div className="flex gap-2 justify-end pt-3 border-t border-zinc-100 dark:border-zinc-800">
                                    <button type="button" onClick={resetCampaignForm} className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">Cancelar</button>
                                    <button type="submit" disabled={campaignLoading} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold disabled:opacity-60 transition-all">{campaignLoading ? "Salvando..." : editingCampaign ? "Salvar" : "Criar Campanha"}</button>
                                </div>
                            </form>
                        </FormCard>
                    )}

                    {/* Search */}
                    {campaigns.length > 0 && (
                        <div className="relative">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                            <input value={campaignSearch} onChange={(e) => setCampaignSearch(e.target.value)} placeholder="Buscar campanhas..."
                                className="w-full pl-10 pr-3 py-2.5 text-sm border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                        </div>
                    )}

                    {campaigns.length === 0 ? (
                        <EmptyState icon={<Package size={32} />} title="Nenhuma campanha criada" desc="Crie campanhas para organizar o envio de brindes." cta="Criar primeira campanha" onClick={() => setShowCampaignForm(true)} />
                    ) : (
                        <div className="space-y-3">
                            {filteredCampaigns.map((campaign) => {
                                const isOpen = selectedCampaignId === campaign.id;
                                const progress = campaign.totalCollaborators > 0 ? Math.round((campaign.totalSent / campaign.totalCollaborators) * 100) : 0;
                                const isComplete = campaign.totalCollaborators > 0 && campaign.totalSent === campaign.totalCollaborators;

                                return (
                                    <div key={campaign.id}
                                        className={`bg-white dark:bg-zinc-900 rounded-xl border overflow-hidden transition-all ${
                                            isOpen ? "border-blue-200 dark:border-blue-900 shadow-lg shadow-blue-500/5" : "border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md"
                                        }`}>
                                        {/* Header */}
                                        <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors"
                                            onClick={() => { setSelectedCampaignId(isOpen ? null : campaign.id); setCollaboratorSearch(""); setFilter("all"); setShowAddMenu(false); }}>

                                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                                isComplete ? "bg-green-100 dark:bg-green-900/30" : "bg-purple-100 dark:bg-purple-900/30"
                                            }`}>
                                                {isComplete
                                                    ? <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
                                                    : <Package size={20} className="text-purple-600 dark:text-purple-400" />
                                                }
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-bold text-zinc-900 dark:text-white text-sm">{campaign.name}</p>
                                                    {isComplete && (
                                                        <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">Concluída</span>
                                                    )}
                                                </div>
                                                {campaign.description && (
                                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">{campaign.description}</p>
                                                )}

                                                {/* Pills + Progress */}
                                                <div className="flex items-center gap-3 mt-2 flex-wrap">
                                                    {campaign.gifts.length > 0 && (
                                                        <div className="flex gap-1 flex-wrap">
                                                            {campaign.gifts.slice(0, 3).map((g: any) => (
                                                                <span key={g.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-md text-[11px] font-medium">
                                                                    <Gift size={10} />{g.name}
                                                                </span>
                                                            ))}
                                                            {campaign.gifts.length > 3 && <span className="text-[11px] text-zinc-400">+{campaign.gifts.length - 3}</span>}
                                                        </div>
                                                    )}
                                                    {campaign.totalCollaborators > 0 && (
                                                        <div className="flex items-center gap-2 min-w-[120px] max-w-[200px]">
                                                            <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                                                                <div className={`h-full rounded-full transition-all ${isComplete ? "bg-green-500" : "bg-blue-500"}`} style={{ width: `${progress}%` }} />
                                                            </div>
                                                            <span className="text-[11px] text-zinc-500 font-semibold whitespace-nowrap">{campaign.totalSent}/{campaign.totalCollaborators}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-0.5 flex-shrink-0">
                                                {campaign.totalCollaborators > 0 && (
                                                    <button onClick={(e) => exportCSV(campaign.id, e)} className="p-2 text-zinc-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors" title="Exportar CSV"><Download size={15} /></button>
                                                )}
                                                <button onClick={(e) => startEditCampaign(campaign, e)} className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Editar"><Pencil size={15} /></button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteCampaign(campaign.id); }} className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Excluir"><Trash2 size={15} /></button>
                                                <span className="ml-1 text-zinc-400">{isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
                                            </div>
                                        </div>

                                        {/* ── Expanded detail ── */}
                                        {isOpen && (
                                            <div className="border-t border-zinc-100 dark:border-zinc-800">
                                                <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] divide-y lg:divide-y-0 lg:divide-x divide-zinc-100 dark:divide-zinc-800">

                                                    {/* Left: Gifts + Export */}
                                                    <div className="p-5 space-y-4 bg-zinc-50/50 dark:bg-zinc-950/30">
                                                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                                                            <Gift size={12} /> Brindes da Campanha
                                                        </h3>

                                                        {campaign.gifts.length === 0 && gifts.length === 0 ? (
                                                            <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2.5 rounded-lg border border-amber-100 dark:border-amber-800/30">
                                                                Nenhum brinde cadastrado. Vá para a aba <strong>Brindes</strong> para cadastrar.
                                                            </p>
                                                        ) : campaign.gifts.length === 0 ? (
                                                            <p className="text-xs text-zinc-400 italic">Nenhum brinde selecionado.</p>
                                                        ) : (
                                                            <div className="space-y-1.5">
                                                                {campaign.gifts.map((g: any) => (
                                                                    <div key={g.id} className="group/item flex items-center justify-between gap-2 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                                                                        <div className="flex items-center gap-2 min-w-0">
                                                                            <Gift size={13} className="text-blue-500 flex-shrink-0" />
                                                                            <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate">{g.name}</span>
                                                                        </div>
                                                                        <button onClick={() => removeGiftFromCampaign(campaign.id, g.id)} className="p-1 text-zinc-300 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity"><X size={12} /></button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {availableGifts.length > 0 && (
                                                            <select value="" onChange={(e) => { if (e.target.value) addGiftToCampaign(campaign.id, Number(e.target.value)); }}
                                                                className="w-full px-3 py-2 text-sm border border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 cursor-pointer focus:outline-none focus:border-blue-400 hover:border-blue-400 hover:text-blue-600 transition-colors">
                                                                <option value="">+ Adicionar brinde...</option>
                                                                {availableGifts.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                                                            </select>
                                                        )}

                                                        {campaign.collaborators.length > 0 && (
                                                            <div className="pt-4 mt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                                                                <button onClick={() => exportCSV(campaign.id)}
                                                                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm">
                                                                    <FileText size={14} /> Exportar CSV
                                                                </button>
                                                                <p className="text-[10px] text-zinc-400 text-center leading-tight">
                                                                    Nome, CPF e endereço completo de entrega.
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Right: Collaborators */}
                                                    <div className="p-5 space-y-3">
                                                        <div className="flex items-center justify-between flex-wrap gap-2">
                                                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                                                                <Users size={12} /> Colaboradores ({campaign.totalCollaborators})
                                                            </h3>
                                                            {campaign.totalCollaborators > 0 && (
                                                                <div className="flex gap-1">
                                                                    {(["all", "pending", "sent"] as const).map((f) => {
                                                                        const labels = { all: "Todos", pending: "Pendentes", sent: "Enviados" };
                                                                        const counts = { all: campaign.totalCollaborators, pending: campaign.totalCollaborators - campaign.totalSent, sent: campaign.totalSent };
                                                                        return (
                                                                            <button key={f} onClick={() => setFilter(f)}
                                                                                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all ${
                                                                                    filter === f ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900" : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                                                                }`}>
                                                                                {labels[f]} <span className="opacity-60">{counts[f]}</span>
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Add */}
                                                        <div className="flex items-stretch gap-2">
                                                            <div className="relative flex-1">
                                                                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                                                                <input value={collaboratorSearch} onChange={(e) => setCollaboratorSearch(e.target.value)} placeholder="Buscar colaborador para adicionar..."
                                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                                                            </div>
                                                            {campaign.totalCollaborators < collaborators.length && (
                                                                <div className="relative">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            if (showAddMenu === campaign.id) { setShowAddMenu(false); return; }
                                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                                            setAddMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                                                                            setShowAddMenu(campaign.id);
                                                                        }}
                                                                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-lg transition-colors whitespace-nowrap border border-blue-200 dark:border-blue-800">
                                                                        <Plus size={13} /> Adicionar <ChevronDown size={12} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Search results dropdown */}
                                                        {collaboratorSearch && availableCollaborators.length > 0 && (
                                                            <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden bg-white dark:bg-zinc-900 shadow-lg">
                                                                {availableCollaborators.slice(0, 6).map((c) => (
                                                                    <button key={c.id} onClick={() => { addCollaboratorToCampaign(campaign.id, c.id); setCollaboratorSearch(""); }}
                                                                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 border-b border-zinc-100 dark:border-zinc-800 last:border-0 transition-colors">
                                                                        <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-zinc-300 flex-shrink-0">{c.name[0]?.toUpperCase()}</div>
                                                                        <span className="truncate text-zinc-900 dark:text-white font-medium">{c.name}</span>
                                                                        {c.role?.name && <span className="text-[10px] px-1.5 py-0.5 rounded ml-auto flex-shrink-0 font-semibold" style={{ backgroundColor: (c.role.defaultColor || "#666") + "18", color: c.role.defaultColor || "#666" }}>{roleLabel(c.role.name)}</span>}
                                                                        <Plus size={13} className="text-blue-500 flex-shrink-0" />
                                                                    </button>
                                                                ))}
                                                                {availableCollaborators.length > 6 && <div className="px-3 py-1.5 text-xs text-zinc-400 bg-zinc-50 dark:bg-zinc-800">+{availableCollaborators.length - 6} resultados</div>}
                                                            </div>
                                                        )}

                                                        {/* List */}
                                                        {campaign.collaborators.length === 0 ? (
                                                            <div className="text-center py-12 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                                                                <Users size={28} className="mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
                                                                <p className="text-sm text-zinc-500 font-medium">Nenhum colaborador adicionado</p>
                                                                <p className="text-xs text-zinc-400 mt-0.5">Use a busca acima ou clique em <strong>+ Todos</strong>.</p>
                                                            </div>
                                                        ) : filteredCollabsInCampaign.length === 0 ? (
                                                            <div className="text-center py-8 text-zinc-400 text-sm italic">
                                                                Nenhum colaborador {filter === "sent" ? "enviado" : "pendente"} nesta campanha.
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-1">
                                                                {filteredCollabsInCampaign.map((col: any) => {
                                                                    const address = formatAddress(col);
                                                                    return (
                                                                        <div key={col.id}
                                                                            className="group flex items-center gap-3 px-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-all">
                                                                            {/* Avatar — mesmo estilo da tela de colaboradores */}
                                                                            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-zinc-200 dark:border-zinc-700 bg-blue-50 dark:bg-blue-900/20">
                                                                                {col.photoUrl ? (
                                                                                    <img src={col.photoUrl} alt={col.name} className="w-full h-full object-cover object-top" />
                                                                                ) : (
                                                                                    <div className="w-full h-full flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400">
                                                                                        {col.name[0]?.toUpperCase()}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            {/* Info */}
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100 truncate">{col.name}</p>
                                                                                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-400 flex-wrap">
                                                                                    {col.email && <span className="truncate">{col.email}</span>}
                                                                                    {!col.email && col.cpf && <span className="flex items-center gap-0.5"><Hash size={9} />{col.cpf}</span>}
                                                                                    {address ? (
                                                                                        <span className="flex items-center gap-0.5 truncate"><MapPin size={9} className="flex-shrink-0" /><span className="truncate">{address}</span></span>
                                                                                    ) : (
                                                                                        <span className="text-amber-500 flex items-center gap-0.5"><MapPin size={9} />Sem endereço</span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            {/* Status */}
                                                                            <button onClick={() => toggleSent(campaign.id, col.id, !!col.sent)}
                                                                                title={col.sent ? `Enviado em ${formatDate(col.sentAt)}` : "Marcar como enviado"}
                                                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all flex-shrink-0 ${
                                                                                    col.sent
                                                                                        ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100"
                                                                                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                                                                }`}>
                                                                                {col.sent ? <><CheckCircle size={12} /> Enviado</> : <><Circle size={12} /> Pendente</>}
                                                                            </button>
                                                                            {/* Remove */}
                                                                            <button onClick={() => removeCollaboratorFromCampaign(campaign.id, col.id)}
                                                                                className="p-1.5 text-zinc-300 hover:text-red-500 rounded-md transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0" title="Remover"><X size={14} /></button>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
            {/* ─── Fixed Dropdown Portal ─── */}
            {showAddMenu && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowAddMenu(false)} />
                    <div className="fixed z-50 w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl py-1.5"
                        style={{ top: addMenuPos.top, right: addMenuPos.right }}>
                        {[
                            { key: "all", label: "Todos os colaboradores", icon: <Users size={14} /> },
                            { key: "birthday_month", label: "Aniversariantes do mês", icon: <Gift size={14} /> },
                            { key: "anniversary_month", label: "Aniversariantes de empresa", icon: <Package size={14} /> },
                            { key: "dads", label: "Papais", icon: <Users size={14} /> },
                            { key: "moms", label: "Mamães", icon: <Users size={14} /> },
                        ].map((opt) => (
                            <button key={opt.key}
                                onClick={() => { addCollaboratorsByFilter(showAddMenu as number, opt.key); setShowAddMenu(false); }}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left">
                                <span className="text-zinc-400">{opt.icon}</span>
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

/* ─── Reusable Sub-Components ─── */

function FormCard({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <FormModal open onClose={onClose} title={title} size="md">
            <div className="p-6">{children}</div>
        </FormModal>
    );
}

function EmptyState({ icon, title, desc, cta, onClick }: { icon: React.ReactNode; title: string; desc: string; cta: string; onClick: () => void }) {
    return (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-14 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">{icon}</div>
            <h3 className="font-bold text-zinc-900 dark:text-white mb-1">{title}</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5 max-w-sm mx-auto">{desc}</p>
            <button onClick={onClick} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-md shadow-blue-500/10 transition-all inline-flex items-center gap-2">
                <Plus size={15} />{cta}
            </button>
        </div>
    );
}
