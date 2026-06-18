"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft,
  RefreshCw,
  Loader2,
  SwitchCamera,
  Eye,
  EyeOff,
  FlipHorizontal,
  AlertTriangle,
  CameraOff,
  Activity,
  ScanFace,
  Lock,
  Video as VideoIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAppStore } from "@/lib/store"
import { getPoseDetector } from "@/lib/pose-detector"
import { drawSkeleton, countVisibleLandmarks } from "@/lib/pose-drawing"
import { cn } from "@/lib/utils"

type Status =
  | "loading-model"
  | "requesting-camera"
  | "running"
  | "error"
  | "denied"
  | "insecure"

interface FacingState {
  facingMode: "user" | "environment"
  mirror: boolean
}

export function VideoMode() {
  const goHome = useAppStore((s) => s.goHome)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const detector = useRef(getPoseDetector())
  const fpsBufRef = useRef<number[]>([])
  const lastDetectTsRef = useRef<number>(0)
  const loopRef = useRef<() => void>(() => {})

  const [status, setStatus] = useState<Status>("loading-model")
  const [statusMsg, setStatusMsg] = useState("Loading pose model…")
  const [error, setError] = useState<string>("")
  const [facing, setFacing] = useState<FacingState>({
    facingMode: "environment",
    mirror: false,
  })
  const [showSkeleton, setShowSkeleton] = useState(true)
  const [mirrorOverride, setMirrorOverride] = useState<boolean | null>(null)
  const [fps, setFps] = useState(0)
  const [visibleCount, setVisibleCount] = useState(0)
  const [personDetected, setPersonDetected] = useState(false)
  const [videoAspect, setVideoAspect] = useState<number>(16 / 9)
  const [trackInfo, setTrackInfo] = useState<string>("")

  const mirror = mirrorOverride ?? facing.mirror

  // ---- Camera ----
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const startCamera = useCallback(
    async (facingMode: "user" | "environment") => {
      stopCamera()

      // Secure-context guard: getUserMedia only exists on HTTPS or localhost.
      // Hitting a plain-HTTP URL on mobile leaves navigator.mediaDevices
      // undefined — surface that clearly instead of crashing.
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== "function" ||
        !window.isSecureContext
      ) {
        setStatus("insecure")
        setError(
          "Camera access needs a secure (HTTPS) connection or localhost. On mobile, open the HTTPS preview URL rather than the raw HTTP IP address.",
        )
        return
      }

      setStatus("requesting-camera")
      setStatusMsg("Requesting camera access…")

      // Try the preferred facingMode first, then fall back to a constraint-free
      // request (some laptops reject `facingMode: environment` even as `ideal`).
      const attempts: MediaStreamConstraints[] = [
        {
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        },
        { video: true, audio: false },
      ]

      let stream: MediaStream | null = null
      let lastErr: unknown = null
      for (const constraints of attempts) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints)
          break
        } catch (err) {
          lastErr = err
          // Only retry on OverconstrainedError / NotFound; bail on permission.
          const name = (err as DOMException)?.name
          if (name === "NotAllowedError" || name === "SecurityError") break
        }
      }

      if (!stream) {
        const e = lastErr as DOMException
        if (
          e?.name === "NotAllowedError" ||
          e?.name === "SecurityError"
        ) {
          setStatus("denied")
          setError(
            "Camera permission was denied. Allow camera access in your browser settings to use live pose detection.",
          )
        } else if (e?.name === "NotFoundError") {
          setStatus("error")
          setError("No camera device was found on this device.")
        } else {
          setStatus("error")
          setError(e?.message || "Unable to start the camera.")
        }
        return
      }

      streamRef.current = stream

      // Surface which camera/resolution we actually got (handy for debugging).
      const track = stream.getVideoTracks()[0]
      if (track) {
        const s = track.getSettings()
        setTrackInfo(
          `${s.width ?? "?"}×${s.height ?? "?"}` +
            (s.facingMode ? ` · ${s.facingMode}` : ""),
        )
      }

      const video = videoRef.current
      if (!video) return

      // Attach + play. Retry once if play() rejects (common on first load
      // before the element has finished laying out).
      video.srcObject = stream
      try {
        await video.play()
      } catch {
        try {
          await new Promise((r) => setTimeout(r, 120))
          await video.play()
        } catch {
          /* surfaced as black-frame / stalled below */
        }
      }

      // Wait for the first frame metadata so we know real dimensions.
      if (!video.videoWidth) {
        await new Promise<void>((resolve) => {
          const handler = () => {
            video.removeEventListener("loadedmetadata", handler)
            resolve()
          }
          video.addEventListener("loadedmetadata", handler)
          // Safety timeout — don't hang forever if the track stalls.
          setTimeout(resolve, 3000)
        })
      }

      setVideoAspect(
        video.videoWidth && video.videoHeight
          ? video.videoWidth / video.videoHeight
          : 16 / 9,
      )
      setStatus("running")
    },
    [stopCamera],
  )

  // ---- Detection loop ----
  const loop = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) {
      rafRef.current = requestAnimationFrame(() => loopRef.current())
      return
    }

    // Only run when we actually have a frame and the detector is ready.
    if (
      video.readyState >= 2 &&
      video.videoWidth > 0 &&
      detector.current.isReady
    ) {
      // Keep canvas buffer aligned to the video resolution.
      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
      }
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        const now = performance.now()
        const result = detector.current.detect(video, now)
        const landmarks = result?.landmarks?.[0]

        if (showSkeleton) {
          drawSkeleton(ctx, landmarks, {
            width: canvas.width,
            height: canvas.height,
            minVisibility: 0.5,
          })
        }

        const count = countVisibleLandmarks(landmarks, 0.5)
        setVisibleCount(count)
        setPersonDetected((result?.landmarks?.length ?? 0) > 0)

        // FPS rolling average.
        if (lastDetectTsRef.current > 0) {
          const dt = now - lastDetectTsRef.current
          fpsBufRef.current.push(1000 / dt)
          if (fpsBufRef.current.length > 20) fpsBufRef.current.shift()
          const avg =
            fpsBufRef.current.reduce((a, b) => a + b, 0) /
            fpsBufRef.current.length
          setFps(Math.round(avg))
        }
        lastDetectTsRef.current = now
      }
    }

    // Prefer requestVideoFrameCallback for tight sync with decoded frames.
    const v = video as HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: () => void) => number
    }
    if (typeof v.requestVideoFrameCallback === "function") {
      rafRef.current = v.requestVideoFrameCallback(() => loopRef.current())
    } else {
      rafRef.current = requestAnimationFrame(() => loopRef.current())
    }
  }, [showSkeleton])

  // Keep the rescheduling ref in sync with the latest loop closure.
  useEffect(() => {
    loopRef.current = loop
  }, [loop])

  // ---- Boot: load model + camera ----
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setStatus("loading-model")
        setStatusMsg("Loading pose model…")
        await detector.current.load((msg) => {
          if (!cancelled) setStatusMsg(msg)
        })
        if (cancelled) return
        await startCamera(facing.facingMode)
        if (cancelled) return
      } catch (err) {
        if (cancelled) return
        setStatus("error")
        setError(
          (err as Error).message ||
            "Failed to load the pose detection model. Check your connection.",
        )
      }
    })()

    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      stopCamera()
    }
  }, [])

  // Start / restart the loop whenever it changes.
  useEffect(() => {
    if (status !== "running") return
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    lastDetectTsRef.current = 0
    fpsBufRef.current = []
    rafRef.current = requestAnimationFrame(() => loopRef.current())
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [status])

  // ---- Actions ----
  const handleSwitchCamera = useCallback(async () => {
    const next: FacingState =
      facing.facingMode === "environment"
        ? { facingMode: "user", mirror: true }
        : { facingMode: "environment", mirror: false }
    setFacing(next)
    setMirrorOverride(null)
    await startCamera(next.facingMode)
  }, [facing.facingMode, startCamera])

  const handleRetry = useCallback(async () => {
    setError("")
    if (!detector.current.isReady) {
      try {
        setStatus("loading-model")
        setStatusMsg("Loading pose model…")
        await detector.current.load((m) => setStatusMsg(m))
      } catch (err) {
        setStatus("error")
        setError((err as Error).message)
        return
      }
    }
    await startCamera(facing.facingMode)
  }, [facing.facingMode, startCamera])

  const isLoading =
    status === "loading-model" || status === "requesting-camera"
  const isError =
    status === "error" || status === "denied" || status === "insecure"

  return (
    <div className="relative flex min-h-dvh flex-col bg-black text-white">
      {/* ---- Camera stage ---- */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {/* Video + canvas share ONE mirrored wrapper so the skeleton always
            aligns with the feed. We never toggle visibility on the <video>
            (some browsers stop decoding frames to a hidden video element and
            then render black even after it becomes visible). */}
        <div
          className="relative h-full w-full"
          style={{
            maxHeight: "100dvh",
            transform: mirror ? "scaleX(-1)" : undefined,
          }}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="absolute inset-0 h-full w-full object-cover bg-black"
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>

        {/* Scanline / framing guide overlay */}
        <AnimatePresence>
          {status === "running" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0"
            >
              {/* Center framing brackets */}
              <div className="absolute left-1/2 top-1/2 size-40 -translate-x-1/2 -translate-y-1/2 sm:size-56">
                <span className="absolute left-0 top-0 size-8 border-l-2 border-t-2 border-lime-400/70" />
                <span className="absolute right-0 top-0 size-8 border-r-2 border-t-2 border-lime-400/70" />
                <span className="absolute bottom-0 left-0 size-8 border-b-2 border-l-2 border-lime-400/70" />
                <span className="absolute bottom-0 right-0 size-8 border-b-2 border-r-2 border-lime-400/70" />
              </div>
              {/* Vignette */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.45) 100%)",
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top HUD */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 p-4">
          <div className="mx-auto flex max-w-5xl items-start justify-between gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={goHome}
              className="pointer-events-auto border-white/15 bg-black/50 text-white backdrop-blur hover:bg-black/70"
            >
              <ArrowLeft className="size-4" />
              Modes
            </Button>

            {status === "running" && (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <HudChip
                  icon={<Activity className="size-3.5" />}
                  label={`${fps} FPS`}
                />
                <HudChip
                  icon={<ScanFace className="size-3.5" />}
                  label={`${visibleCount}/33 pts`}
                  tone={personDetected ? "lime" : "muted"}
                />
                {trackInfo && (
                  <HudChip
                    icon={<VideoIcon className="size-3.5" />}
                    label={trackInfo}
                  />
                )}
                <HudChip
                  icon={
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        personDetected
                          ? "bg-lime-400"
                          : "bg-white/40",
                      )}
                    />
                  }
                  label={personDetected ? "Tracking" : "Searching"}
                  tone={personDetected ? "lime" : "muted"}
                />
              </div>
            )}
          </div>
        </div>

        {/* Bottom controls */}
        {status === "running" && (
          <div className="absolute inset-x-0 bottom-0 z-20 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto flex max-w-md items-center justify-center gap-3">
              <ControlButton
                label={showSkeleton ? "Hide skeleton" : "Show skeleton"}
                onClick={() => setShowSkeleton((v) => !v)}
                active={showSkeleton}
              >
                {showSkeleton ? (
                  <Eye className="size-5" />
                ) : (
                  <EyeOff className="size-5" />
                )}
              </ControlButton>

              <ControlButton
                label={mirror ? "Unmirror" : "Mirror"}
                onClick={() => setMirrorOverride((v) => !mirror)}
                active={mirror}
              >
                <FlipHorizontal className="size-5" />
              </ControlButton>

              <ControlButton
                label={
                  facing.facingMode === "environment"
                    ? "Front camera"
                    : "Rear camera"
                }
                onClick={handleSwitchCamera}
              >
                <SwitchCamera className="size-5" />
              </ControlButton>
            </div>
          </div>
        )}

        {/* Loading overlay — opaque so we never flash an empty video stage. */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black"
            >
              <div className="relative">
                <div className="size-16 rounded-full border-2 border-white/10" />
                <Loader2 className="absolute inset-0 m-auto size-7 animate-spin text-lime-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-white">
                  {statusMsg}
                </p>
                <p className="mt-1 text-xs text-white/50">
                  First load fetches the on-device pose model (~a few MB).
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error / permission / insecure-context overlay */}
        <AnimatePresence>
          {isError && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 flex items-center justify-center bg-black/95 p-6 backdrop-blur"
            >
              <div className="max-w-sm text-center">
                <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-red-500/15 text-red-400">
                  {status === "denied" ? (
                    <CameraOff className="size-7" />
                  ) : status === "insecure" ? (
                    <Lock className="size-7" />
                  ) : (
                    <AlertTriangle className="size-7" />
                  )}
                </div>
                <h3 className="text-lg font-bold">
                  {status === "denied"
                    ? "Camera access needed"
                    : status === "insecure"
                      ? "Secure connection required"
                      : "Something went wrong"}
                </h3>
                <p className="mt-2 text-sm text-white/60">{error}</p>
                <div className="mt-6 flex justify-center gap-3">
                  <Button
                    variant="outline"
                    onClick={goHome}
                    className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                  >
                    <ArrowLeft className="size-4" />
                    Back
                  </Button>
                  <Button
                    onClick={handleRetry}
                    className="bg-lime-400 text-black hover:bg-lime-300"
                  >
                    <RefreshCw className="size-4" />
                    Retry
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function HudChip({
  icon,
  label,
  tone = "default",
}: {
  icon: React.ReactNode
  label: string
  tone?: "default" | "lime" | "muted"
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold backdrop-blur",
        tone === "lime" &&
          "border-lime-400/40 bg-lime-400/15 text-lime-200",
        tone === "muted" &&
          "border-white/15 bg-black/50 text-white/60",
        tone === "default" &&
          "border-white/15 bg-black/50 text-white/90",
      )}
    >
      {icon}
      {label}
    </div>
  )
}

function ControlButton({
  children,
  label,
  onClick,
  active,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-14 items-center justify-center rounded-full border backdrop-blur transition-all active:scale-95",
        active
          ? "border-lime-400/50 bg-lime-400/20 text-lime-300"
          : "border-white/15 bg-black/50 text-white hover:bg-black/70",
      )}
    >
      {children}
    </button>
  )
}
