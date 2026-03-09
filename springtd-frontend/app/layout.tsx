import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { AuthProvider } from "@/contexts/AuthContext"
import { ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import { Toaster } from "@/components/ui/toaster"
import "@/lib/devBypass" // Enable dev bypass mode

export const metadata: Metadata = {
  title: "Spring TD Dashboard",
  description: "Spring TD Dashboard Application",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <AuthProvider>
          {children}
          <ToastContainer position="top-right" autoClose={3000} />
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
