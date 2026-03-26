const PLATFORMS: Record<string, { label: string; cls: string }> = {
  x: { label: "\ud835\udd4f", cls: "bg-overlay-accent text-el-high" },
  twitter: { label: "\ud835\udd4f", cls: "bg-overlay-accent text-el-high" },
  linkedin: { label: "in", cls: "bg-info-lighter-ext text-info-dark" },
  tiktok: { label: "\u266a", cls: "bg-error-lighter-ext text-error-dark" },
  youtube: { label: "\u25b6", cls: "bg-error-lighter-ext text-error-dark" },
};

export function PlatformIcon({ platform }: { platform: string }) {
  const p = PLATFORMS[platform.toLowerCase()] ?? { label: platform[0] ?? "?", cls: "bg-overlay text-el-mid" };
  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg title-sm ${p.cls}`}>
      {p.label}
    </span>
  );
}
