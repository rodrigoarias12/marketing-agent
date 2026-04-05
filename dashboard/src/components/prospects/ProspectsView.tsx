import { useEffect, useState, useCallback } from "react";
import { Header } from "../layout/Header";
import { StatusBadge } from "../shared/StatusBadge";
import { PipelineBoard } from "./PipelineBoard";
import { FollowUpPanel } from "./FollowUpPanel";
import { getProspects, getProspectsPipeline, getCampaigns, createProspect, updateProspect } from "../../api/client";
import type { Prospect, ProspectStatus, PipelineData, Campaign } from "../../types";
import { Plus, ExternalLink, MapPin, Building2, Briefcase, MessageSquare, X, LayoutGrid, List } from "lucide-react";

const STATUS_TABS: { label: string; value: string }[] = [
  { label: "Todos", value: "" },
  { label: "Pendiente", value: "pendiente" },
  { label: "Aceptada", value: "aceptada" },
  { label: "DM Sent", value: "dm_sent" },
  { label: "Rechazada", value: "rechazada" },
];

const REGION_TABS: { label: string; value: string }[] = [
  { label: "Todos", value: "" },
  { label: "Argentina", value: "argentina" },
  { label: "Miami", value: "miami" },
];

type ViewMode = "pipeline" | "list";

export function ProspectsView() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [pipeline, setPipeline] = useState<PipelineData | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("pipeline");
  const [statusFilter, setStatusFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [campaignFilter, setCampaignFilter] = useState<number | undefined>();
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Prospect | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [campaignData] = await Promise.all([getCampaigns()]);
      setCampaigns(campaignData);

      if (viewMode === "pipeline") {
        const data = await getProspectsPipeline({ campaign: campaignFilter, region: regionFilter || undefined });
        setPipeline(data);
        // Also get flat list for stats
        const all = await getProspects({ region: regionFilter || undefined, campaign: campaignFilter });
        setProspects(all);
      } else {
        const data = await getProspects({
          status: statusFilter || undefined,
          region: regionFilter || undefined,
          campaign: campaignFilter,
        });
        setProspects(data);
      }
    } catch (e) {
      console.error("Failed to fetch prospects:", e);
    } finally {
      setLoading(false);
    }
  }, [viewMode, statusFilter, regionFilter, campaignFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStatusChange = async (id: number, status: ProspectStatus) => {
    await updateProspect(id, { status });
    fetchData();
    setSelected(null);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header view="prospects" onRefresh={fetchData}>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex border border-outline rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode("pipeline")}
              className={`px-2.5 py-1.5 flex items-center gap-1 label-lg-w-md transition cursor-pointer ${
                viewMode === "pipeline"
                  ? "bg-violet-lighter-ext text-violet-darker-ext"
                  : "text-el-mid hover:bg-overlay"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Pipeline
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-2.5 py-1.5 flex items-center gap-1 label-lg-w-md transition cursor-pointer ${
                viewMode === "list"
                  ? "bg-violet-lighter-ext text-violet-darker-ext"
                  : "text-el-mid hover:bg-overlay"
              }`}
            >
              <List className="w-3.5 h-3.5" /> Lista
            </button>
          </div>

          <button onClick={() => setShowAdd(true)} className="btn-sm btn-primary contained">
            <Plus className="w-3.5 h-3.5" /> Agregar
          </button>
        </div>
      </Header>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          {viewMode === "list" && (
            <FilterTabs label="Estado" tabs={STATUS_TABS} value={statusFilter} onChange={setStatusFilter} />
          )}
          <FilterTabs label="Region" tabs={REGION_TABS} value={regionFilter} onChange={setRegionFilter} />

          {/* Campaign filter */}
          <div className="flex items-center gap-2">
            <span className="label-lg text-el-low">Campaña:</span>
            <select
              value={campaignFilter ?? ""}
              onChange={(e) => setCampaignFilter(e.target.value ? Number(e.target.value) : undefined)}
              className="bg-surface-accent border border-outline rounded-md px-2.5 py-1 label-lg-w-md text-el-high focus:outline-none focus:ring-1 focus:ring-violet-darker cursor-pointer"
            >
              <option value="">Todas</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-3">
          <MiniStat label="Total" value={prospects.length} />
          <MiniStat label="Pendiente" value={prospects.filter((p) => p.status === "pendiente").length} />
          <MiniStat label="Aceptada" value={prospects.filter((p) => p.status === "aceptada").length} accent />
          <MiniStat label="DM Sent" value={prospects.filter((p) => p.status === "dm_sent").length} />
        </div>

        {/* Main content */}
        {loading ? (
          <div className="text-center text-el-low body-sm py-20">Cargando...</div>
        ) : viewMode === "pipeline" && pipeline ? (
          <PipelineBoard pipeline={pipeline} onRefresh={fetchData} />
        ) : (
          /* Table view */
          <div className="bg-surface border border-outline rounded-xl overflow-hidden shadow-low">
            <table className="w-full body-sm">
              <thead>
                <tr className="border-b border-outline text-left overline-sm text-el-low uppercase">
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Campaña</th>
                  <th className="px-4 py-3">Region</th>
                  <th className="px-4 py-3">Grado</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {prospects.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-outline/50 hover:bg-overlay cursor-pointer transition"
                    onClick={() => setSelected(p)}
                  >
                    <td className="px-4 py-3 title-sm text-el-high">{p.name}</td>
                    <td className="px-4 py-3 text-el-mid">{p.company}</td>
                    <td className="px-4 py-3 label-lg text-el-low">{p.role}</td>
                    <td className="px-4 py-3">
                      <CampaignBadge campaignId={p.campaignId} campaigns={campaigns} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 label-lg text-el-low">
                        <MapPin className="w-3 h-3" />{p.region}
                      </span>
                    </td>
                    <td className="px-4 py-3 label-lg text-el-low">{p.degree}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3">
                      {p.linkedinUrl && (
                        <a
                          href={p.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-info-base hover:text-info-dark"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && (
        <AddProspectModal
          campaigns={campaigns}
          onClose={() => setShowAdd(false)}
          onSave={async (data) => {
            await createProspect(data);
            setShowAdd(false);
            fetchData();
          }}
        />
      )}

      {selected && viewMode === "list" && (
        <FollowUpPanel
          prospect={selected}
          onClose={() => setSelected(null)}
          onRefresh={() => {
            setSelected(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

function CampaignBadge({ campaignId, campaigns }: { campaignId: number | null; campaigns: Campaign[] }) {
  if (!campaignId) return <span className="label-lg text-el-disabled">—</span>;
  const campaign = campaigns.find((c) => c.id === campaignId);
  if (!campaign) return null;
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full bg-violet-lighter text-violet-darker-ext label-md truncate max-w-[140px]">
      {campaign.name}
    </span>
  );
}

function FilterTabs({ label, tabs, value, onChange }: {
  label: string;
  tabs: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="label-lg text-el-low">{label}:</span>
      <div className="flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={`px-2.5 py-1 rounded-md label-lg-w-md transition cursor-pointer ${
              value === tab.value
                ? "bg-violet-lighter-ext text-violet-darker-ext"
                : "text-el-mid hover:bg-overlay hover:text-el-high"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`bg-surface border rounded-lg px-3 py-2 text-center shadow-low ${
      accent && value > 0 ? "border-violet-darker/40 bg-violet-lighter/20" : "border-outline"
    }`}>
      <div className={`amount-sm ${accent && value > 0 ? "text-violet-darker-ext" : "text-violet-darker-ext"}`}>
        {value}
      </div>
      <div className="label-md text-el-low uppercase tracking-wider">{label}</div>
    </div>
  );
}

function AddProspectModal({ campaigns, onClose, onSave }: {
  campaigns: Campaign[];
  onClose: () => void;
  onSave: (data: Omit<Prospect, "id" | "createdAt" | "updatedAt" | "lastFollowupAt" | "followupCount">) => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: "", company: "", role: "", location: "", linkedinUrl: "",
    degree: "2°", status: "pendiente" as ProspectStatus, messageSent: "", notes: "",
    region: "argentina", campaignId: null as number | null,
  });

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-surface border border-outline rounded-xl w-full max-w-lg p-6 space-y-4 shadow-high" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="title-lg text-el-high">Nuevo Prospecto</h3>
          <button onClick={onClose} className="text-el-low hover:text-el-high cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Nombre" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Input label="Empresa" value={form.company} onChange={(v) => setForm({ ...form, company: v })} />
          <Input label="Rol" value={form.role} onChange={(v) => setForm({ ...form, role: v })} />
          <Input label="Ubicacion" value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
          <Input label="LinkedIn URL" value={form.linkedinUrl} onChange={(v) => setForm({ ...form, linkedinUrl: v })} full />
          <Select label="Region" value={form.region} options={["argentina", "miami"]} onChange={(v) => setForm({ ...form, region: v })} />
          <Select label="Grado" value={form.degree} options={["1°", "2°", "3°"]} onChange={(v) => setForm({ ...form, degree: v })} />
          <div>
            <label className="label-md text-el-low uppercase tracking-wider block mb-1">Campaña</label>
            <select
              value={form.campaignId ?? ""}
              onChange={(e) => setForm({ ...form, campaignId: e.target.value ? Number(e.target.value) : null })}
              className="w-full bg-surface-accent border border-outline rounded-md px-3 py-1.5 body-sm text-el-high focus:outline-none focus:ring-1 focus:ring-violet-darker"
            >
              <option value="">Sin campaña</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
        <textarea
          placeholder="Notas..."
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="w-full bg-surface-accent border border-outline rounded-md px-3 py-2 body-sm text-el-high placeholder:text-el-disabled resize-none h-20 focus:outline-none focus:ring-1 focus:ring-violet-darker"
        />
        <button
          onClick={() => onSave(form)}
          className="btn-primary contained w-full py-2.5 rounded-md"
        >
          Guardar Prospecto
        </button>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, full }: { label: string; value: string; onChange: (v: string) => void; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <label className="label-md text-el-low uppercase tracking-wider block mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface-accent border border-outline rounded-md px-3 py-1.5 body-sm text-el-high focus:outline-none focus:ring-1 focus:ring-violet-darker"
      />
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="label-md text-el-low uppercase tracking-wider block mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface-accent border border-outline rounded-md px-3 py-1.5 body-sm text-el-high focus:outline-none focus:ring-1 focus:ring-violet-darker"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
