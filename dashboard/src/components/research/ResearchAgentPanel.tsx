import { useState, useEffect } from "react";
import { X, Bot, Loader2, CheckCircle2, AlertCircle, Search } from "lucide-react";
import { getResearchConfigs, runResearchAgent } from "../../api/client";
import type { ResearchConfigEntry } from "../../types";

interface ProgressEvent {
  phase: string;
  detail?: string;
  count?: number;
  titles?: string[];
}

export function ResearchAgentPanel({ onClose, onComplete }: {
  onClose: () => void;
  onComplete: () => void;
}) {
  const [configs, setConfigs] = useState<ResearchConfigEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getResearchConfigs().then((data) => {
      setConfigs(data.filter((c) => c.enabled));
      setLoading(false);
    });
  }, []);

  const competitors = configs.filter((c) => c.type === "competitor");
  const topics = configs.filter((c) => c.type === "industry");

  const handleRun = async () => {
    setRunning(true);
    setEvents([]);
    setError(null);

    try {
      await runResearchAgent((event) => {
        setEvents((prev) => [...prev, event]);
        if (event.phase === "complete" || event.phase === "done") {
          setDone(true);
        }
        if (event.phase === "error") {
          setError(event.detail ?? "Error desconocido");
        }
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  const lastEvent = events[events.length - 1];
  const savedCount = events.filter((e) => e.phase === "saving").length;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-surface border border-outline rounded-xl w-full max-w-lg p-6 space-y-4 shadow-high max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-green-darker" />
            <h3 className="title-lg text-el-high">Research Agent</h3>
          </div>
          <button onClick={onClose} className="text-el-low hover:text-el-high cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        {loading ? (
          <div className="text-center py-10 text-el-low body-sm">Cargando configuracion...</div>
        ) : !running && !done ? (
          <>
            {/* Pre-run summary */}
            <div className="space-y-3">
              {competitors.length > 0 && (
                <div>
                  <p className="label-md text-el-low uppercase mb-1">Competidores a investigar</p>
                  <div className="flex flex-wrap gap-1.5">
                    {competitors.map((c) => (
                      <span key={c.id} className="label-lg px-2.5 py-1 rounded-md bg-green-lighter-ext text-green-darker-ext">
                        {c.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {topics.length > 0 && (
                <div>
                  <p className="label-md text-el-low uppercase mb-1">Temas de industria</p>
                  <div className="flex flex-wrap gap-1.5">
                    {topics.map((c) => (
                      <span key={c.id} className="label-lg px-2.5 py-1 rounded-md bg-overlay text-el-mid">
                        {c.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {configs.length === 0 && (
                <p className="body-sm text-el-mid py-4">No hay competidores ni temas configurados. Usa el boton de Config para agregar.</p>
              )}
            </div>

            <button
              onClick={handleRun}
              disabled={configs.length === 0}
              className="btn-primary contained w-full py-2.5 rounded-md disabled:opacity-50"
            >
              Iniciar Investigacion
            </button>
          </>
        ) : (
          <>
            {/* Progress / Results */}
            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
              {events.map((event, i) => (
                <div key={i} className="flex items-start gap-2 py-1">
                  {event.phase === "searching" && <Search className="w-3.5 h-3.5 text-info-base mt-0.5 shrink-0" />}
                  {event.phase === "saving" && <CheckCircle2 className="w-3.5 h-3.5 text-green-darker mt-0.5 shrink-0" />}
                  {event.phase === "starting" && <Loader2 className="w-3.5 h-3.5 text-el-low mt-0.5 shrink-0 animate-spin" />}
                  {event.phase === "error" && <AlertCircle className="w-3.5 h-3.5 text-error-base mt-0.5 shrink-0" />}
                  {(event.phase === "complete" || event.phase === "done") && <CheckCircle2 className="w-3.5 h-3.5 text-green-darker mt-0.5 shrink-0" />}
                  <span className="label-lg text-el-mid">
                    {event.phase === "starting" && event.detail}
                    {event.phase === "searching" && `Buscando: ${event.detail}`}
                    {event.phase === "saving" && `Guardado: ${event.detail}`}
                    {event.phase === "done" && event.detail}
                    {event.phase === "complete" && `${event.count} hallazgos guardados`}
                    {event.phase === "error" && event.detail}
                  </span>
                </div>
              ))}

              {running && !done && (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 className="w-4 h-4 text-green-darker animate-spin" />
                  <span className="body-sm text-el-mid">
                    {lastEvent?.phase === "searching" ? "Analizando resultados..." : "Procesando..."}
                  </span>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-error-base/10 border border-error-base/30 rounded-lg px-4 py-3">
                <p className="body-sm text-error-base">{error}</p>
              </div>
            )}

            {done && (
              <div className="space-y-3 pt-2 border-t border-outline">
                <div className="text-center">
                  <p className="title-sm text-green-darker">{savedCount} hallazgos guardados</p>
                  <p className="label-lg text-el-low mt-1">Los resultados estan disponibles en la seccion Research</p>
                </div>
                <button
                  onClick={() => { onComplete(); onClose(); }}
                  className="btn-primary contained w-full py-2.5 rounded-md"
                >
                  Ver Resultados
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
