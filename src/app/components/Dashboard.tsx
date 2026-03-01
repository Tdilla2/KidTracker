import { Users, DollarSign, Calendar, TrendingUp, Building2, Clock, CheckCircle, XCircle, UserX, AlertTriangle, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import { getTrialInfo } from "../../utils/trialUtils";
import { UserGuide } from "./UserGuide";

interface DashboardProps {
  onNavigate?: (page: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { children, attendance, invoices, companyInfo } = useData();
  const { currentDaycare } = useAuth();

  // Get trial info
  const trialInfo = currentDaycare ? getTrialInfo(currentDaycare) : null;

  // Calculate statistics
  const totalChildren = children.length;
  const activeChildren = children.filter(c => c.status === 'active').length;
  
  const today = new Date().toISOString().split('T')[0];
  const todayAttendance = attendance.filter(a => a.date === today);
  const todayCheckedIn = todayAttendance.filter(a => a.status === 'present' && a.checkOut === null).length;
  const todayCheckedOut = todayAttendance.filter(a => a.status === 'present' && a.checkOut !== null).length;
  const todayAbsent = todayAttendance.filter(a => a.status === 'absent').length;
  const presentToday = todayCheckedIn;

  // Calculate weekly attendance stats
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split('T')[0];
  const weekAttendance = attendance.filter(a => a.date >= weekAgoStr && a.date <= today);
  const weeklyPresentCount = weekAttendance.filter(a => a.status === 'present').length;
  const weeklyAbsentCount = weekAttendance.filter(a => a.status === 'absent').length;
  const weeklyAttendanceRate = weekAttendance.length > 0 
    ? Math.round((weeklyPresentCount / (weeklyPresentCount + weeklyAbsentCount)) * 100)
    : 0;

  const totalRevenue = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.amount, 0);

  const pendingRevenue = invoices
    .filter(inv => inv.status === 'pending')
    .reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-700 to-blue-600 text-white rounded-lg p-4 sm:p-6 shadow-lg">
        {companyInfo.name ? (
          <>
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-white shrink-0" />
              <h1 className="text-white text-xl sm:text-3xl">{companyInfo.name}</h1>
            </div>
            <p className="text-blue-50 text-xs sm:text-base">Dashboard Overview - {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </>
        ) : (
          <>
            <h1 className="text-white text-xl sm:text-3xl">Dashboard</h1>
            <p className="text-blue-50 text-xs sm:text-base">Welcome to KidTrackerApp™ - Your daycare management solution</p>
          </>
        )}
      </div>

      {/* Trial Banner */}
      {trialInfo?.isOnTrial && (
        <Card className="border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 shadow-md">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-amber-500 shrink-0 mt-0.5 sm:mt-0" />
                <div>
                  <h3 className="font-semibold text-amber-900 text-sm sm:text-base">
                    Free Trial — {trialInfo.daysRemaining} {trialInfo.daysRemaining === 1 ? "day" : "days"} remaining
                  </h3>
                  <p className="text-xs sm:text-sm text-amber-700 mt-0.5">
                    Your trial ends on {new Date(trialInfo.trialEndsAt!).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.
                    Choose a plan to keep using KidTrackerApp.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => onNavigate?.("billing")}
                className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold shadow-md shrink-0"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Choose a Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-blue-900">Total Children</CardTitle>
            <Users className="h-4 w-4 text-blue-700" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold text-blue-800">{activeChildren}</div>
            <p className="text-xs text-blue-700">
              {totalChildren} total enrolled
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-blue-900">Present Today</CardTitle>
            <Calendar className="h-4 w-4 text-blue-700" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold text-blue-800">{presentToday}</div>
            <p className="text-xs text-blue-700">
              Out of {activeChildren} active
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-blue-900">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-700" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold text-blue-800">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-blue-700">
              Paid invoices
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-blue-900">Pending Payments</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-700" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold text-blue-800">${pendingRevenue.toFixed(2)}</div>
            <p className="text-xs text-blue-700">
              {invoices.filter(inv => inv.status === 'pending').length} invoices
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Overview Section */}
      <Card className="border-blue-200">
        <CardHeader className="bg-blue-50 border-b border-blue-100">
          <CardTitle className="text-blue-900 flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Today's Attendance Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
            {/* Checked In */}
            <div className="flex flex-col items-center p-3 sm:p-4 bg-green-50 border-2 border-green-200 rounded-lg">
              <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 mb-1 sm:mb-2" />
              <div className="text-2xl sm:text-3xl font-bold text-green-700">{todayCheckedIn}</div>
              <div className="text-xs sm:text-sm text-green-600 font-medium">Checked In</div>
              <div className="text-xs text-muted-foreground mt-1 hidden sm:block">Currently present</div>
            </div>

            {/* Checked Out */}
            <div className="flex flex-col items-center p-3 sm:p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 mb-1 sm:mb-2" />
              <div className="text-2xl sm:text-3xl font-bold text-blue-700">{todayCheckedOut}</div>
              <div className="text-xs sm:text-sm text-blue-600 font-medium">Checked Out</div>
              <div className="text-xs text-muted-foreground mt-1 hidden sm:block">Already left</div>
            </div>

            {/* Absent */}
            <div className="flex flex-col items-center p-3 sm:p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
              <XCircle className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600 mb-1 sm:mb-2" />
              <div className="text-2xl sm:text-3xl font-bold text-orange-700">{todayAbsent}</div>
              <div className="text-xs sm:text-sm text-orange-600 font-medium">Absent</div>
              <div className="text-xs text-muted-foreground mt-1 hidden sm:block">Not present today</div>
            </div>

            {/* Weekly Rate */}
            <div className="flex flex-col items-center p-3 sm:p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 mb-1 sm:mb-2" />
              <div className="text-2xl sm:text-3xl font-bold text-purple-700">{weeklyAttendanceRate}%</div>
              <div className="text-xs sm:text-sm text-purple-600 font-medium">Weekly Rate</div>
              <div className="text-xs text-muted-foreground mt-1 hidden sm:block">Last 7 days</div>
            </div>
          </div>

          {/* Attendance Progress Bar */}
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700">Attendance Progress</span>
              <span className="text-muted-foreground">
                {todayCheckedIn + todayCheckedOut + todayAbsent} of {activeChildren} tracked
              </span>
            </div>
            <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full flex">
                <div 
                  className="bg-green-500 transition-all duration-300" 
                  style={{ width: `${activeChildren > 0 ? (todayCheckedIn / activeChildren) * 100 : 0}%` }}
                ></div>
                <div 
                  className="bg-blue-500 transition-all duration-300" 
                  style={{ width: `${activeChildren > 0 ? (todayCheckedOut / activeChildren) * 100 : 0}%` }}
                ></div>
                <div 
                  className="bg-orange-500 transition-all duration-300" 
                  style={{ width: `${activeChildren > 0 ? (todayAbsent / activeChildren) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                Checked In
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                Checked Out
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 bg-orange-500 rounded"></div>
                Absent
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-blue-200">
          <CardHeader className="bg-blue-50 border-b border-blue-100">
            <CardTitle className="text-blue-900">Recent Check-ins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {todayAttendance.slice(0, 5).map((att) => {
                const child = children.find(c => c.id === att.childId);
                return (
                  <div key={att.id} className="flex items-center justify-between border-l-4 border-blue-400 pl-3 py-2">
                    <div>
                      <p className="font-medium text-blue-900">{child?.firstName} {child?.lastName}</p>
                      <p className="text-sm text-blue-700">
                        Checked in at {att.checkIn}
                      </p>
                    </div>
                  </div>
                );
              })}
              {todayAttendance.length === 0 && (
                <p className="text-sm text-muted-foreground">No check-ins today yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardHeader className="bg-blue-50 border-b border-blue-100">
            <CardTitle className="text-blue-900">Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invoices.slice(0, 5).map((invoice) => {
                const child = children.find(c => c.id === invoice.childId);
                return (
                  <div key={invoice.id} className="flex items-center justify-between border-l-4 border-blue-400 pl-3 py-2">
                    <div>
                      <p className="font-medium text-blue-900">{child?.firstName} {child?.lastName}</p>
                      <p className="text-sm text-blue-700">
                        Due: {invoice.dueDate}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${invoice.amount.toFixed(2)}</p>
                      <p className={`text-sm ${
                        invoice.status === 'paid' ? 'text-green-600' : 
                        invoice.status === 'overdue' ? 'text-blue-700' : 
                        'text-yellow-600'
                      }`}>
                        {invoice.status}
                      </p>
                    </div>
                  </div>
                );
              })}
              {invoices.length === 0 && (
                <p className="text-sm text-muted-foreground">No invoices yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <UserGuide />
    </div>
  );
}