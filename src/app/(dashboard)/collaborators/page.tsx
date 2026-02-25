"use client";
import { useState, useEffect } from "react";
import { Plus, Search, Edit2, Trash2, UserPlus, Filter, X, ChevronDown, MoreVertical, Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function CollaboratorsPage() {
    const supabase = createClient();
    const [user, setUser] = useState<any>(null);
    const [collaborators, setCollaborators] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [currentCollab, setCurrentCollab] = useState<any>({
        name: "",
        email: "",
        matricula: "",
        address: "",
        deliveryAddress: "",
        contractType: "CLT",
        seniority: "JUNIOR",
        devType: "NOT_APPLICABLE",
        admissionDate: new Date().toISOString().split('T')[0],
        birthDate: "",
        hasChildren: false,
        roleId: "",
        photoUrl: ""
    });
    const [error, setError] = useState<string | null>(null);

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
        if (user) {
            fetchCollaborators();
            fetchRoles();
        }
    }, [user]);

    const fetchCollaborators = async () => {
        const res = await fetch("/api/collaborators");
        if (res.ok) setCollaborators(await res.json());
    };

    const fetchRoles = async () => {
        const res = await fetch("/api/roles");
        if (res.ok) setRoles(await res.json());
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const method = currentCollab.id ? "PUT" : "POST";
        const url = currentCollab.id ? `/api/collaborators/${currentCollab.id}` : "/api/collaborators";

        try {
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(currentCollab)
            });

            if (res.ok) {
                setIsEditing(false);
                setCurrentCollab({
                    name: "",
                    email: "",
                    matricula: "",
                    address: "",
                    deliveryAddress: "",
                    contractType: "CLT",
                    seniority: "JUNIOR",
                    devType: "NOT_APPLICABLE",
                    admissionDate: new Date().toISOString().split('T')[0],
                    birthDate: "",
                    hasChildren: false,
                    roleId: ""
                });
                fetchCollaborators();
            } else {
                const data = await res.json();
                setError(data.error || "Erro ao salvar colaborador");
                console.error("Save error:", data);
            }
        } catch (err) {
            setError("Erro de conexão com o servidor");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = (file: File) => {
        if (!file.type.startsWith("image/")) {
            setError("Por favor, selecione um arquivo de imagem.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let width = img.width;
                let height = img.height;
                const MAX_SIZE = 400;

                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx?.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

                setCurrentCollab((prev: any) => ({ ...prev, photoUrl: dataUrl }));
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                const file = items[i].getAsFile();
                if (file) handleImageUpload(file);
                break;
            }
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja remover este colaborador?")) return;
        const res = await fetch(`/api/collaborators/${id}`, { method: "DELETE" });
        if (res.ok) fetchCollaborators();
    };

    if (!user) return null;
    const isCoordinator = user.user_metadata?.type === "COORDINATOR";

    const INPUT = "w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all";

    const LABEL = "block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5";

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Colaboradores</h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Gerencie sua equipe e atribua as funções nos squads.</p>
                </div>
                {isCoordinator && !isEditing && (
                    <button
                        onClick={() => {
                            setCurrentCollab({
                                name: "",
                                email: "",
                                matricula: "",
                                address: "",
                                deliveryAddress: "",
                                contractType: "CLT",
                                seniority: "JUNIOR",
                                devType: "NOT_APPLICABLE",
                                admissionDate: new Date().toISOString().split('T')[0],
                                hasChildren: false,
                                roleId: "",
                                photoUrl: ""
                            });
                            setError(null);
                            setIsEditing(true);
                        }}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-md shadow-blue-500/10 transition-all"
                    >
                        <UserPlus size={18} /> Adicionar Colaborador
                    </button>
                )}
            </div>

            {isEditing && (
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-lg overflow-hidden">
                    <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex justify-between items-center">
                        <h2 className="font-bold text-sm uppercase tracking-wider text-zinc-600 dark:text-zinc-400">{currentCollab.id ? "Editar Colaborador" : "Novo Colaborador"}</h2>
                        <button onClick={() => setIsEditing(false)} className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors">
                            <X size={16} className="text-zinc-400" />
                        </button>
                    </div>
                    <form onSubmit={handleSave} className="p-6 space-y-6" onPaste={handlePaste}>
                        <div className="flex flex-col md:flex-row gap-6 items-start">
                            <div className="flex-shrink-0 flex flex-col items-center space-y-3 w-full md:w-auto">
                                <label className={LABEL}>Foto</label>
                                <div
                                    className="relative w-32 h-32 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center overflow-hidden group cursor-pointer"
                                    onClick={() => document.getElementById("photoUpload")?.click()}
                                >
                                    {currentCollab.photoUrl ? (
                                        <img src={currentCollab.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center text-zinc-400 group-hover:text-blue-500 transition-colors">
                                            <Camera size={28} />
                                            <span className="text-[10px] uppercase font-bold mt-2 text-center px-2">Clique ou<br />Ctrl+V</span>
                                        </div>
                                    )}
                                    {currentCollab.photoUrl && (
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-bold uppercase">
                                            Alterar
                                        </div>
                                    )}
                                </div>
                                <input
                                    id="photoUpload"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            handleImageUpload(e.target.files[0]);
                                        }
                                    }}
                                />
                                {currentCollab.photoUrl && (
                                    <button
                                        type="button"
                                        onClick={() => setCurrentCollab((prev: any) => ({ ...prev, photoUrl: "" }))}
                                        className="text-xs text-red-500 font-medium hover:underline"
                                    >
                                        Remover
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 w-full">
                                <div className="space-y-1">
                                    <label className={LABEL}>Nome Completo *</label>
                                    <input required className={INPUT} type="text" value={currentCollab.name || ""} onChange={e => setCurrentCollab({ ...currentCollab, name: e.target.value })} placeholder="Ex: João Silva" />
                                </div>
                                <div className="space-y-1">
                                    <label className={LABEL}>E-mail</label>
                                    <input required className={INPUT} type="email" value={currentCollab.email || ""} onChange={e => setCurrentCollab({ ...currentCollab, email: e.target.value })} placeholder="joao@empresa.com" />
                                </div>
                                <div className="space-y-1">
                                    <label className={LABEL}>Matrícula</label>
                                    <input className={INPUT} type="text" value={currentCollab.matricula || ""} onChange={e => setCurrentCollab({ ...currentCollab, matricula: e.target.value })} placeholder="Opcional" />
                                </div>
                                <div className="space-y-1">
                                    <label className={LABEL}>Cargo / Função</label>
                                    <div className="relative">
                                        <select required className={`${INPUT} appearance-none`} value={currentCollab.roleId || ""} onChange={e => setCurrentCollab({ ...currentCollab, roleId: e.target.value })}>
                                            <option value="">Selecione um papel...</option>
                                            {roles.map(role => (
                                                <option key={role.id} value={role.id}>{roleTypeLabels[role.name as string] || role.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={14} />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className={LABEL}>Data de Nascimento</label>
                                    <input className={INPUT} type="date" value={currentCollab.birthDate ? currentCollab.birthDate.split('T')[0] : ""} onChange={e => setCurrentCollab({ ...currentCollab, birthDate: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className={LABEL}>Data de Admissão</label>
                                    <input required className={INPUT} type="date" value={currentCollab.admissionDate ? currentCollab.admissionDate.split('T')[0] : ""} onChange={e => setCurrentCollab({ ...currentCollab, admissionDate: e.target.value })} />
                                </div>

                                <div className="space-y-1 md:col-span-2">
                                    <label className={LABEL}>Endereço Residencial</label>
                                    <input className={INPUT} type="text" value={currentCollab.address || ""} onChange={e => setCurrentCollab({ ...currentCollab, address: e.target.value })} placeholder="Rua, Número, Bairro, Cidade - UF" />
                                </div>

                                <div className="space-y-1 md:col-span-2">
                                    <label className={LABEL}>Endereço de Entrega (Equipamentos)</label>
                                    <input className={INPUT} type="text" value={currentCollab.deliveryAddress || ""} onChange={e => setCurrentCollab({ ...currentCollab, deliveryAddress: e.target.value })} placeholder="Mesmo do residencial ou outro para entrega" />
                                </div>

                                <div className="space-y-1 text-zinc-500">
                                    <label className={LABEL}>Tipo de Contrato</label>
                                    <select className={INPUT} value={currentCollab.contractType || "CLT"} onChange={e => setCurrentCollab({ ...currentCollab, contractType: e.target.value })}>
                                        <option value="CLT">CLT</option>
                                        <option value="THIRD_PARTY">Terceirizado / PJ</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className={LABEL}>Sênioridade</label>
                                    <select className={INPUT} value={currentCollab.seniority || "JUNIOR"} onChange={e => setCurrentCollab({ ...currentCollab, seniority: e.target.value })}>
                                        <option value="JUNIOR">Júnior</option>
                                        <option value="PLENO">Pleno</option>
                                        <option value="SENIOR">Sênior</option>
                                        <option value="SPECIALIST">Especialista</option>
                                    </select>
                                </div>

                                <div className="space-y-1 text-zinc-500">
                                    <label className={LABEL}>Especialidade</label>
                                    <select className={INPUT} value={currentCollab.devType || "NOT_APPLICABLE"} onChange={e => setCurrentCollab({ ...currentCollab, devType: e.target.value })}>
                                        <option value="NOT_APPLICABLE">Não Aplicável</option>
                                        <option value="BACKEND">Back-end</option>
                                        <option value="FRONTEND">Front-end</option>
                                        <option value="FULLSTACK">Full Stack</option>
                                        <option value="TECH_LEAD">Tech Lead</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-2 pt-6">
                                    <input
                                        id="hasChildren"
                                        type="checkbox"
                                        className="w-4 h-4 text-blue-600 border-zinc-300 rounded focus:ring-blue-500"
                                        checked={currentCollab.hasChildren || false}
                                        onChange={e => setCurrentCollab({ ...currentCollab, hasChildren: e.target.checked })}
                                    />
                                    <label htmlFor="hasChildren" className="text-sm font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">Possui Filhos?</label>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-lg animate-in fade-in zoom-in duration-300">
                                ⚠️ {error}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                            <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">Cancelar</button>
                            <button disabled={loading} type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-all shadow-md shadow-blue-500/10">
                                {loading ? "Salvando..." : currentCollab.id ? "Atualizar" : "Salvar"}
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
                                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Colaborador</th>
                                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Cargo</th>
                                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Matrícula</th>
                                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Admissão</th>
                                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Status</th>
                                {isCoordinator && <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-right">Ações</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {collaborators.map(collab => (
                                <tr key={collab.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {collab.photoUrl ? (
                                                <img src={collab.photoUrl} alt={collab.name} className="w-10 h-10 rounded-full object-cover border border-zinc-200 dark:border-zinc-700" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center font-bold text-blue-600 dark:text-blue-400 text-sm">
                                                    {collab.name[0].toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-bold text-sm text-zinc-800 dark:text-zinc-100">{collab.name}</div>
                                                <div className="text-xs text-zinc-500">{collab.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: collab.role?.defaultColor || '#cbd5e0' }}></div>
                                            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">{collab.role ? roleTypeLabels[collab.role.name as string] || collab.role.name : "Sem papel"}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-zinc-600 dark:text-zinc-300">{collab.matricula || "-"}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs text-zinc-500">{new Date(collab.admissionDate).toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-100 dark:border-green-900/30 uppercase tracking-tighter">
                                            Ativo
                                        </span>
                                    </td>
                                    {isCoordinator && (
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => { setCurrentCollab(collab); setIsEditing(true); }} className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-all">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(collab.id)} className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {collaborators.length === 0 && (
                        <div className="py-20 text-center flex flex-col items-center">
                            <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4 text-zinc-300 dark:text-zinc-600">
                                <Search size={32} />
                            </div>
                            <p className="text-zinc-500 font-medium italic">Nenhum colaborador foi registrado ainda.</p>
                            <button onClick={() => setIsEditing(true)} className="mt-4 text-sm font-bold text-blue-600 hover:underline">Adicionar o primeiro</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
