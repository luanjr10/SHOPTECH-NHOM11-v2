import { Gem } from "lucide-react";

const TIER_META: Record<string, { label: string; className: string }> = {
  dong: { label: "Đồng", className: "bg-amber-800/20 text-amber-500 border-amber-700/30" },
  bac: { label: "Bạc", className: "bg-slate-400/10 text-slate-300 border-slate-400/30" },
  vang: { label: "Vàng", className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" },
  kim_cuong: { label: "Kim Cương", className: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30" },
};

interface Props {
  tier: string;
  label?: string;
  className?: string;
}

export default function TierBadge({ tier, label, className = "" }: Props) {
  const meta = TIER_META[tier] ?? TIER_META.dong;

  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.className} ${className}`}
    >
      <Gem className="h-3 w-3" />
      {label ?? meta.label}
    </span>
  );
}
