import { DollarSign, TrendingUp, FileText, Calendar, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Badge } from "./ui/badge";
import { useData } from "../context/DataContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useState } from "react";
import { formatLocalDate, parseLocalDate } from "../../utils/dateUtils";

export function Financials() {
  const { children, invoices } = useData();

  // Selected period can be a month (YYYY-MM) or a year (year-YYYY)
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Check if year-end report is selected
  const isYearEndReport = selectedPeriod.startsWith('year-');
  const selectedYear = isYearEndReport ? selectedPeriod.replace('year-', '') : null;

  // Generate month options for the last 12 months
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return { value, label };
  });

  // Generate year options (current year and past 5 years)
  const yearOptions = Array.from({ length: 6 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return { value: `year-${year}`, label: `Year-End Report ${year}` };
  });

  // Get selected month label for display
  // Use local date constructor (year, month-1, day) to avoid UTC timezone shifting
  const selectedMonthLabel = !isYearEndReport
    ? (() => {
        const [y, m] = selectedPeriod.split('-').map(Number);
        return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      })()
    : '';

  // Filter invoices by selected month (based on due date)
  const monthInvoices = !isYearEndReport ? invoices.filter(inv => {
    const invDate = parseLocalDate(inv.dueDate);
    const invMonth = `${invDate.getFullYear()}-${String(invDate.getMonth() + 1).padStart(2, '0')}`;
    return invMonth === selectedPeriod;
  }) : [];

  // Calculate selected month stats
  const selectedMonthPaidInvoices = monthInvoices.filter(inv => inv.status === 'paid');
  const selectedMonthPendingInvoices = monthInvoices.filter(inv => inv.status === 'pending');
  const selectedMonthOverdueInvoices = monthInvoices.filter(inv => inv.status === 'overdue');

  const stats = {
    // All-time totals
    totalRevenue: invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0),
    // Selected month totals
    monthRevenue: selectedMonthPaidInvoices.reduce((sum, inv) => sum + inv.amount, 0),
    monthPaidCount: selectedMonthPaidInvoices.length,
    pendingAmount: selectedMonthPendingInvoices.reduce((sum, inv) => sum + inv.amount, 0),
    pendingCount: selectedMonthPendingInvoices.length,
    overdueAmount: selectedMonthOverdueInvoices.reduce((sum, inv) => sum + inv.amount, 0),
    overdueCount: selectedMonthOverdueInvoices.length,
    totalMonthInvoices: monthInvoices.length,
  };

  // Filter invoices by selected year (for year-end report)
  const yearInvoices = isYearEndReport && selectedYear ? invoices.filter(inv => {
    const invDate = parseLocalDate(inv.dueDate);
    return invDate.getFullYear().toString() === selectedYear;
  }) : [];

  // Calculate year-end stats
  const yearPaidInvoices = yearInvoices.filter(inv => inv.status === 'paid');
  const yearPendingInvoices = yearInvoices.filter(inv => inv.status === 'pending');
  const yearOverdueInvoices = yearInvoices.filter(inv => inv.status === 'overdue');

  const yearStats = {
    totalRevenue: yearPaidInvoices.reduce((sum, inv) => sum + inv.amount, 0),
    totalInvoiced: yearInvoices.reduce((sum, inv) => sum + inv.amount, 0),
    pendingAmount: yearPendingInvoices.reduce((sum, inv) => sum + inv.amount, 0),
    overdueAmount: yearOverdueInvoices.reduce((sum, inv) => sum + inv.amount, 0),
    paidCount: yearPaidInvoices.length,
    pendingCount: yearPendingInvoices.length,
    overdueCount: yearOverdueInvoices.length,
    totalInvoices: yearInvoices.length,
    collectionRate: yearInvoices.reduce((sum, inv) => sum + inv.amount, 0) > 0
      ? ((yearPaidInvoices.reduce((sum, inv) => sum + inv.amount, 0) / yearInvoices.reduce((sum, inv) => sum + inv.amount, 0)) * 100).toFixed(1)
      : '0',
  };

  // Calculate monthly breakdown for the year
  const monthlyBreakdown = isYearEndReport && selectedYear ? Array.from({ length: 12 }, (_, i) => {
    const monthName = new Date(parseInt(selectedYear), i, 1).toLocaleDateString('en-US', { month: 'short' });

    const monthData = yearInvoices.filter(inv => {
      const invDate = parseLocalDate(inv.dueDate);
      return invDate.getMonth() === i;
    });

    const paid = monthData.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);
    const pending = monthData.filter(inv => inv.status === 'pending').reduce((sum, inv) => sum + inv.amount, 0);
    const overdue = monthData.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + inv.amount, 0);

    return {
      month: monthName,
      paid,
      pending,
      overdue,
      total: paid + pending + overdue,
      invoiceCount: monthData.length,
    };
  }) : [];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-700 to-blue-600 text-white rounded-lg p-4 sm:p-6 shadow-lg">
        <h1 className="text-white text-xl sm:text-3xl">Financials</h1>
        <p className="text-blue-50 text-xs sm:text-base">Overview of revenue and payments</p>
      </div>

      {/* Period Selector */}
      <Card className="border-blue-200">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                {isYearEndReport && <BarChart3 className="h-5 w-5 text-blue-700" />}
                {isYearEndReport ? `Year-End Financial Report - ${selectedYear}` : `Monthly Financial Report`}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {isYearEndReport ? `Annual summary for ${selectedYear}` : `Viewing data for ${selectedMonthLabel}`}
              </p>
            </div>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {/* Month options */}
                {monthOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
                {/* Separator */}
                <div className="border-t my-2" />
                {/* Year-End Report options */}
                {yearOptions.map(option => (
                  <SelectItem key={option.value} value={option.value} className="font-medium text-blue-800">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Report Content */}
      {!isYearEndReport && (
        <>
          <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-900">Month Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-700" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-800">${stats.monthRevenue.toFixed(2)}</div>
                <p className="text-xs text-blue-700">{stats.monthPaidCount} paid invoices</p>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-900">Pending</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-700" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-800">${stats.pendingAmount.toFixed(2)}</div>
                <p className="text-xs text-blue-700">
                  {stats.pendingCount} invoices
                </p>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-900">Overdue</CardTitle>
                <Calendar className="h-4 w-4 text-blue-700" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">${stats.overdueAmount.toFixed(2)}</div>
                <p className="text-xs text-blue-700">
                  {stats.overdueCount} invoices
                </p>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-900">All Time Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-700" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-800">${stats.totalRevenue.toFixed(2)}</div>
                <p className="text-xs text-blue-700">Total collected</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-blue-200">
            <CardHeader className="bg-blue-50 border-b border-blue-100">
              <CardTitle className="text-blue-900">Payment History - {selectedMonthLabel}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {monthInvoices.map((invoice) => {
                  const child = children.find(c => c.id === invoice.childId);
                  return (
                    <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{child?.firstName} {child?.lastName}</p>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span>Invoice #{invoice.invoiceNumber}</span>
                          <span>Due: {formatLocalDate(invoice.dueDate)}</span>
                          {invoice.paidDate && (
                            <span>Paid: {formatLocalDate(invoice.paidDate)}</span>
                          )}
                        </div>
                        {invoice.description && (
                          <p className="text-sm text-muted-foreground mt-1">{invoice.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-lg">${invoice.amount.toFixed(2)}</p>
                        <Badge
                          variant={
                            invoice.status === 'paid' ? 'default' :
                            invoice.status === 'overdue' ? 'destructive' :
                            'secondary'
                          }
                        >
                          {invoice.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
                {monthInvoices.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No invoices for this month
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Revenue by Child - {selectedMonthLabel}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {children.filter(c => c.status === 'active').map((child) => {
                  // Filter invoices for this child AND the selected month
                  const childMonthInvoices = monthInvoices.filter(inv => inv.childId === child.id);
                  const totalPaid = childMonthInvoices
                    .filter(inv => inv.status === 'paid')
                    .reduce((sum, inv) => sum + inv.amount, 0);
                  const totalPending = childMonthInvoices
                    .filter(inv => inv.status === 'pending' || inv.status === 'overdue')
                    .reduce((sum, inv) => sum + inv.amount, 0);

                  if (totalPaid === 0 && totalPending === 0) return null;

                  return (
                    <div key={child.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{child.firstName} {child.lastName}</p>
                        <p className="text-sm text-muted-foreground">{child.parentName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${totalPaid.toFixed(2)} paid</p>
                        {totalPending > 0 && (
                          <p className="text-sm text-yellow-600">${totalPending.toFixed(2)} pending</p>
                        )}
                      </div>
                    </div>
                  );
                })}
                {children.filter(c => c.status === 'active').every((child) => {
                  const childMonthInvoices = monthInvoices.filter(inv => inv.childId === child.id);
                  const totalPaid = childMonthInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);
                  const totalPending = childMonthInvoices.filter(inv => inv.status === 'pending' || inv.status === 'overdue').reduce((sum, inv) => sum + inv.amount, 0);
                  return totalPaid === 0 && totalPending === 0;
                }) && (
                  <p className="text-center text-muted-foreground py-4">
                    No revenue data for this month
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Year-End Report Content */}
      {isYearEndReport && selectedYear && (
        <>
          {/* Year Summary Cards */}
          <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
            <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-900">Year Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">${yearStats.totalRevenue.toFixed(2)}</div>
                <p className="text-xs text-green-600">{yearStats.paidCount} paid invoices</p>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-900">Total Invoiced</CardTitle>
                <FileText className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">${yearStats.totalInvoiced.toFixed(2)}</div>
                <p className="text-xs text-blue-600">{yearStats.totalInvoices} total invoices</p>
              </CardContent>
            </Card>

            <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-yellow-900">Outstanding</CardTitle>
                <TrendingUp className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-700">
                  ${(yearStats.pendingAmount + yearStats.overdueAmount).toFixed(2)}
                </div>
                <p className="text-xs text-yellow-600">
                  {yearStats.pendingCount} pending, {yearStats.overdueCount} overdue
                </p>
              </CardContent>
            </Card>

            <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-900">Collection Rate</CardTitle>
                <BarChart3 className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-700">{yearStats.collectionRate}%</div>
                <p className="text-xs text-purple-600">of invoiced amount collected</p>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Breakdown */}
          <Card className="border-blue-200">
            <CardHeader className="bg-blue-50 border-b border-blue-100">
              <CardTitle className="text-blue-900">Monthly Breakdown - {selectedYear}</CardTitle>
              <CardDescription>Revenue collected each month</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {monthlyBreakdown.map((month, index) => {
                  const maxTotal = Math.max(...monthlyBreakdown.map(m => m.total));

                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium w-12">{month.month}</span>
                        <div className="flex-1 mx-4">
                          <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full flex">
                              {month.paid > 0 && (
                                <div
                                  className="bg-green-500 h-full"
                                  style={{ width: `${maxTotal > 0 ? (month.paid / maxTotal) * 100 : 0}%` }}
                                  title={`Paid: $${month.paid.toFixed(2)}`}
                                />
                              )}
                              {month.pending > 0 && (
                                <div
                                  className="bg-yellow-500 h-full"
                                  style={{ width: `${maxTotal > 0 ? (month.pending / maxTotal) * 100 : 0}%` }}
                                  title={`Pending: $${month.pending.toFixed(2)}`}
                                />
                              )}
                              {month.overdue > 0 && (
                                <div
                                  className="bg-blue-600 h-full"
                                  style={{ width: `${maxTotal > 0 ? (month.overdue / maxTotal) * 100 : 0}%` }}
                                  title={`Overdue: $${month.overdue.toFixed(2)}`}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="font-medium w-24 text-right">${month.total.toFixed(2)}</span>
                      </div>
                      {month.invoiceCount > 0 && (
                        <div className="flex justify-between text-xs text-muted-foreground ml-12 mr-24">
                          <span className="text-green-600">${month.paid.toFixed(2)} paid</span>
                          {month.pending > 0 && <span className="text-yellow-600">${month.pending.toFixed(2)} pending</span>}
                          {month.overdue > 0 && <span className="text-blue-700">${month.overdue.toFixed(2)} overdue</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded" />
                  <span className="text-sm text-muted-foreground">Paid</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded" />
                  <span className="text-sm text-muted-foreground">Pending</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-600 rounded" />
                  <span className="text-sm text-muted-foreground">Overdue</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Year Revenue by Child */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Child - {selectedYear}</CardTitle>
              <CardDescription>Total revenue collected per child for the year</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {children.filter(c => c.status === 'active').map((child) => {
                  const childYearInvoices = yearInvoices.filter(inv => inv.childId === child.id);
                  const totalPaid = childYearInvoices
                    .filter(inv => inv.status === 'paid')
                    .reduce((sum, inv) => sum + inv.amount, 0);
                  const totalPending = childYearInvoices
                    .filter(inv => inv.status === 'pending' || inv.status === 'overdue')
                    .reduce((sum, inv) => sum + inv.amount, 0);

                  if (totalPaid === 0 && totalPending === 0) return null;

                  return (
                    <div key={child.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{child.firstName} {child.lastName}</p>
                        <p className="text-sm text-muted-foreground">{child.parentName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-green-700">${totalPaid.toFixed(2)} paid</p>
                        {totalPending > 0 && (
                          <p className="text-sm text-yellow-600">${totalPending.toFixed(2)} outstanding</p>
                        )}
                      </div>
                    </div>
                  );
                })}
                {children.filter(c => c.status === 'active').every((child) => {
                  const childYearInvoices = yearInvoices.filter(inv => inv.childId === child.id);
                  const totalPaid = childYearInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);
                  const totalPending = childYearInvoices.filter(inv => inv.status === 'pending' || inv.status === 'overdue').reduce((sum, inv) => sum + inv.amount, 0);
                  return totalPaid === 0 && totalPending === 0;
                }) && (
                  <p className="text-center text-muted-foreground py-4">
                    No revenue data for this year
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
