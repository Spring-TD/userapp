"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Users, CreditCard, Activity, ArrowUpRight, ArrowDownRight, Eye } from "lucide-react"
import { TransactionHistoryDrawer } from "@/components/transaction-history-drawer"

export default function OverviewPage() {
  const [showTransactionDrawer, setShowTransactionDrawer] = useState(false)

  const stats = [
    {
      title: "Total Revenue",
      value: "$45,231.89",
      change: "+20.1%",
      trend: "up",
      icon: DollarSign,
    },
    {
      title: "Active Users",
      value: "2,350",
      change: "+180.1%",
      trend: "up",
      icon: Users,
    },
    {
      title: "Total Transactions",
      value: "12,234",
      change: "+19%",
      trend: "up",
      icon: CreditCard,
    },
    {
      title: "Conversion Rate",
      value: "3.2%",
      change: "+201",
      trend: "up",
      icon: Activity,
    },
  ]

  const recentTransactions = [
    {
      id: "1",
      customer: "Olivia Martin",
      email: "olivia.martin@email.com",
      amount: "+$1,999.00",
      status: "Successful",
      date: "Sept 19, 2025",
    },
    {
      id: "2",
      customer: "Jackson Lee",
      email: "jackson.lee@email.com",
      amount: "+$39.00",
      status: "Pending",
      date: "Sept 19, 2025",
    },
    {
      id: "3",
      customer: "Isabella Nguyen",
      email: "isabella.nguyen@email.com",
      amount: "+$299.00",
      status: "Failed",
      date: "Sept 19, 2025",
    },
    {
      id: "4",
      customer: "William Kim",
      email: "will@email.com",
      amount: "+$99.00",
      status: "Successful",
      date: "Sept 19, 2025",
    },
    {
      id: "5",
      customer: "Sofia Davis",
      email: "sofia.davis@email.com",
      amount: "+$39.00",
      status: "Successful",
      date: "Sept 19, 2025",
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Successful":
        return "bg-green-100 text-green-800"
      case "Pending":
        return "bg-orange-100 text-orange-800"
      case "Failed":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center text-xs text-gray-600">
                {stat.trend === "up" ? (
                  <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-600 mr-1" />
                )}
                <span className={stat.trend === "up" ? "text-green-600" : "text-red-600"}>{stat.change}</span>
                <span className="ml-1">from last month</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[200px] flex items-center justify-center text-gray-500">
              Chart placeholder - Revenue data visualization
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
            <p className="text-sm text-gray-600">You made 265 sales this month.</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.slice(0, 3).map((transaction) => (
                <div key={transaction.id} className="flex items-center">
                  <div className="w-9 h-9 rounded-full bg-[#F0ECE2] flex items-center justify-center mr-3">
                    <span className="text-sm font-medium text-[#9A813F]">
                      {transaction.customer
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">{transaction.customer}</p>
                    <p className="text-sm text-gray-600">{transaction.email}</p>
                  </div>
                  <div className="font-medium">{transaction.amount}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Transactions</CardTitle>
            <p className="text-sm text-gray-600">A list of your recent transactions.</p>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowTransactionDrawer(true)}
            className="text-[#9A813F] border-[#9A813F] bg-transparent hover:bg-[#9A813F] hover:text-white"
          >
            <Eye className="w-4 h-4 mr-2" />
            View All
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-4 text-sm font-medium text-gray-700 pb-2 border-b">
              <div>Customer</div>
              <div>Email</div>
              <div>Amount</div>
              <div>Status</div>
              <div>Date</div>
            </div>
            {recentTransactions.map((transaction) => (
              <div key={transaction.id} className="grid grid-cols-5 gap-4 text-sm py-2">
                <div className="font-medium">{transaction.customer}</div>
                <div className="text-gray-600">{transaction.email}</div>
                <div className="font-medium">{transaction.amount}</div>
                <div>
                  <Badge className={getStatusColor(transaction.status)}>{transaction.status}</Badge>
                </div>
                <div className="text-gray-600">{transaction.date}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <TransactionHistoryDrawer open={showTransactionDrawer} onOpenChange={setShowTransactionDrawer} />
    </div>
  )
}
