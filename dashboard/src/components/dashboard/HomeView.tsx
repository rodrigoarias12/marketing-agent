import { useEffect, useState, useCallback } from "react";
import { Header } from "../layout/Header";
import { KPICard } from "./KPICard";
import { PendingActions } from "./PendingActions";
import { ActivityFeed } from "./ActivityFeed";
import { getDashboardKPIs, getActivity, getPendingActions } from "../../api/client";
import type { DashboardKPIs, ActivityLogEntry, PendingAction, View } from "../../types";
import { Users, FileText, Search, Briefcase, UserCheck, Send } from "lucide-react";

interface HomeViewProps {
  onNavigate: (view: View) => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export function HomeView({ onNavigate }: HomeViewProps) {
  const [kpis, setKPIs] = useState<DashboardKPIs | null>(null);
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [pending, setPending] = useState<PendingAction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [k, a, p] = await Promise.all([
        getDashboardKPIs(),
        getActivity(15),
        getPendingActions(),
      ]);
      setKPIs(k);
      setActivity(a);
      setPending(p);
    } catch (e) {
      console.error("Failed to fetch dashboard:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header view="home" onRefresh={fetchAll} />

      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {/* Greeting */}
        <div>
          <h2 className="headline-md text-el-high">{getGreeting()}</h2>
          <p className="body-sm text-el-low mt-1">Acá tenés el estado de tus operaciones de marketing.</p>
        </div>

        {loading ? (
          <div className="text-center text-el-low body-sm py-20">Cargando...</div>
        ) : (
          <>
            {/* Pending Actions */}
            {pending.length > 0 && (
              <section>
                <h3 className="title-sm text-el-high mb-3">Requiere atención</h3>
                <PendingActions actions={pending} onNavigate={onNavigate} />
              </section>
            )}

            {/* KPI Grid */}
            {kpis && (
              <section>
                <h3 className="title-sm text-el-high mb-3">Métricas</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <KPICard
                    icon={<Users className="w-5 h-5" />}
                    label="Prospectos"
                    value={kpis.prospects.total}
                    detail={`${kpis.prospects.aceptada} aceptados · ${kpis.prospects.pendiente} pendientes`}
                    accent
                  />
                  <KPICard
                    icon={<UserCheck className="w-5 h-5" />}
                    label="Aceptados sin DM"
                    value={kpis.prospects.aceptada}
                    detail="Necesitan follow-up"
                    accent={kpis.prospects.aceptada > 0}
                  />
                  <KPICard
                    icon={<FileText className="w-5 h-5" />}
                    label="Posts publicados"
                    value={kpis.content.published}
                    detail={`${kpis.content.approved} aprobados · ${kpis.content.draft} borradores`}
                  />
                  <KPICard
                    icon={<Send className="w-5 h-5" />}
                    label="DMs enviados"
                    value={kpis.prospects.dmSent}
                    detail={`${kpis.prospects.rechazada} rechazados`}
                  />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                  <KPICard
                    icon={<Search className="w-5 h-5" />}
                    label="Research"
                    value={kpis.research.total}
                  />
                  <KPICard
                    icon={<Briefcase className="w-5 h-5" />}
                    label="Campañas activas"
                    value={kpis.campaigns.total}
                  />
                </div>
              </section>
            )}

            {/* Activity Feed */}
            <section>
              <h3 className="title-sm text-el-high mb-3">Actividad reciente</h3>
              <div className="bg-surface border border-outline rounded-xl overflow-hidden shadow-low">
                <ActivityFeed entries={activity} />
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
