import { normalizeProductType } from '../utils/productType';

export interface OfferLetterApplicationSource {
  id: string;
  localApplicationId?: string;
  productType?: string;
  productName?: string;
  merchantName?: string;
  offeringMerchantName?: string;
  merchantId?: string;
  contractSnapshot?: Record<string, unknown>;
}

export interface OfferLetterContent {
  kind: 'MORTGAGE' | 'LOAN';
  letterDate: string;
  borrowerFullName: string;
  borrowerFirstName: string;
  borrowerAddressLine1: string;
  borrowerAddressLine2: string;
  borrowerEmail: string;
  borrowerPhone: string;
  reference: string;
  applicationId: string;
  lenderName: string;
  productName: string;
  propertyAddress?: string;
  propertyType?: string;
  purchasePrice?: string;
  independentValuation?: string;
  valuerName?: string;
  valuationDate?: string;
  titleType?: string;
  developerOrSeller?: string;
  propertyManagementPartner?: string;
  loanAmount: string;
  loanAmountWords?: string;
  loanToValue?: string;
  equityContribution?: string;
  equityDueDate?: string;
  interestRate?: string;
  mortgageTenor?: string;
  repaymentFrequency?: string;
  estimatedMonthlyRepayment?: string;
  moratorium?: string;
  processingFee?: string;
  legalFees?: string;
  insurance?: string;
  security?: string;
  offerValidUntil: string;
  signatoryName?: string;
  signatoryTitle?: string;
  acceptanceStatus: string;
  acceptanceDate?: string;
  acceptanceId?: string;
  platformName: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== undefined && value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringFrom(value: unknown, fallback = '—'): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return fallback;
}

function formatMoney(amount: number, currency: string): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    return '—';
  }
  return `${currency} ${amount.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
}

function formatPercent(value: number | undefined): string | undefined {
  if (value == null || !Number.isFinite(value)) {
    return undefined;
  }
  return `${value.toLocaleString('en-NG', { maximumFractionDigits: 2 })}%`;
}

function formatLetterDate(date = new Date()): string {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function firstName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return 'Customer';
  }
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

function applicantContact(snapshot: Record<string, unknown>): {
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
} {
  const applicant = asRecord(snapshot.applicant) ?? asRecord(snapshot.user) ?? {};
  const address = asRecord(applicant.address) ?? asRecord(snapshot.address) ?? {};

  const line1 =
    stringFrom(address.line1, '') ||
    stringFrom(address.street, '') ||
    stringFrom(address.addressLine1, '') ||
    stringFrom(applicant.addressLine1, '');
  const city = stringFrom(address.city, '');
  const state = stringFrom(address.state, '');
  const country = stringFrom(address.country, '');
  const line2 =
    [city, state, country].filter((part) => part && part !== '—').join(', ') ||
    stringFrom(address.line2, '') ||
    stringFrom(applicant.addressLine2, '');

  return {
    email: stringFrom(applicant.email) || stringFrom(snapshot.email),
    phone: stringFrom(applicant.phone) || stringFrom(applicant.phoneNumber) || stringFrom(snapshot.phone),
    addressLine1: line1 || '—',
    addressLine2: line2 || '—'
  };
}

function structureField(snapshot: Record<string, unknown>, key: string): unknown {
  const structure = asRecord(snapshot.structure);
  const effective = asRecord(snapshot.effective);
  const effectiveStructure = asRecord(effective?.structure);
  return structure?.[key] ?? effectiveStructure?.[key] ?? snapshot[key];
}

function firstProperty(snapshot: Record<string, unknown>): Record<string, unknown> | null {
  const properties = snapshot.properties;
  if (Array.isArray(properties) && properties.length > 0) {
    return asRecord(properties[0]);
  }
  return asRecord(snapshot.property) ?? asRecord(snapshot.selectedProperty);
}

function buildReference(application: OfferLetterApplicationSource, kind: 'MORTGAGE' | 'LOAN'): string {
  const suffix = (application.localApplicationId || application.id).slice(-8).toUpperCase();
  return kind === 'MORTGAGE' ? `MTG-${suffix}` : `LN-${suffix}`;
}

function resolveLenderName(application: OfferLetterApplicationSource): string {
  return (
    application.merchantName ||
    application.offeringMerchantName ||
    application.merchantId ||
    'Licensed Lender'
  );
}

function resolveTenorLabel(snapshot: Record<string, unknown>): string | undefined {
  const tenure = structureField(snapshot, 'tenure') ?? structureField(snapshot, 'loanTenor');
  const tenureRecord = asRecord(tenure);
  const months = tenureRecord?.months ?? tenureRecord?.value ?? tenure;
  const parsed = Number(months);
  if (Number.isFinite(parsed) && parsed > 0) {
    if (parsed % 12 === 0) {
      return `${parsed / 12} years`;
    }
    return `${parsed} months`;
  }
  if (typeof tenure === 'string' && tenure.trim()) {
    return tenure.trim();
  }
  return undefined;
}

function resolveInterestRate(snapshot: Record<string, unknown>): string | undefined {
  const rate = structureField(snapshot, 'interestRate');
  if (rate == null || rate === '') {
    return undefined;
  }
  const label = String(rate).includes('%') ? String(rate) : `${rate}%`;
  const rateType = stringFrom(structureField(snapshot, 'interestRateType'), '');
  if (rateType && rateType !== '—') {
    return `${label} per annum (${rateType})`;
  }
  return `${label} per annum`;
}

function resolveMonthlyRepayment(snapshot: Record<string, unknown>, currency: string): string | undefined {
  const calculations = asRecord(snapshot.calculations) ?? asRecord(snapshot.effective);
  const projections = asRecord(calculations?.projections);
  const monthly =
    projections?.monthlyRepayment ??
    projections?.estimatedMonthlyRepayment ??
    calculations?.estimatedMonthlyRepayment ??
    structureField(snapshot, 'estimatedMonthlyRepayment');
  const amount = Number(monthly);
  if (Number.isFinite(amount) && amount > 0) {
    return formatMoney(amount, currency);
  }
  return undefined;
}

export function buildOfferLetterContent(args: {
  application: OfferLetterApplicationSource;
  applicantName: string;
  approvedAmount: number;
  equityRequiredAmount: number;
  currency: string;
  acceptanceId?: string;
  acceptanceStatus?: string;
}): OfferLetterContent {
  const { application, applicantName, approvedAmount, equityRequiredAmount, currency } = args;
  const snapshot = application.contractSnapshot ?? {};
  const kind = normalizeProductType(String(application.productType)) === 'MORTGAGE' ? 'MORTGAGE' : 'LOAN';
  const contact = applicantContact(snapshot);
  const property = kind === 'MORTGAGE' ? firstProperty(snapshot) : null;
  const propertyValue = Number(
    snapshot.propertyValue ?? property?.value ?? structureField(snapshot, 'propertyValue') ?? 0
  );
  const equityPercent = Number(
    snapshot.equityContribution ?? structureField(snapshot, 'equityContribution') ?? 0
  );
  const ltv =
    propertyValue > 0 && approvedAmount > 0
      ? formatPercent((approvedAmount / propertyValue) * 100)
      : undefined;
  const equityLabel =
    equityRequiredAmount > 0
      ? `${formatPercent(equityPercent) ?? '—'} — ${formatMoney(equityRequiredAmount, currency)}`
      : 'Not required';
  const offerValidUntil = formatLetterDate(addDays(new Date(), 30));
  const moratoriumAllowed = structureField(snapshot, 'allowMoratorium') === true;
  const moratorium = asRecord(structureField(snapshot, 'moratorium'));
  const moratoriumLabel = moratoriumAllowed
    ? stringFrom(moratorium?.duration ?? moratorium?.months, 'Applicable')
    : 'Not applicable';

  return {
    kind,
    letterDate: formatLetterDate(),
    borrowerFullName: applicantName,
    borrowerFirstName: firstName(applicantName),
    borrowerAddressLine1: contact.addressLine1,
    borrowerAddressLine2: contact.addressLine2,
    borrowerEmail: contact.email,
    borrowerPhone: contact.phone,
    reference: buildReference(application, kind),
    applicationId: application.localApplicationId || application.id,
    lenderName: resolveLenderName(application),
    productName: application.productName || (kind === 'MORTGAGE' ? 'Mortgage facility' : 'Loan facility'),
    propertyAddress:
      kind === 'MORTGAGE'
        ? stringFrom(property?.location ?? property?.address ?? snapshot.propertyAddress)
        : undefined,
    propertyType: kind === 'MORTGAGE' ? stringFrom(property?.propertyType ?? property?.type) : undefined,
    purchasePrice:
      kind === 'MORTGAGE' && propertyValue > 0 ? formatMoney(propertyValue, currency) : undefined,
    independentValuation:
      kind === 'MORTGAGE'
        ? stringFrom(snapshot.independentValuation ?? snapshot.valuationAmount, '—')
        : undefined,
    valuerName: kind === 'MORTGAGE' ? stringFrom(snapshot.valuerName, '—') : undefined,
    valuationDate:
      kind === 'MORTGAGE' ? stringFrom(snapshot.valuationDate, '—') : undefined,
    titleType: kind === 'MORTGAGE' ? stringFrom(snapshot.titleType ?? property?.titleType, '—') : undefined,
    developerOrSeller:
      kind === 'MORTGAGE'
        ? stringFrom(snapshot.developerName ?? snapshot.sellerName ?? property?.developerName, '—')
        : undefined,
    propertyManagementPartner: kind === 'MORTGAGE' ? stringFrom(snapshot.propertyManagementPartner, '—') : undefined,
    loanAmount: formatMoney(approvedAmount, currency),
    loanToValue: ltv,
    equityContribution: equityLabel,
    equityDueDate: equityRequiredAmount > 0 ? offerValidUntil : undefined,
    interestRate: resolveInterestRate(snapshot),
    mortgageTenor: resolveTenorLabel(snapshot),
    repaymentFrequency: stringFrom(structureField(snapshot, 'repaymentFrequency'), 'Monthly'),
    estimatedMonthlyRepayment: resolveMonthlyRepayment(snapshot, currency),
    moratorium: moratoriumLabel,
    processingFee: stringFrom(structureField(snapshot, 'processingFee'), 'As per product schedule'),
    legalFees: stringFrom(structureField(snapshot, 'legalFees'), 'As quoted'),
    insurance: stringFrom(structureField(snapshot, 'insuranceRequirement'), 'Required'),
    security:
      kind === 'MORTGAGE'
        ? 'Legal mortgage over the property described above'
        : stringFrom(structureField(snapshot, 'securityDescription'), 'As per loan agreement'),
    offerValidUntil,
    signatoryName: stringFrom(snapshot.authorizedSignatoryName, 'Authorised Signatory'),
    signatoryTitle: stringFrom(snapshot.authorizedSignatoryTitle, resolveLenderName(application)),
    acceptanceStatus: args.acceptanceStatus ?? 'Pending',
    acceptanceDate: args.acceptanceStatus === 'Accepted' ? formatLetterDate() : undefined,
    acceptanceId: args.acceptanceId,
    platformName: 'Spring'
  };
}

function renderRow(label: string, value: string | undefined): string {
  if (!value || value === '—') {
    return '';
  }
  return `<tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600;width:42%;">${label}</td><td style="padding:8px 12px;border:1px solid #e2e8f0;">${value}</td></tr>`;
}

export function renderOfferLetterHtml(content: OfferLetterContent): string {
  const title = content.kind === 'MORTGAGE' ? 'MORTGAGE OFFER LETTER' : 'LOAN OFFER LETTER';
  const intro =
    content.kind === 'MORTGAGE'
      ? `We are pleased to inform you that your application for a mortgage facility with <strong>${content.lenderName}</strong>, distributed via the ${content.platformName} platform, has been approved in principle for the purchase of the property described below. This letter sets out the indicative terms on which the facility is offered to you, subject to the conditions outlined and to final legal documentation.`
      : `We are pleased to inform you that your application for a loan facility with <strong>${content.lenderName}</strong>, distributed via the ${content.platformName} platform, has been approved in principle. This letter sets out the indicative terms on which the facility is offered to you, subject to the conditions outlined and to final legal documentation.`;

  const propertySection =
    content.kind === 'MORTGAGE'
      ? `<h3 style="margin:24px 0 12px;font-size:16px;">Property Details</h3>
<table style="width:100%;border-collapse:collapse;font-size:14px;">
  ${renderRow('Property address', content.propertyAddress)}
  ${renderRow('Property type', content.propertyType)}
  ${renderRow('Purchase price', content.purchasePrice)}
  ${renderRow('Independent valuation', content.independentValuation && content.independentValuation !== '—' ? `${content.independentValuation}${content.valuerName && content.valuerName !== '—' ? ` (Valuer: ${content.valuerName}${content.valuationDate && content.valuationDate !== '—' ? `, dated ${content.valuationDate}` : ''})` : ''}` : undefined)}
  ${renderRow('Title type', content.titleType)}
  ${renderRow('Developer / Seller', content.developerOrSeller)}
  ${renderRow('Property management partner', content.propertyManagementPartner && content.propertyManagementPartner !== '—' ? `${content.propertyManagementPartner} (optional, orchestrated referral)` : undefined)}
</table>`
      : '';

  const facilityHeading = content.kind === 'MORTGAGE' ? 'Mortgage Terms' : 'Loan Terms';

  return `<div style="font-family:Georgia,'Times New Roman',serif;color:#1f2937;line-height:1.6;max-width:760px;">
  <p style="margin:0 0 4px;">${content.letterDate}</p>
  <p style="margin:0 0 4px;"><strong>${content.borrowerFullName}</strong></p>
  <p style="margin:0 0 4px;">${content.borrowerAddressLine1}</p>
  <p style="margin:0 0 16px;">${content.borrowerAddressLine2}</p>
  <p style="margin:0 0 24px;">${content.borrowerEmail}${content.borrowerPhone && content.borrowerPhone !== '—' ? ` | ${content.borrowerPhone}` : ''}</p>
  <h2 style="text-align:center;margin:0 0 8px;font-size:22px;letter-spacing:0.04em;">${title}</h2>
  <p style="text-align:center;margin:0 0 24px;font-size:13px;color:#475569;">Reference: ${content.reference} | Application ID: ${content.applicationId}</p>
  <p>Dear ${content.borrowerFirstName},</p>
  <p>${intro}</p>
  ${propertySection}
  <h3 style="margin:24px 0 12px;font-size:16px;">${facilityHeading}</h3>
  <table style="width:100%;border-collapse:collapse;font-size:14px;">
    ${renderRow('Loan amount (financed)', content.loanAmount)}
    ${renderRow('Loan-to-value (LTV)', content.loanToValue)}
    ${renderRow('Equity contribution (down payment)', content.equityContribution)}
    ${renderRow('Equity due date', content.equityDueDate)}
    ${renderRow('Interest rate', content.interestRate)}
    ${renderRow(content.kind === 'MORTGAGE' ? 'Mortgage tenor' : 'Loan tenor', content.mortgageTenor)}
    ${renderRow('Repayment frequency', content.repaymentFrequency)}
    ${renderRow('Estimated monthly repayment', content.estimatedMonthlyRepayment)}
    ${renderRow('Moratorium / grace period', content.moratorium)}
    ${renderRow('Processing / origination fee', content.processingFee)}
    ${renderRow('Legal & perfection fees', content.legalFees)}
    ${renderRow('Protection insurance', content.insurance)}
    ${renderRow('Security', content.security)}
    ${renderRow('Offer valid until', content.offerValidUntil)}
  </table>
  <h3 style="margin:24px 0 12px;font-size:16px;">Conditions Precedent to Disbursement</h3>
  <ol style="padding-left:20px;font-size:14px;">
    <li>Completion and digital submission of all Know-Your-Customer (KYC) and identity verification requirements.</li>
    ${content.kind === 'MORTGAGE' ? '<li>Confirmed independent valuation of the property and satisfactory legal title search.</li>' : ''}
    <li>Confirmation of source of funds and, where applicable, proof of income or employment.</li>
    <li>Execution of the ${content.kind === 'MORTGAGE' ? 'mortgage' : 'loan'} offer acceptance, loan agreement, and security documentation.</li>
    <li>Payment of the equity contribution, processing fee, and legal/perfection fees stated above, where applicable.</li>
    <li>Evidence of required insurance in favour of ${content.lenderName}.</li>
  </ol>
  <h3 style="margin:24px 0 12px;font-size:16px;">Digital Acceptance</h3>
  <p style="font-size:14px;">This offer has been issued to you electronically through the ${content.platformName} platform. You may review, accept, or query the terms directly within your ${content.platformName} dashboard or the secure link provided in your offer notification. Your digital acceptance, recorded with a timestamp and unique acceptance ID, constitutes a legally binding acknowledgment of the terms described in this letter, in accordance with applicable electronic transactions regulations.</p>
  <h3 style="margin:24px 0 12px;font-size:16px;">Validity</h3>
  <p style="font-size:14px;">This offer is valid until <strong>${content.offerValidUntil}</strong>. If acceptance is not received electronically by this date, the offer will lapse and a new application, revaluation, or re-approval may be required.</p>
  <h3 style="margin:24px 0 12px;font-size:16px;">Important Notice</h3>
  <p style="font-size:14px;">This is an indicative offer and does not constitute final ${content.kind === 'MORTGAGE' ? 'mortgage' : 'loan'} disbursement. Final terms remain subject to completion of all conditions precedent, satisfactory documentation, and the executed loan agreement. ${content.lenderName} reserves the right to amend or withdraw this offer prior to your digital acceptance. ${content.platformName} acts as the technology and distribution infrastructure for this offer and is not the lender.</p>
  <p style="margin-top:32px;">Yours sincerely,</p>
  <p><strong>${content.signatoryName}</strong><br/>${content.signatoryTitle}</p>
  <div style="margin-top:28px;padding:16px;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;font-size:14px;">
    <strong>Digital Acceptance</strong><br/>
    Status: ${content.acceptanceStatus}<br/>
    ${content.acceptanceDate ? `Date: ${content.acceptanceDate}<br/>` : ''}
    ${content.acceptanceId ? `Acceptance ID: ${content.acceptanceId}` : 'Acceptance ID: Pending acceptance'}
  </div>
</div>`;
}

export function renderOfferLetterText(content: OfferLetterContent): string {
  return renderOfferLetterHtml(content)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[23]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function buildOfferLetterForApplication(args: {
  application: OfferLetterApplicationSource;
  applicantName: string;
  approvedAmount: number;
  equityRequiredAmount: number;
  currency: string;
  acceptanceId?: string;
  acceptanceStatus?: string;
}): Promise<{ content: OfferLetterContent; html: string; text: string }> {
  const content = buildOfferLetterContent(args);
  return {
    content,
    html: renderOfferLetterHtml(content),
    text: renderOfferLetterText(content)
  };
}
