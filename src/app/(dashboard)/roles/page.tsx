"use client";
import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Settings, X, Palette, ChevronRight, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function RolesPage() {
    const supabase = createClient();
    const [user, setUser] = useState<any>(null);
    const [roles, setRoles] = useState<any[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [currentRole, setCurrentRole] = useState<any>({ name: "DEVELOPER", defaultColor: "#4A90E2", maxSquads: 1, order: 0, qtyPerSquad: 1 });

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

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        fetchUser();
    }, [supabase.auth]);

    useEffect(() => {
        if (user) fetchRoles();
    }, [user]);

    const fetchRoles = async () => {
        const res = await fetch("/api/roles");
        if (res.ok) setRoles(await res.json());
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const method = (currentRole as any).id ? "PUT" : "POST";
        const url = (currentRole as any).id ? `/api/roles/${(currentRole as any).id}` : "/api/roles";

        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(currentRole)
        });

        if (res.ok) {
            setIsEditing(false);
            setCurrentRole({ name: "DEVELOPER", defaultColor: "#4A90E2", maxSquads: 1, order: 0, qtyPerSquad: 1 });
            fetchRoles();
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Remover este cargo? Colaboradores vinculados ficarão sem cargo.")) return;
        const res = await fetch(`/api/roles/${id}`, {
            method: "DELETE",
        });
        if (res.ok) fetchRoles();
    };

    if (!user || user.user_metadata?.type !== "COORDINATOR") return null;

    const INPUT = "w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all";
    const LABEL = "block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5";
    const COLORS = ["#4A90E2", "#48BB78", "#F6AD55", "#F56565", "#9F7AEA", "#ED64A6", "#38B2AC", "#4A5568"];

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20 font-sans">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Cargos e Funções</h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Personalize as funções disponíveis para sua equipe.</p>
                </div>
                {!isEditing && (
                    <button
                        onClick={() => {
                            setCurrentRole({ name: "DEVELOPER", defaultColor: "#4A90E2", maxSquads: 1, order: 0, qtyPerSquad: 1 });
                            setIsEditing(true);
                        }}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-md shadow-blue-500/10 transition-colors"
                    >
                        <Plus size={18} /> Adicionar Cargo
                    </button>
                )}
            </div>

            {isEditing && (
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-lg overflow-hidden">
                    <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/30">
                        <h2 className="font-bold text-sm uppercase tracking-wider text-zinc-600 dark:text-zinc-400">{currentRole.id ? "Editar Cargo" : "Criar Novo Cargo"}</h2>
                        <button onClick={() => setIsEditing(false)} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors">
                            <X size={16} className="text-zinc-400" />
                        </button>
                    </div>
                    <form onSubmit={handleSave} className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1 md:col-span-2">
                                <label className={LABEL}>Papel</label>
                                <select
                                    required
                                    className={INPUT}
                                    value={currentRole.name || "DEVELOPER"}
                                    onChange={e => setCurrentRole({ ...currentRole, name: e.target.value })}
                                >
                                    {Object.entries(roleTypeLabels).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className={LABEL}>Qtd Máx. no Squad</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    className={INPUT}
                                    value={currentRole.qtyPerSquad ?? 1}
                                    onChange={e => setCurrentRole({ ...currentRole, qtyPerSquad: Number(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className={LABEL}>Limite de Squads p/ Pessoa</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    className={INPUT}
                                    value={currentRole.maxSquads ?? 1}
                                    onChange={e => setCurrentRole({ ...currentRole, maxSquads: Number(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className={LABEL}>Ordem de Exibição</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    className={INPUT}
                                    value={currentRole.order ?? 0}
                                    onChange={e => setCurrentRole({ ...currentRole, order: Number(e.target.value) })}
                                />
                            </div>

                            <div className="space-y-3 md:col-span-2">
                                <label className={`${LABEL} flex items-center gap-2`}>
                                    <Palette size={14} className="text-blue-500" /> Cor de Identificação
                                </label>
                                <div className="flex flex-wrap gap-3">
                                    {COLORS.map(color => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setCurrentRole({ ...currentRole, defaultColor: color })}
                                            className={`w-10 h-10 rounded-full border-4 transition-all hover:scale-110 flex items-center justify-center
                                                ${currentRole.defaultColor === color ? 'border-zinc-200 dark:border-zinc-700 scale-110' : 'border-transparent'}`}
                                            style={{ backgroundColor: color }}
                                        >
                                            {currentRole.defaultColor === color && <CheckCircle size={16} className="text-white drop-shadow-sm" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                            <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">Cancelar</button>
                            <button disabled={loading} type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-all shadow-md shadow-blue-500/10">
                                {loading ? "Processando..." : currentRole.id ? "Atualizar" : "Salvar"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Papel</th>
                                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-center">Pessoas p/ Squad</th>
                                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-center">Máx. Squads</th>
                                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-center">Ordem</th>
                                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {[...roles].sort((a, b) => (a.order || 0) - (b.order || 0)).map(role => (
                                <tr key={role.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full shadow-inner" style={{ backgroundColor: role.defaultColor }}></div>
                                            <span className="font-bold text-sm text-zinc-800 dark:text-zinc-100">{roleTypeLabels[role.name as string] || role.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-xs font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-md">{role.qtyPerSquad || 1}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-xs font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-md">{role.maxSquads || 1}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-xs font-bold text-zinc-500">{role.order || 0}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => { setCurrentRole(role); setIsEditing(true); }} className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-all">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(role.id)} className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {roles.length === 0 && (
                        <div className="py-20 text-center flex flex-col items-center">
                            <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4 text-zinc-300 dark:text-zinc-600">
                                <Palette size={32} />
                            </div>
                            <p className="text-zinc-500 font-medium italic">Nenhum cargo foi registrado ainda.</p>
                            <button onClick={() => setIsEditing(true)} className="mt-4 text-sm font-bold text-blue-600 hover:underline">Adicionar o primeiro</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
