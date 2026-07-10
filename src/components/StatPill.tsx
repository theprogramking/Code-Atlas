interface StatPillProps {
  label: string;
  value: string | number;
}

export function StatPill({ label, value }: StatPillProps) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-[11px] text-slate-200">
      <span className="font-semibold text-slate-100">{value}</span>
      <span className="text-slate-500">{label}</span>
    </div>
  );
}
