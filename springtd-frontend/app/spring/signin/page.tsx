"use client"

import { AuthLayout } from "@/components/auth-layout"
import { SpringSigninForm } from "@/components/spring-signin-form"

export default function SigninPage() {
    return (
        <AuthLayout>
            <SpringSigninForm />
        </AuthLayout>
    )
}
