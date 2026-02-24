import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { differenceInDays, differenceInYears } from "date-fns";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;
    const userType = session.user.type;

    const buildCoordinatorMetrics = async (coordinatorId: string) => {
        // Paraleliza as 3 queries independentes
        const [collaborators, squads, roles] = await Promise.all([
            prisma.collaborator.findMany({
                where: { coordinatorId },
                include: { role: true, events: true, timeBankEntries: true, squads: { include: { squad: true } } }
            }),
            prisma.squad.findMany({
                where: { coordinatorId },
                include: { collaborators: true }
            }),
            prisma.role.findMany({
                where: { coordinatorId },
            }),
        ]);

        const today = new Date();

        const companyAnniversaries = collaborators.filter((c) => {
            const date = new Date(c.admissionDate);
            return date.getMonth() === today.getMonth() && date.getFullYear() < today.getFullYear();
        });

        const birthdays = collaborators.filter((c) => {
            if (!c.birthDate) return false;
            return new Date(c.birthDate).getMonth() === today.getMonth();
        });

        const roleDistribution = roles.map((r) => ({
            name: r.name,
            count: collaborators.filter((c) => c.roleId === r.id).length
        }));

        const squadSizes = squads.map((s) => ({
            name: s.name,
            count: s.collaborators.length
        }));

        const noIntegration = collaborators
            .filter((c) => c.events.length === 0)
            .map((c) => {
                const years = differenceInYears(today, new Date(c.admissionDate));
                return {
                    id: c.id,
                    name: c.name,
                    years,
                    deliveryAddress: c.deliveryAddress,
                    role: c.role,
                    squads: c.squads.map((s) => s.squad),
                    photoUrl: c.photoUrl,
                    color: years >= 2 ? "red" : years >= 1 ? "yellow" : "normal"
                };
            });

        const highTimebank: object[] = [];
        const expiringTimebank: object[] = [];

        for (const c of collaborators) {
            const collabData = {
                id: c.id,
                name: c.name,
                deliveryAddress: c.deliveryAddress,
                role: c.role,
                photoUrl: c.photoUrl,
                squads: c.squads.map((s) => s.squad).filter(Boolean)
            };

            for (const entry of c.timeBankEntries) {
                if (Math.abs(entry.balanceHours) >= 40) {
                    highTimebank.push({ ...collabData, balance: entry.balanceHours });
                }
                const daysLeft = differenceInDays(new Date(entry.expirationDate), today);
                if (daysLeft >= 0 && daysLeft <= 30) {
                    expiringTimebank.push({ ...collabData, daysLeft, balance: entry.balanceHours, expiration: entry.expirationDate });
                }
            }
        }

        return {
            totalCollaborators: collaborators.length,
            companyAnniversaries: companyAnniversaries.map((c) => ({
                id: c.id,
                name: c.name,
                admissionDate: c.admissionDate,
                deliveryAddress: c.deliveryAddress,
                role: c.role,
                photoUrl: c.photoUrl,
                squads: c.squads.map((s) => s.squad).filter(Boolean)
            })),
            birthdays: birthdays.map((c) => ({
                id: c.id,
                name: c.name,
                birthDate: c.birthDate,
                deliveryAddress: c.deliveryAddress,
                role: c.role,
                photoUrl: c.photoUrl,
                squads: c.squads.map((s) => s.squad).filter(Boolean)
            })),
            roleDistribution,
            squadSizes,
            noIntegration,
            highTimebank,
            expiringTimebank
        };
    };

    if (userType === "COORDINATOR") {
        const metrics = await buildCoordinatorMetrics(userId);
        return NextResponse.json({ metrics, coordinatorMode: true });
    } else {
        // MANAGER — paralelo com Promise.all (elimina N+1)
        const links = await prisma.managerCoordinatorLink.findMany({
            where: { managerId: userId, status: "APPROVED" },
            include: { coordinator: true }
        });

        const managerMetrics = await Promise.all(
            links.map(async (link) => ({
                coordinatorName: link.coordinator.name,
                metrics: await buildCoordinatorMetrics(link.coordinatorId)
            }))
        );

        return NextResponse.json({ managerMetrics, coordinatorMode: false });
    }
}
