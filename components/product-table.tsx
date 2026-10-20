import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface ProductTableProps {
  title: string
}

const products = [
  {
    amount: "$0.45",
    ref: "SPI-234-BY45K",
    timestamp: "12:45 / Apr 12. 2025",
    fee: "$0.2",
    product: "Quick Vast",
    metaRef: "X20445-78P",
    allUsers: "grace.yo@spring.td",
    userPhone: "+2347036714538",
  },
  {
    amount: "$0.45",
    ref: "SPI-234-BY45K",
    timestamp: "12:45 / Apr 12. 2025",
    fee: "$0.2",
    product: "Quick Vast",
    metaRef: "X20445-78P",
    allUsers: "grace.yo@spring.td",
    userPhone: "+2347036714538",
  },
  {
    amount: "$0.45",
    ref: "SPI-234-BY45K",
    timestamp: "12:45 / Apr 12. 2025",
    fee: "$0.2",
    product: "Quick Vast",
    metaRef: "X20445-78P",
    allUsers: "grace.yo@spring.td",
    userPhone: "+2347036714538",
  },
  {
    amount: "$0.45",
    ref: "SPI-234-BY45K",
    timestamp: "12:45 / Apr 12. 2025",
    fee: "$0.2",
    product: "Quick Vast",
    metaRef: "X20445-78P",
    allUsers: "grace.yo@spring.td",
    userPhone: "+2347036714538",
  },
]

export default function ProductTable({ title }: ProductTableProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-6 flex items-center justify-between border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <Button className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white">
          <Plus size={16} className="mr-2" />
          Create Product
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Amount</TableHead>
              <TableHead>Ref</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>Fee</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Meta_Ref</TableHead>
              <TableHead>All users</TableHead>
              <TableHead>User Phone</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{product.amount}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {product.ref}
                    <button className="text-gray-400 hover:text-gray-600">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8 2a2 2 0 00-2 2v2H4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-2V4a2 2 0 00-2-2H8z" />
                      </svg>
                    </button>
                  </div>
                </TableCell>
                <TableCell className="text-gray-600">{product.timestamp}</TableCell>
                <TableCell className="text-gray-600">{product.fee}</TableCell>
                <TableCell className="text-gray-600">{product.product}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {product.metaRef}
                    <button className="text-gray-400 hover:text-gray-600">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8 2a2 2 0 00-2 2v2H4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-2V4a2 2 0 00-2-2H8z" />
                      </svg>
                    </button>
                  </div>
                </TableCell>
                <TableCell className="text-gray-600">{product.allUsers}</TableCell>
                <TableCell className="text-gray-600">{product.userPhone}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
