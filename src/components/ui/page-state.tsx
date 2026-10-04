"use client";

import { Loader2, ShieldAlert } from "lucide-react";
import Link from "next/link";

/** Spinner padrão enquanto a tela resolve sessão/dados. */
export function PageLoader({ label = "Carregando..." }: { label?: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-zinc-400">
            <Loader2 size={28} className="animate-spin text-blue-500" />
            <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
        </div>
    );
}

/**
 * Mensagem para quando o perfil logado não tem acesso à tela.
 *
 * Antes as telas apenas devolviam `null` nesse caso, deixando o usuário
 * diante de uma página em branco sem explicação nem saída.
 */
export function AccessDenied({
    message = "Esta área está disponível apenas para coordenadores.",
}: {
    message?: string;
}) {
    return (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-14 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-500">
                <ShieldAlert size={30} />
            </div>
            <h3 className="font-bold text-zinc-900 dark:text-white mb-1">Acesso restrito</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5 max-w-sm mx-auto">{message}</p>
            <Link
                href="/dashboard"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-md shadow-blue-500/10 transition-all inline-flex items-center gap-2"
            >
                Voltar ao início
            </Link>
        </div>
    );
}
