"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Edit2, Trash2, Palette, CheckCircle, AlertCircle, X } from "lucide-react";
import { FormModal } from "@/components/ui/form-modal";
import { useSession } from "@/lib/hooks/use-session";
import { PageLoader, AccessDenied } from "@/components/ui/page-state";
import { roleTypeLabels } from "@/lib/labels";

const EMPTY_ROLE = () => ({
    name: "DEVELOPER",
    defaultColor: "#4A90E2",
    maxSquads: 1,
    order: 0,
    qtyPerSquad: 1,
    multipleSquads: false,
});

export default function RolesPage() {
    const { user, loading: sessionLoading, isCoordinator } = useSession();
    const [roles, setRoles] = useState<any[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [listError, setListError] = useState("");
    const [currentRole, setCurrentRole] = useState<any>(EMPTY_ROLE());

    const fetchRoles = useCallback(async () => {
        const res = await fetch("/api/roles");
        if (res.ok) setRoles(await res.json());
    }, []);

    useEffect(() => {
        if (user) fetchRoles();
    }, [user, fetchRoles]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const method = currentRole.id ? "PUT" : "POST";
        const url = currentRole.id ? `/api/roles/${currentRole.id}` : "/api/roles";

        try {
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                // Só os campos que a API aceita. Reenviar o registro inteiro
                // (id, coordinatorId, created_at...) não quebra, mas manter o
                // payload enxuto evita surpresas quando o schema mudar.
                body: JSON.stringify({
                    name: currentRole.name,
                    defaultColor: currentRole.defaultColor,
                    qtyPerSquad: Number(currentRole.qtyPerSquad) || 1,
                    maxSquads: Number(currentRole.maxSquads) || 1,
                    multipleSquads: !!currentRole.multipleSquads,
                    order: Number(currentRole.order) || 0,
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                // Antes a falha era engolida: o modal simplesmente não fechava
                // e o usuário não fazia ideia do porquê.
                setError(data.error || "Não foi possível salvar o cargo.");
                return;
            }

            setIsEditing(false);
            setCurrentRole(EMPTY_ROLE());
            fetchRoles();
        } catch {
            setError("Erro de conexão com o servidor.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Remover este cargo? Só é possível se nenhum colaborador estiver vinculado a ele.")) return;
        setListError("");
        const res = await fetch(`/api/roles/${id}`, { method: "DELETE" });
        if (res.ok) {
            fetchRoles();
            return;
        }
        const data = await res.json().catch(() => ({}));
        setListError(data.error || "Não foi possível remover o cargo.");
    };

    if (sessionLoading) return <PageLoader label="Carregando cargos..." />;
    if (!user) return null;
    if (!isCoordinator) return <AccessDenied />;

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
                <button
                    onClick={() => {
                        setCurrentRole(EMPTY_ROLE());
                        setError("");
                        setIsEditing(true);
                    }}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-md shadow-blue-500/10 transition-colors"
                >
                    <Plus size={18} /> Adicionar Cargo
                </button>
            </div>

            <FormModal
                open={isEditing}
                onClose={() => setIsEditing(false)}
                title={currentRole.id ? "Editar Cargo" : "Criar Novo Cargo"}
                size="lg"
            >
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

                            {/* BUG FIX: campo multipleSquads adicionado para não ser resetado para false a cada edição */}
                            <div className="md:col-span-2 flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-700">
                                <input
                                    type="checkbox"
                                    id="multipleSquads"
                                    className="w-4 h-4 accent-blue-600 cursor-pointer"
                                    checked={!!currentRole.multipleSquads}
                                    onChange={e => setCurrentRole({ ...currentRole, multipleSquads: e.target.checked })}
                                />
                                <label htmlFor="multipleSquads" className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 cursor-pointer select-none">
                                    Permite participar de múltiplos squads simultaneamente
                                </label>
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

                        {error && (
                            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs font-semibold rounded-lg animate-in fade-in duration-200">
                                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                            <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">Cancelar</button>
                            <button disabled={loading} type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-all shadow-md shadow-blue-500/10">
                                {loading ? "Processando..." : currentRole.id ? "Atualizar" : "Salvar"}
                            </button>
                        </div>
                    </form>
            </FormModal>

            {listError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs font-semibold rounded-lg animate-in fade-in duration-200">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span className="flex-1">{listError}</span>
                    <button onClick={() => setListError("")} className="shrink-0 hover:opacity-70" aria-label="Fechar aviso">
                        <X size={14} />
                    </button>
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
                                            <button onClick={() => { setCurrentRole({ ...role, multipleSquads: !!role.multipleSquads }); setError(""); setIsEditing(true); }} className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-all">
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
                            <button onClick={() => { setCurrentRole(EMPTY_ROLE()); setError(""); setIsEditing(true); }} className="mt-4 text-sm font-bold text-blue-600 hover:underline">Adicionar o primeiro</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
