import { Search, SlidersHorizontal, MoreVertical } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const users = [
  {
    userName: "Grace Ayomide",
    email: "Graceayo@email.com",
    userId: "X20445-78P",
    submittedFile: "View",
  },
  {
    userName: "Chidi Obi",
    email: "chidiobi@email.com",
    userId: "X20445-78P",
    submittedFile: "View",
  },
  {
    userName: "Grace Ayomide",
    email: "Graceayo@email.com",
    userId: "X20445-78P",
    submittedFile: "View",
  },
  {
    userName: "Chidi Obi",
    email: "chidiobi@email.com",
    userId: "X20445-78P",
    submittedFile: "View",
  },
]

export default function DriveUsersTable() {
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
              <TableHead>User Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead>Submitted File</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{user.userName}</TableCell>
                <TableCell className="text-gray-600">{user.email}</TableCell>
                <TableCell className="text-gray-600">{user.userId}</TableCell>
                <TableCell>
                  <Button variant="secondary" size="sm" className="bg-gray-200 text-gray-700 hover:bg-gray-300">
                    {user.submittedFile}
                  </Button>
                </TableCell>
                <TableCell>
                  <button className="text-gray-400 hover:text-gray-600">
                    <MoreVertical size={20} />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
