import { useEffect, useState } from "react";
import { X, Plus, Trash2, Globe, Building2, Lightbulb, ToggleLeft, ToggleRight } from "lucide-react";
import { getResearchConfigs, createResearchConfig, deleteResearchConfig, updateResearchConfig } from "../../api/client";
import type { ResearchConfigEntry } from "../../types";

export function ResearchConfigPanel({ onClose }: { onClose: () => void }) {
  const [configs, setConfigs] = useState<ResearchConfigEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [addType, setAddType] = useState<"competitor" | "industry" | null>(null);
  const [form, setForm] = useState({ name: "", url: "", description: "" });

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const data = await getResearchConfigs();
      setConfigs(data);
    } catch (e) {
      console.error("Failed to load configs:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConfigs(); }, []);

  const competitors = configs.filter((c) => c.type === "competitor");
  const topics = configs.filter((c) => c.type === "industry");

  const handleAdd = async () => {
    if (!addType || !form.name) return;
    await createResearchConfig({ type: addType, name: form.name, url: form.url, description: form.description });
    setForm({ name: "", url: "", description: "" });
    setAddType(null);
    fetchConfigs();
  };

  const handleDelete = async (id: number) => {
    await deleteResearchConfig(id);
    fetchConfigs();
  };

  const handleToggle = async (config: ResearchConfigEntry) => {
    await updateResearchConfig(config.id, { enabled: !config.enabled });
    fetchConfigs();
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-surface border border-outline rounded-xl w-full max-w-2xl p-6 space-y-5 shadow-high max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="title-lg text-el-high">Configuracion de Research</h3>
          <button onClick={onClose} className="text-el-low hover:text-el-high cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-5 custom-scrollbar">
          {/* Competitors */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-green-darker" />
                <h4 className="title-sm text-el-high">Competidores</h4>
              </div>
              <button
                onClick={() => setAddType("competitor")}
                className="flex items-center gap-1 label-lg text-green-darker hover:text-green-darker-ext cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar
              </button>
            </div>

            {competitors.length === 0 ? (
              <p className="body-sm text-el-low py-3">No hay competidores configurados. Agregá uno para empezar.</p>
            ) : (
              <div className="space-y-2">
                {competitors.map((c) => (
                  <ConfigCard key={c.id} config={c} onDelete={handleDelete} onToggle={handleToggle} />
                ))}
              </div>
            )}
          </section>

          {/* Industry Topics */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-green-darker" />
                <h4 className="title-sm text-el-high">Temas de Industria</h4>
              </div>
              <button
                onClick={() => setAddType("industry")}
                className="flex items-center gap-1 label-lg text-green-darker hover:text-green-darker-ext cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar
              </button>
            </div>

            {topics.length === 0 ? (
              <p className="body-sm text-el-low py-3">No hay temas configurados. Agregá temas de industria a monitorear.</p>
            ) : (
              <div className="space-y-2">
                {topics.map((c) => (
                  <ConfigCard key={c.id} config={c} onDelete={handleDelete} onToggle={handleToggle} />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Add form */}
        {addType && (
          <div className="border-t border-outline pt-4 space-y-3">
            <h4 className="label-md text-el-low uppercase">
              {addType === "competitor" ? "Nuevo Competidor" : "Nuevo Tema de Industria"}
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-surface-accent border border-outline rounded-md px-3 py-1.5 body-sm text-el-high focus:outline-none focus:ring-1 focus:ring-green-darker"
                placeholder={addType === "competitor" ? "ej: Bitso" : "ej: AI en logística"}
                autoFocus
              />
              {addType === "competitor" && (
                <input
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  className="bg-surface-accent border border-outline rounded-md px-3 py-1.5 body-sm text-el-high focus:outline-none focus:ring-1 focus:ring-green-darker"
                  placeholder="URL (opcional): bitso.com"
                />
              )}
            </div>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full bg-surface-accent border border-outline rounded-md px-3 py-1.5 body-sm text-el-high focus:outline-none focus:ring-1 focus:ring-green-darker"
              placeholder="Descripcion breve (opcional)"
            />
            <div className="flex gap-2">
              <button onClick={handleAdd} disabled={!form.name} className="btn-primary contained px-4 py-1.5 rounded-md disabled:opacity-50">
                Guardar
              </button>
              <button onClick={() => { setAddType(null); setForm({ name: "", url: "", description: "" }); }} className="btn-sm text-el-mid hover:text-el-high cursor-pointer">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ConfigCard({ config, onDelete, onToggle }: {
  config: ResearchConfigEntry;
  onDelete: (id: number) => void;
  onToggle: (config: ResearchConfigEntry) => void;
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition ${
      config.enabled ? "border-outline bg-surface" : "border-outline/50 bg-surface/50 opacity-60"
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="body-sm text-el-high font-medium">{config.name}</span>
          {config.url && (
            <a href={config.url.startsWith("http") ? config.url : `https://${config.url}`} target="_blank" rel="noopener noreferrer" className="text-el-low hover:text-info-base">
              <Globe className="w-3 h-3" />
            </a>
          )}
        </div>
        {config.description && (
          <p className="label-lg text-el-low truncate">{config.description}</p>
        )}
      </div>
      <button onClick={() => onToggle(config)} className="text-el-low hover:text-el-high cursor-pointer p-1">
        {config.enabled ? <ToggleRight className="w-5 h-5 text-green-darker" /> : <ToggleLeft className="w-5 h-5" />}
      </button>
      <button onClick={() => onDelete(config.id)} className="text-el-low hover:text-error-base cursor-pointer p-1">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
