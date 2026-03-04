import { useState, useEffect } from "react";
import { Calendar, DollarSign, Baby, FileText, Clock, CheckCircle, XCircle, Camera, Image as ImageIcon, Trash2, Smile, Frown, Meh, Zap, Heart, School, Key, Copy, Smartphone, Search, Download, CreditCard } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { formatLocalDate, parseLocalDate } from "../../utils/dateUtils";
import { formatPhone } from "../../lib/formatPhone";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { API_BASE, API_KEY } from "../../lib/api";

export function ParentPortal() {
  const { currentUser, currentDaycare } = useAuth();
  const { children, attendance, invoices, activityPhotos, dailyActivities, classrooms, refreshData } = useData();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"current" | "history">("current");

  // Re-fetch data whenever the Activity Photos tab is opened so parents see the latest photos
  useEffect(() => {
    if (activeTab === "photos") {
      refreshData();
    }
  }, [activeTab]);

  // Get children linked to this parent
  const myChildren = children.filter(child =>
    child.parentUserId === currentUser?.id
  );

  // Helper function for mood icons
  const getMoodIcon = (mood: string) => {
    switch (mood) {
      case 'happy':
        return <Smile className="h-4 w-4" />;
      case 'sad':
        return <Frown className="h-4 w-4" />;
      case 'cranky':
        return <Meh className="h-4 w-4" />;
      case 'energetic':
        return <Zap className="h-4 w-4" />;
      case 'calm':
        return <Heart className="h-4 w-4" />;
      default:
        return null;
    }
  };

  // If no children linked, show message
  if (myChildren.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="mb-1">Parent Portal</h1>
          <p className="text-muted-foreground">View your child's information</p>
        </div>
        
        <Card>
          <CardContent className="py-12 text-center">
            <Baby className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">No Children Linked</h3>
            <p className="text-muted-foreground">
              Please contact the administrator to link your account to your child's profile.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get attendance and invoices for my children
  const myChildrenIds = myChildren.map(c => c.id);
  const myAttendance = attendance.filter(att => myChildrenIds.includes(att.childId));
  const myInvoices = invoices.filter(inv => myChildrenIds.includes(inv.childId));

  // Calculate statistics
  const currentMonthAttendance = myAttendance.filter(att => {
    const attDate = parseLocalDate(att.date);
    return attDate.getMonth() === selectedMonth && attDate.getFullYear() === selectedYear;
  });

  const stats = {
    totalInvoices: myInvoices.length,
    pendingInvoices: myInvoices.filter(inv => inv.status === "pending").length,
    paidInvoices: myInvoices.filter(inv => inv.status === "paid").length,
    overdueInvoices: myInvoices.filter(inv => inv.status === "overdue").length,
    totalOwed: myInvoices
      .filter(inv => inv.status === "pending" || inv.status === "overdue")
      .reduce((sum, inv) => sum + inv.amount, 0),
    totalPaid: myInvoices
      .filter(inv => inv.status === "paid")
      .reduce((sum, inv) => sum + inv.amount, 0),
    daysPresent: currentMonthAttendance.filter(att => att.status === "present").length,
    daysAbsent: currentMonthAttendance.filter(att => att.status === "absent").length,
  };

  // Filtered invoices for the Billing & Payments tab
  const filteredInvoices = myInvoices.filter(invoice => {
    const child = children.find(c => c.id === invoice.childId);
    const matchesSearch = child
      ? `${child.firstName} ${child.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
      : invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || invoice.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const unpaidInvoices = filteredInvoices.filter(inv => inv.status !== "paid");
  const paidInvoices = filteredInvoices.filter(inv => inv.status === "paid");

  // Pay invoice via Stripe Checkout
  const handlePayInvoice = async (invoiceId: string) => {
    setPayingInvoiceId(invoiceId);
    try {
      const res = await fetch(`${API_BASE}/stripe/create-invoice-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
        body: JSON.stringify({
          invoiceId,
          daycareId: currentDaycare?.id || currentUser?.daycareId,
          successUrl: window.location.origin,
          cancelUrl: window.location.origin,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create payment session");

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error(error.message || "Failed to initiate payment. Please try again.");
    } finally {
      setPayingInvoiceId(null);
    }
  };

  // Download invoice as printable PDF
  const handleDownloadPDF = (invoice: any) => {
    const child = children.find(c => c.id === invoice.childId);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow pop-ups to download invoices');
      return;
    }

    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoice.invoiceNumber}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #1d4ed8; padding-bottom: 20px; }
            .header h1 { color: #1d4ed8; margin: 0; font-size: 28px; }
            .header p { color: #666; margin: 5px 0 0 0; font-size: 14px; }
            .invoice-details { display: table; width: 100%; margin-bottom: 30px; }
            .invoice-details > div { display: table-cell; width: 50%; padding: 5px; }
            .section { margin-bottom: 20px; word-wrap: break-word; }
            .section-title { font-weight: bold; color: #1d4ed8; margin-bottom: 5px; font-size: 14px; }
            .amount { font-size: 32px; font-weight: bold; color: #1d4ed8; margin: 20px 0; }
            .status { display: inline-block; padding: 5px 15px; border-radius: 20px; font-size: 14px; font-weight: bold; text-transform: uppercase; }
            .status.paid { background-color: #22c55e; color: white; }
            .status.pending { background-color: #f59e0b; color: white; }
            .status.overdue { background-color: #dc2626; color: white; }
            .footer { margin-top: 60px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }
            @media print { body { margin: 0; padding: 15px; max-width: 100%; } .invoice-details { page-break-inside: avoid; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>KidTrackerApp\u2122</h1>
            <p>Powered by GDI Digital Solutions</p>
          </div>
          <div class="invoice-details">
            <div class="section">
              <div class="section-title">Invoice Number</div>
              <div>${invoice.invoiceNumber}</div>
            </div>
            <div class="section">
              <div class="section-title">Status</div>
              <div><span class="status ${invoice.status}">${invoice.status}</span></div>
            </div>
          </div>
          <div class="section">
            <div class="section-title">Bill To</div>
            <div>${child?.firstName} ${child?.lastName}</div>
            <div style="color: #666; font-size: 14px;">${child?.parentName || ''}</div>
            <div style="color: #666; font-size: 14px;">${child?.parentEmail || ''}</div>
            <div style="color: #666; font-size: 14px;">${formatPhone(child?.parentPhone)}</div>
          </div>
          <div class="section">
            <div class="section-title">Invoice Date</div>
            <div>${new Date(invoice.createdAt).toLocaleDateString()}</div>
          </div>
          <div class="section">
            <div class="section-title">Due Date</div>
            <div>${parseLocalDate(invoice.dueDate).toLocaleDateString()}</div>
          </div>
          ${invoice.paidDate ? `
            <div class="section">
              <div class="section-title">Paid Date</div>
              <div>${parseLocalDate(invoice.paidDate).toLocaleDateString()}</div>
            </div>
          ` : ''}
          ${invoice.description ? `
            <div class="section">
              <div class="section-title">Description</div>
              <div style="font-size: 14px; line-height: 1.5;">${invoice.description}</div>
            </div>
          ` : ''}
          <div class="section">
            <div class="section-title">Amount Due</div>
            <div class="amount">$${invoice.amount.toFixed(2)}</div>
          </div>
          <div class="footer">
            <p>Thank you for your business!</p>
            <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `;

    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
    toast.success('Invoice ready for download');
  };

  const copyParentCode = (code: string) => {
    // Fallback method for copying text when Clipboard API is blocked
    try {
      // Try modern Clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(() => {
          toast.success("Mobile app code copied to clipboard!");
        }).catch(() => {
          // Fallback if clipboard write fails
          copyToClipboardFallback(code);
        });
      } else {
        // Use fallback method
        copyToClipboardFallback(code);
      }
    } catch (error) {
      // Use fallback method
      copyToClipboardFallback(code);
    }
  };

  const copyToClipboardFallback = (text: string) => {
    // Create a temporary textarea element
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "-9999px";
    document.body.appendChild(textarea);
    
    try {
      textarea.select();
      textarea.setSelectionRange(0, 99999); // For mobile devices
      
      // Execute copy command
      const successful = document.execCommand('copy');
      
      if (successful) {
        toast.success("Mobile app code copied to clipboard!");
      } else {
        toast.error("Failed to copy code. Please copy manually: " + text);
      }
    } catch (err) {
      toast.error("Failed to copy code. Please copy manually: " + text);
    } finally {
      document.body.removeChild(textarea);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="mb-1 text-xl sm:text-3xl">Parent Portal</h1>
        <p className="text-muted-foreground text-xs sm:text-base">
          Welcome, {currentUser?.fullName}! View your child's information below.
        </p>
      </div>

      {/* Mobile App Access Code */}
      {currentUser?.parentCode && (
        <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-600">
                <Smartphone className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Mobile App Access Code</CardTitle>
                <CardDescription>Use this code to access the KidTrackerApp™ mobile app</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-2 sm:gap-4 p-3 sm:p-4 bg-white rounded-lg border-2 border-purple-300">
              <div className="flex items-center gap-2 sm:gap-3">
                <Key className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 mb-1">Your Access Code</p>
                  <p className="text-2xl sm:text-3xl font-bold font-mono text-purple-900 tracking-wider">
                    {currentUser.parentCode}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => copyParentCode(currentUser.parentCode!)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Code
              </Button>
            </div>
            <p className="text-sm text-purple-700 mt-3">
              <strong>Note:</strong> Enter this code in the KidTrackerApp™ mobile app to access your child's information on the go.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Children Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {myChildren.map((child) => {
          const classroom = classrooms.find(c => c.id === child.classroomId);
          
          return (
            <Card key={child.id} className="border-2 border-blue-200">
              <CardHeader>
                <div className="flex items-center gap-3">
                  {child.photo ? (
                    <img
                      src={child.photo}
                      alt={`${child.firstName} ${child.lastName}`}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100">
                      <Baby className="h-6 w-6 text-blue-700" />
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-lg">
                      {child.firstName} {child.lastName}
                    </CardTitle>
                    <CardDescription>
                      Born: {formatLocalDate(child.dateOfBirth)}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {classroom && (
                    <div className="flex items-center gap-2 bg-blue-50 px-2 py-1.5 rounded">
                      <School className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-900">{classroom.name}</span>
                    </div>
                  )}
                  {child.allergies && (
                    <div>
                      <span className="font-medium">Allergies:</span> {child.allergies}
                    </div>
                  )}
                  {child.medicalNotes && (
                    <div>
                      <span className="font-medium">Medical Notes:</span> {child.medicalNotes}
                    </div>
                  )}
                  <Badge
                    variant="outline"
                    className={
                      child.status === "active"
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-gray-500 bg-gray-50 text-gray-700"
                    }
                  >
                    {child.status === "active" ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <p className="text-2xl font-bold">${stats.totalPaid.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pending/Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <p className="text-2xl font-bold">
                {stats.pendingInvoices + stats.overdueInvoices}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Owed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-700" />
              <p className="text-2xl font-bold">${stats.totalOwed.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Days Present (This Month)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <p className="text-2xl font-bold">{stats.daysPresent}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Attendance and Invoices */}
      <Tabs defaultValue="attendance" className="space-y-4" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="attendance">Attendance History</TabsTrigger>
          <TabsTrigger value="activities">Daily Activities</TabsTrigger>
          <TabsTrigger value="photos">Activity Photos</TabsTrigger>
          <TabsTrigger value="invoices">
            <CreditCard className="h-4 w-4 mr-1" />
            Billing & Payments
          </TabsTrigger>
        </TabsList>

        {/* Attendance Tab */}
        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle>Attendance History</CardTitle>
              <CardDescription>
                View check-in and check-out times for your children
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Month/Year Selector */}
              <div className="flex gap-4 mb-6">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i}>
                      {new Date(2000, i).toLocaleDateString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - 2 + i;
                    return (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Attendance Table */}
              <div className="rounded-lg border">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Child
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Check In
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Check Out
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentMonthAttendance.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                            No attendance records for this month
                          </td>
                        </tr>
                      ) : (
                        currentMonthAttendance
                          .sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime())
                          .map((att) => {
                            const child = children.find(c => c.id === att.childId);
                            return (
                              <tr key={att.id} className="hover:bg-gray-50">
                                <td className="px-4 py-4 whitespace-nowrap text-sm">
                                  {parseLocalDate(att.date).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <div className="font-medium">
                                    {child?.firstName} {child?.lastName}
                                  </div>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm">
                                  {att.checkIn || "-"}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm">
                                  {att.checkOut || "-"}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <Badge
                                    variant="outline"
                                    className={
                                      att.status === "present"
                                        ? "border-green-500 bg-green-50 text-green-700"
                                        : "border-blue-600 bg-blue-50 text-blue-800"
                                    }
                                  >
                                    {att.status === "present" ? (
                                      <>
                                        <CheckCircle className="mr-1 h-3 w-3" />
                                        Present
                                      </>
                                    ) : (
                                      <>
                                        <XCircle className="mr-1 h-3 w-3" />
                                        Absent
                                      </>
                                    )}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Daily Activities Tab */}
        <TabsContent value="activities">
          <Card>
            <CardHeader>
              <CardTitle>Daily Activities</CardTitle>
              <CardDescription>
                View bathroom times, nap times, mood/behavior, and teacher notes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {myChildren.map((child) => {
                  // Get all daily activities for this child directly from state
                  const allActivities = dailyActivities
                    .filter(a => a.childId === child.id && (
                      a.bathroomTimes.length > 0 || a.napStart || a.mood || a.teacherNotes
                    ))
                    .sort((a, b) => b.date.localeCompare(a.date));

                  return (
                    <div key={child.id}>
                      <div className="flex items-center gap-2 mb-4">
                        {child.photo ? (
                          <img
                            src={child.photo}
                            alt={`${child.firstName} ${child.lastName}`}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100">
                            <Baby className="h-4 w-4 text-blue-700" />
                          </div>
                        )}
                        <h3 className="text-lg font-semibold">
                          {child.firstName} {child.lastName}
                        </h3>
                        <Badge variant="outline" className="ml-auto">
                          {allActivities.length} {allActivities.length === 1 ? 'Day' : 'Days'} Recorded
                        </Badge>
                      </div>

                      {allActivities.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed mb-6">
                          <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                          <p className="text-muted-foreground">No activity records yet</p>
                        </div>
                      ) : (
                        <div className="space-y-4 mb-6">
                          {allActivities.map((activity, index) => (
                            <Card key={index} className="border-l-4 border-l-blue-500">
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-base">
                                    {parseLocalDate(activity.date).toLocaleDateString('en-US', {
                                      weekday: 'long',
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })}
                                  </CardTitle>
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    {parseLocalDate(activity.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </Badge>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                {/* Bathroom Times */}
                                {activity.bathroomTimes.length > 0 && (
                                  <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-500">
                                        <Clock className="h-3 w-3 text-white" />
                                      </div>
                                      <span className="font-medium text-yellow-900">Bathroom Times</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {activity.bathroomTimes.map((time, idx) => (
                                        <Badge key={idx} variant="outline" className="bg-white text-yellow-800 border-yellow-300">
                                          {time}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Nap Time */}
                                {activity.napStart && (
                                  <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500">
                                        <Clock className="h-3 w-3 text-white" />
                                      </div>
                                      <span className="font-medium text-purple-900">Nap Time</span>
                                    </div>
                                    <div className="text-sm text-purple-800">
                                      <span className="font-medium">Started:</span> {activity.napStart}
                                      {activity.napEnd && (
                                        <>
                                          <span className="mx-2">•</span>
                                          <span className="font-medium">Ended:</span> {activity.napEnd}
                                          <span className="mx-2">•</span>
                                          <span className="font-medium">Duration:</span> {activity.napStart && activity.napEnd ? (() => { const [sh, sm] = activity.napStart.split(':').map(Number); const [eh, em] = activity.napEnd.split(':').map(Number); const mins = (eh * 60 + em) - (sh * 60 + sm); const h = Math.floor(mins / 60); const m = mins % 60; return h > 0 ? `${h}h ${m}m` : `${m}m`; })() : ''}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Mood/Behavior */}
                                {activity.mood && (
                                  <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500">
                                        {getMoodIcon(activity.mood) ? (
                                          <span className="text-white">{getMoodIcon(activity.mood)}</span>
                                        ) : (
                                          <Smile className="h-3 w-3 text-white" />
                                        )}
                                      </div>
                                      <span className="font-medium text-green-900">Mood & Behavior</span>
                                    </div>
                                    <Badge variant="outline" className="bg-white text-green-800 border-green-300 capitalize">
                                      {activity.mood}
                                    </Badge>
                                  </div>
                                )}

                                {/* Teacher Notes */}
                                {activity.teacherNotes && (
                                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500">
                                        <FileText className="h-3 w-3 text-white" />
                                      </div>
                                      <span className="font-medium text-blue-900">Teacher Notes</span>
                                    </div>
                                    <p className="text-sm text-blue-800 leading-relaxed">
                                      {activity.teacherNotes}
                                    </p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Photos Tab */}
        <TabsContent value="photos">
          <Card>
            <CardHeader>
              <CardTitle>Activity Photos</CardTitle>
              <CardDescription>
                View photos of your children's daily activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {myChildren.map((child) => {
                  // Get all activity photos for this child directly from state
                  const allChildPhotos = activityPhotos.filter(p => p.childId === child.id && p.photo);

                  return (
                    <div key={child.id}>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100">
                          <Baby className="h-4 w-4 text-blue-700" />
                        </div>
                        <h3 className="text-lg font-semibold">
                          {child.firstName} {child.lastName}
                        </h3>
                        <Badge variant="outline" className="ml-auto">
                          {allChildPhotos.length} {allChildPhotos.length === 1 ? 'Photo' : 'Photos'}
                        </Badge>
                      </div>

                      {allChildPhotos.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed">
                          <Camera className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                          <p className="text-muted-foreground">No activity photos yet</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {allChildPhotos
                            .sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime())
                            .map((photo) => (
                              <div key={photo.id} className="relative group">
                                <div className="aspect-square overflow-hidden rounded-lg border-2 border-gray-200 bg-gray-100">
                                  <img
                                    src={photo.photo}
                                    alt={photo.caption || "Activity photo"}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                  <p className="text-white text-xs font-medium">
                                    {parseLocalDate(photo.date).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </p>
                                  {photo.caption && (
                                    <p className="text-white/90 text-xs mt-1">{photo.caption}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {myChildren.length === 0 && (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <Camera className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium mb-2">No Activity Photos</h3>
                    <p className="text-muted-foreground">
                      Activity photos will appear here once staff uploads them
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing & Payments Tab */}
        <TabsContent value="invoices">
          {/* Financial Summary Cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-blue-900">Total Owed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-blue-700" />
                  <p className="text-2xl font-bold text-blue-800">${stats.totalOwed.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-green-900">Total Paid</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <p className="text-2xl font-bold text-green-700">${stats.totalPaid.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-yellow-900">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <p className="text-2xl font-bold text-yellow-700">{stats.pendingInvoices}</p>
                </div>
                <p className="text-xs text-yellow-600 mt-1">invoices</p>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-gradient-to-br from-red-50 to-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-900">Overdue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <p className="text-2xl font-bold text-red-700">{stats.overdueInvoices}</p>
                </div>
                <p className="text-xs text-red-600 mt-1">invoices</p>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by child name or invoice number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sub-tabs: Current Invoices / Payment History */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={activeSubTab === "current" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveSubTab("current")}
              className={activeSubTab === "current" ? "bg-blue-700 hover:bg-blue-800" : ""}
            >
              Current Invoices ({unpaidInvoices.length})
            </Button>
            <Button
              variant={activeSubTab === "history" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveSubTab("history")}
              className={activeSubTab === "history" ? "bg-blue-700 hover:bg-blue-800" : ""}
            >
              Payment History ({paidInvoices.length})
            </Button>
          </div>

          {/* Invoice Cards */}
          <div className="grid gap-4">
            {(activeSubTab === "current" ? unpaidInvoices : paidInvoices)
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((invoice) => {
                const child = children.find(c => c.id === invoice.childId);
                return (
                  <Card key={invoice.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">Invoice #{invoice.invoiceNumber}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {child?.firstName} {child?.lastName}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            invoice.status === "paid"
                              ? "border-green-500 bg-green-50 text-green-700"
                              : invoice.status === "overdue"
                              ? "border-red-500 bg-red-50 text-red-700"
                              : "border-yellow-500 bg-yellow-50 text-yellow-700"
                          }
                        >
                          {invoice.status === "paid" ? "Paid" :
                           invoice.status === "overdue" ? "Overdue" : "Pending"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Amount</p>
                            <p className="text-2xl font-bold">${invoice.amount.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Due Date</p>
                            <p className="font-medium">{parseLocalDate(invoice.dueDate).toLocaleDateString()}</p>
                            {invoice.paidDate && (
                              <>
                                <p className="text-sm text-muted-foreground mt-2">Paid Date</p>
                                <p className="text-sm text-green-700">{parseLocalDate(invoice.paidDate).toLocaleDateString()}</p>
                              </>
                            )}
                          </div>
                        </div>

                        {invoice.description && (
                          <div>
                            <p className="text-sm text-muted-foreground">Description</p>
                            <p className="text-sm mt-1">{invoice.description}</p>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 pt-4 border-t">
                          {invoice.status !== "paid" && (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handlePayInvoice(invoice.id)}
                              disabled={payingInvoiceId === invoice.id}
                            >
                              <CreditCard className="mr-2 h-4 w-4" />
                              {payingInvoiceId === invoice.id ? "Redirecting..." : "Pay Now"}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadPDF(invoice)}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download PDF
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

            {(activeSubTab === "current" ? unpaidInvoices : paidInvoices).length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  {activeSubTab === "current"
                    ? "No outstanding invoices. You're all caught up!"
                    : "No payment history yet."}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}