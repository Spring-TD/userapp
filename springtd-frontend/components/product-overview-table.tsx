import { Search, SlidersHorizontal } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const records = [
  {
    amount: "$0.45",
    ref: "SPI-234-BY45K",
    timestamp: "12:45 / Apr 12, 2025",
    fee: "$0.2",
    product: "Quick Vast",
    metaRef: "X20445-78P",
    allUsers: "grace.yo@spring.td",
    userPhone: "+2347036714538",
  },
  {
    amount: "$0.45",
    ref: "SPI-234-BY45K",
    timestamp: "12:45 / Apr 12, 2025",
    fee: "$0.2",
    product: "Quick Vast",
    metaRef: "X20445-78P",
    allUsers: "grace.yo@spring.td",
    userPhone: "+2347036714538",
  },
  {
    amount: "$0.45",
    ref: "SPI-234-BY45K",
    timestamp: "12:45 / Apr 12, 2025",
    fee: "$0.2",
    product: "Quick Vast",
    metaRef: "X20445-78P",
    allUsers: "grace.yo@spring.td",
    userPhone: "+2347036714538",
  },
  {
    amount: "$0.45",
    ref: "SPI-234-BY45K",
    timestamp: "12:45 / Apr 12, 2025",
    fee: "$0.2",
    product: "Quick Vast",
    metaRef: "X20445-78P",
    allUsers: "grace.yo@spring.td",
    userPhone: "+2347036714538",
  },
]

export default function ProductOverviewTable() {
  return (
    <div>
      <div className="flex items-center justify-end gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input placeholder="Search" className="pl-10 w-64" />
        </div>
        <Button variant="outline" className="gap-2 bg-transparent">
          <SlidersHorizontal size={16} />
          Sort
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="py-4">Amount</TableHead>
              <TableHead className="py-4">Ref</TableHead>
              <TableHead className="py-4">Timestamp</TableHead>
              <TableHead className="py-4">Fee</TableHead>
              <TableHead className="py-4">Product</TableHead>
              <TableHead className="py-4">Meta_Ref</TableHead>
              <TableHead className="py-4">All users</TableHead>
              <TableHead className="py-4">User Phone</TableHead>
            </TableRow>
            {/* </CHANGE> */}
          </TableHeader>
          <TableBody>
            {records.map((record, index) => (
              <TableRow key={index} className="hover:bg-gray-50">
                <TableCell className="font-medium py-5">{record.amount}</TableCell>
                <TableCell className="py-5">
                  <div className="flex items-center gap-2">
                    {record.ref}
                    <button className="text-gray-400 hover:text-gray-600">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8 2a2 2 0 00-2 2v2H4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-2V4a2 2 0 00-2-2H8z" />
                      </svg>
                    </button>
                  </div>
                </TableCell>
                <TableCell className="text-gray-600 py-5">{record.timestamp}</TableCell>
                <TableCell className="text-gray-600 py-5">{record.fee}</TableCell>
                <TableCell className="text-gray-600 py-5">{record.product}</TableCell>
                <TableCell className="py-5">
                  <div className="flex items-center gap-2">
                    {record.metaRef}
                    <button className="text-gray-400 hover:text-gray-600">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8 2a2 2 0 00-2 2v2H4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-2V4a2 2 0 00-2-2H8z" />
                      </svg>
                    </button>
                  </div>
                </TableCell>
                <TableCell className="text-gray-600 py-5">{record.allUsers}</TableCell>
                <TableCell className="text-gray-600 py-5">{record.userPhone}</TableCell>
              </TableRow>
              // </CHANGE>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
