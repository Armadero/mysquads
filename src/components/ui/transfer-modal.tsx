"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { FormModal } from "@/components/ui/form-modal";
import { describeApiError } from "@/lib/utils";

interface TransferModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    description: string;
    /** Endpoint POST que recebe `{ targetEmail }`. */
    endpoint: string;
    /** Chamado após sucesso, com o corpo da resposta da API. */
    onDone: (data: { collaboratorsMoved?: number }) => void;
}

export function TransferModal({ open, onClose, title, description, endpoint, onDone }: TransferModalProps) {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const close = () => {
        setEmail("");
        setError("");
        onClose();
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError("");
        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ targetEmail: email }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(describeApiError(data, "Não foi possível transferir."));
                return;
            }
            const data = await res.json().catch(() => ({}));
            setEmail("");
            onDone(data);
            onClose();
        } catch {
            setError("Erro de conexão com o servidor.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <FormModal open={open} onClose={close} title={title} size="md" dismissable={!saving}>
            <form onSubmit={submit} className="p-6 space-y-4">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
                <div>
                    <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                        E-mail do coordenador de destino
                    </label>
                    <input
                        type="email"
                        required
                        autoFocus
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="coordenador@empresa.com"
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                {error && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs font-semibold rounded-lg">
                        <AlertCircle size={14} className="shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={close} disabled={saving} className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
                        Cancelar
                    </button>
                    <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 disabled:opacity-60">
                        {saving ? "Transferindo..." : "Transferir"}
                    </button>
                </div>
            </form>
        </FormModal>
    );
}
