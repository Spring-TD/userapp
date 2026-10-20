"use client"

import { useState, useEffect } from "react"
import { Drawer } from "@/components/drawer"
import { Button } from "@/components/ui/button"
import { Account, accountService } from "@/lib/services/accountService"
import {
    Loader2,
    DollarSign,
    Building,
    PiggyBank,
    Coins,
    TrendingUp,
    Calendar,
    CreditCard,
    Clock,
    ArrowUpRight,
    ArrowDownRight,
    RefreshCw
} from "lucide-react"
import { toast } from "sonner"

interface AccountDetailDrawerProps {
    isOpen: boolean
    onClose: () => void
    account: Account | null
    customerName?: string
    onRefresh?: () => void
}

// Mock transaction data for demonstration
interface Transaction {
    id: string
    type: "credit" | "debit"
    amount: number
    description: string
    date: string
    balance: number
}

const generateMockTransactions = (account: Account): Transaction[] => {
    const transactions: Transaction[] = []
    let runningBalance = account.balance

    const descriptions = {
        credit: ["Deposit", "Interest Payment", "Transfer In", "Refund"],
        debit: ["Withdrawal", "Payment", "Transfer Out", "Fee"],
    }

    for (let i = 0; i < 4; i++) {
        const isCredit = Math.random() > 0.4
        const amount = Math.round((Math.random() * 500 + 50) * 100) / 100

        transactions.push({
            id: `txn-${i}`,
            type: isCredit ? "credit" : "debit",
            amount,
            description: descriptions[isCredit ? "credit" : "debit"][Math.floor(Math.random() * 4)],
            date: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000 * (Math.random() * 3 + 1)).toISOString(),
            balance: runningBalance,
        })

        runningBalance = isCredit ? runningBalance - amount : runningBalance + amount
    }

    return transactions
}

export default function AccountDetailDrawer({
    isOpen,
    onClose,
    account,
    customerName,
    onRefresh,
}: AccountDetailDrawerProps) {
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [isLoadingTransactions, setIsLoadingTransactions] = useState(false)

    useEffect(() => {
        if (isOpen && account) {
            // Generate mock transactions when drawer opens
            setIsLoadingTransactions(true)
            setTimeout(() => {
                setTransactions(generateMockTransactions(account))
                setIsLoadingTransactions(false)
            }, 500)
        }
    }, [isOpen, account])

    if (!account) return null

    const getAccountIcon = (type: string) => {
        switch (type) {
            case "savings":
                return <PiggyBank className="h-6 w-6" />
            case "loan":
                return <CreditCard className="h-6 w-6" />
            case "mortgage":
                return <Building className="h-6 w-6" />
            case "commodity":
                return <Coins className="h-6 w-6" />
            case "investment":
                return <TrendingUp className="h-6 w-6" />
            default:
                return <DollarSign className="h-6 w-6" />
        }
    }

    // All account types use the same purple color
    const getAccountColor = () => {
        return { bg: "bg-[#7C3AED]", text: "text-[#7C3AED]", light: "bg-purple-100" }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "active":
                return "bg-green-100 text-green-700"
            case "inactive":
                return "bg-gray-100 text-gray-700"
            case "suspended":
                return "bg-red-100 text-red-700"
            case "closed":
                return "bg-gray-200 text-gray-500"
            default:
                return "bg-gray-100 text-gray-700"
        }
    }

    const formatCurrency = (amount: number, currency = "USD") => {
        const symbol = currency === "USD" ? "$" : currency === "GBP" ? "£" : "₦"
        return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
        })
    }

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        })
    }

    const colors = getAccountColor()

    return (
        <Drawer
            open={isOpen}
            onOpenChange={onClose}
            title="Account Details"
            subtitle={`${account.type.charAt(0).toUpperCase() + account.type.slice(1)} Account`}
        >
            <div className="space-y-6">
                {/* Account Card */}
                <div className={`${colors.bg} text-white p-6 rounded-xl`}>
                    <div className="flex items-center gap-3 mb-4">
                        {getAccountIcon(account.type)}
                        <span className="text-lg font-semibold capitalize">
                            {account.type} Account
                        </span>
                    </div>
                    <p className="text-3xl font-bold mb-2">
                        {formatCurrency(account.balance, account.currency)}
                    </p>
                    <div className="flex items-center justify-between text-white/80 text-sm">
                        <span>Account ID: {account.id?.slice(0, 8).toUpperCase()}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-white/20 capitalize`}>
                            {account.status}
                        </span>
                    </div>
                </div>

                {/* Account Details */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <h3 className="font-semibold text-gray-900 mb-3">Account Information</h3>

                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-sm text-gray-500 flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            Account Type
                        </span>
                        <span className="text-sm font-medium text-gray-900 capitalize">
                            {account.type}
                        </span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-sm text-gray-500 flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            Account Holder
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                            {customerName || "Unknown User"}
                        </span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-sm text-gray-500 flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Currency
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                            {account.currency}
                        </span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-sm text-gray-500 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Status
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(account.status)}`}>
                            {account.status}
                        </span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-sm text-gray-500 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Created
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                            {formatDate(account.createdAt)}
                        </span>
                    </div>

                    {account.metadata?.interestRate && (
                        <div className="flex justify-between items-center py-2 border-b border-gray-200">
                            <span className="text-sm text-gray-500 flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" />
                                Interest Rate
                            </span>
                            <span className="text-sm font-medium text-[#7C3AED]">
                                {account.metadata.interestRate}% p.a.
                            </span>
                        </div>
                    )}
                </div>

                {/* Recent Transactions */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">Recent Transactions</h3>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setIsLoadingTransactions(true)
                                setTimeout(() => {
                                    setTransactions(generateMockTransactions(account))
                                    setIsLoadingTransactions(false)
                                }, 500)
                            }}
                            className="h-8 gap-1 text-gray-500"
                        >
                            <RefreshCw className="h-3 w-3" />
                            Refresh
                        </Button>
                    </div>

                    {isLoadingTransactions ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No transactions yet
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {transactions.map((txn) => (
                                <div
                                    key={txn.id}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${txn.type === "credit" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                                            }`}>
                                            {txn.type === "credit" ? (
                                                <ArrowDownRight className="h-4 w-4" />
                                            ) : (
                                                <ArrowUpRight className="h-4 w-4" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{txn.description}</p>
                                            <p className="text-xs text-gray-500">{formatDateTime(txn.date)}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-sm font-semibold ${txn.type === "credit" ? "text-green-600" : "text-red-600"
                                            }`}>
                                            {txn.type === "credit" ? "+" : "-"}{formatCurrency(txn.amount, account.currency)}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Bal: {formatCurrency(txn.balance, account.currency)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="flex-1 h-12"
                    >
                        Close
                    </Button>
                    <Button
                        onClick={() => {
                            toast.info("View full transaction history")
                        }}
                        className="flex-1 h-12 bg-black hover:bg-black/90 text-white"
                    >
                        More transactions
                    </Button>
                </div>
            </div>
        </Drawer>
    )
}
