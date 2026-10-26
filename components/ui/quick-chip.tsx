/**
 * The pill filters the dark list pages share (/prospects/all, /college-commitments): one labelled
 * group per question, one pill per answer, the active pill gold.
 */
export function QuickGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-white/45">{label}</span>
      {/* One line per group on a phone, scrolling sideways, so the filters do not push the list a screen down. */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 sm:flex-wrap sm:overflow-visible">{children}</div>
    </div>
  )
}

export function QuickChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-[36px] shrink-0 whitespace-nowrap rounded-full border px-3.5 text-sm font-semibold transition-colors ${
        active ? "border-[#D3B574] bg-[#D3B574] text-[#0A1628]" : "border-white/20 text-white/75 hover:border-white/40 hover:text-white"
      }`}
    >
      {children}
    </button>
  )
}
