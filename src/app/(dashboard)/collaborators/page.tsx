"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Edit2, Trash2, UserPlus, ChevronDown, Camera, Upload, CheckCircle, AlertCircle, Loader2, Users } from "lucide-react";
import { FormModal } from "@/components/ui/form-modal";
import { formatDate, describeApiError } from "@/lib/utils";
import { useSession } from "@/lib/hooks/use-session";
import { PageLoader } from "@/components/ui/page-state";
import { roleTypeLabels } from "@/lib/labels";

const EMPTY_COLLAB = () => ({
    name: "",
    email: "",
    matricula: "",
    cpf: "",
    sexo: "",
    contractType: "CLT",
    seniority: "JUNIOR",
    devType: "NOT_APPLICABLE",
    admissionDate: new Date().toISOString().split('T')[0],
    birthDate: "",
    resignationDate: "",
    hasChildren: false,
    roleId: "",
    photoUrl: "",
    cep_residencia: "",
    logradouro_residencia: "",
    numero_residencia: "",
    complemento_residencia: "",
    bairro_residencia: "",
    cidade_residencia: "",
    estado_residencia: "",
    cep_entrega: "",
    logradouro_entrega: "",
    numero_entrega: "",
    complemento_entrega: "",
    bairro_entrega: "",
    cidade_entrega: "",
    estado_entrega: "",
});

export default function CollaboratorsPage() {
    const { user, loading: sessionLoading, isCoordinator } = useSession();
    const [collaborators, setCollaborators] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [currentCollab, setCurrentCollab] = useState<any>(EMPTY_COLLAB());
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    /** Instante de referência para calcular "ativo/desligado", fixo por montagem. */
    const [mountedAt] = useState(() => Date.now());

    // CSV Import state
    const [showImport, setShowImport] = useState(false);
    const [importRows, setImportRows] = useState<any[]>([]);
    const [importResults, setImportResults] = useState<{ row: number; name: string; status: "pending" | "success" | "error"; message?: string }[]>([]);
    const [importing, setImporting] = useState(false);
    const [importDone, setImportDone] = useState(false);
    const csvInputRef = useRef<HTMLInputElement>(null);
    const [importDefaults, setImportDefaults] = useState({
        roleId: "",
        seniority: "JUNIOR",
        contractType: "CLT",
        devType: "NOT_APPLICABLE",
        sexo: "",
    });

    const updateImportRow = (idx: number, field: string, value: any) => {
        setImportRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
    };

    /** Aplica um valor a todas as linhas da importação (ou só às vazias). */
    const applyToAll = (field: string, value: string, onlyBlank = false) => {
        if (!value) return;
        setImportRows(prev =>
            prev.map(r => (onlyBlank && r[field] ? r : { ...r, [field]: value }))
        );
    };

    const fetchCollaborators = useCallback(async () => {
        const res = await fetch("/api/collaborators");
        if (res.ok) setCollaborators(await res.json());
    }, []);

    const fetchRoles = useCallback(async () => {
        // Só coordenadores têm cargos próprios; para gerentes /api/roles
        // devolve 401 e não há nada a carregar.
        if (!isCoordinator) return;
        const res = await fetch("/api/roles");
        if (res.ok) setRoles(await res.json());
    }, [isCoordinator]);

    useEffect(() => {
        if (!user) return;
        fetchCollaborators();
        fetchRoles();
    }, [user, fetchCollaborators, fetchRoles]);

    const parseCSV = (text: string) => {
        const lines = text.trim().split(/\r?\n/);
        if (lines.length < 2) return [];

        // Skip header row, parse data rows
        return lines.slice(1).map((line, idx) => {
            const cols = line.split(";").map(c => c.trim());
            const [
                email, nome, datanasc, datacontratacao, cargo,
                cep, logradouro, numero, complemento, bairro, cidade, estado,
                tipocontrato, senioridade, especialidade, filhos, sexo
            ] = cols;

            // Normalize contract type
            const contractMap: Record<string, string> = {
                clt: "CLT", pj: "THIRD_PARTY", terceirizado: "THIRD_PARTY", third_party: "THIRD_PARTY"
            };
            const contractType = contractMap[(tipocontrato || "").toLowerCase()] || "CLT";

            // Normalize seniority
            const seniorityMap: Record<string, string> = {
                junior: "JUNIOR", júnior: "JUNIOR", pleno: "PLENO", senior: "SENIOR",
                sênior: "SENIOR", specialist: "SPECIALIST", especialista: "SPECIALIST"
            };
            const seniority = seniorityMap[(senioridade || "").toLowerCase()] || "JUNIOR";

            // Normalize devType
            const devMap: Record<string, string> = {
                backend: "BACKEND", "back-end": "BACKEND", "back end": "BACKEND",
                frontend: "FRONTEND", "front-end": "FRONTEND", "front end": "FRONTEND",
                fullstack: "FULLSTACK", "full stack": "FULLSTACK", "full-stack": "FULLSTACK",
                tech_lead: "TECH_LEAD", "tech lead": "TECH_LEAD", techlead: "TECH_LEAD",
                "n/a": "NOT_APPLICABLE", na: "NOT_APPLICABLE", "não aplicável": "NOT_APPLICABLE"
            };
            const devType = devMap[(especialidade || "").toLowerCase()] || "NOT_APPLICABLE";

            // Normalize hasChildren
            const hasChildren = ["sim", "yes", "true", "1", "s"].includes((filhos || "").toLowerCase());

            // Normalize sexo
            const sexoMap: Record<string, string> = {
                masculino: "MASCULINO", m: "MASCULINO", masc: "MASCULINO",
                feminino: "FEMININO", f: "FEMININO", fem: "FEMININO"
            };
            const sexoNorm = sexoMap[(sexo || "").toLowerCase()] || null;

            // Find role by name (case-insensitive)
            const roleMatch = roles.find(r =>
                r.name.toLowerCase() === (cargo || "").toLowerCase() ||
                (roleTypeLabels[r.name] || "").toLowerCase() === (cargo || "").toLowerCase()
            );

            return {
                _row: idx + 2,
                name: nome || "",
                email: email || "",
                birthDate: datanasc ? new Date(datanasc.split("/").reverse().join("-")).toISOString().split("T")[0] : "",
                admissionDate: datacontratacao
                    ? new Date(datacontratacao.split("/").reverse().join("-")).toISOString().split("T")[0]
                    : new Date().toISOString().split("T")[0],
                roleId: roleMatch?.id?.toString() || "",
                _cargoOriginal: cargo || "",
                cep_residencia: cep || "",
                logradouro_residencia: logradouro || "",
                numero_residencia: numero || "",
                complemento_residencia: complemento || "",
                bairro_residencia: bairro || "",
                cidade_residencia: cidade || "",
                estado_residencia: estado || "",
                contractType,
                seniority,
                devType,
                hasChildren,
                sexo: sexoNorm,
            };
        }).filter(r => r.name);
    };

    const handleCSVFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result as string;
            const rows = parseCSV(text);
            setImportRows(rows);
            setImportResults(rows.map(r => ({ row: r._row, name: r.name, status: "pending" })));
            setImportDone(false);
        };
        reader.readAsText(file, "UTF-8");
        e.target.value = "";
    };

    const handleRunImport = async () => {
        if (importRows.length === 0) return;
        setImporting(true);
        const results = [...importResults];

        for (let i = 0; i < importRows.length; i++) {
            const row = importRows[i];
            results[i] = { ...results[i], status: "pending" };
            setImportResults([...results]);

            if (!row.name || !row.email) {
                results[i] = { ...results[i], status: "error", message: "Nome e e-mail são obrigatórios." };
                setImportResults([...results]);
                continue;
            }
            if (!row.roleId) {
                results[i] = { ...results[i], status: "error", message: `Cargo "${row._cargoOriginal}" não encontrado.` };
                setImportResults([...results]);
                continue;
            }

            try {
                const res = await fetch("/api/collaborators", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(row),
                });
                if (res.ok) {
                    results[i] = { ...results[i], status: "success" };
                } else {
                    const data = await res.json();
                    results[i] = { ...results[i], status: "error", message: data.error || "Erro ao importar." };
                }
            } catch {
                results[i] = { ...results[i], status: "error", message: "Erro de conexão." };
            }
            setImportResults([...results]);
        }

        setImporting(false);
        setImportDone(true);
        fetchCollaborators();
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
                setCurrentCollab(EMPTY_COLLAB());
                fetchCollaborators();
            } else {
                const data = await res.json().catch(() => ({}));
                setError(describeApiError(data));
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
                const OUTPUT_SIZE = 400;

                // Recorta para quadrado: centraliza horizontalmente,
                // começa do topo verticalmente (onde fica o rosto)
                const cropSize = Math.min(img.width, img.height);
                const sx = Math.floor((img.width - cropSize) / 2);
                const sy = 0; // topo da imagem

                canvas.width = OUTPUT_SIZE;
                canvas.height = OUTPUT_SIZE;
                const ctx = canvas.getContext("2d");
                ctx?.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
                const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

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
        setError(null);
        const res = await fetch(`/api/collaborators/${id}`, { method: "DELETE" });
        if (res.ok) {
            fetchCollaborators();
            return;
        }
        const data = await res.json().catch(() => ({}));
        setError(describeApiError(data, "Não foi possível remover o colaborador."));
    };

    if (sessionLoading) return <PageLoader label="Carregando colaboradores..." />;
    if (!user) return null;

    /**
     * Colaborador desligado quando há data de desligamento já ocorrida.
     * Usa `mountedAt` (capturado uma vez) em vez de `Date.now()` durante a
     * render — ler o relógio na render torna o resultado não-determinístico.
     */
    const isActive = (c: any) =>
        !c.resignationDate || new Date(c.resignationDate).getTime() > mountedAt;

    const term = search.trim().toLowerCase();
    const visibleCollaborators = term
        ? collaborators.filter(c =>
            [c.name, c.email, c.matricula, c.cpf]
                .some((f: string | null) => (f || "").toLowerCase().includes(term))
        )
        : collaborators;

    const INPUT = "w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all";

    const LABEL = "block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5";

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Colaboradores</h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Gerencie sua equipe e atribua as funções nos squads.</p>
                </div>
                {isCoordinator && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => { setShowImport(true); setImportRows([]); setImportResults([]); setImportDone(false); setImportDefaults({ roleId: "", seniority: "JUNIOR", contractType: "CLT", devType: "NOT_APPLICABLE", sexo: "" }); }}
                            className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                        >
                            <Upload size={16} /> Importar CSV
                        </button>
                    <button
                        onClick={() => {
                            setCurrentCollab(EMPTY_COLLAB());
                            setError(null);
                            setIsEditing(true);
                        }}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-md shadow-blue-500/10 transition-all"
                    >
                        <UserPlus size={18} /> Adicionar Colaborador
                    </button>
                    </div>
                )}
            </div>

            {/* Modal de Importação CSV */}
            <FormModal
                open={showImport}
                onClose={() => setShowImport(false)}
                title="Importar Colaboradores via CSV"
                subtitle="Separador: ponto e vírgula (;)"
                size="3xl"
                dismissable={!importing}
                footer={
                    importDone ? (
                        <button onClick={() => { setShowImport(false); setImportRows([]); setImportResults([]); setImportDone(false); setImportDefaults({ roleId: "", seniority: "JUNIOR", contractType: "CLT", devType: "NOT_APPLICABLE", sexo: "" }); }} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-all">
                            Concluir
                        </button>
                    ) : (
                        <>
                            <button onClick={() => setShowImport(false)} className="px-4 py-2 text-sm font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                                Cancelar
                            </button>
                            <button
                                onClick={handleRunImport}
                                disabled={importRows.length === 0 || importing}
                                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-all"
                            >
                                {importing ? <><Loader2 size={15} className="animate-spin" /> Importando...</> : <><Upload size={15} /> Importar {importRows.length > 0 ? `${importRows.length} registro(s)` : ""}</>}
                            </button>
                        </>
                    )
                }
            >
                        <div className="p-6 space-y-5">
                            {/* Padrão esperado */}
                            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3 border border-zinc-200 dark:border-zinc-700 min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Cabeçalho esperado</p>
                                <div className="overflow-x-auto">
                                    <code className="block text-[10px] text-zinc-600 dark:text-zinc-300 whitespace-nowrap leading-relaxed">
                                        email;nome;datanasc;datacontratacao;cargo;cep;logradouro;numero;complemento;bairro;cidade;estado;tipocontrato;senioridade;especialidade;filhos;sexo
                                    </code>
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
                                    {[
                                        ["tipocontrato", "CLT · PJ / Terceirizado"],
                                        ["senioridade", "Junior · Pleno · Senior · Especialista"],
                                        ["especialidade", "Backend · Frontend · Fullstack · Tech Lead · N/A"],
                                        ["filhos", "Sim · Não"],
                                        ["sexo", "Masculino · Feminino"],
                                        ["datas", "DD/MM/AAAA"],
                                    ].map(([k, v]) => (
                                        <div key={k} className="flex gap-1 text-[10px] min-w-0">
                                            <span className="font-bold text-zinc-500 shrink-0">{k}:</span>
                                            <span className="text-zinc-400 truncate">{v}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Upload */}
                            {importRows.length === 0 && !importDone && (
                                <div
                                    className="border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all group"
                                    onClick={() => csvInputRef.current?.click()}
                                >
                                    <Upload size={28} className="mx-auto mb-3 text-zinc-300 group-hover:text-blue-400 transition-colors" />
                                    <p className="text-sm font-semibold text-zinc-500 group-hover:text-blue-500 transition-colors">Clique para selecionar o arquivo CSV</p>
                                    <p className="text-xs text-zinc-400 mt-1">Arquivo .csv com separador ponto e vírgula</p>
                                    <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCSVFile} />
                                </div>
                            )}

                            {/* Preview dos registros */}
                            {importRows.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{importRows.length} registro(s) encontrado(s)</p>
                                        {!importing && !importDone && (
                                            <button onClick={() => { setImportRows([]); setImportResults([]); }} className="text-xs text-zinc-400 hover:text-red-500 transition-colors">Limpar</button>
                                        )}
                                    </div>

                                    {/* Preenchimento em massa — evita ajustar linha a linha
                                        quando o CSV vem sem cargo/senioridade mapeados. */}
                                    {!importing && !importDone && (
                                        <div className="flex flex-wrap items-end gap-2 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                            <p className="w-full text-[10px] font-bold uppercase tracking-widest text-zinc-400">Aplicar a todas as linhas</p>
                                            {([
                                                { field: "roleId", label: "Cargo", options: roles.map(r => ({ value: String(r.id), label: roleTypeLabels[r.name] || r.name })) },
                                                { field: "seniority", label: "Senioridade", options: [{ value: "JUNIOR", label: "Júnior" }, { value: "PLENO", label: "Pleno" }, { value: "SENIOR", label: "Sênior" }, { value: "SPECIALIST", label: "Especialista" }] },
                                                { field: "contractType", label: "Contrato", options: [{ value: "CLT", label: "CLT" }, { value: "THIRD_PARTY", label: "Terceirizado / PJ" }] },
                                                { field: "devType", label: "Especialidade", options: [{ value: "NOT_APPLICABLE", label: "N/A" }, { value: "BACKEND", label: "Back-end" }, { value: "FRONTEND", label: "Front-end" }, { value: "FULLSTACK", label: "Full Stack" }, { value: "TECH_LEAD", label: "Tech Lead" }] },
                                                { field: "sexo", label: "Sexo", options: [{ value: "MASCULINO", label: "Masculino" }, { value: "FEMININO", label: "Feminino" }] },
                                            ] as const).map(({ field, label, options }) => (
                                                <div key={field} className="flex flex-col gap-1">
                                                    <label className="text-[9px] font-bold uppercase text-zinc-400">{label}</label>
                                                    <div className="flex gap-1">
                                                        <select
                                                            value={importDefaults[field]}
                                                            onChange={e => setImportDefaults(prev => ({ ...prev, [field]: e.target.value }))}
                                                            className="text-xs px-1.5 py-1 border border-zinc-200 dark:border-zinc-700 rounded bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                                        >
                                                            <option value="">—</option>
                                                            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                                        </select>
                                                        <button
                                                            type="button"
                                                            disabled={!importDefaults[field]}
                                                            onClick={() => applyToAll(field, importDefaults[field], true)}
                                                            title="Preencher apenas as linhas vazias"
                                                            className="text-[10px] font-bold px-2 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-blue-600 hover:border-blue-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                                        >
                                                            Vazias
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={!importDefaults[field]}
                                                            onClick={() => applyToAll(field, importDefaults[field])}
                                                            title="Sobrescrever todas as linhas"
                                                            className="text-[10px] font-bold px-2 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-blue-600 hover:border-blue-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                                        >
                                                            Todas
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Tabela de registros com campos editáveis por linha */}
                                    <div className="border border-zinc-100 dark:border-zinc-800 rounded-lg overflow-hidden max-h-96">
                                        <div className="overflow-x-auto overflow-y-auto max-h-96">
                                            <table className="text-left text-xs" style={{ minWidth: "900px" }}>
                                                <thead className="sticky top-0 z-10">
                                                    <tr className="bg-zinc-50 dark:bg-zinc-800 text-zinc-400 border-b border-zinc-100 dark:border-zinc-700">
                                                        <th className="px-3 py-2 font-semibold whitespace-nowrap" style={{ minWidth: "150px" }}>Nome</th>
                                                        <th className="px-3 py-2 font-semibold whitespace-nowrap" style={{ minWidth: "180px" }}>E-mail</th>
                                                        <th className="px-3 py-2 font-semibold whitespace-nowrap" style={{ minWidth: "150px" }}>Cargo</th>
                                                        <th className="px-3 py-2 font-semibold whitespace-nowrap" style={{ minWidth: "120px" }}>Senioridade</th>
                                                        <th className="px-3 py-2 font-semibold whitespace-nowrap" style={{ minWidth: "130px" }}>Contrato</th>
                                                        <th className="px-3 py-2 font-semibold whitespace-nowrap" style={{ minWidth: "130px" }}>Especialidade</th>
                                                        <th className="px-3 py-2 font-semibold whitespace-nowrap" style={{ minWidth: "110px" }}>Sexo</th>
                                                        <th className="px-3 py-2 font-semibold whitespace-nowrap w-14 text-center">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                                                    {importRows.map((row, i) => {
                                                        const result = importResults[i];
                                                        const SEL = (hasIssue?: boolean) =>
                                                            `w-full text-xs px-1.5 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-400 ${hasIssue ? "border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-amber-700" : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300"}`;
                                                        return (
                                                            <tr key={i} className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 ${!row.roleId ? "bg-amber-50/20 dark:bg-amber-900/5" : ""}`}>
                                                                <td className="px-3 py-1.5 font-medium text-zinc-700 dark:text-zinc-300">
                                                                    <span className="block truncate max-w-[140px]" title={row.name}>{row.name || <span className="text-red-400 italic">vazio</span>}</span>
                                                                </td>
                                                                <td className="px-3 py-1.5 text-zinc-500">
                                                                    <span className="block truncate max-w-[170px]" title={row.email}>{row.email || <span className="text-red-400 italic">vazio</span>}</span>
                                                                </td>
                                                                <td className="px-2 py-1">
                                                                    <select disabled={importing} value={row.roleId} onChange={e => updateImportRow(i, "roleId", e.target.value)} className={SEL(!row.roleId)}>
                                                                        <option value="">⚠ Selecione...</option>
                                                                        {roles.map(r => <option key={r.id} value={String(r.id)}>{roleTypeLabels[r.name] || r.name}</option>)}
                                                                    </select>
                                                                </td>
                                                                <td className="px-2 py-1">
                                                                    <select disabled={importing} value={row.seniority || "JUNIOR"} onChange={e => updateImportRow(i, "seniority", e.target.value)} className={SEL()}>
                                                                        <option value="JUNIOR">Júnior</option>
                                                                        <option value="PLENO">Pleno</option>
                                                                        <option value="SENIOR">Sênior</option>
                                                                        <option value="SPECIALIST">Especialista</option>
                                                                    </select>
                                                                </td>
                                                                <td className="px-2 py-1">
                                                                    <select disabled={importing} value={row.contractType || "CLT"} onChange={e => updateImportRow(i, "contractType", e.target.value)} className={SEL()}>
                                                                        <option value="CLT">CLT</option>
                                                                        <option value="THIRD_PARTY">Terceirizado / PJ</option>
                                                                    </select>
                                                                </td>
                                                                <td className="px-2 py-1">
                                                                    <select disabled={importing} value={row.devType || "NOT_APPLICABLE"} onChange={e => updateImportRow(i, "devType", e.target.value)} className={SEL()}>
                                                                        <option value="NOT_APPLICABLE">N/A</option>
                                                                        <option value="BACKEND">Back-end</option>
                                                                        <option value="FRONTEND">Front-end</option>
                                                                        <option value="FULLSTACK">Full Stack</option>
                                                                        <option value="TECH_LEAD">Tech Lead</option>
                                                                    </select>
                                                                </td>
                                                                <td className="px-2 py-1">
                                                                    <select disabled={importing} value={row.sexo || ""} onChange={e => updateImportRow(i, "sexo", e.target.value)} className={SEL()}>
                                                                        <option value="">—</option>
                                                                        <option value="MASCULINO">Masculino</option>
                                                                        <option value="FEMININO">Feminino</option>
                                                                    </select>
                                                                </td>
                                                                <td className="px-3 py-1.5 text-center">
                                                                    {result?.status === "success" && <CheckCircle size={14} className="mx-auto text-green-500" />}
                                                                    {result?.status === "error" && <span title={result.message}><AlertCircle size={14} className="mx-auto text-red-500" /></span>}
                                                                    {result?.status === "pending" && importing && i === importResults.findIndex(r => r.status === "pending") && <Loader2 size={14} className="mx-auto text-blue-500 animate-spin" />}
                                                                    {result?.status === "pending" && !importing && <span className="text-zinc-300">—</span>}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Erros detalhados */}
                                    {importDone && importResults.some(r => r.status === "error") && (
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold uppercase text-red-500 tracking-wider">Erros encontrados</p>
                                            {importResults.filter(r => r.status === "error").map((r, i) => (
                                                <div key={i} className="text-xs text-red-600 bg-red-50 dark:bg-red-900/10 rounded px-3 py-1.5 flex gap-2">
                                                    <span className="font-bold shrink-0">Linha {r.row}:</span>
                                                    <span>{r.message}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Resumo final */}
                                    {importDone && (
                                        <div className="flex items-center gap-3 text-xs font-bold p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                                            <span className="text-green-600">{importResults.filter(r => r.status === "success").length} importado(s)</span>
                                            <span className="text-zinc-300">·</span>
                                            <span className="text-red-500">{importResults.filter(r => r.status === "error").length} com erro</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
            </FormModal>

            <FormModal
                open={isEditing}
                onClose={() => setIsEditing(false)}
                title={currentCollab.id ? "Editar Colaborador" : "Novo Colaborador"}
                size="2xl"
                dismissable={!loading}
            >
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
                                    <label className={LABEL}>Matrícula <span className="normal-case font-normal text-zinc-400">(opcional)</span></label>
                                    <input className={INPUT} type="text" value={currentCollab.matricula || ""} onChange={e => setCurrentCollab({ ...currentCollab, matricula: e.target.value })} placeholder="Ex: 12345" />
                                </div>
                                <div className="space-y-1">
                                    <label className={LABEL}>CPF <span className="normal-case font-normal text-zinc-400">(opcional)</span></label>
                                    <input className={INPUT} type="text" value={currentCollab.cpf || ""} onChange={e => setCurrentCollab({ ...currentCollab, cpf: e.target.value })} placeholder="000.000.000-00" maxLength={14} />
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

                                {/* Campo já existia no banco e no schema, mas não tinha input:
                                    não havia como registrar um desligamento pela interface. */}
                                <div className="space-y-1">
                                    <label className={LABEL}>Data de Desligamento <span className="normal-case font-normal text-zinc-400">(opcional)</span></label>
                                    <input className={INPUT} type="date" value={currentCollab.resignationDate ? currentCollab.resignationDate.split('T')[0] : ""} onChange={e => setCurrentCollab({ ...currentCollab, resignationDate: e.target.value })} />
                                </div>

                                <div className="space-y-1">
                                    <label className={LABEL}>Sexo</label>
                                    <div className="relative">
                                        <select className={`${INPUT} appearance-none`} value={currentCollab.sexo || ""} onChange={e => setCurrentCollab({ ...currentCollab, sexo: e.target.value })}>
                                            <option value="">Selecione...</option>
                                            <option value="MASCULINO">Masculino</option>
                                            <option value="FEMININO">Feminino</option>
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={14} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Endereço de Residência */}
                        <div className="bg-zinc-50/60 dark:bg-zinc-800/20 rounded-lg border border-zinc-100 dark:border-zinc-800 p-4 space-y-3">
                            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 pb-2 border-b border-zinc-200 dark:border-zinc-700">Endereço de Residência</p>
                            {/* Linha 1: CEP + Logradouro */}
                            <div className="flex gap-3">
                                <div className="space-y-1 w-32 flex-shrink-0">
                                    <label className={LABEL}>CEP</label>
                                    <input className={INPUT} type="text" value={currentCollab.cep_residencia || ""} onChange={e => setCurrentCollab({ ...currentCollab, cep_residencia: e.target.value })} placeholder="00000-000" maxLength={9} />
                                </div>
                                <div className="space-y-1 flex-1">
                                    <label className={LABEL}>Logradouro</label>
                                    <input className={INPUT} type="text" value={currentCollab.logradouro_residencia || ""} onChange={e => setCurrentCollab({ ...currentCollab, logradouro_residencia: e.target.value })} placeholder="Rua, Avenida, Travessa..." />
                                </div>
                            </div>
                            {/* Linha 2: Número + Complemento + Bairro */}
                            <div className="flex gap-3">
                                <div className="space-y-1 w-24 flex-shrink-0">
                                    <label className={LABEL}>Número</label>
                                    <input className={INPUT} type="text" value={currentCollab.numero_residencia || ""} onChange={e => setCurrentCollab({ ...currentCollab, numero_residencia: e.target.value })} placeholder="Nº" />
                                </div>
                                <div className="space-y-1 w-40 flex-shrink-0">
                                    <label className={LABEL}>Complemento</label>
                                    <input className={INPUT} type="text" value={currentCollab.complemento_residencia || ""} onChange={e => setCurrentCollab({ ...currentCollab, complemento_residencia: e.target.value })} placeholder="Apto, Bloco..." />
                                </div>
                                <div className="space-y-1 flex-1">
                                    <label className={LABEL}>Bairro</label>
                                    <input className={INPUT} type="text" value={currentCollab.bairro_residencia || ""} onChange={e => setCurrentCollab({ ...currentCollab, bairro_residencia: e.target.value })} placeholder="Bairro" />
                                </div>
                            </div>
                            {/* Linha 3: Cidade + Estado */}
                            <div className="flex gap-3">
                                <div className="space-y-1 flex-1">
                                    <label className={LABEL}>Cidade</label>
                                    <input className={INPUT} type="text" value={currentCollab.cidade_residencia || ""} onChange={e => setCurrentCollab({ ...currentCollab, cidade_residencia: e.target.value })} placeholder="Cidade" />
                                </div>
                                <div className="space-y-1 w-24 flex-shrink-0">
                                    <label className={LABEL}>Estado (UF)</label>
                                    <input className={INPUT} type="text" value={currentCollab.estado_residencia || ""} onChange={e => setCurrentCollab({ ...currentCollab, estado_residencia: e.target.value.toUpperCase() })} placeholder="SP" maxLength={2} />
                                </div>
                            </div>
                        </div>

                        {/* Endereço de Entrega */}
                        <div className="bg-zinc-50/60 dark:bg-zinc-800/20 rounded-lg border border-zinc-100 dark:border-zinc-800 p-4 space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-700">
                                <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Endereço de Entrega</p>
                                <button
                                    type="button"
                                    onClick={() => setCurrentCollab((prev: any) => ({
                                        ...prev,
                                        cep_entrega: prev.cep_residencia,
                                        logradouro_entrega: prev.logradouro_residencia,
                                        numero_entrega: prev.numero_residencia,
                                        complemento_entrega: prev.complemento_residencia,
                                        bairro_entrega: prev.bairro_residencia,
                                        cidade_entrega: prev.cidade_residencia,
                                        estado_entrega: prev.estado_residencia,
                                    }))}
                                    className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2.5 py-1 rounded-md transition-all"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                                    Copiar endereço de residência
                                </button>
                            </div>
                            {/* Linha 1: CEP + Logradouro */}
                            <div className="flex gap-3">
                                <div className="space-y-1 w-32 flex-shrink-0">
                                    <label className={LABEL}>CEP</label>
                                    <input className={INPUT} type="text" value={currentCollab.cep_entrega || ""} onChange={e => setCurrentCollab({ ...currentCollab, cep_entrega: e.target.value })} placeholder="00000-000" maxLength={9} />
                                </div>
                                <div className="space-y-1 flex-1">
                                    <label className={LABEL}>Logradouro</label>
                                    <input className={INPUT} type="text" value={currentCollab.logradouro_entrega || ""} onChange={e => setCurrentCollab({ ...currentCollab, logradouro_entrega: e.target.value })} placeholder="Rua, Avenida, Travessa..." />
                                </div>
                            </div>
                            {/* Linha 2: Número + Complemento + Bairro */}
                            <div className="flex gap-3">
                                <div className="space-y-1 w-24 flex-shrink-0">
                                    <label className={LABEL}>Número</label>
                                    <input className={INPUT} type="text" value={currentCollab.numero_entrega || ""} onChange={e => setCurrentCollab({ ...currentCollab, numero_entrega: e.target.value })} placeholder="Nº" />
                                </div>
                                <div className="space-y-1 w-40 flex-shrink-0">
                                    <label className={LABEL}>Complemento</label>
                                    <input className={INPUT} type="text" value={currentCollab.complemento_entrega || ""} onChange={e => setCurrentCollab({ ...currentCollab, complemento_entrega: e.target.value })} placeholder="Apto, Bloco..." />
                                </div>
                                <div className="space-y-1 flex-1">
                                    <label className={LABEL}>Bairro</label>
                                    <input className={INPUT} type="text" value={currentCollab.bairro_entrega || ""} onChange={e => setCurrentCollab({ ...currentCollab, bairro_entrega: e.target.value })} placeholder="Bairro" />
                                </div>
                            </div>
                            {/* Linha 3: Cidade + Estado */}
                            <div className="flex gap-3">
                                <div className="space-y-1 flex-1">
                                    <label className={LABEL}>Cidade</label>
                                    <input className={INPUT} type="text" value={currentCollab.cidade_entrega || ""} onChange={e => setCurrentCollab({ ...currentCollab, cidade_entrega: e.target.value })} placeholder="Cidade" />
                                </div>
                                <div className="space-y-1 w-24 flex-shrink-0">
                                    <label className={LABEL}>Estado (UF)</label>
                                    <input className={INPUT} type="text" value={currentCollab.estado_entrega || ""} onChange={e => setCurrentCollab({ ...currentCollab, estado_entrega: e.target.value.toUpperCase() })} placeholder="SP" maxLength={2} />
                                </div>
                            </div>
                        </div>

                        {/* Informações Contratuais */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            </FormModal>

            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                {/* Busca — a lista cresce rápido e antes só havia rolagem */}
                <div className="p-4 bg-zinc-50/50 dark:bg-zinc-800/30 border-b border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="font-bold text-xs uppercase tracking-wider text-zinc-500">
                        {visibleCollaborators.length} de {collaborators.length} colaborador(es)
                    </h2>
                    <div className="relative w-full md:w-80">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nome, e-mail, matrícula ou CPF..."
                            className={`${INPUT} pl-10`}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

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
                            {visibleCollaborators.map(collab => (
                                <tr key={collab.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {collab.photoUrl ? (
                                                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-zinc-200 dark:border-zinc-700">
                                                    <img src={collab.photoUrl} alt={collab.name} className="w-full h-full object-cover object-top" />
                                                </div>
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center font-bold text-blue-600 dark:text-blue-400 text-sm">
                                                    {(collab.name || "?")[0].toUpperCase()}
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
                                        <div className="text-xs text-zinc-500">{formatDate(collab.admissionDate)}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {/* O status vinha fixo em "Ativo", ignorando a data de
                                            desligamento já gravada no banco. */}
                                        {isActive(collab) ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-100 dark:border-green-900/30 uppercase tracking-tighter">
                                                Ativo
                                            </span>
                                        ) : (
                                            <span
                                                title={`Desligado em ${formatDate(collab.resignationDate)}`}
                                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 uppercase tracking-tighter"
                                            >
                                                Desligado
                                            </span>
                                        )}
                                    </td>
                                    {isCoordinator && (
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => {
                                        setCurrentCollab({
                                            ...collab,
                                            roleId: collab.roleId != null ? String(collab.roleId) : "",
                                            hasChildren: Boolean(collab.hasChildren),
                                            birthDate: collab.birthDate ? collab.birthDate.split('T')[0] : "",
                                            admissionDate: collab.admissionDate ? collab.admissionDate.split('T')[0] : new Date().toISOString().split('T')[0],
                                            resignationDate: collab.resignationDate ? collab.resignationDate.split('T')[0] : "",
                                        });
                                        setError(null);
                                        setIsEditing(true);
                                    }} className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-all">
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
                                <Users size={32} />
                            </div>
                            <p className="text-zinc-500 font-medium italic">Nenhum colaborador foi registrado ainda.</p>
                            {isCoordinator && (
                                <button onClick={() => { setCurrentCollab(EMPTY_COLLAB()); setError(null); setIsEditing(true); }} className="mt-4 text-sm font-bold text-blue-600 hover:underline">Adicionar o primeiro</button>
                            )}
                        </div>
                    )}
                    {collaborators.length > 0 && visibleCollaborators.length === 0 && (
                        <div className="py-20 text-center flex flex-col items-center">
                            <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4 text-zinc-300 dark:text-zinc-600">
                                <Search size={32} />
                            </div>
                            <p className="text-zinc-500 font-medium italic">Nenhum resultado para &ldquo;{search}&rdquo;.</p>
                            <button onClick={() => setSearch("")} className="mt-4 text-sm font-bold text-blue-600 hover:underline">Limpar busca</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
