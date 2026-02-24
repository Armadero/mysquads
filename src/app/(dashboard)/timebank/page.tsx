"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Clock, Upload, AlertTriangle, CheckCircle, FileText, X, Search, Info, ArrowUpRight } from "lucide-react";

export default function TimebankPage() {
    const { data: session } = useSession();
    const [alerts, setAlerts] = useState<any[]>([]);
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (session) fetchAlerts();
    }, [session]);

    const fetchAlerts = async () => {
        const res = await fetch("/api/timebank");
        if (res.ok) setAlerts(await res.json());
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        setLoading(true);
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/timebank", {
            method: "POST",
            body: formData,
        });

        if (res.ok) {
            setSuccess(true);
            setFile(null);
            fetchAlerts();
            setTimeout(() => setSuccess(false), 3000);
        } else {
            alert("Erro ao processar PDF");
        }
        setLoading(false);
    };

    if (!session?.user || (session.user as any).type !== "COORDINATOR") return null;

    return (
        <div className="space-y-10 animate-in fade-in duration-500 pb-20 font-sans">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Banco de Horas</h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Monitore saldos críticos e importe novos relatórios mensais.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Alerts */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-zinc-800 dark:text-white flex items-center gap-2">
                            Alertas de Saldo
                        </h2>
                        <span className="text-[10px] font-black bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 px-2 py-0.5 rounded-full border border-orange-200 dark:border-orange-900/30">
                            {alerts.length} CRÍTICOS
                        </span>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                                        <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Colaborador</th>
                                        <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-center">Saldo Crítico</th>
                                        <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-center">Expiração</th>
                                        <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                    {alerts.map((alert, i) => (
                                        <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 font-bold text-xs">
                                                        {alert.name[0]}
                                                    </div>
                                                    <span className="font-bold text-sm text-zinc-800 dark:text-zinc-100">{alert.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-xs font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/10 px-2.5 py-1 rounded-md">
                                                    {alert.balance}h
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">{alert.daysLeft} dias</span>
                                                    <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-black">Restantes</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="p-2 text-zinc-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-md transition-all">
                                                    <ArrowUpRight size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {alerts.length === 0 && (
                                <div className="py-20 text-center flex flex-col items-center">
                                    <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4 text-zinc-300 dark:text-zinc-600">
                                        <CheckCircle size={32} />
                                    </div>
                                    <p className="text-zinc-500 font-medium italic">Nenhum saldo crítico detectado.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Import UI */}
                <div className="space-y-6">
                    <h2 className="text-lg font-bold text-zinc-800 dark:text-white">Importar Dados</h2>

                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 overflow-hidden relative">
                        {success && (
                            <div className="absolute inset-0 bg-green-600 text-white flex flex-col items-center justify-center z-10 animate-in fade-in duration-300">
                                <CheckCircle size={48} className="mb-2" />
                                <span className="font-bold uppercase tracking-widest text-xs">Importado com sucesso!</span>
                            </div>
                        )}

                        <form onSubmit={handleUpload} className="space-y-6">
                            <div className="text-center space-y-2">
                                <div className="mx-auto w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 mb-4">
                                    <FileText size={32} />
                                </div>
                                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Relatório mensal (PDF)</p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">Selecione o arquivo gerado pelo sistema de ponto para atualizar os saldos.</p>
                            </div>

                            <div className="relative group">
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={e => setFile(e.target.files?.[0] || null)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all
                                    ${file ? 'border-blue-500 bg-blue-50/20' : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'}`}>
                                    <Upload size={24} className={file ? "text-blue-600" : "text-zinc-400"} />
                                    <span className="mt-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 truncate max-w-full px-4">
                                        {file ? file.name : "Clique ou arraste o arquivo"}
                                    </span>
                                </div>
                            </div>

                            <button
                                disabled={!file || loading}
                                type="submit"
                                className="w-full bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white font-bold py-3 rounded-xl disabled:bg-zinc-100 disabled:text-zinc-300 transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/5"
                            >
                                {loading ? "Processando..." : "Iniciar Importação"}
                            </button>

                            <div className="flex items-start gap-3 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-700">
                                <Info size={16} className="text-zinc-400 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-zinc-500 leading-normal">
                                    Formatos suportados: PDF extraído diretamente do portal corporativo. O processamento leva alguns segundos.
                                </p>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
