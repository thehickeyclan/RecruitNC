import Image from "next/image"
import { tocDisplayClass } from "@/components/toc/toc-theme"
import type { TocConfirmedCollege } from "@/lib/toc/confirmed-colleges"

type Props = {
  colleges: TocConfirmedCollege[]
}

/** Static, confirmed-only college strip — no ticker until the field is large enough to warrant it. */
export function TocCollegeAttendees({ colleges }: Props) {
  if (colleges.length === 0) return null

  return (
    <div className="mt-12 pt-10 border-t border-white/12">
      <h3 className={`text-2xl md:text-3xl text-white ${tocDisplayClass()}`}>
        College programs attending
      </h3>
      <p className="mt-2 text-sm text-white/60 max-w-xl">
        These programs are confirmed for attendance at the Tournament of Champions — coaches and staff on site for
        the weekend.
      </p>

      <ul className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5 list-none p-0 m-0">
        {colleges.map((college) => (
          <li key={college.name}>
            <div className="flex h-full flex-col items-center justify-center rounded-sm bg-white px-4 py-6 shadow-[0_8px_24px_rgba(0,0,0,0.18)] ring-1 ring-black/5">
              <div className="relative h-14 w-full max-w-[140px]">
                <Image
                  src={college.logoUrl}
                  alt={`${college.name} logo`}
                  fill
                  className="object-contain"
                  sizes="140px"
                  unoptimized
                />
              </div>
              <span className="mt-4 text-center text-[11px] font-medium uppercase tracking-[0.12em] text-[#0B1D3A]/65 leading-snug">
                {college.name}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
