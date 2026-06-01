type PullQuoteProps = {
  children: React.ReactNode
  attribution?: string
}

export function PullQuote({ children, attribution }: PullQuoteProps) {
  return (
    <blockquote className="my-8 border-l-4 border-[#D3B574] bg-slate-50 py-4 pl-5 pr-4 md:pl-6">
      <p className="my-0 text-lg font-semibold leading-relaxed text-[#13294B] md:text-xl">{children}</p>
      {attribution ? <footer className="mt-3 text-sm font-medium text-slate-600">— {attribution}</footer> : null}
    </blockquote>
  )
}
