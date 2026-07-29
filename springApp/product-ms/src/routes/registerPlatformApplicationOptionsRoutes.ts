import { Router } from 'express';
import type { PlatformApplicationOptionsController } from '../controllers/platformApplicationOptionsController';

/**
 * Platform apply-form dropdown options (PEP, income, marital status, loan reason, etc.).
 * Must be mounted before `/:id` on the same router.
 */
export function registerPlatformApplicationOptionsRoutes(
  router: Router,
  controller: PlatformApplicationOptionsController
): void {
  router.get('/options/platform-application-fields', controller.getPlatformApplicationFieldOptions);
  router.get('/options/repayment-source', controller.getRepaymentSourceOptions);
  router.get('/options/marital-status', controller.getMaritalStatusOptions);
  router.get('/options/loan-reason', controller.getLoanReasonOptions);
}
