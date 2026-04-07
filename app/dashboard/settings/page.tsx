"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronRight, CircleHelp, Copy, Flag, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Tabs from "@/components/Tabs"
import { CountrySelect } from "@/components/ui/country-select"
import { useCountries } from "@/hooks/useCountries"
import { fetchWithAuth } from "@/lib/fetchWithAuth"
import { BACKEND } from "@/lib/endpoints"
import type { AuthUser, SessionDto } from "@/types/auth"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState("account-settings")
    const [deactivateOpen, setDeactivateOpen] = useState(false)

    const [profileLoading, setProfileLoading] = useState(false)
    const [profile, setProfile] = useState<AuthUser | null>(null)

    const [fullName, setFullName] = useState("")
    const [currentEmail, setCurrentEmail] = useState("")
    const [phone, setPhone] = useState("")
    const [country, setCountry] = useState("")

    const [newEmail, setNewEmail] = useState("")
    const [confirmEmail, setConfirmEmail] = useState("")
    const [emailCurrentPassword, setEmailCurrentPassword] = useState("")

    const [passwordCurrent, setPasswordCurrent] = useState("")
    const [passwordNew, setPasswordNew] = useState("")
    const [passwordConfirm, setPasswordConfirm] = useState("")
    const [passwordUpdating, setPasswordUpdating] = useState(false)

    const [profileUpdating, setProfileUpdating] = useState(false)
    const [emailUpdating, setEmailUpdating] = useState(false)
    const [deactivateLoading, setDeactivateLoading] = useState(false)

    const [sessionsLoading, setSessionsLoading] = useState(false)
    const [sessions, setSessions] = useState<SessionDto[]>([])

    const { countries } = useCountries()
    const resolvedCountryCode = useMemo(() => {
        const raw = (country ?? "").trim().toLowerCase()
        if (!raw) return ""
        if (countries.some((c) => c.code === raw)) return raw
        const matchByName = countries.find((c) => c.name.toLowerCase() === raw)
        return matchByName?.code ?? raw
    }, [country, countries])

    const selectedDialCode = useMemo(() => {
        if (!resolvedCountryCode) return ""
        return countries.find((c) => c.code === resolvedCountryCode)?.dialCode ?? ""
    }, [countries, resolvedCountryCode])

    // Some REST Countries records can return "+2" root for Nigeria depending on the IDD shape.
    // Force Nigeria to the expected "+234" so the UI prefix + stored phone number are consistent.
    const normalizedDialCode = useMemo(() => {
        if (resolvedCountryCode === "ng") return "+234"
        return selectedDialCode
    }, [resolvedCountryCode, selectedDialCode])

    const tabs = [
        { id: "account-settings", label: "Account Settings" },
        { id: "login-security", label: "Login & Security" },
        { id: "contact-support", label: "Contact Support" },
        { id: "account-control", label: "Account Control" },
    ]

    useEffect(() => {
        const loadProfile = async () => {
            try {
                setProfileLoading(true)
                const res = await fetchWithAuth(BACKEND.user.profile, { method: "GET" })
                const json = await res.json().catch(() => ({}))
                if (!res.ok) return

                const dataAny = (json?.data ?? json) as any
                const firstName = dataAny?.first_name ?? dataAny?.firstName ?? dataAny?.first
                const lastName = dataAny?.last_name ?? dataAny?.lastName ?? dataAny?.last
                const emailValue = dataAny?.email ?? dataAny?.user?.email ?? dataAny?.data?.email ?? ""
                const phoneValue = dataAny?.phone ?? dataAny?.phone_number ?? dataAny?.phoneNumber ?? ""
                const countryValue = dataAny?.country ?? dataAny?.country_code ?? dataAny?.countryCode ?? ""

                setProfile(dataAny as AuthUser)

                setFullName(
                    [firstName, lastName].filter((v) => typeof v === "string" && v.trim().length > 0).join(" "),
                )
                setCurrentEmail(emailValue)
                // Input field expects local part (no "+" prefix)
                setPhone((phoneValue ?? "").replace(/^\+\d+/, ""))
                setCountry((countryValue ?? "").toLowerCase())
            } finally {
                setProfileLoading(false)
            }
        }

        void loadProfile()
    }, [])

    useEffect(() => {
        if (activeTab !== "login-security") return

        const loadSessions = async () => {
            try {
                setSessionsLoading(true)
                const res = await fetchWithAuth(BACKEND.sessions.list, { method: "GET" })
                const json = await res.json().catch(() => ({}))
                if (!res.ok) return

                const list =
                    (Array.isArray(json?.data?.sessions) ? (json.data.sessions as SessionDto[]) : undefined) ??
                    (Array.isArray(json?.data?.data?.sessions) ? (json.data.data.sessions as SessionDto[]) : undefined) ??
                    (Array.isArray(json?.data) ? (json.data as SessionDto[]) : undefined) ??
                    (Array.isArray(json?.sessions) ? (json.sessions as SessionDto[]) : undefined) ??
                    []
                setSessions(Array.isArray(list) ? list : [])
            } finally {
                setSessionsLoading(false)
            }
        }

        void loadSessions()
    }, [activeTab])

    const handleUpdateProfile = async () => {
        try {
            setProfileUpdating(true)
            const name = fullName.trim().replace(/\s+/g, " ")
            const [firstName, ...rest] = name.split(" ")
            const lastName = rest.join(" ")

            const body = {
                first_name: firstName || "",
                last_name: lastName || "",
                phone: normalizedDialCode ? `${normalizedDialCode}${phone}` : phone,
                country: resolvedCountryCode,
            }

            const res = await fetchWithAuth(BACKEND.user.updateProfile, {
                method: "PUT",
                body: JSON.stringify(body),
            })
            if (!res.ok) return

            await (async () => {
                const res2 = await fetchWithAuth(BACKEND.user.profile, { method: "GET" })
                const json2 = await res2.json().catch(() => ({}))
                const data2Any = (json2?.data ?? json2) as any
                const first2 = data2Any?.first_name ?? data2Any?.firstName ?? data2Any?.first
                const last2 = data2Any?.last_name ?? data2Any?.lastName ?? data2Any?.last
                const email2 = data2Any?.email ?? data2Any?.user?.email ?? data2Any?.data?.email ?? currentEmail
                const phone2 = data2Any?.phone ?? data2Any?.phone_number ?? data2Any?.phoneNumber ?? ""
                const country2 = data2Any?.country ?? data2Any?.country_code ?? data2Any?.countryCode ?? ""

                setProfile(data2Any as AuthUser)
                setFullName([first2, last2].filter(Boolean).join(" "))
                setCurrentEmail(email2)
                setPhone((phone2 ?? "").replace(/^\+\d+/, ""))
                setCountry((country2 ?? "").toLowerCase())
            })()
        } finally {
            setProfileUpdating(false)
        }
    }

    const handleUpdateEmail = async () => {
        if (!newEmail || !confirmEmail) return
        if (newEmail !== confirmEmail) return

        try {
            setEmailUpdating(true)
            const body = {
                newEmail,
                confirmEmail,
                currentPassword: emailCurrentPassword,
            }
            const res = await fetchWithAuth(BACKEND.user.updateEmail, {
                method: "PUT",
                body: JSON.stringify(body),
            })
            if (!res.ok) return

            setNewEmail("")
            setConfirmEmail("")
            setEmailCurrentPassword("")
            await handleUpdateProfile()
        } finally {
            setEmailUpdating(false)
        }
    }

    const handleChangePassword = async () => {
        if (!passwordCurrent || !passwordNew || !passwordConfirm) return
        if (passwordNew !== passwordConfirm) return

        try {
            setPasswordUpdating(true)
            const res = await fetchWithAuth(BACKEND.password.change, {
                method: "PUT",
                body: JSON.stringify({ currentPassword: passwordCurrent, newPassword: passwordNew }),
            })
            if (!res.ok) return

            setPasswordCurrent("")
            setPasswordNew("")
            setPasswordConfirm("")
        } finally {
            setPasswordUpdating(false)
        }
    }

    const handleRevokeSession = async (sessionId: string) => {
        try {
            const res = await fetchWithAuth(BACKEND.sessions.revoke(sessionId), { method: "DELETE" })
            if (!res.ok) return
            setSessions((prev) => prev.filter((s) => s.id !== sessionId))
        } catch {
            // ignore
        }
    }

    const handleDeactivate = async () => {
        try {
            setDeactivateLoading(true)
            const res = await fetchWithAuth(BACKEND.user.deactivate, { method: "POST", body: JSON.stringify({}) })
            if (!res.ok) return

            setDeactivateOpen(false)
        } finally {
            setDeactivateLoading(false)
        }
    }

    return (
        <div className="p-8 bg-white min-h-full">
            <div className="flex flex-col space-y-8">
                {/* Header with Tabs */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-200 pb-0">
                    <div className="flex-1">
                        <Tabs
                            tabs={tabs}
                            activeTab={activeTab}
                            onTabChange={setActiveTab}
                            containerClassName="border-b-0"
                        />
                    </div>
                </div>

                {/* Tab Content */}
                {activeTab === "account-settings" && (
                    <div className="space-y-6 max-w-5xl">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Update Account</h3>
                            <p className="text-sm text-gray-500">Update your account information.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="fullName" className="text-gray-600 font-normal">
                                    Full name
                                </Label>
                                <Input
                                    id="fullName"
                                    placeholder="Please enter your full name"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="bg-[#F0F2F5] border-none text-gray-900 placeholder:text-gray-400 h-12"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-gray-600 font-normal">
                                    Email
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={currentEmail}
                                    readOnly
                                    className="bg-[#F0F2F5] border-none text-gray-900 placeholder:text-gray-400 h-12"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="country" className="text-gray-600 font-normal">
                                    Country
                                </Label>
                                <div className="grid grid-cols-1 gap-3">
                                    <CountrySelect
                                        value={resolvedCountryCode}
                                        onValueChange={(value) => setCountry(value)}
                                        placeholder="Select Country"
                                        triggerClassName="w-full !h-12 bg-[#F0F2F5] border-none text-gray-900 placeholder:text-gray-400"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone" className="text-gray-600 font-normal">
                                    Phone number
                                </Label>
                                <div className="flex">
                                    <div className="flex items-center justify-center bg-[#F0F2F5] px-3 rounded-l-md border-r border-gray-300 text-gray-500 h-12 min-w-[56px] w-[56px]">
                                        {normalizedDialCode || "+"}
                                    </div>
                                    <Input
                                        id="phone"
                                        placeholder="Please enter your phone number"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="bg-[#F0F2F5] border-none text-gray-900 placeholder:text-gray-400 h-12 rounded-l-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-6">
                            <Button
                                className="bg-[#9A813F] text-white hover:bg-[#8A7335] rounded-md px-6"
                                onClick={() => void handleUpdateProfile()}
                                disabled={profileUpdating}
                            >
                                {profileUpdating ? "Updating..." : "Update Profile"}
                            </Button>
                        </div>

                        <div className="rounded-lg py-6 space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Update Email</h3>
                                <p className="text-sm text-gray-500">Confirm your password and provide the new email.</p>
                            </div>

                            <div className="flex lg:flex-row flex-col gap-x-8 w-full gap-y-4">
                                <div className="space-y-2 w-full">
                                    <Label htmlFor="newEmail" className="text-gray-600 font-normal">
                                        New email
                                    </Label>
                                    <Input
                                        id="newEmail"
                                        type="email"
                                        placeholder="Please enter your new email"
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        className="bg-[#F0F2F5] border-none text-gray-900 placeholder:text-gray-400 h-12"
                                    />
                                </div>
                                <div className="space-y-2 w-full">
                                    <Label htmlFor="confirmEmail" className="text-gray-600 font-normal">
                                        Confirm new email
                                    </Label>
                                    <Input
                                        id="confirmEmail"
                                        type="email"
                                        placeholder="Please confirm your new email"
                                        value={confirmEmail}
                                        onChange={(e) => setConfirmEmail(e.target.value)}
                                        className="bg-[#F0F2F5] border-none text-gray-900 placeholder:text-gray-400 h-12"
                                    />
                                </div>

                                <div className="space-y-2 w-full">
                                    <Label htmlFor="emailCurrentPassword" className="text-gray-600 font-normal">
                                        Current password
                                    </Label>
                                    <Input
                                        id="emailCurrentPassword"
                                        type="password"
                                        placeholder="Enter your current password"
                                        value={emailCurrentPassword}
                                        onChange={(e) => setEmailCurrentPassword(e.target.value)}
                                        className="bg-[#F0F2F5] border-none text-gray-900 placeholder:text-gray-400 h-12"
                                    />
                                </div>
                            </div>

                            <Button
                                className="bg-[#9A813F] text-white hover:bg-[#8A7335] rounded-md px-6 mt-4"
                                onClick={() => void handleUpdateEmail()}
                                disabled={emailUpdating || profileUpdating}
                            >
                                {emailUpdating ? "Updating..." : "Update Email"}
                            </Button>
                        </div>
                    </div>
                )}

                {activeTab === "login-security" && (
                    <div className="space-y-10 max-w-5xl">
                        {/* Change Password Section */}
                        <section>
                            <div className="mb-6">
                                <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
                                <p className="text-sm text-gray-500">Update your password to keep your account secure</p>
                            </div>
                            <div className="space-y-6">
                                <Input
                                    placeholder="Enter Current Password"
                                    type="password"
                                    value={passwordCurrent}
                                    onChange={(e) => setPasswordCurrent(e.target.value)}
                                    className="bg-[#F0F2F5] border-none text-gray-900 placeholder:text-gray-400 h-12"
                                />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Input
                                        placeholder="Enter New Password"
                                        type="password"
                                        value={passwordNew}
                                        onChange={(e) => setPasswordNew(e.target.value)}
                                        className="bg-[#F0F2F5] border-none text-gray-900 placeholder:text-gray-400 h-12"
                                    />
                                    <Input
                                        placeholder="Confirm New Password"
                                        type="password"
                                        value={passwordConfirm}
                                        onChange={(e) => setPasswordConfirm(e.target.value)}
                                        className="bg-[#F0F2F5] border-none text-gray-900 placeholder:text-gray-400 h-12"
                                    />
                                </div>
                            </div>
                            
                            <div className="mt-6">
                                <Button
                                    className="bg-[#9A813F] text-white hover:bg-[#8A7335] rounded-md px-6"
                                    onClick={() => void handleChangePassword()}
                                    disabled={passwordUpdating}
                                >
                                    {passwordUpdating ? "Updating..." : "Update Password"}
                                </Button>
                            </div>
                        </section>

                        {/* Active Sessions Section */}
                        <section>
                            <div className="mb-6">
                                <h2 className="text-lg font-semibold text-gray-900">Active Sessions</h2>
                                <p className="text-sm text-gray-500">Manage your active login sessions across devices.</p>
                            </div>
                            <div className="bg-[#F0F2F5] rounded-lg p-6 space-y-4">
                                {sessionsLoading ? (
                                    <p className="text-sm text-gray-500">Loading sessions...</p>
                                ) : sessions.length === 0 ? (
                                    <p className="text-sm text-gray-500">No active sessions.</p>
                                ) : (
                                    sessions.map((s) => (
                                        <div key={s.id} className="flex justify-between items-center bg-white p-4 rounded-md shadow-sm">
                                            <div>
                                                <p className="font-medium text-gray-900">{s.deviceInfo || "Unknown device"}</p>
                                                <p className="text-sm text-gray-500">
                                                    {s.ipAddress ? `${s.ipAddress} • ` : ""}
                                                    {s.lastActiveAt ? `Last active: ${s.lastActiveAt}` : "Active"}
                                                </p>
                                            </div>
                                            {s.isCurrent ? (
                                                <span className="text-green-600 text-sm font-medium">Current</span>
                                            ) : (
                                                <button
                                                    className="text-red-500 text-sm font-medium hover:text-red-600"
                                                    onClick={() => void handleRevokeSession(s.id)}
                                                >
                                                    Revoke
                                                </button>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>

                        {/* API Keys — integration keys (per-app keys live under each app’s Settings) */}
                        <section>
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
                                <div className="space-y-1">
                                    <h2 className="text-lg font-semibold text-gray-900">API Keys</h2>
                                    <p className="text-sm text-gray-500">Manage your API keys for integration</p>
                                </div>
                                <Button
                                    type="button"
                                    className="bg-[#7F56D9] text-white hover:bg-[#6941C6] rounded-md px-6 shrink-0 w-full sm:w-auto"
                                >
                                    Generate New Key
                                </Button>
                            </div>
                            <div className="bg-[#F0F2F5] rounded-lg border border-gray-200/80 p-6 space-y-4">
                                <div className="flex justify-between items-center gap-4 bg-white p-4 rounded-md border border-gray-200 shadow-sm">
                                    <div className="min-w-0">
                                        <p className="font-medium text-gray-900">Production Key</p>
                                        <p className="text-sm text-gray-500">Created Dec 1, 2025</p>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <button
                                            type="button"
                                            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                                            aria-label="Copy key"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            className="rounded-md p-1.5 text-red-500 hover:bg-red-50 hover:text-red-600"
                                            aria-label="Delete key"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center gap-4 bg-white p-4 rounded-md border border-gray-200 shadow-sm">
                                    <div className="min-w-0">
                                        <p className="font-medium text-gray-900">Development Key</p>
                                        <p className="text-sm text-gray-500">Created Dec 5, 2025</p>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <button
                                            type="button"
                                            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                                            aria-label="Copy key"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            className="rounded-md p-1.5 text-red-500 hover:bg-red-50 hover:text-red-600"
                                            aria-label="Delete key"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center gap-4 bg-white p-4 rounded-md border border-gray-200 shadow-sm">
                                    <div className="min-w-0">
                                        <p className="font-medium text-gray-900">Production Key</p>
                                        <p className="text-sm text-gray-500">Created Dec 8, 2025</p>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <button
                                            type="button"
                                            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                                            aria-label="Copy key"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            className="rounded-md p-1.5 text-red-500 hover:bg-red-50 hover:text-red-600"
                                            aria-label="Delete key"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 mt-4">
                                For credentials tied to a specific application, open it from{" "}
                                <strong className="font-medium text-gray-700">All Apps</strong>, then use{" "}
                                <strong className="font-medium text-gray-700">Settings</strong> in the app sidebar.
                            </p>
                        </section>
                    </div>
                )}

                {activeTab === "contact-support" && (
                    <div className="max-w-5xl">
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold text-gray-900">Frequently Asked Questions</h2>
                            <p className="text-sm text-gray-500">Find answers to common questions about Spring TD</p>
                        </div>
                        <div className="bg-[#F0F2F5] rounded-lg p-6 space-y-4">
                            <button className="w-full flex items-center justify-between bg-white p-4 rounded-md shadow-sm hover:bg-gray-50 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
                                        <CircleHelp className="w-5 h-5 text-white" />
                                    </div>
                                    <span className="font-medium text-gray-900">Customer Support</span>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                            </button>

                            <button className="w-full flex items-center justify-between bg-white p-4 rounded-md shadow-sm hover:bg-gray-50 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center">
                                        <CircleHelp className="w-5 h-5 text-gray-900" />
                                    </div>
                                    <span className="font-medium text-gray-900">Website</span>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                            </button>

                            <button className="w-full flex items-center justify-between bg-white p-4 rounded-md shadow-sm hover:bg-gray-50 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center">
                                        <Flag className="w-5 h-5 text-gray-900" />
                                    </div>
                                    <span className="font-medium text-gray-900">WhatsApp</span>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === "account-control" && (
                    <div className="max-w-5xl">
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold text-gray-900">Deactivate Account</h2>
                        </div>
                        <div className="bg-[#F0F2F5] rounded-lg p-8">
                            <p className="text-gray-600 mb-6">
                                Temporarily deactivate your account. Your data will be preserved and you can reactivate anytime by logging back in. Your subscription will be paused during deactivation.
                            </p>
                            <ul className="list-disc pl-5 space-y-2 text-gray-600 mb-8">
                                <li>Your profile will not be visible to others.</li>
                                <li>Active subscriptions will be paused.</li>
                                <li>You can reactivate within 90 days.</li>
                                <li>After 90 days, your account may be permanently deleted.</li>
                            </ul>
                            <Button
                                onClick={() => setDeactivateOpen(true)}
                                className="bg-[#FF4D4F] hover:bg-[#FF7875] text-white border-none px-6"
                            >
                                Deactivate Account
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Deactivate account confirmation modal */}
            <AlertDialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
                <AlertDialogContent className="sm:max-w-md text-center">
                    <AlertDialogHeader>
                        <div className="flex justify-center mb-2">
                            <div className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center">
                                <X className="w-7 h-7 text-white" strokeWidth={2.5} />
                            </div>
                        </div>
                        <AlertDialogTitle className="text-xl">Deactivate</AlertDialogTitle>
                        <AlertDialogDescription className="text-base text-gray-600">
                            Are you sure to deactivate your account?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex gap-3 sm:justify-center mt-6">
                        <AlertDialogCancel className="border-gray-300 bg-white text-gray-900 hover:bg-gray-50 px-6">
                            No, Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-[#FF4D4F] hover:bg-[#FF7875] text-white px-6"
                                    onClick={() => void handleDeactivate()}
                                    disabled={deactivateLoading}
                                    onClick={() => void handleDeactivate()}
                                    disabled={deactivateLoading}
                        >
                                    {deactivateLoading ? "Deactivating..." : "Yes"}
                                    {deactivateLoading ? "Deactivating..." : "Yes"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
