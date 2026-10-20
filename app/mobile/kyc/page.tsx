import { redirect } from 'next/navigation';

/** Legacy manual KYC — redirect to FusPay modular flow. */
export default function LegacyMobileKycRedirect() {
  redirect('/mobile-v2/profile/kyc/create');
}
