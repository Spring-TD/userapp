import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import axios from 'axios';
import {
  formatInspectionScheduledFor,
  notifyMortgageInspectionBookingFromSpring
} from '../services/productFlowNotificationService';

jest.mock('axios');

const mockedPost = axios.post as jest.MockedFunction<typeof axios.post>;

describe('productFlowNotificationService storefront mortgage inspection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedPost.mockResolvedValue({ status: 200, data: { success: true } } as never);
  });

  it('formats inspection slots in UTC', () => {
    const formatted = formatInspectionScheduledFor('2026-08-17T09:00:00.000Z');
    expect(formatted).toContain('17');
    expect(formatted).toContain('09:00');
  });

  it('sends mortgage-inspection-booking via send-dual', async () => {
    await notifyMortgageInspectionBookingFromSpring({
      id: 'local-app-1',
      userId: 'spring-user-1',
      email: 'borrower@example.com',
      customerName: 'David Testimony',
      productName: 'Parkview Court',
      postApprovalFulfillment: {
        appointment: {
          scheduledFor: '2026-08-17T09:00:00.000Z',
          location: 'Parkview Estate, Ikoyi'
        }
      }
    });

    expect(mockedPost).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/notifications/send-dual'),
      expect.objectContaining({
        userId: 'spring-user-1',
        email: 'borrower@example.com',
        template: 'mortgage-inspection-booking',
        priority: 'high',
        data: expect.objectContaining({
          userName: 'David Testimony',
          propertyAddress: 'Parkview Court',
          location: 'Parkview Estate, Ikoyi'
        })
      }),
      expect.any(Object)
    );
  });
});
