"use client"

import type React from "react"
import { Provider as ReduxProvider } from "react-redux"
import { store } from "@/store/store"
import { AuthProvider } from "@/contexts/AuthContext"
import { ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ReduxProvider store={store}>
      <AuthProvider>
        {children}
        <ToastContainer position="top-right" autoClose={3000} />
        <Toaster />
        <SonnerToaster position="top-right" richColors closeButton />
      </AuthProvider>
    </ReduxProvider>
  )
}

