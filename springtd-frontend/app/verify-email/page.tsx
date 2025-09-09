import { EmailVerificationInstruction } from "@/components/email-verification-instruction";
import { Header } from "@/components/header";


export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="flex items-center justify-center px-6 py-12">
        <EmailVerificationInstruction />
      </main>
    </div>
  )
}
