import { EmailVerificationSuccess } from "@/components/email-verification-success";
import { Header } from "@/components/header";


export default function VerifySuccessPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="flex items-center justify-center px-6 py-12">
        <EmailVerificationSuccess />
      </main>
    </div>
  )
}
