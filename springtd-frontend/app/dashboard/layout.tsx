import { DashboardHeader } from "@/components/DashboardHeader";


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* <DashboardHeader /> */}
        {children}
      </body>
    </html>
  );
}
