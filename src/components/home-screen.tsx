"use client"

import { motion } from "framer-motion"
import {
  Video,
  Camera,
  GraduationCap,
  GitCompareArrows,
  ArrowRight,
  Lock,
  Flame,
  Timer,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAppStore, MODES, type AppMode } from "@/lib/store"
import { cn } from "@/lib/utils"

const MODE_ICONS: Record<AppMode, React.ComponentType<{ className?: string }>> = {
  video: Video,
  photo: Camera,
  tutorial: GraduationCap,
  compare: GitCompareArrows,
}

const ACCENT_RING: Record<string, string> = {
  lime: "ring-lime-400/40 hover:ring-lime-400/70 hover:shadow-[0_0_40px_-12px_rgba(163,230,53,0.55)]",
  emerald:
    "ring-emerald-400/40 hover:ring-emerald-400/70 hover:shadow-[0_0_40px_-12px_rgba(52,211,153,0.5)]",
  amber:
    "ring-amber-400/40 hover:ring-amber-400/70 hover:shadow-[0_0_40px_-12px_rgba(245,158,11,0.5)]",
  orange:
    "ring-orange-400/40 hover:ring-orange-400/70 hover:shadow-[0_0_40px_-12px_rgba(249,115,22,0.5)]",
}

const ACCENT_ICON_BG: Record<string, string> = {
  lime: "bg-lime-400/15 text-lime-300",
  emerald: "bg-emerald-400/15 text-emerald-300",
  amber: "bg-amber-400/15 text-amber-300",
  orange: "bg-orange-400/15 text-orange-300",
}

export function HomeScreen() {
  const setView = useAppStore((s) => s.setView)

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#0a0e0a] text-white">
      {/* Background track lane motif */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, transparent 0, transparent 78px, #a3e635 78px, #a3e635 80px)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-lime-500/20 blur-[120px]"
      />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 pb-10 pt-8 sm:px-8">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-lime-400 text-black shadow-lg shadow-lime-400/30">
              <Flame className="size-6" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight sm:text-2xl">
                BLOCK<span className="text-lime-400">START</span> AI
              </h1>
              <p className="text-xs font-medium text-white/50 sm:text-sm">
                Sprint block-start technique coach
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 backdrop-blur">
            <Timer className="size-3.5 text-lime-400" />
            <span className="font-medium">Pose engine: MediaPipe</span>
          </div>
        </motion.header>

        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05 }}
          className="mt-10 sm:mt-14"
        >
          <Badge
            variant="secondary"
            className="mb-4 border-lime-400/30 bg-lime-400/10 text-lime-300 hover:bg-lime-400/15"
          >
            Live pose detection
          </Badge>
          <h2 className="max-w-2xl text-3xl font-black leading-[1.1] tracking-tight sm:text-5xl">
            Train your{" "}
            <span className="bg-gradient-to-r from-lime-300 to-emerald-400 bg-clip-text text-transparent">
              block start
            </span>{" "}
            with real-time skeleton tracking.
          </h2>
          <p className="mt-4 max-w-xl text-sm text-white/60 sm:text-base">
            Point your camera at the athlete and see a 33-point skeleton drawn
            over the live feed. Choose how you want to train below.
          </p>
        </motion.section>

        {/* Mode selection */}
        <section className="mt-10 sm:mt-12">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white/40">
              Select a mode
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {MODES.map((mode, idx) => {
              const Icon = MODE_ICONS[mode.id]
              const disabled = !mode.available
              return (
                <motion.button
                  key={mode.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 + idx * 0.07 }}
                  whileHover={disabled ? undefined : { y: -4 }}
                  whileTap={disabled ? undefined : { scale: 0.99 }}
                  onClick={() => mode.available && setView(mode.id)}
                  disabled={disabled}
                  aria-label={`${mode.title}${disabled ? " (coming soon)" : ""}`}
                  className={cn(
                    "group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left ring-1 transition-all sm:p-6",
                    disabled
                      ? "cursor-not-allowed opacity-60"
                      : "cursor-pointer",
                    ACCENT_RING[mode.accent],
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div
                      className={cn(
                        "flex size-12 items-center justify-center rounded-xl",
                        ACCENT_ICON_BG[mode.accent],
                      )}
                    >
                      <Icon className="size-6" strokeWidth={2.2} />
                    </div>
                    {disabled ? (
                      <Badge
                        variant="outline"
                        className="border-white/15 bg-white/5 text-white/50"
                      >
                        <Lock className="mr-1 size-3" />
                        Soon
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-lime-400/30 bg-lime-400/10 text-lime-300"
                      >
                        Ready
                      </Badge>
                    )}
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-bold tracking-tight">
                        {mode.title}
                      </h4>
                    </div>
                    <p className="text-xs font-medium uppercase tracking-wider text-white/40">
                      {mode.subtitle}
                    </p>
                  </div>

                  <p className="mt-2 text-sm leading-relaxed text-white/60">
                    {mode.description}
                  </p>

                  {!disabled && (
                    <div className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-lime-300">
                      Launch mode
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  )}
                </motion.button>
              )
            })}
          </div>
        </section>

        {/* Tips strip */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          {[
            {
              t: "Full body in frame",
              d: "Step back so head and feet are both visible.",
            },
            {
              t: "Good lighting",
              d: "Avoid strong backlight; keep the athlete well lit.",
            },
            {
              t: "Side profile",
              d: "A side angle gives the clearest block-set read.",
            },
          ].map((tip) => (
            <div
              key={tip.t}
              className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
            >
              <p className="text-sm font-semibold text-lime-300">{tip.t}</p>
              <p className="mt-1 text-xs text-white/50">{tip.d}</p>
            </div>
          ))}
        </motion.section>

        <footer className="mt-auto pt-10 text-center text-xs text-white/30">
          Built for the track · Web-based pose detection runs on-device
        </footer>
      </div>
    </div>
  )
}
