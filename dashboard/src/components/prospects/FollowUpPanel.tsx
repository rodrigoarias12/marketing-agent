import { useState, useEffect } from "react";
import { X, ExternalLink, Building2, Briefcase, MapPin, Clock, Send, MessageSquare, Check, Search } from "lucide-react";
import { StatusBadge } from "../shared/StatusBadge";
import { followUpProspect, updateProspect, getProspectResearch } from "../../api/client";
import type { Prospect, ProspectStatus, Research } from "../../types";

interface Props {
  prospect: Prospect;
  onClose: () => void;
  onRefresh: () => void;
}

export function FollowUpPanel({ prospect, onClose, onRefresh }: Props) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [linkedResearch, setLinkedResearch] = useState<Research[]>([]);

  useEffect(() => {
    getProspectResearch(prospect.id).then(setLinkedResearch).catch(() => {});
  }, [prospect.id]);

  const daysSinceUpdate = Math.floor(
    (Date.now() - new Date(prospect.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  const daysSinceFollowup = prospect.lastFollowupAt
    ? Math.floor((Date.now() - new Date(prospect.lastFollowupAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const handleFollowUp = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await followUpProspect(prospect.id, message);
      onRefresh();
    } catch (e) {
      console.error("Failed to follow up:", e);
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (status: ProspectStatus) => {
    await updateProspect(prospect.id, { status });
    onRefresh();
  };

  return (
    <div className="fixed inset-0 bg-black/20 flex justify-end z-50" onClick={onClose}>
      <div
        className="w-[420px] bg-surface border-l border-outline h-full overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-surface border-b border-outline px-5 py-4 flex items-center justify-between z-10">
          <div>
            <h3 className="title-lg text-el-high">{prospect.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <StatusBadge status={prospect.status} />
              {prospect.followupCount > 0 && (
                <span className="label-md text-el-low">{prospect.followupCount} follow-ups</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-el-low hover:text-el-high cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Info */}
          <div className="space-y-2.5">
            <DetailRow icon={Building2} label="Empresa" value={prospect.company} />
            <DetailRow icon={Briefcase} label="Rol" value={prospect.role} />
            <DetailRow icon={MapPin} label="Region" value={`${prospect.location} (${prospect.region})`} />
            <div className="flex items-center gap-4">
              <DetailRow icon={Clock} label="Hace" value={`${daysSinceUpdate} días`} />
              {daysSinceFollowup !== null && (
                <DetailRow icon={Send} label="Último follow-up" value={`hace ${daysSinceFollowup}d`} />
              )}
            </div>
          </div>

          {/* Status buttons */}
          <div>
            <label className="overline-sm text-el-low uppercase block mb-2">Estado</label>
            <div className="flex gap-2 flex-wrap">
              {(["pendiente", "aceptada", "rechazada", "dm_sent"] as ProspectStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={`px-3 py-1.5 rounded-md label-lg-w-semibold transition capitalize cursor-pointer ${
                    prospect.status === s
                      ? "bg-violet-lighter-ext text-violet-darker-ext ring-1 ring-violet-darker/40"
                      : "bg-overlay text-el-mid hover:bg-overlay-accent"
                  }`}
                >
                  {s.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Original message */}
          {prospect.messageSent && (
            <div>
              <label className="overline-sm text-el-low uppercase flex items-center gap-1 mb-2">
                <MessageSquare className="w-3 h-3" /> Mensaje enviado
              </label>
              <div className="bg-surface-accent border border-outline rounded-md p-3 body-sm text-el-mid whitespace-pre-wrap">
                {prospect.messageSent}
              </div>
            </div>
          )}

          {/* Follow-up section */}
          {prospect.status === "aceptada" && (
            <div className="border-t border-outline pt-5">
              <label className="overline-sm text-el-low uppercase flex items-center gap-1 mb-2">
                <Send className="w-3 h-3" /> Follow-up DM
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escribí el mensaje de follow-up..."
                className="w-full bg-surface-accent border border-outline rounded-md px-3 py-2.5 body-sm text-el-high placeholder:text-el-disabled resize-none h-32 focus:outline-none focus:ring-1 focus:ring-violet-darker"
              />
              <button
                onClick={handleFollowUp}
                disabled={!message.trim() || sending}
                className="btn-primary contained w-full mt-2 py-2.5 rounded-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <span>Guardando...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Marcar como DM Sent
                  </>
                )}
              </button>
            </div>
          )}

          {/* Linked Research */}
          {linkedResearch.length > 0 && (
            <div>
              <label className="overline-sm text-el-low uppercase flex items-center gap-1 mb-2">
                <Search className="w-3 h-3" /> Research vinculado
              </label>
              <div className="space-y-2">
                {linkedResearch.map((r) => (
                  <div key={r.id} className="bg-surface-accent border border-outline rounded-md p-3 space-y-1">
                    <h5 className="body-sm-w-md text-el-high">{r.title}</h5>
                    {r.summary && (
                      <p className="label-lg text-el-mid line-clamp-2">{r.summary}</p>
                    )}
                    {r.sourceUrl && (
                      <a
                        href={r.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 label-md text-info-base hover:text-info-dark"
                      >
                        <ExternalLink className="w-3 h-3" /> Fuente
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {prospect.notes && (
            <div>
              <label className="overline-sm text-el-low uppercase block mb-2">Notas</label>
              <div className="bg-surface-accent border border-outline rounded-md p-3 body-sm text-el-mid">
                {prospect.notes}
              </div>
            </div>
          )}

          {/* LinkedIn link */}
          {prospect.linkedinUrl && (
            <a
              href={prospect.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 body-sm text-info-base hover:text-info-dark"
            >
              <ExternalLink className="w-4 h-4" /> Ver perfil en LinkedIn
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-3.5 h-3.5 text-el-low mt-0.5 shrink-0" />
      <div>
        <div className="label-md text-el-low uppercase tracking-wider">{label}</div>
        <div className="body-sm text-el-high">{value}</div>
      </div>
    </div>
  );
}
