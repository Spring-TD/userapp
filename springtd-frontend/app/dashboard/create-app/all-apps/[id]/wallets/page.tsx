import { redirect } from "next/navigation"

export default async function WalletsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/dashboard/create-app/all-apps/${id}/wallets/treasury`)
}
