import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import {
  hubSectionDescClass,
  hubSectionHeadingClass,
  hubSectionTitleClass,
} from "@/components/national-team/nhsca-hub-theme"

export function NhscaHubSection({
  id,
  title,
  description,
  children,
  className,
}: {
  id?: string
  title: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section id={id} className={cn("scroll-mt-8", className)}>
      <div className={hubSectionHeadingClass}>
        <h2 className={hubSectionTitleClass}>{title}</h2>
        {description ? <p className={hubSectionDescClass}>{description}</p> : null}
      </div>
      {children}
    </section>
  )
}
