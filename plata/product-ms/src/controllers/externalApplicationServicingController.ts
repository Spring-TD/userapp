import type { Request, Response } from 'express';
import { ApiError } from '../middleware/errorHandler';
import {
  ExternalApplicationServicingService,
  type ExternalLoanOfferResponseInput
} from '../services/externalApplicationServicingService';

export class ExternalApplicationServicingController {
  constructor(private readonly service: ExternalApplicationServicingService) {}

  getStatus = async (req: Request, res: Response): Promise<void> => {
    await this.handle(req, res, 'get external application status', (merchantId, reference) =>
      this.service.getStatus(merchantId, reference)
    );
  };

  getOffer = async (req: Request, res: Response): Promise<void> => {
    await this.handle(req, res, 'get external loan offer', (merchantId, reference) =>
      this.service.getOffer(merchantId, reference)
    );
  };

  respondToOffer = async (req: Request, res: Response): Promise<void> => {
    const body = req.validatedBody as ExternalLoanOfferResponseInput;
    await this.handle(
      req,
      res,
      'respond to external loan offer',
      (merchantId, reference) => this.service.respondToOffer(merchantId, reference, body),
      body.action === 'accept' ? 'Loan offer accepted' : 'Loan offer declined'
    );
  };

  getAccount = async (req: Request, res: Response): Promise<void> => {
    await this.handle(req, res, 'get external application account', (merchantId, reference) =>
      this.service.getAccount(merchantId, reference)
    );
  };

  getRepaymentSchedule = async (req: Request, res: Response): Promise<void> => {
    await this.handle(req, res, 'get external loan repayment schedule', (merchantId, reference) =>
      this.service.getRepaymentSchedule(merchantId, reference)
    );
  };

  private async handle(
    req: Request,
    res: Response,
    label: string,
    run: (merchantId: string, reference: string) => Promise<unknown>,
    message?: string
  ): Promise<void> {
    try {
      const gm = req.gatewayMerchant;
      if (!gm) {
        res.status(401).json({ success: false, error: 'Gateway context missing' });
        return;
      }
      const data = await run(gm.merchantId, String(req.params.applicationId || ''));
      res.status(200).json({ success: true, ...(message ? { message } : {}), data });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
        return;
      }
      console.error(`${label}:`, error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}
