import type { AmortizationScheduleView } from '../types/amortizationSchedule';
import type { UserProductApplication } from '../types/userProductApplication';

/** Stub — full billing schedule wiring lives outside this restore. */
export async function resolveAmortizationScheduleForApplication(
  _application: UserProductApplication
): Promise<AmortizationScheduleView | null> {
  return null;
}
