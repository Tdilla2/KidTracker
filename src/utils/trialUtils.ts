export type SubscriptionStatus = "trial" | "active" | "expired";
export type SubscriptionPlan = "none" | "starter" | "professional" | "enterprise";

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

/** Returns the max children allowed for a given plan (Infinity = unlimited) */
export function getChildLimit(plan: SubscriptionPlan | undefined): number {
  switch (plan) {
    case "starter": return 25;
    case "professional": return 75;
    case "enterprise": return Infinity;
    default: return Infinity; // trial / legacy / none = unlimited during trial
  }
}

/** Check if a subscription plan has access to a specific feature */
export function hasFeatureAccess(plan: SubscriptionPlan | undefined, feature: string): boolean {
  const planOrDefault = plan || "none";

  const featureMatrix: Record<string, SubscriptionPlan[]> = {
    quickbooks: ["professional", "enterprise"],
  };

  const allowedPlans = featureMatrix[feature];
  if (!allowedPlans) return true;
  return allowedPlans.includes(planOrDefault);
}
