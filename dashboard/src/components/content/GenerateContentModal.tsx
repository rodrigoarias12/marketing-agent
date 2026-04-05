import { useEffect, useState } from "react";
import { X, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { getResearchList, generateContent } from "../../api/client";
import type { Research } from "../../types";

export function GenerateContentModal({ onClose, onComplete }: {
  onClose: () => void;
  onComplete: () => void;
}) {
  const [research, setResearch] = useState<Research[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ posts: Array<{ number: number; platform: string; type: string }> } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [postCount, setPostCount] = useState(3);
  const [platforms, setPlatforms] = useState<string[]>(["LinkedIn", "X (Twitter)"]);

  useEffect(() => {
    getResearchList().then((data) => {
      setResearch(data);
      // Auto-select recent entries
      const recent = data.slice(0, 5);
      setSelected(new Set(recent.map((r) => r.id)));
      setLoading(false);
    });
  }, []);

  const toggleResearch = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const togglePlatform = (p: string) => {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await generateContent({
        date,
        researchIds: Array.from(selected),
        platforms,
        postCount,
      });
      setResult(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-surface border border-outline rounded-xl w-full max-w-lg p-6 space-y-4 shadow-high max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-darker" />
            <h3 className="title-lg text-el-high">Generar Contenido</h3>
          </div>
          <button onClick={onClose} className="text-el-low hover:text-el-high cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        {result ? (
          <div className="space-y-4">
            <div className="text-center py-4">
              <CheckCircle2 className="w-10 h-10 text-violet-darker mx-auto mb-2" />
              <p className="title-sm text-el-high">{result.posts.length} posts generados</p>
              <p className="label-lg text-el-low mt-1">Para la fecha {date}</p>
            </div>
            <div className="space-y-1">
              {result.posts.map((p) => (
                <div key={p.number} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-overlay">
                  <span className="label-md text-el-low">#{p.number}</span>
                  <span className="body-sm text-el-high">{p.type}</span>
                  <span className="label-lg text-violet-darker ml-auto">{p.platform}</span>
                </div>
              ))}
            </div>
            <button onClick={() => { onComplete(); onClose(); }} className="btn-primary contained w-full py-2.5 rounded-md">
              Ver en Content
            </button>
          </div>
        ) : (
          <>
            {/* Config */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-md text-el-low uppercase block mb-1">Fecha</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-surface-accent border border-outline rounded-md px-3 py-1.5 body-sm text-el-high focus:outline-none focus:ring-1 focus:ring-violet-darker"
                  />
                </div>
                <div>
                  <label className="label-md text-el-low uppercase block mb-1">Cantidad de Posts</label>
                  <select
                    value={postCount}
                    onChange={(e) => setPostCount(Number(e.target.value))}
                    className="w-full bg-surface-accent border border-outline rounded-md px-3 py-1.5 body-sm text-el-high focus:outline-none focus:ring-1 focus:ring-violet-darker cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label-md text-el-low uppercase block mb-1">Plataformas</label>
                <div className="flex gap-2">
                  {["LinkedIn", "X (Twitter)"].map((p) => (
                    <button
                      key={p}
                      onClick={() => togglePlatform(p)}
                      className={`px-3 py-1.5 rounded-lg label-lg transition cursor-pointer ${
                        platforms.includes(p)
                          ? "bg-violet-lighter-ext text-violet-darker-ext ring-1 ring-violet-darker/30"
                          : "bg-overlay text-el-mid"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label-md text-el-low uppercase block mb-1">Research base ({selected.size} seleccionados)</label>
                <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar border border-outline rounded-lg p-2">
                  {loading ? (
                    <p className="text-center text-el-low body-sm py-4">Cargando...</p>
                  ) : research.length === 0 ? (
                    <p className="text-center text-el-low body-sm py-4">No hay research disponible. Ejecuta el Research Agent primero.</p>
                  ) : (
                    research.map((r) => (
                      <label
                        key={r.id}
                        className={`flex items-start gap-2 px-3 py-2 rounded-lg cursor-pointer transition ${
                          selected.has(r.id) ? "bg-violet-lighter-ext/40" : "hover:bg-overlay"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(r.id)}
                          onChange={() => toggleResearch(r.id)}
                          className="accent-violet-darker mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="body-sm text-el-high">{r.title}</span>
                          {r.brandName && <span className="label-lg text-violet-darker ml-2">{r.brandName}</span>}
                          {r.summary && <p className="label-lg text-el-low truncate">{r.summary}</p>}
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-error-base/10 border border-error-base/30 rounded-lg px-4 py-3">
                <p className="body-sm text-error-base">{error}</p>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={generating || selected.size === 0 || platforms.length === 0}
              className="btn-primary contained w-full py-2.5 rounded-md disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generar {postCount} Posts
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
