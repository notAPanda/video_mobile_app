import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BlockStart AI — Sprint Block-Start Coach",
  description:
    "Live pose-detection coach for sprint block-start technique. Real-time 33-point skeleton tracking over your camera feed.",
  keywords: [
    "sprint",
    "block start",
    "pose detection",
    "MediaPipe",
    "athletics coach",
  ],
  authors: [{ name: "BlockStart AI" }],
  openGraph: {
    title: "BlockStart AI",
    description: "Live pose-detection coach for sprint block-start technique.",
    siteName: "BlockStart AI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BlockStart AI",
    description: "Live pose-detection coach for sprint block-start technique.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
