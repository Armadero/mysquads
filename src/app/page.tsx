import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="flex flex-col items-center gap-8 p-12 bg-white dark:bg-zinc-900 shadow-xl rounded-2xl border dark:border-zinc-800 text-center">
        <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full text-blue-600 dark:text-blue-400">
          <LayoutDashboard size={48} />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">MySquads</h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-sm">
            Sistema integrado para gestão de squads, colaboradores e banco de horas.
          </p>
        </div>
        <Link
          href="/login"
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-medium transition flex items-center gap-2"
        >
          Acessar Plataforma
        </Link>
      </main>
    </div>
  );
}
