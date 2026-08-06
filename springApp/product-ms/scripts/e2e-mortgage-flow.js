/**
 * E2E: Plata mortgage → CRBC turn-on → apply → post-approval → disburse
 * Run: node scripts/e2e-mortgage-flow.js
 */
const axios = require('axios');

const PLATA = 'https://account-ms-plata.fly.dev';
const SPRING = 'https://account-ms.fly.dev';
const CRBC = 'https://crbc.tryspring.io';

const PLATA_APP = '69efccf9a6f701fa458935e0';
const CRBC_APP = '69f330b2a795ac77103a6d77';
const CRBC_MERCHANT = 'merchant_1774844182734_rm0g5u27l';
const STOREFRONT_USER = '6a2fa2c55e076aafcf32316a';

const log = (step, msg, data) => {
  console.log(`\n=== ${step}: ${msg} ===`);
  if (data !== undefined) console.log(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
};

async function login(base, email, password) {
  const { data } = await axios.post(`${base}/api/v1/auth/login`, { email, password });
  if (!data.accessToken) throw new Error(`Login failed for ${email}: ${JSON.stringify(data)}`);
  return data.accessToken;
}

function auth(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function main() {
  const results = { steps: [], ok: true };
  const resumeLocalApp = process.env.E2E_RESUME_LOCAL_APP;
  const resumeUpstream = process.env.E2E_RESUME_UPSTREAM_APP;
  const resumeLocalProduct = process.env.E2E_RESUME_LOCAL_PRODUCT;
  const resumePlataProduct = process.env.E2E_RESUME_PLATA_PRODUCT;
  const resumeSlot1 = process.env.E2E_RESUME_SLOT1;

  try {
    let plataProductId = resumePlataProduct;
    let localProductId = resumeLocalProduct;
    let localAppId = resumeLocalApp;
    let upstreamId = resumeUpstream;
    let slot1 = resumeSlot1;

    const slot2 = new Date(Date.now() + 21 * 864e5).toISOString().replace(/\.\d{3}Z$/, '.000Z');
    const slot3 = new Date(Date.now() + 28 * 864e5).toISOString().replace(/\.\d{3}Z$/, '.000Z');
    if (!slot1) {
      slot1 = new Date(Date.now() + 14 * 864e5).toISOString().replace(/\.\d{3}Z$/, '.000Z');
    }

    if (resumeLocalApp && resumeUpstream) {
      log('0', 'Resuming from existing application', {
        localAppId,
        upstreamId,
        localProductId,
        plataProductId
      });
      results.steps.push({
        step: 'create_plata_product',
        ok: true,
        plataProductId,
        resumed: true
      });
      results.steps.push({ step: 'turn_on_crbc', ok: true, localProductId, resumed: true });
      results.steps.push({
        step: 'apply',
        ok: true,
        localAppId,
        upstreamAppId: upstreamId,
        resumed: true
      });
    } else {
    // --- 1. Plata create mortgage ---
    const plataToken = await login(PLATA, 'titusdavid39+a@gmail.com', 'SecurePass123!');
    log('1', 'Plata logged in as John Dave');

    const createBody = {
      name: `E2E Mortgage ${new Date().toISOString().slice(0, 16)}`,
      description: 'E2E mortgage for CRBC storefront virtual-tour → disburse flow',
      type: 'MORTGAGE',
      appId: PLATA_APP,
      isActive: true,
      propertyValue: 10000000,
      structure: {
        interestRate: 15,
        interestMethod: 'reducing_balance',
        allowMoratorium: false,
        repaymentWorkflow: 'principal_interest_charges',
        loanAmount: { min: 500000, max: 50000000 },
        repaymentStructure: 'equal_monthly_instalments',
        amortizationSchedule: 'equal_instalment',
        repaymentFrequency: 'Monthly',
        acceptableNPA: '90',
        equityRequirement: 'zero_down'
      },
      about: {
        tenure: { unit: 'month', label: '120 months', value: 120 },
        mortgageTypes: [{ name: 'Residential', description: 'E2E residential mortgage' }]
      },
      requirements: {
        security: {
          acceptCheque: false,
          realEstateProperties: false,
          otherProperties: false,
          guarantor: false,
          bankGuarantee: false,
          savingsAccount: false,
          noSecurity: true
        },
        documentsToDownload: [],
        otherRequirements: []
      },
      feesAndCharges: {
        fees: [{ name: 'Processing Fee', feeType: 'Flat', value: '0' }],
        lateRepayment: { enabled: false, penalties: [] }
      },
      properties: [
        {
          name: 'E2E Residences Unit 1',
          propertyType: '2 bedroom flat',
          value: 10000000,
          location: 'Lagos, Nigeria',
          propertyDescription: 'E2E test property',
          facilities: ['gated_estate'],
          imageUrls: []
        }
      ],
      inspectionDates: [
        { scheduledFor: slot1, label: 'Morning', location: 'E2E Sales Office' },
        { scheduledFor: slot2, label: 'Afternoon', location: 'E2E Sales Office' },
        { scheduledFor: slot3, label: 'Weekend', location: 'E2E Sales Office' }
      ]
    };

    const created = await axios.post(`${PLATA}/api/v1/products`, createBody, { headers: auth(plataToken) });
    plataProductId = created.data.data.id;
    await axios.put(
      `${PLATA}/api/v1/products/${plataProductId}`,
      { status: 'complete', isActive: true, propertyValue: 10000000 },
      { headers: auth(plataToken) }
    );
    log('1', 'Plata mortgage created + complete', {
      id: plataProductId,
      name: createBody.name,
      ref: created.data.data.referenceNumber
    });
    results.steps.push({ step: 'create_plata_product', ok: true, plataProductId });

    // --- 2. Spring turn on ---
    const springToken = await login(SPRING, 'arikpostanley123+a@gmail.com', 'Stanley@123');
    log('2', 'Spring CRBC merchant logged in');

    try {
      const toggled = await axios.put(
        `${SPRING}/api/v1/products/toggle/${CRBC_APP}/${plataProductId}`,
        { activate: true },
        { headers: auth(springToken) }
      );
      localProductId = toggled.data.data?.id || toggled.data.data?._id || toggled.data.id;
      log('2', 'Product turned on for CRBC', { localProductId, rawKeys: Object.keys(toggled.data.data || {}) });
    } catch (e) {
      const msg = e.response?.data?.error || e.message;
      if (/already turned on/i.test(String(msg))) {
        const list = await axios.get(`${SPRING}/api/v1/products/app/${CRBC_APP}`, { headers: auth(springToken) });
        const hit = (list.data.data || []).find(
          (p) => p.upstreamProductId === plataProductId || p.upstreamId === plataProductId
        );
        localProductId = hit?.id || hit?._id;
        log('2', 'Already on — reused local product', { localProductId, msg });
      } else {
        throw e;
      }
    }
    if (!localProductId) throw new Error('No local CRBC product id after toggle');
    results.steps.push({ step: 'turn_on_crbc', ok: true, localProductId });

    // --- 3. Storefront apply ---
    const storeTokenInit = await login(CRBC, 'titusdavid39+d@gmail.com', 'SecurePass123!');
    log('3', 'Storefront user logged in');

    const amount = 5000000;
    const init = await axios.post(
      `${CRBC}/api/v1/applications/init`,
      {
        userId: STOREFRONT_USER,
        productId: localProductId,
        merchantId: CRBC_MERCHANT,
        amount,
        currency: 'NGN',
        email: 'titusdavid39+d@gmail.com',
        applicantName: 'David Testimony',
        phone: '+2348166175258',
        bvn: '22123456789',
        country: 'NG',
        appId: CRBC_APP,
        isPoliticallyExposedPerson: false,
        monthlyIncome: 500000,
        repaymentSource: 'salary',
        maritalStatus: 'single',
        loanReason: 'investment',
        repayingWithSpouse: false
      },
      { headers: auth(storeTokenInit) }
    );
    localAppId = init.data.data?.id || init.data.data?._id || init.data.id;
    log('3a', 'Application init', { localAppId, status: init.data.data?.status });

    await axios.patch(
      `${CRBC}/api/v1/applications/${localAppId}/progress`,
      {
        userId: STOREFRONT_USER,
        currentStep: 'platform',
        isPoliticallyExposedPerson: false,
        monthlyIncome: 500000,
        repaymentSource: 'salary',
        maritalStatus: 'single',
        loanReason: 'investment',
        repayingWithSpouse: false
      },
      { headers: auth(storeTokenInit) }
    );

    const submitted = await axios.post(
      `${CRBC}/api/v1/applications/${localAppId}/submit`,
      {
        userId: STOREFRONT_USER,
        acceptedTerms: true,
        mortgageSelection: {
          propertyName: 'E2E Residences Unit 1',
          propertyType: '2 bedroom flat',
          unitPrice: amount,
          quantity: 1,
          startDate: '2026-08',
          investmentPeriod: '10 years',
          total: amount
        }
      },
      { headers: auth(storeTokenInit) }
    );
    const upstreamAppId =
      submitted.data.data?.upstreamApplicationId ||
      submitted.data.data?.plataApplicationId ||
      null;
    log('3b', 'Application submitted', {
      localAppId,
      upstreamAppId,
      loanWorkflowStatus: submitted.data.data?.loanWorkflowStatus,
      upstreamSyncError: submitted.data.data?.upstreamSyncError
    });
    results.steps.push({
      step: 'apply',
      ok: Boolean(upstreamAppId || submitted.data.data?.loanWorkflowStatus),
      localAppId,
      upstreamAppId
    });

    // Resolve upstream id from detail if missing
    upstreamId = upstreamAppId;
    if (!upstreamId) {
      await new Promise((r) => setTimeout(r, 3000));
      const detail = await axios.get(`${CRBC}/api/v1/applications/${localAppId}`, {
        headers: auth(storeTokenInit)
      });
      upstreamId = detail.data.data?.upstreamApplicationId;
      log('3c', 'Resolved upstream from GET', { upstreamId, loanWorkflowStatus: detail.data.data?.loanWorkflowStatus });
    }
    if (!upstreamId) throw new Error('No upstream Plata application id — cannot approve');

    // --- 4. Plata approve ---
    const plataToken2 = await login(PLATA, 'titusdavid39+a@gmail.com', 'SecurePass123!');
    await axios.patch(
      `${PLATA}/api/v1/products/applications/${upstreamId}/loan-workflow`,
      { loanWorkflowStatus: 'under_review' },
      { headers: auth(plataToken2) }
    );
    const approved = await axios.patch(
      `${PLATA}/api/v1/products/applications/${upstreamId}/loan-workflow`,
      { loanWorkflowStatus: 'approved', approvedAmount: amount, equityReceived: true },
      { headers: auth(plataToken2) }
    );
    const fulfillment = approved.data.data?.postApprovalFulfillment;
    log('4', 'Plata approved', {
      currentWorkflowStepId: fulfillment?.currentWorkflowStepId,
      status: fulfillment?.status,
      workflowStepOrder: fulfillment?.workflowStepOrder
    });
    results.steps.push({
      step: 'approve',
      ok: fulfillment?.currentWorkflowStepId === 'virtual_inspection' || fulfillment?.status === 'virtual_inspection_pending',
      fulfillment: { step: fulfillment?.currentWorkflowStepId, status: fulfillment?.status }
    });

    await new Promise((r) => setTimeout(r, 4000));

    // --- 5. Virtual tour ---
    const virt = await axios.post(
      `${CRBC}/api/v1/applications/${localAppId}/pending-approved-mortgage/virtual-inspection/complete`,
      { userId: STOREFRONT_USER, notes: 'E2E virtual tour completed' },
      { headers: auth(storeTokenInit) }
    );
    const f5 = virt.data.data?.postApprovalFulfillment || virt.data.data?.application?.postApprovalFulfillment;
    log('5', 'Virtual inspection complete', {
      currentWorkflowStepId: f5?.currentWorkflowStepId || virt.data.data?.postApprovalFulfillment?.currentWorkflowStepId,
      status: f5?.status,
      dataKeys: Object.keys(virt.data.data || {})
    });
    }

    const amount = 5000000;
    const storeToken = await login(CRBC, 'titusdavid39+d@gmail.com', 'SecurePass123!');

    if (resumeLocalApp && resumeUpstream) {
      results.steps.push({
        step: 'approve',
        ok: true,
        resumed: true
      });
      results.steps.push({ step: 'virtual_inspection', ok: true, resumed: true });
      log('5b', 'Skipping virtual — already at offer (resume)');
    } else {
    const afterVirt = await axios.get(
      `${CRBC}/api/v1/applications/${localAppId}/pending-approved-mortgage?userId=${STOREFRONT_USER}`,
      { headers: auth(storeToken) }
    );
    const pf = afterVirt.data.data?.postApprovalFulfillment || afterVirt.data.data?.application?.postApprovalFulfillment;
    log('5b', 'Pending detail after virtual', {
      currentWorkflowStepId: pf?.currentWorkflowStepId,
      status: pf?.status,
      completed: pf?.completedWorkflowSteps
    });
    results.steps.push({
      step: 'virtual_inspection',
      ok: pf?.currentWorkflowStepId === 'offer_letter' || pf?.status === 'offer_pending'
    });
    }
    // --- 6–7. Offer + book (idempotent; use merchant-configured slots) ---
    let pendingState = (
      await axios.get(
        `${CRBC}/api/v1/applications/${localAppId}/pending-approved-mortgage?userId=${STOREFRONT_USER}`,
        { headers: auth(storeToken) }
      )
    ).data.data;
    let pfState =
      pendingState?.postApprovalFulfillment || pendingState?.application?.postApprovalFulfillment;

    if (
      pfState?.currentWorkflowStepId === 'offer_letter' ||
      pfState?.status === 'offer_pending'
    ) {
      const plataToken3 = await login(PLATA, 'titusdavid39+a@gmail.com', 'SecurePass123!');
      try {
        await axios.post(
          `${PLATA}/api/v1/products/applications/${upstreamId}/loan-workflow/offer-letter/generate`,
          {},
          { headers: auth(plataToken3) }
        );
        log('6', 'Offer letter generated');
      } catch (e) {
        const msg = e.response?.data?.error || e.message;
        if (/already been sent|already generated|already exists/i.test(String(msg))) {
          log('6', 'Offer letter already present — continuing', msg);
        } else {
          throw e;
        }
      }

      try {
        await axios.post(
          `${CRBC}/api/v1/applications/${localAppId}/pending-approved-mortgage/offer`,
          { userId: STOREFRONT_USER, action: 'accept', acceptedTerms: true },
          { headers: auth(storeToken) }
        );
      } catch (e) {
        const msg = e.response?.data?.error || e.message;
        if (/already accepted|offer_accepted|not pending/i.test(String(msg))) {
          log('6', 'Offer already accepted — continuing', msg);
        } else {
          throw e;
        }
      }
      await new Promise((r) => setTimeout(r, 2000));
      pendingState = (
        await axios.get(
          `${CRBC}/api/v1/applications/${localAppId}/pending-approved-mortgage?userId=${STOREFRONT_USER}`,
          { headers: auth(storeToken) }
        )
      ).data.data;
      pfState =
        pendingState?.postApprovalFulfillment || pendingState?.application?.postApprovalFulfillment;
    } else {
      log('6', 'Offer already past — skipping generate/accept', {
        currentWorkflowStepId: pfState?.currentWorkflowStepId,
        status: pfState?.status
      });
    }

    log('6b', 'After offer phase', {
      currentWorkflowStepId: pfState?.currentWorkflowStepId,
      status: pfState?.status,
      completed: pfState?.completedWorkflowSteps
    });
    results.steps.push({
      step: 'offer_accept',
      ok:
        pfState?.currentWorkflowStepId === 'inspection_booking' ||
        pfState?.status === 'offer_accepted' ||
        (pfState?.completedWorkflowSteps || []).includes('offer_letter')
    });

    // --- 7. Book inspection ---
    const availableSlots =
      pfState?.availableInspectionDates ||
      pendingState?.application?.postApprovalFulfillment?.availableInspectionDates ||
      [];
    const bookSlot = availableSlots[0]?.scheduledFor || slot1;
    log('7a', 'Booking inspection slot', { bookSlot, availableCount: availableSlots.length });

    if (
      pfState?.currentWorkflowStepId === 'inspection_booking' ||
      pfState?.status === 'offer_accepted'
    ) {
      await axios.post(
        `${CRBC}/api/v1/applications/${localAppId}/pending-approved-mortgage/appointment`,
        { userId: STOREFRONT_USER, scheduledFor: bookSlot },
        { headers: auth(storeToken) }
      );
    } else {
      log('7', 'Inspection already booked — skipping', {
        currentWorkflowStepId: pfState?.currentWorkflowStepId
      });
    }
    await new Promise((r) => setTimeout(r, 1500));
    const afterBook = await axios.get(
      `${CRBC}/api/v1/applications/${localAppId}/pending-approved-mortgage?userId=${STOREFRONT_USER}`,
      { headers: auth(storeToken) }
    );
    const pf7 = afterBook.data.data?.postApprovalFulfillment || afterBook.data.data?.application?.postApprovalFulfillment;
    log('7', 'Inspection booked', {
      currentWorkflowStepId: pf7?.currentWorkflowStepId,
      status: pf7?.status,
      appointment: pf7?.appointment?.scheduledFor
    });
    results.steps.push({
      step: 'inspection_booking',
      ok: pf7?.currentWorkflowStepId === 'inspection_outcome' || Boolean(pf7?.appointment?.scheduledFor)
    });

    // --- 8. Physical inspection ---
    await axios.post(
      `${CRBC}/api/v1/applications/${localAppId}/pending-approved-mortgage/inspection/start`,
      { userId: STOREFRONT_USER },
      { headers: auth(storeToken) }
    );
    await axios.post(
      `${CRBC}/api/v1/applications/${localAppId}/pending-approved-mortgage/inspection/complete`,
      { userId: STOREFRONT_USER, outcome: 'completed' },
      { headers: auth(storeToken) }
    );
    await new Promise((r) => setTimeout(r, 2000));
    const afterInsp = await axios.get(
      `${CRBC}/api/v1/applications/${localAppId}/pending-approved-mortgage?userId=${STOREFRONT_USER}`,
      { headers: auth(storeToken) }
    );
    const pf8 = afterInsp.data.data?.postApprovalFulfillment || afterInsp.data.data?.application?.postApprovalFulfillment;
    log('8', 'Physical inspection completed', {
      currentWorkflowStepId: pf8?.currentWorkflowStepId,
      status: pf8?.status,
      completed: pf8?.completedWorkflowSteps
    });
    results.steps.push({
      step: 'inspection_outcome',
      ok: ['down_payment', 'contract_signed', 'contract_issued', 'loan_disbursement'].includes(
        pf8?.currentWorkflowStepId
      ) || ['down_payment_pending', 'down_payment_confirmed', 'contract_issued', 'contract_signed'].includes(pf8?.status)
    });

    // --- 9. Down payment (0 equity should auto-skip) / confirm if needed ---
    if (pf8?.status === 'down_payment_pending') {
      await axios.post(
        `${CRBC}/api/v1/applications/${localAppId}/pending-approved-mortgage/down-payment`,
        { userId: STOREFRONT_USER },
        { headers: auth(storeToken) }
      );
      const plataToken4 = await login(PLATA, 'titusdavid39+a@gmail.com', 'SecurePass123!');
      await axios.post(
        `${PLATA}/api/v1/products/applications/${upstreamId}/pending-approved-mortgage/down-payment/confirm`,
        {},
        { headers: auth(plataToken4) }
      );
    }
    await new Promise((r) => setTimeout(r, 2000));
    const afterDp = await axios.get(
      `${CRBC}/api/v1/applications/${localAppId}/pending-approved-mortgage?userId=${STOREFRONT_USER}`,
      { headers: auth(storeToken) }
    );
    const pf9 = afterDp.data.data?.postApprovalFulfillment || afterDp.data.data?.application?.postApprovalFulfillment;
    log('9', 'After down payment / contract issue', {
      currentWorkflowStepId: pf9?.currentWorkflowStepId,
      status: pf9?.status
    });
    results.steps.push({
      step: 'down_payment_contract',
      ok: pf9?.currentWorkflowStepId === 'contract_signed' || pf9?.status === 'contract_issued'
    });

    // --- 10. Sign contract ---
    await axios.post(
      `${CRBC}/api/v1/applications/${localAppId}/pending-approved-mortgage/contract/sign`,
      { userId: STOREFRONT_USER, acceptedTerms: true },
      { headers: auth(storeToken) }
    );
    await new Promise((r) => setTimeout(r, 2000));
    const afterSign = await axios.get(
      `${CRBC}/api/v1/applications/${localAppId}/pending-approved-mortgage?userId=${STOREFRONT_USER}`,
      { headers: auth(storeToken) }
    );
    const pf10 = afterSign.data.data?.postApprovalFulfillment || afterSign.data.data?.application?.postApprovalFulfillment;
    log('10', 'Contract signed', {
      currentWorkflowStepId: pf10?.currentWorkflowStepId,
      status: pf10?.status
    });
    results.steps.push({
      step: 'contract_signed',
      ok: pf10?.currentWorkflowStepId === 'loan_disbursement' || pf10?.status === 'contract_signed'
    });

    // --- 11. Disburse (Plata merchant) ---
    const plataToken5 = await login(PLATA, 'titusdavid39+a@gmail.com', 'SecurePass123!');
    try {
      const disburse = await axios.post(
        `${PLATA}/api/v1/products/applications/${upstreamId}/pending-approved-mortgage/disburse`,
        {},
        { headers: auth(plataToken5) }
      );
      const pf11 = disburse.data.data?.postApprovalFulfillment;
      log('11', 'Disbursed', {
        status: pf11?.status || disburse.data.data?.loanWorkflowStatus,
        loanDisbursement: disburse.data.data?.loanDisbursement
      });
      results.steps.push({
        step: 'disburse',
        ok: pf11?.status === 'disbursed' || Boolean(disburse.data.data?.loanDisbursement)
      });
    } catch (e) {
      log('11', 'Disburse failed', e.response?.data || e.message);
      results.steps.push({ step: 'disburse', ok: false, error: e.response?.data || e.message });
      results.ok = false;
    }

    console.log('\n\n========== E2E SUMMARY ==========');
    console.log(
      JSON.stringify(
        {
          plataProductId,
          localProductId,
          localAppId,
          upstreamId,
          steps: results.steps
        },
        null,
        2
      )
    );
    const failed = results.steps.filter((s) => !s.ok);
    if (failed.length) {
      console.log('\nFAILED STEPS:', failed.map((s) => s.step).join(', '));
      process.exit(1);
    }
    console.log('\nALL CHECKED STEPS PASSED');
  } catch (e) {
    console.error('\nE2E ABORTED:', e.response?.status, e.response?.data || e.message);
    if (e.response?.data) console.error(JSON.stringify(e.response.data, null, 2));
    process.exit(1);
  }
}

main();
