import notificationService from './NotificationService';

/** Fire-and-forget storefront notifications (in-app inbox, optional email, Web Push when subscribed). */
export async function sendStorefrontNotification(args: {
  userId: string;
  email?: string;
  template: string;
  data: Record<string, unknown>;
  priority?: 'high' | 'normal' | 'low';
}): Promise<void> {
  try {
    await notificationService.sendEmailAndInApp({
      userId: args.userId,
      ...(args.email?.trim() ? { email: args.email.trim() } : {}),
      template: args.template,
      data: args.data,
      ...(args.priority ? { priority: args.priority } : {})
    });
  } catch (error) {
    console.error(`[client-auth-ms] Failed to send storefront notification (${args.template}):`, error);
  }
}

/** In-app only (e.g. OTP companion — never includes the code). */
export async function sendStorefrontInAppPrompt(args: {
  userId: string;
  template: string;
  data: Record<string, unknown>;
}): Promise<void> {
  try {
    await notificationService.sendInAppOnly({
      userId: args.userId,
      template: args.template,
      data: args.data
    });
  } catch (error) {
    console.error(`[client-auth-ms] Failed to send storefront in-app prompt (${args.template}):`, error);
  }
}
