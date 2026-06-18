import {
  POSE_CONNECTIONS,
  KEY_JOINTS,
} from "./pose-connections"
import type { NormalizedLandmark } from "@mediapipe/tasks-vision"

export interface DrawSkeletonOptions {
  /** Width of the canvas (drawing buffer) in pixels. */
  width: number
  /** Height of the canvas (drawing buffer) in pixels. */
  height: number
  /** Minimum landmark visibility (0..1) to draw a bone / joint. */
  minVisibility?: number
}

// Part -> stroke color. Lime/emerald skeleton on dark video for an athletic look.
const PART_COLORS: Record<string, string> = {
  torso: "#a3e635",
  leftArm: "#34d399",
  rightArm: "#34d399",
  leftHand: "#6ee7b7",
  rightHand: "#6ee7b7",
  leftLeg: "#f59e0b",
  rightLeg: "#f59e0b",
  leftFoot: "#fbbf24",
  rightFoot: "#fbbf24",
  face: "#e5e7eb",
}

const JOINT_COLOR = "#ffffff"
const KEY_JOINT_COLOR = "#a3e635"

// NOTE: coordinates are drawn in raw camera space. Any mirroring is handled
// at the CSS layer (transform on a wrapper that contains BOTH the video and
// the canvas), so the skeleton always stays aligned with the video feed.
function toCanvas(
  lm: NormalizedLandmark,
  width: number,
  height: number,
): { x: number; y: number } {
  return { x: lm.x * width, y: lm.y * height }
}

/**
 * Draw a pose skeleton onto a 2D canvas context. Assumes the caller has
 * already cleared the canvas. Mirroring is NOT applied here — wrap the video
 * and canvas in a CSS-mirrored container if a selfie view is needed.
 */
export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[] | undefined,
  opts: DrawSkeletonOptions,
): void {
  const { width, height, minVisibility = 0.5 } = opts
  if (!landmarks || landmarks.length === 0) return

  // ---- Bones ----
  ctx.lineCap = "round"
  ctx.lineJoin = "round"

  for (const [part, connections] of Object.entries(POSE_CONNECTIONS)) {
    const color = PART_COLORS[part] ?? "#a3e635"
    ctx.strokeStyle = color
    ctx.lineWidth = part === "torso" ? 6 : 4

    ctx.beginPath()
    for (const conn of connections) {
      const a = landmarks[conn.start]
      const b = landmarks[conn.end]
      if (!a || !b) continue
      if ((a.visibility ?? 0) < minVisibility) continue
      if ((b.visibility ?? 0) < minVisibility) continue
      const pa = toCanvas(a, width, height)
      const pb = toCanvas(b, width, height)
      ctx.moveTo(pa.x, pa.y)
      ctx.lineTo(pb.x, pb.y)
    }
    ctx.stroke()
  }

  // ---- Small joints (all landmarks) ----
  ctx.fillStyle = JOINT_COLOR
  for (const lm of landmarks) {
    if ((lm.visibility ?? 0) < minVisibility) continue
    const p = toCanvas(lm, width, height)
    ctx.beginPath()
    ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2)
    ctx.fill()
  }

  // ---- Key joints (larger, highlighted) ----
  ctx.fillStyle = KEY_JOINT_COLOR
  ctx.strokeStyle = "#052e16"
  ctx.lineWidth = 2
  for (const idx of KEY_JOINTS) {
    const lm = landmarks[idx]
    if (!lm || (lm.visibility ?? 0) < minVisibility) continue
    const p = toCanvas(lm, width, height)
    ctx.beginPath()
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
}

/** Count landmarks above the visibility threshold, useful for UI feedback. */
export function countVisibleLandmarks(
  landmarks: NormalizedLandmark[] | undefined,
  minVisibility = 0.5,
): number {
  if (!landmarks) return 0
  return landmarks.filter((lm) => (lm.visibility ?? 0) >= minVisibility).length
}
