import { parsePayonusFundingWebhookBody, parsePayonusRawPayload } from './payonusWebhookParser';

describe('parsePayonusFundingWebhookBody', () => {
  it('parses flat PayOnUs-style payloads', () => {
    const parsed = parsePayonusFundingWebhookBody({
      accountNumber: '7582360692',
      amount: 100,
      currency: 'NGN',
      transactionId: '208a8c86-d12e-465e-8221-a60ff0859841',
      onusReference: 'ONUS-FNUB-0013461429490-08062026-112538',
      paymentStatus: 'COMPLETED',
      paymentChannel: 'BANK_TRANSFER'
    });

    expect(parsed.accountNumber).toBe('7582360692');
    expect(parsed.amount).toBe(100);
    expect(parsed.transactionId).toBe('208a8c86-d12e-465e-8221-a60ff0859841');
    expect(parsed.onusReference).toBe('ONUS-FNUB-0013461429490-08062026-112538');
    expect(parsed.paymentStatus).toBe('COMPLETED');
  });

  it('unwraps nested data payloads and snake_case fields', () => {
    const parsed = parsePayonusFundingWebhookBody({
      data: {
        account_number: '7582360692',
        transaction_amount: '100',
        transaction_id: 'tx-123',
        onus_reference: 'ONUS-REF-1',
        payment_status: 'COMPLETED',
        payment_channel: 'BANK',
        currency: 'NGN'
      }
    });

    expect(parsed.accountNumber).toBe('7582360692');
    expect(parsed.amount).toBe(100);
    expect(parsed.transactionId).toBe('tx-123');
    expect(parsed.onusReference).toBe('ONUS-REF-1');
    expect(parsed.paymentStatus).toBe('COMPLETED');
  });

  it('parses JSON sent as a plain text body string', () => {
    const parsed = parsePayonusFundingWebhookBody(
      JSON.stringify({
        accountNumber: '7582360692',
        amount: 100,
        transactionId: 'tx-plain',
        onusReference: 'ONUS-PLAIN-1',
        paymentStatus: 'COMPLETED',
        currency: 'NGN'
      })
    );

    expect(parsed.accountNumber).toBe('7582360692');
    expect(parsed.amount).toBe(100);
    expect(parsed.transactionId).toBe('tx-plain');
  });

  it('parses stringified notification payloads', () => {
    const parsed = parsePayonusFundingWebhookBody({
      NotificationData: JSON.stringify({
        BeneficiaryAccount: '7582360692',
        TotalAmount: '100.00',
        TransactionReference: 'ONUS-VA-1',
        Currency: 'NGN',
        transactionStatusDesc: 'completed'
      })
    });

    expect(parsed.accountNumber).toBe('7582360692');
    expect(parsed.amount).toBe(100);
    expect(parsed.onusReference).toBe('ONUS-VA-1');
    expect(parsed.currency).toBe('NGN');
  });

  it('extracts full PayOnUs receipt-style details', () => {
    const parsed = parsePayonusFundingWebhookBody({
      data: {
        transactionId: '1f63971e-1b6a-4963-a76e-983e1fcdd6a7',
        transactionDateTime: 'Jun 08, 2026 pmt 14:12:03',
        businessName: 'Spring TD Limited',
        merchantName: 'Avis Charles',
        customerName: 'Spring TD Ebunoluwa Ade-Ajayi',
        emailAddress: 'iamebunade@gmail.com',
        accountName: 'Spring TD Ebunoluwa Ade-Ajayi',
        accountNumber: '7582360692',
        bankName: 'Globus Bank',
        paymentChannel: 'Bank Transfer',
        paymentStatus: 'Completed',
        transactionAmount: '100.00',
        transactionFee: '3',
        senderName: 'DAVID EZEKIEL TITUS',
        senderAccountNumber: '8166175255',
        senderBankName: 'OPAY DIGITAL SERVICES LIMITED',
        onusReference: 'ONUS-FNUB-9538024401806-08062026-141203',
        merchantReference: 'ONUS-FNUB-9538024401806-08062026-141203',
        sessionId: '100004260608131148162058880784',
        currency: 'NGN'
      }
    });

    expect(parsed.transactionId).toBe('1f63971e-1b6a-4963-a76e-983e1fcdd6a7');
    expect(parsed.transactionDateTime).toBe('Jun 08, 2026 pmt 14:12:03');
    expect(parsed.businessName).toBe('Spring TD Limited');
    expect(parsed.merchantName).toBe('Avis Charles');
    expect(parsed.customerName).toBe('Spring TD Ebunoluwa Ade-Ajayi');
    expect(parsed.customerEmail).toBe('iamebunade@gmail.com');
    expect(parsed.beneficiaryAccountName).toBe('Spring TD Ebunoluwa Ade-Ajayi');
    expect(parsed.accountNumber).toBe('7582360692');
    expect(parsed.beneficiaryBankName).toBe('Globus Bank');
    expect(parsed.paymentChannel).toBe('Bank Transfer');
    expect(parsed.paymentStatus).toBe('Completed');
    expect(parsed.amount).toBe(100);
    expect(parsed.transactionFee).toBe(3);
    expect(parsed.senderName).toBe('DAVID EZEKIEL TITUS');
    expect(parsed.senderAccountNumber).toBe('8166175255');
    expect(parsed.senderBankName).toBe('OPAY DIGITAL SERVICES LIMITED');
    expect(parsed.onusReference).toBe('ONUS-FNUB-9538024401806-08062026-141203');
    expect(parsed.merchantReference).toBe('ONUS-FNUB-9538024401806-08062026-141203');
    expect(parsed.sessionId).toBe('100004260608131148162058880784');
  });

  it('extracts nested PayOnUs senderDetails and fixed account fields from raw payload strings', () => {
    const rawPayload = JSON.stringify({
      id: 'c9a90084-cff7-44a4-bf4f-c593e61d8cf6',
      type: 'COLLECTION',
      currency: 'NGN',
      transactionAmount: 100,
      merchantFee: 3,
      merchantReference: 'ONUS-FNUB-2342188144005-08062026-161811',
      onusReference: 'ONUS-FNUB-2342188144005-08062026-161811',
      accountNumber: '7582360692',
      paymentStatus: 'SUCCESSFUL',
      paymentChannel: 'BANK_TRANSFER',
      businessId: '951e7ec5-14da-4f0b-966a-93c782e7fc67',
      senderDetails: {
        name: 'DAVID EZEKIEL TITUS',
        accountNumber: '8166175255',
        bankName: 'OPAY DIGITAL SERVICES LIMITED',
        bankCode: '100004'
      },
      fixedAccountId: 'a3e6a271-c9da-4285-9603-1370d846913a',
      fixedAccountMerchantReference: 'user-6a26817d85985edaca645730'
    });

    const parsed = parsePayonusFundingWebhookBody(rawPayload);
    const decoded = parsePayonusRawPayload({ rawPayload });

    expect(parsed.transactionId).toBe('c9a90084-cff7-44a4-bf4f-c593e61d8cf6');
    expect(parsed.amount).toBe(100);
    expect(parsed.senderName).toBe('DAVID EZEKIEL TITUS');
    expect(parsed.senderAccountNumber).toBe('8166175255');
    expect(parsed.senderBankName).toBe('OPAY DIGITAL SERVICES LIMITED');
    expect(parsed.senderBankCode).toBe('100004');
    expect(parsed.fixedAccountId).toBe('a3e6a271-c9da-4285-9603-1370d846913a');
    expect(parsed.fixedAccountMerchantReference).toBe('user-6a26817d85985edaca645730');
    expect(decoded).toMatchObject({
      rawPayload: {
        senderDetails: {
          name: 'DAVID EZEKIEL TITUS',
          accountNumber: '8166175255',
          bankName: 'OPAY DIGITAL SERVICES LIMITED',
          bankCode: '100004'
        }
      }
    });
  });
});
