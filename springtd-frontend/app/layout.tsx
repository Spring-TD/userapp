import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import "./globals.css"
import { Header } from "@/components/header"
import { ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

export const metadata: Metadata = {
  title: "SpringTD",
  description: "SpringTD is a fintech company that provides innovative financial solutions.",
  generator: "Next.js",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
        style={{
          backgroundImage: "url('/images/clip-path-group.png')",
          backgroundRepeat: "repeat",
          backgroundSize: "400px 400px",
          backgroundAttachment: "fixed",
          backgroundPosition: "center",
        }}
      >
        <Header />
        <Suspense fallback={null}>
          {children}
          <ToastContainer position="top-right" autoClose={3000} />
          </Suspense>
        <Analytics />
      </body>
    </html>
  )
}
