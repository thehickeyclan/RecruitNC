import { HardLink } from "@/components/hard-link"
import { NC_UNITED_CODE, NC_UNITED_CODE_EVENT_EXCERPT, NC_UNITED_CODE_HREF } from "@/lib/nc-united-code"
import { cn } from "@/lib/utils"

type Variant = "light" | "dark" | "hub"

const variantClass: Record<Variant, string> = {
  light: "border-[#002147]/15 bg-gray-50 text-gray-800",
  dark: "border-[#B31B1B]/30 bg-[#B31B1B]/10 text-white/85",
  hub: "border-[#CBAF5D]/30 bg-black/20 text-white/85",
}

const linkClass: Record<Variant, string> = {
  light: "font-semibold text-[#003366] hover:text-[#B31B1B] underline underline-offset-2",
  dark: "font-semibold text-[#FF7070] hover:text-white underline underline-offset-2",
  hub: "font-semibold text-[#CBAF5D] hover:text-white underline underline-offset-2",
}

const bulletClass: Record<Variant, string> = {
  light: "text-[#B31B1B]",
  dark: "text-[#FF7070]",
  hub: "text-[#CBAF5D]",
}

export function NcUnitedCodeCallout({ variant = "light", className }: { variant?: Variant; className?: string }) {
  return (
    <div className={cn("rounded-lg border px-4 py-4 space-y-3 text-sm leading-relaxed", variantClass[variant], className)}>
      <div>
        <p className="font-bold text-inherit">{NC_UNITED_CODE.title}</p>
        <p className="mt-1 opacity-90">{NC_UNITED_CODE.tagline}</p>
      </div>
      <ul className="space-y-2">
        {NC_UNITED_CODE_EVENT_EXCERPT.map((line) => (
          <li key={line} className="flex gap-2">
            <span className={cn("font-bold shrink-0", bulletClass[variant])}>•</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
      <p>
        <HardLink href={NC_UNITED_CODE_HREF} className={linkClass[variant]}>
          Read the full NC United Code →
        </HardLink>
      </p>
    </div>
  )
}
