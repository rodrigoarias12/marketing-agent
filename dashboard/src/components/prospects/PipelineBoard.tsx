import { useState } from "react";
import { StatusBadge } from "../shared/StatusBadge";
import { ExternalLink, Building2, Clock, MessageSquare, Send } from "lucide-react";
import type { Prospect, PipelineData, ProspectStatus } from "../../types";
import { updateProspect } from "../../api/client";
import { FollowUpPanel } from "./FollowUpPanel";

interface Props {
  pipeline: PipelineData;
  onRefresh: () => void;
}

const COLUMNS: { key: keyof PipelineData; label: string; accent?: boolean }[] = [
  { key: "pendiente", label: "Pendiente" },
  { key: "aceptada", label: "Aceptada", accent: true },
  { key: "dm_sent", label: "DM Sent" },
  { key: "rechazada", label: "Rechazada" },
];

export function PipelineBoard({ pipeline, onRefresh }: Props) {
  const [selected, setSelected] = useState<Prospect | null>(null);

  const handleStatusChange = async (prospect: Prospect, newStatus: ProspectStatus) => {
    await updateProspect(prospect.id, { status: newStatus });
    onRefresh();
  };

  return (
    <>
      <div className="grid grid-cols-4 gap-4 h-full min-h-[400px]">
        {COLUMNS.map((col) => {
          const items = pipeline[col.key];
          return (
            <div key={col.key} className="flex flex-col">
              {/* Column header */}
              <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg border border-outline ${
                col.accent ? "bg-violet-lighter" : "bg-surface-accent"
              }`}>
                <span className={`label-lg-w-semibold ${col.accent ? "text-violet-darker-ext" : "text-el-mid"}`}>
                  {col.label}
                </span>
                <span className={`label-lg-w-semibold px-1.5 py-0.5 rounded-full text-xs ${
                  col.accent ? "bg-violet-darker-ext text-white" : "bg-overlay text-el-low"
                }`}>
                  {items.length}
                </span>
              </div>

              {/* Column body */}
              <div className="flex-1 border border-t-0 border-outline rounded-b-lg bg-surface/50 p-2 space-y-2 overflow-y-auto custom-scrollbar">
                {items.length === 0 && (
                  <div className="text-center text-el-disabled label-lg py-8">Sin prospectos</div>
                )}
                {items.map((prospect) => (
                  <PipelineCard
                    key={prospect.id}
                    prospect={prospect}
                    isAccepted={col.key === "aceptada"}
                    onClick={() => setSelected(prospect)}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <FollowUpPanel
          prospect={selected}
          onClose={() => setSelected(null)}
          onRefresh={() => {
            setSelected(null);
            onRefresh();
          }}
        />
      )}
    </>
  );
}

function PipelineCard({ prospect, isAccepted, onClick, onStatusChange }: {
  prospect: Prospect;
  isAccepted: boolean;
  onClick: () => void;
  onStatusChange: (p: Prospect, s: ProspectStatus) => void;
}) {
  const daysSinceUpdate = Math.floor(
    (Date.now() - new Date(prospect.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div
      onClick={onClick}
      className={`bg-surface border rounded-lg p-3 cursor-pointer transition hover:shadow-mid group ${
        isAccepted
          ? "border-violet-darker/40 hover:border-violet-darker"
          : "border-outline hover:border-outline-accent"
      }`}
    >
      <div className="flex items-start justify-between mb-1.5">
        <span className="title-sm text-el-high leading-tight">{prospect.name}</span>
        {prospect.linkedinUrl && (
          <a
            href={prospect.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-info-base hover:text-info-dark opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      <div className="flex items-center gap-1.5 mb-2">
        <Building2 className="w-3 h-3 text-el-low shrink-0" />
        <span className="label-lg text-el-mid truncate">{prospect.company}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-el-low">
          <Clock className="w-3 h-3" />
          <span className="label-md">{daysSinceUpdate}d</span>
        </div>

        {prospect.messageSent && (
          <MessageSquare className="w-3 h-3 text-el-low" />
        )}

        {isAccepted && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-lighter text-violet-darker-ext label-md hover:bg-violet-darker hover:text-white transition"
          >
            <Send className="w-3 h-3" /> Follow up
          </button>
        )}
      </div>
    </div>
  );
}
