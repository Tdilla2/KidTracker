import { useState } from "react";
import { Check, X, Crown, Zap, Building2, ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { toast } from "sonner";

const API_BASE = "https://v9iqpcma3c.execute-api.us-east-1.amazonaws.com/prod/api";

interface PricingPageProps {
  daycareId: string;
  daycareName: string;
  onSkip?: () => void;
  onClose?: () => void;
  isPostSignup?: boolean;
}

const TIERS = [
  {
    id: "starter" as const,
    name: "Starter",
    price: 199,
    icon: Zap,
    description: "Essential daycare management",
    color: "blue",
    features: [
      "Up to 25 children",
      "Dashboard & Analytics",
      "Child Management",
      "Attendance Tracking",
      "Activities & Classrooms",
      "Financial Management",
      "Invoicing",
      "Reports",
      "Meal Menu Planning",
      "User Management",
      "Company Info",
    ],
    excluded: ["QuickBooks Integration"],
  },
  {
    id: "professional" as const,
    name: "Professional",
    price: 299,
    icon: Crown,
    popular: true,
    description: "Everything in Starter plus accounting",
    color: "purple",
    features: [
      "Up to 75 children",
      "Everything in Starter",
      "QuickBooks Integration",
      "QB Invoice Sync",
      "QB Payment Sync",
      "QB Customer Sync",
      "Email Support",
    ],
    excluded: [],
  },
  {
    id: "enterprise" as const,
    name: "Enterprise",
    price: 499,
    icon: Building2,
    description: "Full platform with priority support",
    color: "amber",
    features: [
      "Unlimited children",
      "Everything in Professional",
      "Priority Phone & Email Support",
      "Custom Branding",
      "Advanced Analytics",
      "Multi-location Management",
      "Dedicated Onboarding",
    ],
    excluded: [],
  },
];

export function PricingPage({ daycareId, daycareName, onSkip, onClose, isPostSignup }: PricingPageProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSubscribe = async (plan: string) => {
    setLoadingPlan(plan);
    try {
      const res = await fetch(`${API_BASE}/stripe/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          daycareId,
          plan,
          successUrl: window.location.origin,
          cancelUrl: window.location.origin,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error(error.message || "Failed to start checkout. Please try again.");
      setLoadingPlan(null);
    }
  };

  const colorClasses = {
    blue: {
      border: "border-blue-200 hover:border-blue-400",
      header: "text-blue-700",
      badge: "bg-blue-100 text-blue-700",
      button: "bg-blue-600 hover:bg-blue-700",
      icon: "text-blue-600",
      price: "text-blue-900",
    },
    purple: {
      border: "border-purple-300 hover:border-purple-500 ring-2 ring-purple-200",
      header: "text-purple-700",
      badge: "bg-purple-100 text-purple-700",
      button: "bg-purple-600 hover:bg-purple-700",
      icon: "text-purple-600",
      price: "text-purple-900",
    },
    amber: {
      border: "border-amber-200 hover:border-amber-400",
      header: "text-amber-700",
      badge: "bg-amber-100 text-amber-700",
      button: "bg-amber-600 hover:bg-amber-700",
      icon: "text-amber-600",
      price: "text-amber-900",
    },
  };

  return (
    <div className={isPostSignup ? "min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col items-center justify-center p-3 sm:p-4" : ""}>
      <div className="w-full max-w-5xl mx-auto px-1 sm:px-0">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          {onClose && (
            <Button variant="ghost" className="mb-4" onClick={onClose}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            {isPostSignup ? "Choose Your Plan" : "Upgrade Your Plan"}
          </h2>
          <p className="text-sm sm:text-base text-gray-600 max-w-xl mx-auto">
            {isPostSignup
              ? `Welcome, ${daycareName}! Pay upfront to lock in your plan, or continue with your 14-day free trial.`
              : "Select a plan that fits your daycare's needs."}
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {TIERS.map((tier) => {
            const colors = colorClasses[tier.color as keyof typeof colorClasses];
            const Icon = tier.icon;

            return (
              <Card
                key={tier.id}
                className={`relative transition-all duration-200 ${colors.border} ${tier.popular ? "md:scale-105 shadow-xl" : "shadow-md"}`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className={`${colors.badge} px-4 py-1 text-sm font-semibold`}>
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-3 sm:pb-4 pt-5 sm:pt-6">
                  <div className="flex justify-center mb-2 sm:mb-3">
                    <div className={`p-2 sm:p-3 rounded-xl bg-gradient-to-br from-gray-50 to-white shadow-sm`}>
                      <Icon className={`h-6 w-6 sm:h-8 sm:w-8 ${colors.icon}`} />
                    </div>
                  </div>
                  <CardTitle className={`text-lg sm:text-xl ${colors.header}`}>{tier.name}</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">{tier.description}</CardDescription>
                  <div className="mt-3 sm:mt-4">
                    <span className={`text-3xl sm:text-4xl font-bold ${colors.price}`}>${tier.price}</span>
                    <span className="text-gray-500 text-xs sm:text-sm">/month</span>
                  </div>
                </CardHeader>

                <CardContent className="pt-0 px-4 sm:px-6">
                  <ul className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-xs sm:text-sm">
                        <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500 shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                    {tier.excluded.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-xs sm:text-sm">
                        <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-400 shrink-0" />
                        <span className="text-gray-400 line-through">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={`w-full text-white text-sm sm:text-base ${colors.button}`}
                    onClick={() => handleSubscribe(tier.id)}
                    disabled={loadingPlan !== null}
                  >
                    {loadingPlan === tier.id
                      ? "Redirecting..."
                      : `Subscribe — $${tier.price}/mo`}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Skip / Continue with trial */}
        {isPostSignup && onSkip && (
          <div className="text-center">
            <button
              type="button"
              onClick={onSkip}
              className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 underline"
            >
              Continue with Free Trial — no credit card needed
            </button>
          </div>
        )}

        {/* Footer note */}
        <p className="text-center text-xs text-gray-400 mt-6">
          All plans include a 14-day free trial. Cancel anytime. Prices in USD.
        </p>
      </div>
    </div>
  );
}
