import { create } from "zustand"

export type AppMode = "video" | "photo" | "tutorial" | "compare"

export type AppView = "home" | AppMode

interface AppState {
  view: AppView
  setView: (view: AppView) => void
  goHome: () => void
}

export const useAppStore = create<AppState>((set) => ({
  view: "home",
  setView: (view) => set({ view }),
  goHome: () => set({ view: "home" }),
}))

export interface ModeInfo {
  id: AppMode
  title: string
  subtitle: string
  description: string
  available: boolean
  /** lucide-react icon name reference handled in the component. */
  accent: string
}

export const MODES: ModeInfo[] = [
  {
    id: "video",
    title: "Live Video Mode",
    subtitle: "Real-time pose tracking",
    description:
      "Camera feed with a live skeleton overlay so you can watch your block-set posture and drive phase as it happens.",
    available: true,
    accent: "lime",
  },
  {
    id: "photo",
    title: "Photo Analysis",
    subtitle: "Single-frame breakdown",
    description:
      "Capture a still frame at your set position and get joint-angle measurements against the ideal block start.",
    available: false,
    accent: "emerald",
  },
  {
    id: "tutorial",
    title: "Technique Tutorial",
    subtitle: "Step-by-step coaching",
    description:
      "Guided walkthrough of the block start: set, clearance, and first-step drive, with checkpoints to hit.",
    available: false,
    accent: "amber",
  },
  {
    id: "compare",
    title: "Pro Comparison",
    subtitle: "Side-by-side overlay",
    description:
      "Overlay your drive phase against elite sprinter reference clips to spot the gaps in your mechanics.",
    available: false,
    accent: "orange",
  },
]
