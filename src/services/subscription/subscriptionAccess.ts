export const SUBSCRIPTION_BLOCKED_EVENT = 'subscription:blocked';

export class SubscriptionBlockedError extends Error {
  code: string;

  constructor(message = 'Subscription expired. Please renew to continue.') {
    super(message);
    this.name = 'SubscriptionBlockedError';
    this.code = 'SUBSCRIPTION_EXPIRED';
  }
}

export function notifySubscriptionBlocked(
  message = 'Clinic subscription has expired. Please renew to continue.'
) {
  window.dispatchEvent(
    new CustomEvent(SUBSCRIPTION_BLOCKED_EVENT, {
      detail: { message },
    })
  );
}

export function assertSubscriptionActive(isExpired: boolean, message?: string) {
  if (!isExpired) return;
  notifySubscriptionBlocked(message);
  throw new SubscriptionBlockedError(message);
}

export function isSubscriptionBlockedError(error: unknown): boolean {
  const maybeError = error as any;
  return Boolean(
    maybeError?.code === 'SUBSCRIPTION_EXPIRED' ||
      maybeError?.subscriptionBlocked === true ||
      maybeError?.response?.status === 402
  );
}
