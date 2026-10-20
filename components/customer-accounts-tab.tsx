"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Account, accountService } from "@/lib/services/accountService"
import {
    RefreshCw,
    DollarSign,
    Building,
    PiggyBank,
    Coins,
    CreditCard,
    Clock,
    TrendingUp,
    Eye
} from "lucide-react"
import AccountDetailDrawer from "@/components/drawers/account-detail-drawer"
import { toast } from "sonner"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { TableSkeleton } from "@/components/ui/table-skeleton"

interface CustomerAccountsTabProps {
    customerId: string
}

// Fallback mock accounts data
const FALLBACK_ACCOUNTS: Account[] = [
    {
        id: "acc-001",
        userId: "cust-001",
        type: "savings",
        balance: 15000,
        currency: "USD",
        status: "active",
        metadata: { interestRate: 5.5 },
        createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "acc-002",
        userId: "cust-001",
        type: "loan",
        balance: 25000,
        currency: "USD",
        status: "active",
        metadata: { interestRate: 12.5, term: 24, monthlyPayment: 1180 },
        createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "acc-003",
        userId: "cust-001",
        type: "mortgage",
        balance: 350000,
        currency: "USD",
        status: "active",
        metadata: { interestRate: 6.5, term: 25, propertyType: "Residential" },
        createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "acc-004",
        userId: "cust-001",
        type: "commodity",
        balance: 8500,
        currency: "USD",
        status: "active",
        metadata: { commodityType: "Gold", quantity: 3.5, unitPrice: 2428 },
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
    },
]

export default function CustomerAccountsTab({ customerId }: CustomerAccountsTabProps) {
    const [accounts, setAccounts] = useState<Account[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [usingFallback, setUsingFallback] = useState(false)
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
    const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false)
    const [customerName, setCustomerName] = useState<string>("")

    // Fetch accounts for user
    const fetchAccounts = async () => {
        setIsLoading(true)
        try {
            const response = await accountService.accounts.getByUserId(customerId)

            if (response.success && response.data) {
                setAccounts(response.data)
                setUsingFallback(false)
            } else {
                console.warn("API returned error, using fallback data:", response.error)
                // Generate fallback accounts with the customerId
                const fallbackWithId = FALLBACK_ACCOUNTS.map(acc => ({
                    ...acc,
                    userId: customerId,
                }))
                setAccounts(fallbackWithId)
                setUsingFallback(true)
            }
        } catch (error) {
            console.error("Failed to fetch accounts:", error)
            const fallbackWithId = FALLBACK_ACCOUNTS.map(acc => ({
                ...acc,
                userId: customerId,
            }))
            setAccounts(fallbackWithId)
            setUsingFallback(true)
            toast.info("Using demo data - API unavailable")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (customerId) {
            fetchAccounts()
            // Fetch customer details to get name
            const fetchCustomer = async () => {
                try {
                    const response = await accountService.customers.getById(customerId)
                    if (response.success && response.data) {
                        setCustomerName(response.data.name)
                    } else {
                        // Fallback name if using mock/demo data or api fails
                        setCustomerName("Demo User")
                    }
                } catch (error) {
                    console.error("Failed to fetch customer:", error)
                    setCustomerName("Demo User")
                }
            }
            fetchCustomer()
        }
    }, [customerId])

    const handleAccountClick = (account: Account) => {
        setSelectedAccount(account)
        setIsDetailDrawerOpen(true)
    }

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
            default:
                return <DollarSign className="h-6 w-6" />
        }
    }

    // All account types use the same purple color
    const getAccountColor = () => {
        return { gradient: "from-[#7C3AED] to-[#6D28D9]", light: "bg-purple-100", text: "text-[#7C3AED]" }
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
        return `${symbol}${amount.toLocaleString()}`
    }

    // Calculate totals
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0)
    const savingsTotal = accounts.filter(a => a.type === "savings").reduce((sum, acc) => sum + acc.balance, 0)
    const loanTotal = accounts.filter(a => a.type === "loan" || a.type === "mortgage").reduce((sum, acc) => sum + acc.balance, 0)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Customer Accounts</h3>
                    <p className="text-sm text-gray-500">
                        {usingFallback && <span className="text-amber-600">(Demo Mode) </span>}
                        {accounts.length} account{accounts.length !== 1 ? 's' : ''} found
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchAccounts}
                    className="gap-2"
                >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-r from-gray-800 to-black text-white rounded-xl p-6 min-h-[100px]">
                    <p className="text-sm text-gray-300 mb-2">Total Value</p>
                    <p className="text-3xl font-bold">{formatCurrency(totalBalance)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6 min-h-[100px]">
                    <p className="text-sm text-gray-500 mb-2">Savings & Investments</p>
                    <p className="text-3xl font-bold text-green-600">{formatCurrency(savingsTotal)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6 min-h-[100px]">
                    <p className="text-sm text-gray-500 mb-2">Outstanding Loans</p>
                    <p className="text-3xl font-bold text-red-600">{formatCurrency(loanTotal)}</p>
                </div>
            </div>

            {/* Accounts Table */}
            {isLoading ? (
                <div className="p-4">
                    <TableSkeleton columnCount={8} rowCount={6} />
                </div>
            ) : accounts.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-700 mb-2">No Accounts</h3>
                    <p className="text-gray-500">This customer doesn't have any accounts yet.</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/50">
                                <TableHead className="py-4 px-6 text-gray-600 font-medium">Name of User</TableHead>
                                <TableHead className="py-4 px-6 text-gray-600 font-medium">Balance</TableHead>
                                <TableHead className="py-4 px-6 text-gray-600 font-medium">User ID</TableHead>
                                <TableHead className="py-4 px-6 text-gray-600 font-medium">Interest</TableHead>
                                <TableHead className="py-4 px-6 text-gray-600 font-medium">Status</TableHead>
                                <TableHead className="py-4 px-6 text-gray-600 font-medium">Account Type</TableHead>
                                <TableHead className="py-4 px-6 text-gray-600 font-medium">Currency</TableHead>
                                <TableHead className="py-4 px-6 text-gray-600 font-medium text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {accounts.map((account) => (
                                <TableRow
                                    key={account.id}
                                    className="cursor-pointer hover:bg-purple-50/30 transition-colors border-b border-gray-100 last:border-0"
                                    onClick={() => handleAccountClick(account)}
                                >
                                    <TableCell className="py-4 px-6 font-medium text-gray-900">{customerName || "Loading..."}</TableCell>
                                    <TableCell className="py-4 px-6 font-semibold text-gray-900">
                                        {formatCurrency(account.balance, account.currency)}
                                    </TableCell>
                                    <TableCell className="py-4 px-6 text-gray-500 font-mono text-xs">{customerId}</TableCell>
                                    <TableCell className="py-4 px-6">
                                        {account.metadata?.interestRate ? (
                                            <span className="text-green-600 font-medium bg-green-50 px-2 py-1 rounded-md text-xs">
                                                {account.metadata.interestRate}%
                                            </span>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize border ${account.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                                                account.status === 'inactive' ? 'bg-gray-50 text-gray-700 border-gray-200' :
                                                    account.status === 'suspended' ? 'bg-red-50 text-red-700 border-red-200' :
                                                        'bg-gray-100 text-gray-500 border-gray-200'
                                            }`}>
                                            {account.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 rounded-md bg-gray-100 text-gray-600">
                                                {getAccountIcon(account.type)}
                                            </div>
                                            <span className="capitalize text-gray-700 font-medium">{account.type}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4 px-6 text-gray-600">{account.currency}</TableCell>
                                    <TableCell className="py-4 px-6 text-right">
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full">
                                            <Eye className="h-4 w-4 text-gray-400" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Account Detail Drawer */}
            <AccountDetailDrawer
                isOpen={isDetailDrawerOpen}
                onClose={() => {
                    setIsDetailDrawerOpen(false)
                    setSelectedAccount(null)
                }}
                account={selectedAccount}
                customerName={customerName}
                onRefresh={fetchAccounts}
            />
        </div>
    )
}
