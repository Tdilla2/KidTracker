import { useState, useEffect } from "react";
import { LayoutDashboard, Users, Calendar, DollarSign, FileText, BarChart3, UtensilsCrossed, Link, Settings, LogOut, Building2, ClipboardList, School, ArrowLeft, Shield, AlertTriangle, CreditCard, Menu, X } from "lucide-react";
import defaultLogo from "./assets/kidtracker-logo.jpg";
import { Button } from "./components/ui/button";
import { Dashboard } from "./components/Dashboard";
import { ChildrenManagement } from "./components/ChildrenManagement";
import { Attendance } from "./components/Attendance";
import { Financials } from "./components/Financials";
import { Invoicing } from "./components/Invoicing";
import { Reports } from "./components/Reports";
import { MealMenu } from "./components/MealMenu";
import { QuickBooksIntegration } from "./components/QuickBooksIntegration";
import { ManageUsers } from "./components/ManageUsers";
import { ParentPortal } from "./components/ParentPortal";
import { CompanyInfo } from "./components/CompanyInfo";
import { Activities } from "./components/Activities";
import { Classrooms } from "./components/Classrooms";
import { Login } from "./components/Login";
import { TrialSignup } from "./components/TrialSignup";
import { ForcePasswordChange } from "./components/ForcePasswordChange";
import { ForgotPassword } from "./components/ForgotPassword";
import { SuperAdminDashboard } from "./components/SuperAdminDashboard";
import { BillingSettings } from "./components/BillingSettings";
import { DataProvider, useData } from "./context/DataContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Toaster } from "./components/ui/sonner";
import { Badge } from "./components/ui/badge";
import { toast } from "sonner";
import { getTrialInfo, hasFeatureAccess } from "../utils/trialUtils";

type Page = "dashboard" | "children" | "attendance" | "activities" | "classrooms" | "financials" | "invoicing" | "reports" | "mealmenu" | "quickbooks" | "users" | "parent" | "company" | "billing";

function AppContent() {
  const { isAuthenticated, isAdmin, isSuperAdmin, currentUser, currentDaycare, setCurrentDaycare, refreshCurrentDaycare, logout, logoutCount } = useAuth();
  const { companyInfo } = useData();
  const [showTrialSignup, setShowTrialSignup] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    // Initialize state based on user role
    if (!currentUser) return "dashboard";
    if (currentUser.role === "parent") return "parent";
    if (currentUser.role === "user") return "attendance";
    return "dashboard";
  });

  // Close sidebar on navigation (mobile)
  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
    setSidebarOpen(false);
  };

  // Detect QuickBooks OAuth callback redirect (?code=...&realmId=...&state=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code    = params.get('code');
    const realmId = params.get('realmId');
    const state   = params.get('state');
    if (!code || !realmId) return;

    // If we're inside the OAuth popup, send data back to the main window and close
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        { type: 'qbo_callback', code, realmId, daycareId: state, redirectUri: window.location.origin },
        window.location.origin
      );
      window.close();
      return;
    }

    // Fallback: main window redirect flow (stays logged in via localStorage)
    if (!isAuthenticated) return;
    localStorage.setItem('qbo_pending_callback', JSON.stringify({ code, realmId, daycareId: state, redirectUri: window.location.origin }));
    window.history.replaceState({}, '', window.location.pathname);
    setCurrentPage('quickbooks');
  }, [isAuthenticated]);

  // Detect Stripe Checkout redirect (?payment=success or ?payment=cancelled)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    if (!payment) return;

    window.history.replaceState({}, "", window.location.pathname);

    if (payment === "success") {
      // Refresh daycare data to get updated subscription from webhook
      refreshCurrentDaycare();
      setCurrentPage("billing");
      toast.success("Payment successful! Your subscription is now active.");
    } else if (payment === "cancelled") {
      toast.info("Payment was cancelled. You can upgrade anytime from Billing.");
    }
  }, [isAuthenticated]);

  // Show login or trial signup or forgot password screen if not authenticated
  if (!isAuthenticated) {
    if (showTrialSignup) {
      return (
        <>
          <TrialSignup onBackToLogin={() => setShowTrialSignup(false)} />
          <Toaster />
        </>
      );
    }
    if (showForgotPassword) {
      return (
        <>
          <ForgotPassword onBackToLogin={() => setShowForgotPassword(false)} />
          <Toaster />
        </>
      );
    }
    return (
      <>
        <Login
          key={logoutCount}
          onStartTrial={() => setShowTrialSignup(true)}
          onForgotPassword={() => setShowForgotPassword(true)}
        />
        <Toaster />
      </>
    );
  }

  // Force password change for new users
  if (currentUser?.mustChangePassword) {
    return (
      <>
        <ForcePasswordChange />
        <Toaster />
      </>
    );
  }

  // Super Admin - show dashboard or manage specific daycare
  if (isSuperAdmin && !currentDaycare) {
    return (
      <>
        <div className="min-h-screen bg-background">
          <header className="sticky top-0 z-40 border-b border-blue-200 bg-gradient-to-r from-blue-700 to-blue-600 shadow-md">
            <div className="flex h-14 sm:h-16 items-center px-3 sm:px-4 gap-2 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex items-center justify-center w-9 h-9 sm:w-12 sm:h-12 bg-white rounded-lg shadow-lg overflow-hidden">
                  <img src={companyInfo.logo || defaultLogo} alt="Company logo" className="w-full h-full object-contain p-1" />
                </div>
                <div>
                  <h1 className="text-base sm:text-lg font-bold text-white">KidTrackerApp™</h1>
                  <p className="text-[10px] sm:text-xs text-blue-50 hidden sm:block">Super Admin Portal</p>
                </div>
              </div>

              <div className="flex-1" />

              <div className="ml-auto flex items-center gap-2 sm:gap-3">
                <div className="text-right mr-1 sm:mr-2 hidden sm:block">
                  <p className="text-sm font-medium text-white">{currentUser?.fullName}</p>
                  <Badge variant="outline" className="border-white text-white text-xs">
                    Super Admin
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-blue-800"
                  onClick={logout}
                >
                  <LogOut className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 p-3 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
              <SuperAdminDashboard />
            </div>
          </main>
        </div>
        <Toaster />
      </>
    );
  }

  // Parent role - show only parent portal
  if (currentUser?.role === "parent") {
    return (
      <>
        <div className="min-h-screen bg-background">
          <header className="sticky top-0 z-40 border-b border-blue-200 bg-gradient-to-r from-blue-700 to-blue-600 shadow-md">
            <div className="flex h-14 sm:h-16 items-center px-3 sm:px-4 gap-2 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex items-center justify-center w-9 h-9 sm:w-12 sm:h-12 bg-white rounded-lg shadow-lg overflow-hidden">
                  <img src={companyInfo.logo || defaultLogo} alt="Company logo" className="w-full h-full object-contain p-1" />
                </div>
                <div>
                  <h1 className="text-base sm:text-lg font-bold text-white">KidTrackerApp™</h1>
                  <p className="text-[10px] sm:text-xs text-blue-50 hidden sm:block">Powered by GDI Digital Solutions</p>
                </div>
              </div>

              {/* Company Name in Center - hidden on mobile */}
              {companyInfo.name && (
                <div className="flex-1 hidden md:flex justify-center">
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-white tracking-wide">{companyInfo.name}</h2>
                  </div>
                </div>
              )}

              <div className="ml-auto flex items-center gap-2 sm:gap-3">
                <div className="text-right mr-1 sm:mr-2 hidden sm:block">
                  <p className="text-sm font-medium text-white">{currentUser?.fullName}</p>
                  <Badge variant="outline" className="border-white text-white text-xs">
                    Parent
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-blue-800"
                  onClick={logout}
                >
                  <LogOut className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 p-3 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
              <ParentPortal />
            </div>
          </main>
        </div>
        <Toaster />
      </>
    );
  }

  // Regular User - only attendance and invoicing
  const userNavigationItems = [
    { id: "attendance" as Page, label: "Attendance", icon: Calendar },
    { id: "activities" as Page, label: "Activities", icon: ClipboardList },
    { id: "invoicing" as Page, label: "Invoicing", icon: FileText },
    { id: "mealmenu" as Page, label: "Meal Menu", icon: UtensilsCrossed },
  ];

  // QuickBooks access: enabled during trial, gated by plan after trial
  const qbDisabled = (() => {
    if (!currentDaycare) return true;
    if (currentDaycare.subscriptionStatus === "trial") return false;
    if (currentDaycare.subscriptionStatus === "active" && (!currentDaycare.subscriptionPlan || currentDaycare.subscriptionPlan === "none")) return false;
    return !hasFeatureAccess(currentDaycare.subscriptionPlan, "quickbooks");
  })();

  // Admin - all features
  const adminNavigationItems = [
    { id: "dashboard" as Page, label: "Dashboard", icon: LayoutDashboard },
    { id: "children" as Page, label: "Children", icon: Users },
    { id: "attendance" as Page, label: "Attendance", icon: Calendar },
    { id: "activities" as Page, label: "Activities", icon: ClipboardList },
    { id: "classrooms" as Page, label: "Classrooms", icon: School },
    { id: "financials" as Page, label: "Financials", icon: DollarSign },
    { id: "invoicing" as Page, label: "Invoicing", icon: FileText },
    { id: "reports" as Page, label: "Reports", icon: BarChart3 },
    { id: "mealmenu" as Page, label: "Meal Menu", icon: UtensilsCrossed },
    { id: "quickbooks" as Page, label: "QuickBooks Integration", icon: Link, disabled: qbDisabled },
    { id: "users" as Page, label: "Manage Users", icon: Settings },
    { id: "billing" as Page, label: "Billing", icon: CreditCard },
    { id: "company" as Page, label: "Company Info", icon: Building2 },
  ];

  const navigationItems = isAdmin ? adminNavigationItems : userNavigationItems;

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard onNavigate={(page) => handleNavigate(page as Page)} />;
      case "children":
        return <ChildrenManagement onNavigate={(page) => handleNavigate(page as Page)} />;
      case "attendance":
        return <Attendance />;
      case "activities":
        return <Activities />;
      case "classrooms":
        return <Classrooms />;
      case "financials":
        return <Financials />;
      case "invoicing":
        return <Invoicing />;
      case "reports":
        return <Reports />;
      case "mealmenu":
        return <MealMenu />;
      case "quickbooks":
        return <QuickBooksIntegration />;
      case "users":
        return <ManageUsers />;
      case "billing":
        return <BillingSettings />;
      case "company":
        return <CompanyInfo />;
      default:
        return <Dashboard />;
    }
  };

  // Trial warning banner
  const trialInfo = currentDaycare ? getTrialInfo(currentDaycare) : null;
  const showTrialWarning = trialInfo && trialInfo.isOnTrial && trialInfo.daysRemaining <= 5;

  // Admin/User View
  return (
    <>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-blue-200 bg-gradient-to-r from-blue-700 to-blue-600 shadow-md">
          <div className="flex h-14 sm:h-16 items-center px-3 sm:px-4 gap-2 sm:gap-4">
            {/* Hamburger menu - mobile/tablet only */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden text-white hover:bg-blue-800 p-1.5"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center justify-center w-9 h-9 sm:w-12 sm:h-12 bg-white rounded-lg shadow-lg overflow-hidden">
                <img src={companyInfo.logo || defaultLogo} alt="Company logo" className="w-full h-full object-contain p-1" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-base sm:text-lg font-bold text-white">KidTrackerApp™</h1>
                <p className="text-[10px] sm:text-xs text-blue-50">Powered by GDI Digital Solutions</p>
              </div>
            </div>

            {/* Company/Daycare Name in Center - hidden on mobile */}
            <div className="flex-1 hidden md:flex justify-center">
              <div className="text-center">
                {isSuperAdmin && currentDaycare ? (
                  <>
                    <h2 className="text-xl font-bold text-white tracking-wide">{currentDaycare.name}</h2>
                    <p className="text-xs text-blue-100">Managing Daycare</p>
                  </>
                ) : companyInfo.name ? (
                  <h2 className="text-xl font-bold text-white tracking-wide">{companyInfo.name}</h2>
                ) : null}
              </div>
            </div>

            {/* Spacer on mobile */}
            <div className="flex-1 md:hidden" />

            <div className="ml-auto flex items-center gap-1 sm:gap-3">
              {/* Back to All Daycares button for Super Admin */}
              {isSuperAdmin && currentDaycare && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white text-white hover:bg-blue-800 hover:text-white text-xs sm:text-sm"
                  onClick={() => setCurrentDaycare(null)}
                >
                  <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                  <span className="hidden sm:inline">All Daycares</span>
                </Button>
              )}

              <div className="text-right mr-1 sm:mr-2 hidden sm:block">
                <p className="text-sm font-medium text-white">{currentUser?.fullName}</p>
                <Badge variant="outline" className="border-white text-white text-xs">
                  {currentUser?.role === "super_admin" ? "Super Admin" : currentUser?.role === "admin" ? "Admin" : "User"}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-blue-800"
                onClick={logout}
              >
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Trial Warning Banner */}
        {showTrialWarning && (
          <div className="bg-yellow-50 border-b border-yellow-200 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-yellow-800">
            <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0" />
            <span>Trial expires in <strong>{trialInfo.daysRemaining} day{trialInfo.daysRemaining !== 1 ? "s" : ""}</strong>.</span>
            <Button
              size="sm"
              variant="outline"
              className="border-yellow-400 text-yellow-800 hover:bg-yellow-100 h-7 text-xs"
              onClick={() => handleNavigate("billing")}
            >
              Upgrade Now
            </Button>
          </div>
        )}

        <div className="flex relative">
          {/* Mobile sidebar overlay backdrop */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-30 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar - collapsible on mobile, always visible on desktop */}
          <aside className={`
            fixed lg:sticky top-14 sm:top-16 left-0 z-30
            h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)]
            w-64 border-r border-blue-200 bg-gradient-to-b from-blue-50 to-white
            transition-transform duration-200 ease-in-out overflow-y-auto
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
          `}>
            {/* Mobile: show user info at top of sidebar */}
            <div className="lg:hidden p-4 pb-2 border-b border-blue-100">
              <p className="text-sm font-medium text-blue-900">{currentUser?.fullName}</p>
              <Badge variant="outline" className="text-xs border-blue-300 text-blue-700 mt-1">
                {currentUser?.role === "super_admin" ? "Super Admin" : currentUser?.role === "admin" ? "Admin" : "User"}
              </Badge>
            </div>

            <nav className="flex flex-col gap-1 p-4">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isDisabled = "disabled" in item && item.disabled;
                return (
                  <Button
                    key={item.id}
                    variant={currentPage === item.id ? "default" : "ghost"}
                    className={
                      isDisabled
                        ? "justify-start text-gray-400 cursor-not-allowed opacity-50"
                        : currentPage === item.id
                          ? "justify-start bg-blue-700 hover:bg-blue-800 text-white"
                          : "justify-start text-blue-900 hover:bg-blue-100 hover:text-blue-800"
                    }
                    onClick={() => {
                      if (isDisabled) {
                        toast.info("QuickBooks Integration requires the Professional or Enterprise plan.", {
                          action: { label: "Upgrade", onClick: () => handleNavigate("billing" as Page) },
                        });
                        return;
                      }
                      handleNavigate(item.id);
                    }}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.label}
                    {isDisabled && (
                      <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0 border-gray-300 text-gray-400">Pro</Badge>
                    )}
                  </Button>
                );
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0 p-3 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
              {renderPage()}
            </div>
          </main>
        </div>
      </div>
      <Toaster />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AuthProvider>
  );
}

export default App;