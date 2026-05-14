import { SigninForm } from "@/components/signin-form"

export default function SigninPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 relative">
      <div className="absolute top-8 left-0 right-0 flex justify-center">
        <span className="text-2xl font-bold text-[#9A813F]">Product Builder</span>
      </div>
      <div className="w-full max-w-lg px-4">
        <SigninForm />
      </div>
    </div>
  )
}