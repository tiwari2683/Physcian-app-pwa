import { useAppSelector } from './hooks';

/**
 * useSubscription — lightweight hook consumed by any component
 * that needs to gate actions based on the clinic's subscription state.
 *
 * Data is fetched once per session in DashboardScreen and stored in Redux.
 * Every other component simply reads from the store — zero extra network calls.
 */
export function useSubscription() {
  const { clinicName, subscriptionExpiry, status } = useAppSelector(s => s.clinic);

  const now = Date.now();
  const expiryMs = subscriptionExpiry ? new Date(subscriptionExpiry).getTime() : null;
  
  // Precise expiration: true if the exact moment has passed or status is SUSPENDED
  const isExpired = status === 'SUSPENDED' || (expiryMs !== null && now >= expiryMs);

  // Time remaining in milliseconds
  const remainingMs = expiryMs !== null ? expiryMs - now : 0;
  
  // Conservative day count: 25 hours left = 1 full day left; 10 hours left = 0 full days (Today)
  const daysLeft = expiryMs !== null ? Math.floor(remainingMs / 86_400_000) : null;

  // Human-readable labels for the countdown
  let daysLeftLabel = null;
  if (expiryMs !== null) {
    if (isExpired) {
      daysLeftLabel = 'Expired';
    } else if (remainingMs < 86_400_000) {
      daysLeftLabel = 'Today';
    } else {
      daysLeftLabel = `${daysLeft}d`;
    }
  }

  /** True only in the last-30-day warning window and not yet expired */
  const isExpiringSoon = !isExpired && daysLeft !== null && daysLeft <= 30;

  /** Formatted expiry date string e.g. "15 May 2026" */
  const expiryDateLabel = expiryMs
    ? new Date(expiryMs).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return {
    clinicName,
    daysLeft,
    daysLeftLabel,
    isExpired,
    isExpiringSoon,
    expiryDateLabel,
    status,
  };
}
