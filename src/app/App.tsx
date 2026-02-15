import { useState } from "react";
import { LayoutDashboard, Users, Calendar, DollarSign, FileText, BarChart3, UtensilsCrossed, Link, Settings, LogOut, Building2, ClipboardList, School, ArrowLeft, Shield, AlertTriangle } from "lucide-react";
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
import { SuperAdminDashboard } from "./components/SuperAdminDashboard";
import { DataProvider, useData } from "./context/DataContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Toaster } from "./components/ui/sonner";
import { Badge } from "./components/ui/badge";
import { getTrialInfo } from "../utils/trialUtils";

type Page = "dashboard" | "children" | "attendance" | "activities" | "classrooms" | "financials" | "invoicing" | "reports" | "mealmenu" | "quickbooks" | "users" | "parent" | "company";

function AppContent() {
  const { isAuthenticated, isAdmin, isSuperAdmin, currentUser, currentDaycare, setCurrentDaycare, logout, logoutCount } = useAuth();
  const { companyInfo } = useData();
  const [showTrialSignup, setShowTrialSignup] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    // Initialize state based on user role
    if (!currentUser) return "dashboard";
    if (currentUser.role === "parent") return "parent";
    if (currentUser.role === "user") return "attendance";
    return "dashboard";
  });

  // Show login or trial signup screen if not authenticated
  if (!isAuthenticated) {
    if (showTrialSignup) {
      return (
        <>
          <TrialSignup onBackToLogin={() => setShowTrialSignup(false)} />
          <Toaster />
        </>
      );
    }
    return (
      <>
        <Login key={logoutCount} onStartTrial={() => setShowTrialSignup(true)} />
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
            <div className="flex h-16 items-center px-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 bg-white rounded-lg shadow-lg overflow-hidden">
                  {companyInfo.logo ? (
                    <img src={companyInfo.logo} alt="Company logo" className="w-full h-full object-contain p-1" />
                  ) : (
                    <Shield className="h-6 w-6 text-blue-700" />
                  )}
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">KidTrackerApp™</h1>
                  <p className="text-xs text-blue-50">Super Admin Portal</p>
                </div>
              </div>

              <div className="flex-1" />

              <div className="ml-auto flex items-center gap-3">
                <div className="text-right mr-2">
                  <p className="text-sm font-medium text-white">{currentUser?.fullName}</p>
                  <Badge variant="outline" className="border-white text-white text-xs">
                    Super Admin
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  className="text-white hover:bg-blue-800"
                  onClick={logout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 p-6 lg:p-8">
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
            <div className="flex h-16 items-center px-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 bg-white rounded-lg shadow-lg overflow-hidden">
                  {companyInfo.logo ? (
                    <img src={companyInfo.logo} alt="Company logo" className="w-full h-full object-contain p-1" />
                  ) : (
                    <Users className="h-6 w-6 text-blue-700" />
                  )}
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">KidTrackerApp™</h1>
                  <p className="text-xs text-blue-50">Powered by GDI Digital Solutions</p>
                </div>
              </div>

              {/* Company Name in Center */}
              {companyInfo.name && (
                <div className="flex-1 flex justify-center">
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-white tracking-wide">{companyInfo.name}</h2>
                  </div>
                </div>
              )}
              
              <div className="ml-auto flex items-center gap-3">
                <div className="text-right mr-2">
                  <p className="text-sm font-medium text-white">{currentUser?.fullName}</p>
                  <Badge variant="outline" className="border-white text-white text-xs">
                    Parent
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  className="text-white hover:bg-blue-800"
                  onClick={logout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 p-6 lg:p-8">
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
    { id: "quickbooks" as Page, label: "QuickBooks Integration", icon: Link },
    { id: "users" as Page, label: "Manage Users", icon: Settings },
    { id: "company" as Page, label: "Company Info", icon: Building2 },
  ];

  const navigationItems = isAdmin ? adminNavigationItems : userNavigationItems;

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />;
      case "children":
        return <ChildrenManagement />;
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
          <div className="flex h-16 items-center px-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 bg-white rounded-lg shadow-lg overflow-hidden">
                {companyInfo.logo ? (
                  <img src={companyInfo.logo} alt="Company logo" className="w-full h-full object-contain p-1" />
                ) : (
                  <Users className="h-6 w-6 text-blue-700" />
                )}
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">KidTrackerApp™</h1>
                <p className="text-xs text-blue-50">Powered by GDI Digital Solutions</p>
              </div>
            </div>

            {/* Company/Daycare Name in Center */}
            <div className="flex-1 flex justify-center">
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

            <div className="ml-auto flex items-center gap-3">
              {/* Back to All Daycares button for Super Admin */}
              {isSuperAdmin && currentDaycare && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white text-white hover:bg-blue-800 hover:text-white"
                  onClick={() => setCurrentDaycare(null)}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  All Daycares
                </Button>
              )}

              <div className="text-right mr-2">
                <p className="text-sm font-medium text-white">{currentUser?.fullName}</p>
                <Badge variant="outline" className="border-white text-white text-xs">
                  {currentUser?.role === "super_admin" ? "Super Admin" : currentUser?.role === "admin" ? "Admin" : "User"}
                </Badge>
              </div>
              <Button
                variant="ghost"
                className="text-white hover:bg-blue-800"
                onClick={logout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </header>

        {/* Trial Warning Banner */}
        {showTrialWarning && (
          <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center justify-center gap-2 text-sm text-yellow-800">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span>Your free trial expires in <strong>{trialInfo.daysRemaining} day{trialInfo.daysRemaining !== 1 ? "s" : ""}</strong>. Contact GDI Digital Solutions to activate your subscription.</span>
          </div>
        )}

        <div className="flex">
          {/* Sidebar - Always visible */}
          <aside className="sticky top-16 left-0 z-30 h-[calc(100vh-4rem)] w-64 border-r border-blue-200 bg-gradient-to-b from-blue-50 to-white">
            <nav className="flex flex-col gap-1 p-4">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.id}
                    variant={currentPage === item.id ? "default" : "ghost"}
                    className={currentPage === item.id 
                      ? "justify-start bg-blue-700 hover:bg-blue-800 text-white" 
                      : "justify-start text-blue-900 hover:bg-blue-100 hover:text-blue-800"
                    }
                    onClick={() => setCurrentPage(item.id)}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Button>
                );
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-6 lg:p-8">
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