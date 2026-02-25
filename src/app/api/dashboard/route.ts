import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { differenceInDays, differenceInYears } from "date-fns";

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = user.id;
    const userType = user.user_metadata?.type;

    const buildCoordinatorMetrics = async (coordinatorId: string) => {
        // Paraleliza as queries independentes
        const [{ data: collaborators }, { data: squads }, { data: roles }] = await Promise.all([
            supabase
                .from("Collaborator")
                .select(`
          *,
          role:Role(*),
          events:IntegrationEventCollaborator(event:IntegrationEvent(*)),
          timeBankEntries:TimeBankEntry(*),
          squads:SquadCollaborator(squad:Squad(*))
        `)
                .eq("coordinatorId", coordinatorId),
            supabase
                .from("Squad")
                .select(`
          *,
          collaborators:SquadCollaborator(*)
        `)
                .eq("coordinatorId", coordinatorId),
            supabase
                .from("Role")
                .select("*")
                .eq("coordinatorId", coordinatorId),
        ]);

        const collabList = collaborators || [];
        const squadList = squads || [];
        const roleList = roles || [];

        const today = new Date();

        const companyAnniversaries = collabList.filter((c: any) => {
            const date = new Date(c.admissionDate);
            return date.getMonth() === today.getMonth() && date.getFullYear() < today.getFullYear();
        });

        const birthdays = collabList.filter((c: any) => {
            if (!c.birthDate) return false;
            return new Date(c.birthDate).getMonth() === today.getMonth();
        });

        const roleDistribution = roleList.map((r: any) => ({
            name: r.name,
            count: collabList.filter((c: any) => c.roleId === r.id).length
        }));

        const squadSizes = squadList.map((s: any) => ({
            name: s.name,
            count: s.collaborators?.length || 0
        }));

        const noIntegration = collabList
            .filter((c: any) => !c.events || c.events.length === 0)
            .map((c: any) => {
                const years = differenceInYears(today, new Date(c.admissionDate));
                return {
                    id: c.id,
                    name: c.name,
                    years,
                    deliveryAddress: c.deliveryAddress,
                    role: c.role,
                    squads: (c.squads || []).map((s: any) => s.squad),
                    photoUrl: c.photoUrl,
                    color: years >= 2 ? "red" : years >= 1 ? "yellow" : "normal"
                };
            });

        const highTimebank: object[] = [];
        const expiringTimebank: object[] = [];

        for (const c of collabList) {
            const collabData = {
                id: c.id,
                name: c.name,
                deliveryAddress: c.deliveryAddress,
                role: c.role,
                photoUrl: c.photoUrl,
                squads: (c.squads || []).map((s: any) => s.squad).filter(Boolean)
            };

            for (const entry of (c.timeBankEntries || [])) {
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
            totalCollaborators: collabList.length,
            companyAnniversaries: companyAnniversaries.map((c: any) => ({
                id: c.id,
                name: c.name,
                admissionDate: c.admissionDate,
                deliveryAddress: c.deliveryAddress,
                role: c.role,
                photoUrl: c.photoUrl,
                squads: (c.squads || []).map((s: any) => s.squad).filter(Boolean)
            })),
            birthdays: birthdays.map((c: any) => ({
                id: c.id,
                name: c.name,
                birthDate: c.birthDate,
                deliveryAddress: c.deliveryAddress,
                role: c.role,
                photoUrl: c.photoUrl,
                squads: (c.squads || []).map((s: any) => s.squad).filter(Boolean)
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
    } else if (userType === "MANAGER") {
        // MANAGER
        const { data: links } = await supabase
            .from("ManagerCoordinatorLink")
            .select(`
        coordinatorId,
        coordinator:User!coordinatorId(*)
      `)
            .eq("managerId", userId)
            .eq("status", "APPROVED");

        const managerMetrics = await Promise.all(
            (links || []).map(async (link: any) => ({
                // Assuming the foreign key reference User!coordinatorId fetches the User relation correctly
                coordinatorName: link.coordinator?.name || "Unknown",
                metrics: await buildCoordinatorMetrics(link.coordinatorId)
            }))
        );

        return NextResponse.json({ managerMetrics, coordinatorMode: false });
    } else {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
}
