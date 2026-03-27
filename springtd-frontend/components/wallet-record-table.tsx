import { Search, SlidersHorizontal } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const records = [
  {
    amount: "$0.45",
    ref: "SPI-234-BY45K",
    timestamp: "12:25 / Apr 12, 2025",
    fee: "$0.2",
    product: "Quick Vast",
    metaRef: "X20445-78P",
    userEmail: "grace.yo@spring.td",
    userPhone: "+2347036714538",
  },
  {
    amount: "$0.45",
    ref: "SPI-234-BY45K",
    timestamp: "12:25 / Apr 12, 2025",
    fee: "$0.2",
    product: "Quick Vast",
    metaRef: "X20445-78P",
    userEmail: "grace.yo@spring.td",
    userPhone: "+2347036714538",
  },
  {
    amount: "$0.45",
    ref: "SPI-234-BY45K",
    timestamp: "12:25 / Apr 12, 2025",
    fee: "$0.2",
    product: "Quick Vast",
    metaRef: "X20445-78P",
    userEmail: "grace.yo@spring.td",
    userPhone: "+2347036714538",
  },
  {
    amount: "$0.45",
    ref: "SPI-234-BY45K",
    timestamp: "12:25 / Apr 12, 2025",
    fee: "$0.2",
    product: "Quick Vast",
    metaRef: "X20445-78P",
    userEmail: "grace.yo@spring.td",
    userPhone: "+2347036714538",
  },
]

export default function WalletRecordTable() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 mt-8">
      <div className="p-6 flex items-center justify-between border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Wallet Record</h3>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input placeholder="Search" className="pl-10 w-64" />
          </div>
          <Button variant="outline" className="gap-2 bg-transparent">
            <SlidersHorizontal size={16} />
            Sort
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Amount</TableHead>
              <TableHead>Ref</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>Fee</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Meta_Ref</TableHead>
              <TableHead>User email</TableHead>
              <TableHead>User Phone</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record, index) => (
              <TableRow key={index} className="h-16">
                <TableCell className="font-medium">{record.amount}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {record.ref}
                    <button className="text-gray-400 hover:text-gray-600">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8 2a2 2 0 00-2 2v2H4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-2V4a2 2 0 00-2-2H8z" />
                      </svg>
                    </button>
                  </div>
                </TableCell>
                <TableCell className="text-gray-600">{record.timestamp}</TableCell>
                <TableCell className="text-gray-600">{record.fee}</TableCell>
                <TableCell className="text-gray-600">{record.product}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {record.metaRef}
                    <button className="text-gray-400 hover:text-gray-600">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8 2a2 2 0 00-2 2v2H4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-2V4a2 2 0 00-2-2H8z" />
                      </svg>
                    </button>
                  </div>
                </TableCell>
                <TableCell className="text-gray-600">{record.userEmail}</TableCell>
                <TableCell className="text-gray-600">{record.userPhone}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
