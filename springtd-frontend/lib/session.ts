// lib/session.ts
import api from "./api"

export async function getSession() {
  const res = await api.get("/auth/session", { withCredentials: true })
  return res.data
}

export async function resendVerification() {
  const res = await api.post("/auth/resend-verification", {}, { withCredentials: true })
  return res.data
}

export async function getVerificationStatus() {
  const res = await api.get("/auth/verification-status", { withCredentials: true })
  return res.data
}
