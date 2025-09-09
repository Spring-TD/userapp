import { Header } from "@/components/header"
import { RegistrationForm } from "@/components/registration-form"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Fixed top header */}
      <Header />

      {/* Center form in remaining space */}
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <RegistrationForm />
      </main>
    </div>
  )
}
