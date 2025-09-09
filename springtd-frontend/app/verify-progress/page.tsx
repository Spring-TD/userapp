import { EmailVerificationProgress } from "@/components/email-verification-progress";
import { Header } from "@/components/header";


export default function VerifyProgressPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="flex items-center justify-center px-6 py-12">
        <EmailVerificationProgress />
      </main>
    </div>
  )
}
