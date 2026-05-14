"use client"

import { useState, useEffect } from "react"
import { Search, Loader2, RefreshCw, WalletCards, Copy } from "lucide-react"
import { Input } from "@/components/ui/input"
import { adminWalletApi, AdminWalletTransaction } from "@/lib/adminService"
import WalletHistoryDrawer from "@/components/drawers/wallet-history-drawer"
import { toast } from "sonner"

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).then(() => toast.success("Copied!"))
}

export default function AdminWalletPage() {
  const [activeTab, setActiveTab] = useState("summary")
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [transactions, setTransactions] = useState<AdminWalletTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [summary, setSummary] = useState<{
    totalWallets?: number
    totalBalance?: number
    activeWallets?: number
  }>({})

  const fetchData = async () => {
    setLoading(true)

    // Fetch summary
    const summaryRes = await adminWalletApi.getSummary()
    if (summaryRes.success && summaryRes.data) {
      setSummary(summaryRes.data)
    }

    // Fetch transactions
    const txRes = await adminWalletApi.getAllTransactions({ limit: 50 })
    if (txRes.success && txRes.data) {
      setTransactions(txRes.data)
    } else {
      setTransactions([])
    }

    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const filteredTx = transactions.filter(tx => {
    const q = searchQuery.toLowerCase()
    return (
      tx.referenceId?.toLowerCase().includes(q) ||
      tx.description?.toLowerCase().includes(q) ||
      tx.userEmail?.toLowerCase().includes(q) ||
      tx.id.toLowerCase().includes(q)
    )
  })

  const formatCurrency = (n: number) =>
    `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const formatDate = (d: string) => {
    const date = new Date(d)
    return `${date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} / ${date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
  }

  return (
    <div className="flex-1 bg-white">
      {/* Tabs */}
      <div className="border-b border-gray-200 px-8">
        <div className="flex gap-8">
          {[
            { id: "summary", label: "Summary" },
            { id: "total", label: "Total wallets" },
            { id: "commutative", label: "Cumulative balances" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 text-sm relative ${activeTab === tab.id ? "text-[#3061F5]" : "text-gray-500 hover:text-gray-700"}`}
            >
              {tab.label}
              {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3061F5]" />}
            </button>
          ))}
        </div>
      </div>

      <div className="p-8">
        {/* Summary Card */}
        <div className="bg-[#3061F5] rounded-3xl p-8 mb-8 relative">
          <div className="text-white">
            <h2 className="text-2xl mb-1">Platform Overview</h2>
            <p className="text-white/70 text-sm mb-6">All wallets • Live data from wallet-ms</p>
            {loading ? (
              <Loader2 className="w-8 h-8 animate-spin text-white/60" />
            ) : (
              <>
                <p className="text-5xl font-bold tracking-tight mb-4">
                  {formatCurrency(summary.totalBalance ?? 0)}
                </p>
                <div className="flex gap-6 text-sm text-white/80">
                  <span>{summary.totalWallets ?? "—"} total wallets</span>
                  <span>•</span>
                  <span>{summary.activeWallets ?? "—"} active</span>
                </div>
              </>
            )}
          </div>
          <div className="absolute top-8 right-8 flex gap-2">
            <button
              onClick={fetchData}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm transition-colors backdrop-blur-sm"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="bg-white hover:bg-gray-50 text-gray-900 px-6 py-2.5 rounded-lg text-sm transition-colors font-medium"
            >
              View transactions
            </button>
          </div>
        </div>

        {/* Wallet History */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-medium">Transaction History</h3>
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by ref, email..."
                className="pl-10 bg-white border-gray-200"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-gray-50 rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : filteredTx.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <WalletCards className="w-10 h-10 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">
                {searchQuery ? "No transactions match your search." : "No transactions yet."}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-4 px-4 text-sm font-normal text-gray-700">Amount</th>
                  <th className="text-left py-4 px-4 text-sm font-normal text-gray-700">Type</th>
                  <th className="text-left py-4 px-4 text-sm font-normal text-gray-700">Reference</th>
                  <th className="text-left py-4 px-4 text-sm font-normal text-gray-700">Timestamp</th>
                  <th className="text-left py-4 px-4 text-sm font-normal text-gray-700">Description</th>
                  <th className="text-left py-4 px-4 text-sm font-normal text-gray-700">Status</th>
                  <th className="text-left py-4 px-4 text-sm font-normal text-gray-700">User</th>
                </tr>
              </thead>
              <tbody>
                {filteredTx.map((tx) => (
                  <tr key={tx.id} className="border-b border-gray-200 bg-white hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4 text-sm font-semibold">
                      <span className={tx.type === "CREDIT" ? "text-green-700" : "text-red-700"}>
                        {tx.type === "CREDIT" ? "+" : "-"}{formatCurrency(tx.amount)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${tx.type === "CREDIT" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm font-mono text-gray-600">
                      <div className="flex items-center gap-1">
                        <span>{tx.referenceId?.slice(0, 16) ?? tx.id.slice(0, 12)}</span>
                        <button
                          className="text-gray-400 hover:text-gray-600"
                          onClick={() => copyToClipboard(tx.referenceId ?? tx.id)}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-500">{formatDate(tx.createdAt)}</td>
                    <td className="py-4 px-4 text-sm text-gray-600 max-w-[200px] truncate">{tx.description || "—"}</td>
                    <td className="py-4 px-4 text-sm">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tx.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                          tx.status === "FAILED" ? "bg-red-100 text-red-700" :
                            "bg-gray-100 text-gray-600"
                        }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600">
                      {tx.userEmail ? (
                        <div>
                          <div>{tx.userEmail}</div>
                          {tx.userPhone && <div className="text-xs text-gray-400">{tx.userPhone}</div>}
                        </div>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <WalletHistoryDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </div>
  )
}
