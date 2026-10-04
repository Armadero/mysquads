"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type Size = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "full";

const SIZES: Record<Size, string> = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    "2xl": "max-w-5xl",
    "3xl": "max-w-6xl",
    full: "max-w-[95vw]",
};

interface FormModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    size?: Size;
    /** Impede fechar ao clicar fora / ESC (útil durante submit) */
    dismissable?: boolean;
    children: React.ReactNode;
    /** Rodapé fixo (botões de ação). Opcional — pode ficar dentro do children. */
    footer?: React.ReactNode;
}

/**
 * Modal padrão para telas de inclusão e alteração.
 * Fundo com blur, card centralizado e corpo com rolagem própria.
 * As telas de consulta permanecem intactas atrás do overlay.
 */
export function FormModal({
    open,
    onClose,
    title,
    subtitle,
    size = "lg",
    dismissable = true,
    children,
    footer,
}: FormModalProps) {
    const panelRef = useRef<HTMLDivElement>(null);

    // Fecha com ESC
    useEffect(() => {
        if (!open || !dismissable) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [open, dismissable, onClose]);

    // Trava a rolagem do fundo enquanto o modal estiver aberto
    useEffect(() => {
        if (!open) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previous;
        };
    }, [open]);

    // Foca o primeiro campo do formulário ao abrir
    useEffect(() => {
        if (!open) return;
        const id = window.setTimeout(() => {
            const el = panelRef.current?.querySelector<HTMLElement>(
                "input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled])"
            );
            el?.focus();
        }, 60);
        return () => window.clearTimeout(id);
    }, [open]);

    if (!open || typeof document === "undefined") return null;

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 sm:p-6 md:items-center"
        >
            {/* Backdrop com blur */}
            <div
                onClick={() => dismissable && onClose()}
                className="fixed inset-0 bg-zinc-900/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            />

            {/* Painel */}
            <div
                ref={panelRef}
                onClick={(e) => e.stopPropagation()}
                className={`relative w-full ${SIZES[size]} my-auto bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200`}
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 shrink-0">
                    <div className="min-w-0">
                        <h2 className="font-bold text-sm uppercase tracking-wider text-zinc-600 dark:text-zinc-300 truncate">
                            {title}
                        </h2>
                        {subtitle && (
                            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 truncate">{subtitle}</p>
                        )}
                    </div>
                    {/* Respeita `dismissable`: com o botão sempre ativo dava para
                        fechar o modal no meio de um envio (ex.: importação de CSV
                        em andamento), deixando a operação órfã em segundo plano. */}
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={!dismissable}
                        aria-label="Fechar"
                        className="p-1.5 -mr-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors shrink-0 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    >
                        <X size={16} className="text-zinc-400" />
                    </button>
                </div>

                {/* Corpo rolável */}
                <div className="flex-1 overflow-y-auto">{children}</div>

                {/* Rodapé fixo (opcional) */}
                {footer && (
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}

export default FormModal;
