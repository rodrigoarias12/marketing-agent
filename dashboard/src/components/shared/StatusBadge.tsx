const COLORS: Record<string, string> = {
  draft: "bg-overlay text-el-mid",
  approved: "bg-warning-lighter-ext text-warning-dark",
  publishing: "bg-info-lighter-ext text-info-dark animate-pulse",
  published: "bg-success-lighter-ext text-success-dark",
  failed: "bg-error-lighter-ext text-error-dark",
  pendiente: "bg-overlay text-el-mid",
  aceptada: "bg-success-lighter-ext text-success-dark",
  rechazada: "bg-error-lighter-ext text-error-dark",
  dm_sent: "bg-info-lighter-ext text-info-dark",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = COLORS[status.toLowerCase()] ?? "bg-overlay text-el-mid";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full label-lg-w-semibold capitalize ${cls}`}>
      {status.replace("_", " ")}
    </span>
  );
}
