import Image from "next/image"

export function DashboardHeader() {
  return (
    <header className="glass-strong rounded-xl p-4 md:p-6 glow-gold">
      <div className="flex items-center justify-between gap-2 md:gap-4">
        <div className="flex items-center justify-center w-12 h-12 md:w-20 md:h-20 rounded-full bg-background/50 border-2 border-primary p-1 flex-shrink-0">
          <Image
            src="/nc-united-logo.png"
            alt="NC United Wrestling Logo"
            width={80}
            height={80}
            className="w-full h-full object-contain"
          />
        </div>

        <div className="flex-1 text-center min-w-0">
          <div className="text-3xl md:text-5xl font-bold text-primary mb-1 md:mb-2">2025</div>
          <h1 className="text-xl md:text-4xl font-bold text-balance leading-tight">
            <span className="text-primary">NC United</span> — <span className="font-bold">Super 32</span>
          </h1>
          <p className="text-xs md:text-base text-muted-foreground mt-0.5 md:mt-1">Real-Time Tournament Dashboard</p>
        </div>

        <div className="flex items-center justify-center w-12 h-12 md:w-20 md:h-20 rounded-lg bg-background/50 border-2 border-[#B31B1B] p-1 flex-shrink-0">
          <Image
            src="/super-32-logo.png"
            alt="Super 32 Logo"
            width={80}
            height={80}
            className="w-full h-full object-contain"
          />
        </div>
      </div>
    </header>
  )
}
