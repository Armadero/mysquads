"use client";
import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Plus, Trash2, Users, Layout, GripVertical, ChevronRight, X, UserMinus, Monitor, ArrowLeft } from "lucide-react";

export default function SquadsPage() {
    const { data: session } = useSession();
    const [squads, setSquads] = useState<any[]>([]);
    const [collaborators, setCollaborators] = useState<any[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newSquadName, setNewSquadName] = useState("");
    const [view, setView] = useState<'LIST' | 'EDIT'>('LIST');
    const [selectedSquadId, setSelectedSquadId] = useState<string | null>(null);

    useEffect(() => {
        if (session) {
            fetchSquads();
            fetchCollaborators();
        }
    }, [session]);

    const fetchSquads = async () => {
        const res = await fetch("/api/squads", { cache: "no-store" });
        if (res.ok) setSquads(await res.json());
    };

    const fetchCollaborators = async () => {
        const res = await fetch("/api/collaborators", { cache: "no-store" });
        if (res.ok) setCollaborators(await res.json());
    };

    const createSquad = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch("/api/squads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: newSquadName })
        });
        if (res.ok) {
            setIsCreating(false);
            setNewSquadName("");
            fetchSquads();
        }
    };

    const deleteSquad = async (id: string) => {
        if (!confirm("Remover este squad? Os membros ficarão sem equipe.")) return;
        const res = await fetch(`/api/squads/${id}`, { method: "DELETE" });
        if (res.ok) {
            fetchSquads();
            fetchCollaborators();
        }
    };

    const onDragEnd = async (result: any) => {
        const { destination, source, draggableId } = result;

        if (!destination || (destination.droppableId === source.droppableId)) return;

        const isMovingToList = destination.droppableId === "unassigned";
        const squadId = isMovingToList ? source.droppableId : destination.droppableId;

        if (squadId === 'none' || squadId === 'unassigned') return;

        // --- OPTIMISTIC UPDATE START ---
        // Capture current state
        const prevSquads = [...squads];
        const prevCollabs = [...collaborators];

        // Find the collaborator object
        const collabToMove = collaborators.find(c => c.id === draggableId) ||
            squads.flatMap(s => s.collaborators).find(c => c.id === draggableId);

        if (!collabToMove) return;

        // Update local state immediately
        setSquads(current => current.map(s => {
            if (isMovingToList && s.id === source.droppableId) {
                return { ...s, collaborators: s.collaborators.filter((c: any) => c.id !== draggableId) };
            }
            if (!isMovingToList && s.id === destination.droppableId) {
                // Avoid duplicates in optimistic state
                if (s.collaborators.some((c: any) => c.id === draggableId)) return s;
                return { ...s, collaborators: [...s.collaborators, collabToMove] };
            }
            return s;
        }));
        // --- OPTIMISTIC UPDATE END ---

        try {
            const res = await fetch(`/api/squads/${squadId}/collaborators`, {
                method: isMovingToList ? "DELETE" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ collaboratorId: draggableId })
            });

            if (!res.ok) {
                // Rollback on failure
                setSquads(prevSquads);
                setCollaborators(prevCollabs);
                console.error("Failed to move member:", await res.text());
            } else {
                // Refresh data to confirm server state
                await Promise.all([fetchSquads(), fetchCollaborators()]);
            }
        } catch (error) {
            // Rollback on error
            setSquads(prevSquads);
            setCollaborators(prevCollabs);
            console.error("Drag-and-drop error:", error);
        }
    };

    if (!session?.user) return null;
    const isCoordinator = (session.user as any).type === "COORDINATOR";

    // Derived state for the lists
    const selectedSquad = squads.find(s => s.id === selectedSquadId);

    // A collaborator is available if they are NOT in the current squad AND haven't reached their maxSquads limit
    const unassignedCollabs = collaborators
        .filter(c => {
            const isInCurrentSquad = selectedSquad?.collaborators.some((m: any) => m.id === c.id);
            if (isInCurrentSquad) return false;

            const currentSquadCount = c.squads?.length || 0;
            const maxSquads = c.role?.maxSquads || 1;

            return currentSquadCount < maxSquads;
        })
        .sort((a, b) => (a.role?.order || 0) - (b.role?.order || 0));

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20 font-sans">
            {view === 'LIST' ? (
                <>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Squads</h1>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">Veja as equipes e organização de membros.</p>
                        </div>
                        {isCoordinator && !isCreating && (
                            <button
                                onClick={() => setIsCreating(true)}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-md shadow-blue-500/10 transition-all"
                            >
                                <Plus size={18} /> Adicionar Squad
                            </button>
                        )}
                    </div>

                    {isCreating && (
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-lg max-w-md">
                            <form onSubmit={createSquad} className="space-y-4">
                                <div className="flex justify-between items-center mb-2">
                                    <h2 className="font-bold text-zinc-800 dark:text-white">Nome do Squad</h2>
                                    <button type="button" onClick={() => setIsCreating(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"><X size={16} /></button>
                                </div>
                                <input
                                    required
                                    autoFocus
                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    placeholder="Ex: Squad Delta"
                                    value={newSquadName || ""}
                                    onChange={e => setNewSquadName(e.target.value)}
                                />
                                <div className="flex justify-end gap-2 pt-2">
                                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-blue-700">Criar Squad</button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                                        <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Nome do Squad</th>
                                        <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-center">Membros</th>
                                        <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Composição</th>
                                        {isCoordinator && <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-right">Ações</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                    {squads.map(squad => (
                                        <tr key={squad.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                        <Layout size={18} />
                                                    </div>
                                                    <span className="font-bold text-sm text-zinc-800 dark:text-zinc-100">{squad.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-xs font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-md">{squad.collaborators.length}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex -space-x-1.5 overflow-hidden">
                                                    {[...squad.collaborators]
                                                        .sort((a, b) => (a.role?.order || 0) - (b.role?.order || 0))
                                                        .slice(0, 5)
                                                        .map((c: any) => (
                                                            <div
                                                                key={c.id}
                                                                title={`${c.name} (${c.role?.name || 'Membro'})`}
                                                                className="w-7 h-7 rounded-full border-2 border-white dark:border-zinc-900 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-black text-zinc-500 uppercase shadow-sm overflow-hidden"
                                                                style={{ borderColor: c.role?.defaultColor ? `${c.role.defaultColor}40` : undefined }}
                                                            >
                                                                {c.photoUrl ? (
                                                                    <img src={c.photoUrl} alt={c.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    c.name?.[0] || ""
                                                                )}
                                                            </div>
                                                        ))}
                                                    {squad.collaborators.length > 5 && (
                                                        <div className="w-7 h-7 rounded-full border-2 border-white dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-[8px] font-black text-zinc-400 shadow-sm">
                                                            +{squad.collaborators.length - 5}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            {isCoordinator && (
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            onClick={() => { setSelectedSquadId(squad.id); setView('EDIT'); }}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-all"
                                                        >
                                                            GERENCIAR <ChevronRight size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => deleteSquad(squad.id)}
                                                            className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {squads.length === 0 && (
                                <div className="py-20 text-center flex flex-col items-center">
                                    <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4 text-zinc-300 dark:text-zinc-600">
                                        <Layout size={32} />
                                    </div>
                                    <p className="text-zinc-500 font-medium italic">Nenhum squad foi criado ainda.</p>
                                    {isCoordinator && <button onClick={() => setIsCreating(true)} className="mt-4 text-sm font-bold text-blue-600 hover:underline">Adicionar o primeiro</button>}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="flex flex-col gap-8">
                        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-6">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setView('LIST')}
                                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors"
                                >
                                    <ArrowLeft size={20} />
                                </button>
                                <div>
                                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white uppercase tracking-tight">{selectedSquad?.name}</h1>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Arraste os colaboradores para formar ou alterar a equipe.</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col lg:flex-row gap-8 items-start">
                            {/* Available side list */}
                            {isCoordinator && (
                                <div className="w-full lg:w-80 flex-shrink-0 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col h-auto max-h-[calc(100vh-280px)]">
                                    <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 flex justify-between items-center text-zinc-500">
                                        <h2 className="font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                                            <Users size={14} className="text-blue-500" /> Disponíveis
                                        </h2>
                                        <span className="bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-black px-2 py-0.5 rounded-full">{unassignedCollabs.length}</span>
                                    </div>
                                    <Droppable droppableId="unassigned" isDropDisabled={!isCoordinator}>
                                        {(provided, snapshot) => (
                                            <div
                                                {...provided.droppableProps}
                                                ref={provided.innerRef}
                                                className={`p-4 flex-1 overflow-y-auto space-y-2 min-h-[200px] transition-all scrollbar-thin ${snapshot.isDraggingOver ? 'bg-blue-50/30' : ''}`}
                                            >
                                                {unassignedCollabs.map((collab, index) => (
                                                    <DraggableItem key={collab.id} collab={collab} index={index} isDragDisabled={!isCoordinator} />
                                                ))}
                                                {provided.placeholder}
                                                {unassignedCollabs.length === 0 && (
                                                    <div className="py-10 text-center text-xs text-zinc-400 font-medium italic border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">Todos alocados</div>
                                                )}
                                            </div>
                                        )}
                                    </Droppable>
                                </div>
                            )}

                            {/* Squad Droppable Area */}
                            <div className="flex-1 w-full bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 min-h-[500px] flex flex-col shadow-sm">
                                <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/30 dark:bg-zinc-800/20">
                                    <h3 className="font-bold text-zinc-800 dark:text-white flex items-center gap-2">
                                        Membros da Equipe
                                        <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-400 text-[10px] font-black px-2 py-0.5 rounded-full">
                                            {selectedSquad?.collaborators.length || 0}
                                        </span>
                                    </h3>
                                </div>

                                <Droppable droppableId={selectedSquadId || 'none'} isDropDisabled={!isCoordinator}>
                                    {(provided, snapshot) => (
                                        <div
                                            {...provided.droppableProps}
                                            ref={provided.innerRef}
                                            className={`p-8 flex-1 transition-colors relative ${snapshot.isDraggingOver ? 'bg-blue-50/20' : ''}`}
                                        >
                                            <div className="space-y-8">
                                                {(() => {
                                                    const members = [...(selectedSquad?.collaborators || [])];
                                                    const grouped = members.reduce((acc: any, collab: any) => {
                                                        const roleId = collab.roleId || 'no-role';
                                                        if (!acc[roleId]) acc[roleId] = { role: collab.role, members: [] };
                                                        acc[roleId].members.push(collab);
                                                        return acc;
                                                    }, {});

                                                    const sortedRoleGroups = Object.values(grouped).sort((a: any, b: any) =>
                                                        (a.role?.order || 0) - (b.role?.order || 0)
                                                    );

                                                    return sortedRoleGroups.map(({ role, members: roleMembers }: any) => (
                                                        <div key={role?.id || 'no-role'} className="space-y-4">
                                                            <div className="flex items-center gap-2 border-b border-zinc-50 dark:border-zinc-800 pb-2">
                                                                <div className="w-1 h-3 rounded-full" style={{ backgroundColor: role?.defaultColor || "#CBD5E1" }}></div>
                                                                <h4 className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                                                                    {role?.name || "Sem Cargo"} • {roleMembers.length}
                                                                </h4>
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                                                {roleMembers.map((collab: any) => {
                                                                    const flatIndex = (selectedSquad?.collaborators || []).findIndex((c: any) => c.id === collab.id);
                                                                    return <DraggableItem key={collab.id} collab={collab} index={flatIndex} isDragDisabled={!isCoordinator} />;
                                                                })}
                                                            </div>
                                                        </div>
                                                    ));
                                                })()}
                                            </div>
                                            {provided.placeholder}

                                            {(!selectedSquad?.collaborators || selectedSquad.collaborators.length === 0) && !snapshot.isDraggingOver && (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-300 dark:text-zinc-700 pointer-events-none">
                                                    <Monitor size={48} strokeWidth={1} className="mb-4 opacity-10" />
                                                    <p className="text-xs font-bold uppercase tracking-widest italic opacity-30">Arraste colaboradores para este squad</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        </div>
                    </div>
                </DragDropContext>
            )}
        </div>
    );
}

function DraggableItem({ collab, index, isDragDisabled }: { collab: any, index: number, isDragDisabled?: boolean }) {
    return (
        <Draggable draggableId={collab.id} index={index} isDragDisabled={isDragDisabled}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`p-3 bg-white dark:bg-zinc-800 border rounded-xl flex items-center justify-between shadow-sm transition-all group
                        ${snapshot.isDragging
                            ? 'border-blue-500 shadow-xl shadow-blue-500/10 scale-105 z-50 ring-2 ring-blue-500/20'
                            : 'border-zinc-100 dark:border-zinc-700/50 hover:border-zinc-300 dark:hover:border-zinc-600'
                        }`}
                >
                    <div className="flex items-center gap-3 overflow-hidden">
                        {!isDragDisabled && <GripVertical size={14} className="text-zinc-300 dark:text-zinc-600 shrink-0" />}

                        {collab.photoUrl ? (
                            <img src={collab.photoUrl} alt={collab.name} className="w-8 h-8 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 shrink-0" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center font-bold text-blue-600 dark:text-blue-400 text-[10px] shrink-0">
                                {collab.name?.[0]?.toUpperCase() || ""}
                            </div>
                        )}

                        <div className="min-w-0">
                            <div className="font-bold text-sm text-zinc-800 dark:text-zinc-200 truncate">{collab.name}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: collab.role?.defaultColor || "#CBD5E1" }}></div>
                                <span className="text-[10px] font-bold text-zinc-500 uppercase truncate">{collab.role?.name || "Colaborador"}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Draggable>
    );
}
