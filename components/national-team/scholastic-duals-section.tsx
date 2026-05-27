import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import {
  aauPanelClass,
  aauPanelDescClass,
  aauPanelHeaderClass,
  aauPanelTitleClass,
} from "@/components/national-team/aau-scholastic-theme"

export function ScholasticDualsSection({
  id,
  title,
  icon,
  description,
  children,
  className,
  headerClassName,
  contentClassName,
}: {
  id?: string
  title: ReactNode
  icon?: ReactNode
  description?: ReactNode
  children: ReactNode
  className?: string
  headerClassName?: string
  contentClassName?: string
}) {
  return (
    <article id={id} className={cn(aauPanelClass, id && "scroll-mt-28", className)}>
      <header className={cn(aauPanelHeaderClass, headerClassName)}>
        <h2 className={cn(aauPanelTitleClass, "flex items-center gap-2")}>
          {icon}
          {title}
        </h2>
        {description ? <p className={aauPanelDescClass}>{description}</p> : null}
      </header>
      <div className={cn("p-4 sm:p-5 md:p-6 text-sm text-white/85 leading-relaxed", contentClassName)}>
        {children}
      </div>
    </article>
  )
}

/** Re-export AAU theme tokens used across scholastic pages. */
export {
  aauLinkClass as scholasticLinkClass,
  aauCalloutClass as scholasticCalloutClass,
  aauInsetClass as scholasticInsetClass,
} from "@/components/national-team/aau-scholastic-theme"
