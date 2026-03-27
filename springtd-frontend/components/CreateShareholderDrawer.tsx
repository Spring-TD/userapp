"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Upload } from "lucide-react"
import { cn } from "@/lib/utils"
import { fileToBase64 } from "@/lib/fileUtils"
import { createShareholder } from "@/lib/kycService"
import { useAuth } from "@/hooks/useAuth"
import { toast } from "react-toastify"
import { useComplianceForm } from "@/providers/ComplianceFormProvider"

export const CreateShareholderDrawer: React.FC = () => {
  const { shareholderDrawerOpen, setShareholderDrawerOpen, addShareholder } = useComplianceForm()
  const { user } = useAuth()

  const [formData, setFormData] = React.useState({
    fullName: "",
    email: "",
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

    const currentToken = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null
    if (!currentToken) {
      toast.error("No access token found. Please log in and try again.")
      return
    }

    setLoading(true)
    try {
      const docs: any[] = []
      if (uboFile) {
        const data = await fileToBase64(uboFile)
        docs.push({
          type: "ubo",
          fileName: uboFile.name,
          fileType: uboFile.type,
          fileSize: uboFile.size,
          fileData: data,
        })
      }
      if (bankFile) {
        const data = await fileToBase64(bankFile)
        docs.push({
          type: "bank_statement",
          fileName: bankFile.name,
          fileType: bankFile.type,
          fileSize: bankFile.size,
          fileData: data,
        })
      }

      const payload = {
        beneficialOwner: {
          fullName: formData.fullName,
          email: formData.email,
          bvn: formData.bvn,
          bankAccount: formData.bankAccount,
        },
        documents: docs,
      }

      const res = await createShareholder(payload, currentToken || undefined)

      const shareholder = res?.data?.shareholder || res?.shareholder || {}
      addShareholder({
        name: shareholder.fullName || formData.fullName,
        email: shareholder.email || formData.email,
        phone: shareholder.phoneNumber || "",
        date: new Date().toISOString().slice(0, 16).replace("T", " "),
        kyc: "Copy Kyc",
        status: shareholder.status === "APPROVED" ? "Successful" : "Pending",
      })

      setShareholderDrawerOpen(false)
      toast.success("Shareholder created successfully")
    } catch (err: any) {
      console.error("Create shareholder failed", err)
      if (err?.response?.status === 401) {
        toast.error("Unauthorized — your session may have expired. Please log out and log in again.")
      } else {
        toast.error(err?.response?.data?.message || "Failed to create shareholder")
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
              "border-l border-gray-200 flex flex-col max-h-screen",
              "rounded-tl-[40px] rounded-bl-[40px] pointer-events-auto",
            )}
          >
            <button
              onClick={() => setShareholderDrawerOpen(false)}
              className="absolute -left-20 top-6 h-10 w-10 flex items-center justify-center rounded-full bg-background shadow-md hover:bg-muted"
            >
              <X className="h-5 w-5 text-foreground" />
            </button>

            <form
              onSubmit={handleSubmit}
              className="flex-1 flex flex-col mt-16 px-8 py-10 space-y-6 max-w-md mx-auto w-full"
            >
              <div className="flex items-center justify-between border rounded-lg p-5 bg-white shadow-sm">
                <div className="flex items-center space-x-3">
                  <Upload className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Ultimate Beneficial Owner (UBO)</p>
                    <p className="text-xs text-gray-500">PDF format • Max. 5MB</p>
                  </div>
                </div>
                <label
                  className="px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors"
                  style={{ backgroundColor: "#9A813F", color: "#fff" }}
                >
                  <input type="file" className="hidden" accept="application/pdf,image/*" onChange={handleUboSelect} />
                  Upload
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

              <div className="flex items-center justify-between border rounded-lg p-5 bg-white shadow-sm">
                <div className="flex items-center space-x-3">
                  <Upload className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Bank Statement</p>
                    <p className="text-xs text-gray-500">PDF format • Max. 5MB</p>
                  </div>
                </div>
                <label
                  className="px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors"
                  style={{ backgroundColor: "#9A813F", color: "#fff" }}
                >
                  <input type="file" className="hidden" accept="application/pdf,image/*" onChange={handleBankSelect} />
                  Upload
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-black text-white py-3 rounded-md font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
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
