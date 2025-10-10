import { Sparkles } from "lucide-react"

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative size-8 bg-gradient-to-br from-primary to-chart-2 rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
        <Sparkles className="size-5 text-white" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-chart-2 rounded-lg blur-sm opacity-50 -z-10" />
      </div>
      <span className="text-xl font-bold bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
        ezsolvy
      </span>
    </div>
  )
}
