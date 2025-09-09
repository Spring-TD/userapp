import { Header } from "@/components/header";
import { LoginForm } from "@/components/login-form";


export default function LoginPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: "url('/images/bg-login.jpg')" }}
    >
      {/* Centered login form */}
      <LoginForm />
    </div>
  )
}
