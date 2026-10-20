import { ChevronDown } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function Header() {
  return (
    <header className="flex items-center justify-between px-[100px] py-4">
      <div className="text-xl font-semibold" style={{ color: "#74612F" }}>
        Spring TD
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <span className="text-xs">🇺🇸</span>
          <span>ENG</span>
          <ChevronDown className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>
            <span className="text-xs mr-2">🇺🇸</span>
            English
          </DropdownMenuItem>
          <DropdownMenuItem>
            <span className="text-xs mr-2">🇪🇸</span>
            Español
          </DropdownMenuItem>
          <DropdownMenuItem>
            <span className="text-xs mr-2">🇫🇷</span>
            Français
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
