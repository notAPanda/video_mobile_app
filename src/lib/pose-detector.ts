import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision"

// Wasm runtime is fetched from the jsDelivr CDN matching the installed version.
const WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"

// Google-hosted pose landmarker model (lite variant -> fastest for real-time).
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"

export type PoseDetectionCallback = (
  result: PoseLandmarkerResult,
  timestampMs: number,
) => void

/**
 * Thin wrapper around MediaPipe's PoseLandmarker.
 * Loads the wasm + model lazily and streams detections via detectForVideo.
 */
export class PoseDetector {
  private landmarker: PoseLandmarker | null = null
  private loadingPromise: Promise<PoseLandmarker> | null = null
  private lastTimestamp = 0

  get isReady(): boolean {
    return this.landmarker !== null
  }

  async load(onProgress?: (msg: string) => void): Promise<PoseLandmarker> {
    if (this.landmarker) return this.landmarker
    if (this.loadingPromise) return this.loadingPromise

    this.loadingPromise = (async () => {
      onProgress?.("Loading vision runtime…")
      const fileset = await FilesetResolver.forVisionTasks(WASM_BASE)

      onProgress?.("Loading pose model…")
      const landmarker = await PoseLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })

      this.landmarker = landmarker
      return landmarker
    })()

    try {
      return await this.loadingPromise
    } catch (err) {
      // Reset so a future load() can retry after a failure.
      this.loadingPromise = null
      throw err
    }
  }

  /**
   * Run detection for a single video frame. Returns null when the frame
   * timestamp is not strictly newer than the previous one (MediaPipe throws
   * otherwise) or when the detector is not ready.
   */
  detect(
    video: HTMLVideoElement,
    timestampMs: number,
  ): PoseLandmarkerResult | null {
    if (!this.landmarker) return null
    if (!Number.isFinite(timestampMs) || timestampMs <= this.lastTimestamp) {
      return null
    }
    this.lastTimestamp = timestampMs

    try {
      return this.landmarker.detectForVideo(video, timestampMs)
    } catch {
      return null
    }
  }

  dispose(): void {
    this.landmarker?.close()
    this.landmarker = null
    this.loadingPromise = null
    this.lastTimestamp = 0
  }
}

// Shared singleton for the app lifetime.
let detectorInstance: PoseDetector | null = null

export function getPoseDetector(): PoseDetector {
  if (!detectorInstance) detectorInstance = new PoseDetector()
  return detectorInstance
}
