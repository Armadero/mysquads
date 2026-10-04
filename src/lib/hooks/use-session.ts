"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export type SessionUser = {
    id: string;
    email: string;
    name: string | null;
    type: "COORDINATOR" | "MANAGER";
};

/**
 * Sessão do usuário logado.
 *
 * Todas as telas faziam `fetch("/api/auth/me").then(r => r.json())` sem checar
 * o status. Com a sessão expirada a resposta 401 (`{ error: "Unauthorized" }`)
 * é um objeto truthy, então a tela seguia renderizando com `user.type`
 * indefinido — caindo no ramo de COORDENADOR e disparando um bombardeio de
 * requisições que também falhavam. Aqui só consideramos sessão válida uma
 * resposta 2xx, e mandamos para o login caso contrário.
 *
 * `loading` permite distinguir "ainda carregando" de "sem sessão", evitando
 * o flash de tela vazia que havia com `if (!user) return null`.
 */
export function useSession() {
    const router = useRouter();
    const [user, setUser] = useState<SessionUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const res = await fetch("/api/auth/me");
                if (!res.ok) {
                    if (!cancelled) router.replace("/login");
                    return;
                }
                const data = (await res.json()) as SessionUser;
                if (!cancelled) setUser(data);
            } catch {
                if (!cancelled) router.replace("/login");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [router]);

    return { user, loading, isCoordinator: user?.type === "COORDINATOR" };
}
