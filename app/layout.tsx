import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { AppProviders } from "./providers"

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
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
