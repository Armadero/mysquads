"use client";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Users, Settings, Building, LayoutDashboard, Calendar, Clock, Menu, X, ChevronRight, MessageSquare, Link2 } from "lucide-react";
import { useState } from "react";

const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/connections", label: "Coordenadores", icon: Link2, managerOnly: true },
    { href: "/roles", label: "Cargos", icon: Settings, coordinatorOnly: true },
    { href: "/collaborators", label: "Colaboradores", icon: Users },
    { href: "/squads", label: "Squads", icon: Building },
    { href: "/events", label: "Integração", icon: Calendar, coordinatorOnly: true },
    { href: "/feedback", label: "Feedback", icon: MessageSquare },
    { href: "/timebank", label: "Banco de Horas", icon: Clock, coordinatorOnly: true },
];

const pageTitles: Record<string, string> = {
    "/dashboard": "Início",
    "/roles": "Cargos e Funções",
    "/collaborators": "Colaboradores",
    "/squads": "Squads",
    "/events": "Integração de Eventos",
    "/feedback": "Gestão de Feedbacks",
    "/timebank": "Banco de Horas",
    "/connections": "Coordenadores",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    const isCoordinator = session?.user?.type === "COORDINATOR";

    const NavContent = () => (
        <div className="flex flex-col h-full bg-white dark:bg-zinc-900">
            {/* Brand */}
            <div className="h-16 flex items-center px-6 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">S</div>
                    <span className="font-bold text-xl tracking-tight text-zinc-800 dark:text-white">MySquads</span>
                </div>
            </div>

            {/* Navigation links */}
            <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto mt-2">
                {navItems.map(({ href, label, icon: Icon, coordinatorOnly, managerOnly }) => {
                    if (coordinatorOnly && !isCoordinator) return null;
                    if (managerOnly && isCoordinator) return null;
                    const active = pathname === href;
                    return (
                        <Link
                            key={href}
                            href={href}
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-md transition-all group
                                ${active
                                    ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 font-semibold"
                                    : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200"
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <Icon size={20} className={active ? "text-blue-600 dark:text-blue-400" : "text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"} />
                                <span className="text-sm">{label}</span>
                            </div>
                            {active && <ChevronRight size={14} />}
                        </Link>
                    );
                })}
            </nav>

            {/* User & logout */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
                {session?.user && (
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center font-bold text-zinc-600 dark:text-zinc-300 text-xs">
                            {session.user.name?.[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate">{session.user?.name || 'Usuário'}</div>
                            <div className="text-[10px] text-zinc-500 font-bold uppercase truncate">
                                {session.user?.type === "COORDINATOR" ? "Coordenador" : "Gerente"}
                            </div>
                        </div>
                    </div>
                )}
                <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="flex items-center gap-3 w-full px-3 py-2 text-sm text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-md transition-colors"
                >
                    <LogOut size={18} />
                    <span>Sair do sistema</span>
                </button>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 font-sans">
            {/* Desktop Sidebar */}
            <aside className="w-60 border-r border-zinc-200 dark:border-zinc-800 hidden md:block flex-shrink-0 shadow-sm z-20">
                <NavContent />
            </aside>

            {/* Mobile Sidebar */}
            {mobileOpen && (
                <div className="fixed inset-0 z-50 flex md:hidden">
                    <div className="w-64 shadow-2xl animate-in slide-in-from-left duration-300">
                        <NavContent />
                    </div>
                    <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                {/* Top header */}
                <header className="h-16 flex items-center justify-between px-6 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0 z-10">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setMobileOpen(true)} className="md:hidden p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md">
                            <Menu size={22} />
                        </button>
                        <h2 className="font-semibold text-lg text-zinc-800 dark:text-white capitalize">
                            {pageTitles[pathname] || "MySquads"}
                        </h2>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Notification or other Header elements could go here */}
                    </div>
                </header>

                {/* Page content */}
                <div className="flex-1 overflow-auto bg-[#F7F9FC] dark:bg-zinc-950 p-6 md:p-8">
                    <div className="max-w-6xl mx-auto">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
