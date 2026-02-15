export type SubscriptionStatus = "trial" | "active" | "expired";

export interface TrialInfo {
  isOnTrial: boolean;
  isTrialExpired: boolean;
  isPermanentlyActive: boolean;
  isAccessAllowed: boolean;
  daysRemaining: number;
  trialEndsAt: string | null;
}

interface DaycareTrialFields {
  trialEndsAt?: string | null;
  subscriptionStatus?: SubscriptionStatus | null;
}

export function getTrialInfo(daycare: DaycareTrialFields): TrialInfo {
  const { subscriptionStatus, trialEndsAt } = daycare;

  // Permanently active subscription — always allowed
  if (subscriptionStatus === "active") {
    return {
      isOnTrial: false,
      isTrialExpired: false,
      isPermanentlyActive: true,
      isAccessAllowed: true,
      daysRemaining: Infinity,
      trialEndsAt: trialEndsAt ?? null,
    };
  }

  // Explicitly expired — always blocked
  if (subscriptionStatus === "expired") {
    return {
      isOnTrial: false,
      isTrialExpired: true,
      isPermanentlyActive: false,
      isAccessAllowed: false,
      daysRemaining: 0,
      trialEndsAt: trialEndsAt ?? null,
    };
  }

  // Trial status — check the date
  if (subscriptionStatus === "trial" && trialEndsAt) {
    const now = new Date();
    const end = new Date(trialEndsAt);
    const diffMs = end.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const expired = daysRemaining <= 0;

    return {
      isOnTrial: !expired,
      isTrialExpired: expired,
      isPermanentlyActive: false,
      isAccessAllowed: !expired,
      daysRemaining,
      trialEndsAt,
    };
  }

  // Fallback for pre-migration data (no columns yet) — allow access
  return {
    isOnTrial: false,
    isTrialExpired: false,
    isPermanentlyActive: false,
    isAccessAllowed: true,
    daysRemaining: Infinity,
    trialEndsAt: null,
  };
}

/** Returns an ISO string for 14 days from now */
export function computeTrialEndDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date.toISOString();
}
