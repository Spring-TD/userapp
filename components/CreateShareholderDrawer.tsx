"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Upload, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { ComplianceService } from "@/lib/services/complianceService"
import { useAuth } from "@/hooks/useAuth"
import { toast } from "react-toastify"
import { useComplianceForm } from "@/providers/ComplianceFormProvider"

const formatFileSize = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`

export const CreateShareholderDrawer: React.FC = () => {
  const { shareholderDrawerOpen, setShareholderDrawerOpen, addShareholder } = useComplianceForm()
  const { user } = useAuth()
  const uboInputRef = React.useRef<HTMLInputElement>(null)
  const bankInputRef = React.useRef<HTMLInputElement>(null)

  const [formData, setFormData] = React.useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    bvn: "",
    bankAccount: "",
  })
  const [uboFile, setUboFile] = React.useState<File | null>(null)
  const [bankFile, setBankFile] = React.useState<File | null>(null)
  const [loading, setLoading] = React.useState(false)

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleUboSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null
    setUboFile(f)
  }

  const handleBankSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null
    setBankFile(f)
  }

  const clearUbo = () => {
    setUboFile(null)
    if (uboInputRef.current) uboInputRef.current.value = ""
  }

  const clearBank = () => {
    setBankFile(null)
    if (bankInputRef.current) bankInputRef.current.value = ""
  }

  // Reset files when drawer closes so next open is clean
  React.useEffect(() => {
    if (!shareholderDrawerOpen) {
      setUboFile(null)
      setBankFile(null)
      if (uboInputRef.current) uboInputRef.current.value = ""
      if (bankInputRef.current) bankInputRef.current.value = ""
    }
  }, [shareholderDrawerOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.fullName || !formData.email) {
      toast.error("Please provide full name and email")
      return
    }
    if (!formData.bvn || !formData.bankAccount) {
      toast.error("BVN and Bank Account are required")
      return
    }
    if (!uboFile || !bankFile) {
      toast.error("Please upload UBO and Bank Statement")
      return
    }

    const maxSize = 5 * 1024 * 1024
    if (uboFile && uboFile.size > maxSize) return toast.error("UBO file exceeds 5MB")
    if (bankFile && bankFile.size > maxSize) return toast.error("Bank statement exceeds 5MB")

    const currentToken = typeof window !== "undefined" ? (await import("@/lib/cookieAuth")).getAccessToken() : null
    if (!currentToken) {
      toast.error("No access token found. Please log in and try again.")
      return
    }

    setLoading(true)
    try {
      // Upload UBO and Bank Statement to get fileUrl (per docs: upload first, then send URLs)
      toast.info("Uploading documents…")
      const uboUpload = await ComplianceService.uploadDocument(uboFile)
      if (!uboUpload.success || !uboUpload.url) {
        toast.error(uboUpload.error || "UBO upload failed")
        return
      }
      const bankUpload = await ComplianceService.uploadDocument(bankFile)
      if (!bankUpload.success || !bankUpload.url) {
        toast.error(bankUpload.error || "Bank statement upload failed")
        return
      }

      const now = new Date().toISOString()
      const bankStatement = {
        fileName: bankFile.name,
        fileType: bankFile.type || "application/pdf",
        fileSize: bankFile.size,
        fileUrl: bankUpload.url,
        uploadDate: now,
      }
      const uboDocument = {
        fileName: uboFile.name,
        fileType: uboFile.type || "application/pdf",
        fileSize: uboFile.size,
        fileUrl: uboUpload.url,
        uploadDate: now,
      }

      // API shape per compliance-ms docs: fullName, ownershipPercentage, bankStatement, status, kyc; optional email, bvn, bankAccount, uboDocument
      const newShareholder = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim() || undefined,
        phoneNumber: formData.phoneNumber.trim() || undefined,
        bvn: formData.bvn.trim() || undefined,
        bankAccount: formData.bankAccount.trim() || undefined,
        ownershipPercentage: 100,
        bankStatement,
        uboDocument,
        status: "pending" as const,
        kyc: {
          url: "https://liveness-test.example.com/placeholder",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: "pending" as const,
        },
      }

      const existing: any[] = await ComplianceService.getShareholdersForCurrentMerchant().catch(() => [])
      const payload = [...existing, newShareholder]

      const res = await ComplianceService.upsertShareholdersForCurrentMerchant(payload)
      const shareholder = (res as any)?.data?.shareholder ?? (res as any)?.shareholder ?? newShareholder

      addShareholder({
        name: shareholder.fullName || formData.fullName,
        email: shareholder.email || formData.email,
        phone: shareholder.phoneNumber || formData.phoneNumber || "",
        date: new Date().toISOString().slice(0, 16).replace("T", " "),
        kyc: "Copy Kyc",
        status: shareholder.status === "APPROVED" ? "Successful" : "Pending",
      })

      setShareholderDrawerOpen(false)
      toast.success("Shareholder created successfully")
    } catch (err: any) {
      const data = err?.response?.data
      const msg = data?.error ?? data?.message ?? err?.message ?? "Failed to create shareholder"
      console.error("Create shareholder failed", { status: err?.response?.status, data, err })
      if (err?.response?.status === 401) {
        toast.error("Unauthorized — please log in again.")
      } else if (String(msg).toLowerCase().includes("no kyc profile") || String(msg).toLowerCase().includes("no profile found")) {
        toast.error("Complete the Business Info step first, then add shareholders.")
      } else {
        toast.error(String(msg))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {shareholderDrawerOpen && (
        <div className="fixed inset-0 z-50 flex pointer-events-none">
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShareholderDrawerOpen(false)}
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={cn(
              "relative ml-auto w-[45%] min-w-[400px] bg-white shadow-2xl",
              "border-l border-gray-200 flex flex-col h-screen max-h-screen",
              "rounded-tl-[40px] rounded-bl-[40px] pointer-events-auto",
            )}
          >
            <button
              onClick={() => setShareholderDrawerOpen(false)}
              className="absolute -left-20 top-6 h-10 w-10 flex items-center justify-center rounded-full bg-background shadow-md hover:bg-muted z-10"
            >
              <X className="h-5 w-5 text-foreground" />
            </button>

            <form
              onSubmit={handleSubmit}
              className="flex-1 flex flex-col min-h-0 mt-16 px-8 py-10 space-y-6 max-w-md mx-auto w-full overflow-y-auto"
            >
              <div className="flex items-center justify-between border rounded-lg p-5 bg-white shadow-sm flex-wrap gap-2">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <Upload className="w-5 h-5 text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-700">Ultimate Beneficial Owner (UBO)</p>
                    <p className="text-xs text-gray-500">PDF format • Max. 5MB</p>
                    {uboFile && (
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded">
                          <FileText className="w-4 h-4 text-gray-500" />
                          <span className="truncate max-w-[180px]" title={uboFile.name}>{uboFile.name}</span>
                          <span className="text-gray-500 text-xs">({formatFileSize(uboFile.size)})</span>
                        </span>
                        <button type="button" onClick={clearUbo} className="text-xs text-red-600 hover:underline">
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <label
                  className="px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors shrink-0 cursor-pointer"
                  style={{ backgroundColor: "#2563EB", color: "#fff" }}
                >
                  <input ref={uboInputRef} type="file" className="hidden" accept="application/pdf,image/*" onChange={handleUboSelect} />
                  {uboFile ? "Change file" : "Upload"}
                </label>
              </div>

              <div className="border rounded-lg p-5 bg-white shadow-sm">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={formData.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  className="w-full bg-transparent outline-none text-gray-900 placeholder-gray-400"
                />
              </div>

              <div className="border rounded-lg p-5 bg-white shadow-sm">
                <input
                  type="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className="w-full bg-transparent outline-none text-gray-900 placeholder-gray-400"
                />
              </div>

              <div className="border rounded-lg p-5 bg-white shadow-sm">
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={formData.phoneNumber}
                  onChange={(e) => handleChange("phoneNumber", e.target.value)}
                  className="w-full bg-transparent outline-none text-gray-900 placeholder-gray-400"
                />
              </div>

              <div className="border rounded-lg p-5 bg-white shadow-sm">
                <input
                  type="text"
                  placeholder="BVN"
                  value={formData.bvn}
                  onChange={(e) => handleChange("bvn", e.target.value)}
                  className="w-full bg-transparent outline-none text-gray-900 placeholder-gray-400"
                />
              </div>

              <div className="border rounded-lg p-5 bg-white shadow-sm">
                <input
                  type="text"
                  placeholder="Bank Account"
                  value={formData.bankAccount}
                  onChange={(e) => handleChange("bankAccount", e.target.value)}
                  className="w-full bg-transparent outline-none text-gray-900 placeholder-gray-400"
                />
              </div>

              <div className="flex items-center justify-between border rounded-lg p-5 bg-white shadow-sm flex-wrap gap-2">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <Upload className="w-5 h-5 text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-700">Bank Statement</p>
                    <p className="text-xs text-gray-500">PDF format • Max. 5MB</p>
                    {bankFile && (
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded">
                          <FileText className="w-4 h-4 text-gray-500" />
                          <span className="truncate max-w-[180px]" title={bankFile.name}>{bankFile.name}</span>
                          <span className="text-gray-500 text-xs">({formatFileSize(bankFile.size)})</span>
                        </span>
                        <button type="button" onClick={clearBank} className="text-xs text-red-600 hover:underline">
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <label
                  className="px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors shrink-0 cursor-pointer"
                  style={{ backgroundColor: "#2563EB", color: "#fff" }}
                >
                  <input ref={bankInputRef} type="file" className="hidden" accept="application/pdf,image/*" onChange={handleBankSelect} />
                  {bankFile ? "Change file" : "Upload"}
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full text-white py-3 rounded-md font-medium hover:opacity-90 transition-colors disabled:opacity-50"
                style={{ backgroundColor: "#2563EB" }}
              >
                {loading ? "Saving..." : "Save Shareholder"}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default CreateShareholderDrawer
