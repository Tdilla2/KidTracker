import { useState } from "react";
import { CreditCard, Calendar, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { useAuth } from "../context/AuthContext";
import { getTrialInfo } from "../../utils/trialUtils";
import { PricingPage } from "./PricingPage";
import { toast } from "sonner";

const API_BASE = "https://v9iqpcma3c.execute-api.us-east-1.amazonaws.com/prod/api";

const PLAN_LABELS: Record<string, string> = {
  none: "No Plan",
  starter: "Starter",
  professional: "Professional",
  enterprise: "Enterprise",
};

const PLAN_PRICES: Record<string, number> = {
  starter: 199,
  professional: 299,
  enterprise: 499,
};

export function BillingSettings() {
  const { currentDaycare } = useAuth();
  const [showPricing, setShowPricing] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);

  if (!currentDaycare) {
    return (
      <div className="text-center py-12 text-gray-500">
        No daycare selected.
      </div>
    );
  }

  const trialInfo = getTrialInfo(currentDaycare);
  const plan = currentDaycare.subscriptionPlan || "none";
  const planLabel = PLAN_LABELS[plan] || plan;
  const planPrice = PLAN_PRICES[plan];

  const handleManageBilling = async () => {
    if (!currentDaycare.stripeCustomerId) {
      toast.error("No billing account found. Please subscribe to a plan first.");
      return;
    }

    setLoadingPortal(true);
    try {
      const res = await fetch(`${API_BASE}/stripe/create-portal-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          daycareId: currentDaycare.id,
          returnUrl: window.location.origin,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to open billing portal");

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error("Portal error:", error);
      toast.error(error.message || "Failed to open billing portal.");
    } finally {
      setLoadingPortal(false);
    }
  };

  if (showPricing) {
    return (
      <PricingPage
        daycareId={currentDaycare.id}
        daycareName={currentDaycare.name}
        onClose={() => setShowPricing(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-600 text-white rounded-lg p-4 sm:p-6 shadow-md">
        <div className="flex items-center gap-2 sm:gap-3">
          <CreditCard className="h-6 w-6 sm:h-8 sm:w-8 shrink-0" />
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-white">Billing & Subscription</h1>
            <p className="text-blue-100 text-xs sm:text-sm">Manage your subscription plan and billing</p>
          </div>
        </div>
      </div>

      {/* Current Plan Card */}
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Current Plan
            <Badge
              variant="outline"
              className={
                trialInfo.isPermanentlyActive
                  ? "border-green-300 text-green-700 bg-green-50"
                  : trialInfo.isOnTrial
                  ? "border-blue-300 text-blue-700 bg-blue-50"
                  : "border-red-300 text-red-700 bg-red-50"
              }
            >
              {trialInfo.isPermanentlyActive
                ? "Active"
                : trialInfo.isOnTrial
                ? "Trial"
                : "Expired"}
            </Badge>
          </CardTitle>
          <CardDescription>
            {currentDaycare.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-3 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {/* Plan Name */}
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-gray-500 mb-1">Plan</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{planLabel}</p>
              {planPrice && (
                <p className="text-sm text-gray-500">${planPrice}/month</p>
              )}
            </div>

            {/* Status */}
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-gray-500 mb-1">Status</p>
              <div className="flex items-center gap-2">
                {trialInfo.isPermanentlyActive ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="text-lg sm:text-xl font-bold text-green-700">Active</span>
                  </>
                ) : trialInfo.isOnTrial ? (
                  <>
                    <Calendar className="h-5 w-5 text-blue-500" />
                    <span className="text-lg sm:text-xl font-bold text-blue-700">Trial</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <span className="text-lg sm:text-xl font-bold text-red-700">Expired</span>
                  </>
                )}
              </div>
            </div>

            {/* Trial Days / Renewal */}
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-gray-500 mb-1">
                {trialInfo.isOnTrial ? "Trial Days Remaining" : "Renewal"}
              </p>
              {trialInfo.isOnTrial ? (
                <p className="text-lg sm:text-xl font-bold text-blue-700">
                  {trialInfo.daysRemaining} day{trialInfo.daysRemaining !== 1 ? "s" : ""}
                </p>
              ) : trialInfo.isPermanentlyActive ? (
                <p className="text-lg sm:text-xl font-bold text-gray-700">Auto-renewing</p>
              ) : (
                <p className="text-lg sm:text-xl font-bold text-red-700">--</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-4 border-t">
            {(!trialInfo.isPermanentlyActive || plan === "none" || plan === "starter") && (
              <Button
                className="bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700"
                onClick={() => setShowPricing(true)}
              >
                {trialInfo.isPermanentlyActive ? "Change Plan" : "Upgrade Now"}
              </Button>
            )}

            {currentDaycare.stripeCustomerId && (
              <Button
                variant="outline"
                onClick={handleManageBilling}
                disabled={loadingPortal}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                {loadingPortal ? "Opening..." : "Manage Billing"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Trial warning if applicable */}
      {trialInfo.isOnTrial && trialInfo.daysRemaining <= 5 && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-semibold text-yellow-800">
                  Your trial expires in {trialInfo.daysRemaining} day{trialInfo.daysRemaining !== 1 ? "s" : ""}
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Subscribe to a plan to keep full access to KidTracker after your trial ends.
                </p>
                <Button
                  size="sm"
                  className="mt-3 bg-yellow-600 hover:bg-yellow-700"
                  onClick={() => setShowPricing(true)}
                >
                  View Plans
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expired warning */}
      {trialInfo.isTrialExpired && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800">Your subscription has expired</p>
                <p className="text-sm text-red-700 mt-1">
                  Subscribe to a plan to restore access to KidTracker.
                </p>
                <Button
                  size="sm"
                  className="mt-3 bg-red-600 hover:bg-red-700"
                  onClick={() => setShowPricing(true)}
                >
                  Subscribe Now
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
