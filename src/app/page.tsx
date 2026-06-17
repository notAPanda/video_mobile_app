"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useAppStore } from "@/lib/store"
import { HomeScreen } from "@/components/home-screen"
import { VideoMode } from "@/components/video-mode"

export default function Home() {
  const view = useAppStore((s) => s.view)

  return (
    <AnimatePresence mode="wait">
      {view === "home" && (
        <motion.div
          key="home"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <HomeScreen />
        </motion.div>
      )}
      {view === "video" && (
        <motion.div
          key="video"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <VideoMode />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
