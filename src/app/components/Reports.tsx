import { useState } from "react";
import { BarChart3, Calendar, DollarSign, Download, Users, FileText, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useData } from "../context/DataContext";
import { parseLocalDate, formatLocalDate } from "../../utils/dateUtils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

export function Reports() {
  const { children, attendance, invoices } = useData();
  const [reportType, setReportType] = useState<"attendance" | "financial" | "enrollment">("attendance");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedChildId, setSelectedChildId] = useState<string>("all");

  // Check if year-end report is selected
  const isYearEndReport = selectedMonth.startsWith('year-');
  const selectedYear = isYearEndReport ? selectedMonth.replace('year-', '') : null;

  // Generate month options
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

  // Attendance Report Data - recalculates on every render
  const getAttendanceReport = () => {
    const monthAttendance = attendance.filter(att => {
      const attDate = parseLocalDate(att.date);
      const attMonth = `${attDate.getFullYear()}-${String(attDate.getMonth() + 1).padStart(2, '0')}`;
      return attMonth === selectedMonth;
    });

    const childrenStats = children.map(child => {
      const childAttendance = monthAttendance.filter(att => att.childId === child.id);
      const totalDays = childAttendance.length;
      const presentDays = childAttendance.filter(att => att.checkIn && att.status !== 'absent').length;
      const absentDays = childAttendance.filter(att => att.status === 'absent').length;
      
      // Get actual dates for present and absent
      const presentDates = childAttendance
        .filter(att => att.checkIn && att.status !== 'absent')
        .map(att => parseLocalDate(att.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
        .sort();

      const absentDates = childAttendance
        .filter(att => att.status === 'absent')
        .map(att => parseLocalDate(att.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
        .sort();

      return {
        child,
        totalDays,
        presentDays,
        absentDays,
        presentDates,
        absentDates,
        attendanceRate: totalDays > 0 ? (presentDays / totalDays * 100).toFixed(1) : '0',
      };
    });

    return childrenStats;
  };

  // Financial Report Data - recalculates on every render based on selected month
  const getFinancialReport = () => {
    // Filter invoices by selected month (based on due date)
    let monthInvoices = invoices.filter(inv => {
      const invDate = parseLocalDate(inv.dueDate);
      const invMonth = `${invDate.getFullYear()}-${String(invDate.getMonth() + 1).padStart(2, '0')}`;
      return invMonth === selectedMonth;
    });

    // Filter by child if a specific child is selected
    if (selectedChildId !== "all") {
      monthInvoices = monthInvoices.filter(inv => inv.childId === selectedChildId);
    }

    // Calculate selected month stats
    const selectedMonthPaidInvoices = monthInvoices.filter(inv => inv.status === 'paid');
    const selectedMonthPendingInvoices = monthInvoices.filter(inv => inv.status === 'pending');
    const selectedMonthOverdueInvoices = monthInvoices.filter(inv => inv.status === 'overdue');

    const monthStats = {
      totalInvoiced: monthInvoices.reduce((sum, inv) => sum + inv.amount, 0),
      totalPaid: selectedMonthPaidInvoices.reduce((sum, inv) => sum + inv.amount, 0),
      totalPending: selectedMonthPendingInvoices.reduce((sum, inv) => sum + inv.amount, 0),
      totalOverdue: selectedMonthOverdueInvoices.reduce((sum, inv) => sum + inv.amount, 0),
      invoiceCount: monthInvoices.length,
      paidCount: selectedMonthPaidInvoices.length,
      pendingCount: selectedMonthPendingInvoices.length,
      overdueCount: selectedMonthOverdueInvoices.length,
    };

    // Calculate all-time total for comparison
    const allTimePaid = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);

    return {
      // Selected month stats
      totalInvoiced: monthStats.totalInvoiced,
      totalPaid: monthStats.totalPaid,
      totalPending: monthStats.totalPending,
      totalOverdue: monthStats.totalOverdue,
      invoiceCount: monthStats.invoiceCount,
      paidCount: monthStats.paidCount,
      pendingCount: monthStats.pendingCount,
      overdueCount: monthStats.overdueCount,
      collectionRate: monthStats.totalInvoiced > 0 ? ((monthStats.totalPaid / monthStats.totalInvoiced) * 100).toFixed(1) : '0',
      // All-time revenue for reference
      allTimeRevenue: allTimePaid,
      // Month invoices for detail list
      monthInvoices: monthInvoices,
    };
  };

  // Year-End Financial Report Data
  const getYearEndFinancialReport = () => {
    if (!selectedYear) return null;

    // Filter invoices by selected year
    let yearInvoices = invoices.filter(inv => {
      const invDate = parseLocalDate(inv.dueDate);
      return invDate.getFullYear().toString() === selectedYear;
    });

    // Filter by child if a specific child is selected
    if (selectedChildId !== "all") {
      yearInvoices = yearInvoices.filter(inv => inv.childId === selectedChildId);
    }

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
    const monthlyBreakdown = Array.from({ length: 12 }, (_, i) => {
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
    });

    // Revenue by child for the year
    const revenueByChild = children.filter(c => c.status === 'active').map(child => {
      const childYearInvoices = yearInvoices.filter(inv => inv.childId === child.id);
      const totalPaid = childYearInvoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.amount, 0);
      const totalPending = childYearInvoices
        .filter(inv => inv.status === 'pending' || inv.status === 'overdue')
        .reduce((sum, inv) => sum + inv.amount, 0);

      return {
        child,
        totalPaid,
        totalPending,
        hasData: totalPaid > 0 || totalPending > 0,
      };
    }).filter(r => r.hasData);

    return {
      ...yearStats,
      monthlyBreakdown,
      revenueByChild,
      yearInvoices,
    };
  };

  // Enrollment Report Data - recalculates on every render
  const getEnrollmentReport = () => {
    const activeCount = children.filter(c => c.status === 'active').length;
    const inactiveCount = children.filter(c => c.status === 'inactive').length;
    
    // Age distribution
    const ageGroups = {
      '0-1': 0,
      '1-2': 0,
      '2-3': 0,
      '3-4': 0,
      '4-5': 0,
      '5+': 0,
    };

    children.forEach(child => {
      const birthDate = parseLocalDate(child.dateOfBirth);
      const age = Math.floor((new Date().getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 1) ageGroups['0-1']++;
      else if (age < 2) ageGroups['1-2']++;
      else if (age < 3) ageGroups['2-3']++;
      else if (age < 4) ageGroups['3-4']++;
      else if (age < 5) ageGroups['4-5']++;
      else ageGroups['5+']++;
    });

    return {
      activeCount,
      inactiveCount,
      totalCount: children.length,
      ageGroups,
    };
  };

  // Calculate all reports - these will update whenever children, attendance, or invoices change
  const attendanceReport = getAttendanceReport();
  const financialReport = getFinancialReport();
  const yearEndFinancialReport = getYearEndFinancialReport();
  const enrollmentReport = getEnrollmentReport();

  // Export PDF function for attendance report
  const exportAttendancePDF = () => {
    const doc = new jsPDF('landscape'); // Use landscape for better fit
    
    // Add title
    doc.setFontSize(16);
    doc.setTextColor(65, 105, 225); // Red color
    doc.text("KidTrackerApp™ - Attendance Report", 14, 15);
    
    // Add subtitle with month
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const monthLabel = monthOptions.find(opt => opt.value === selectedMonth)?.label || selectedMonth;
    doc.text(`Report Period: ${monthLabel}`, 14, 22);
    
    // Add generation date
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 27);
    
    // Get all unique dates in the month from attendance records
    const [year, month] = selectedMonth.split('-');
    const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
    const dayColumns = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());
    
    // Prepare table headers
    const headers = [
      'Child Name',
      ...dayColumns,
      'P',
      'A',
      'T',
      '%'
    ];
    
    // Prepare table data
    const activeChildren = attendanceReport.filter(r => r.child.status === 'active');
    const tableData = activeChildren.map(record => {
      const row = [`${record.child.firstName} ${record.child.lastName}`];
      
      // For each day of the month, check if child was present or absent
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${month}-${String(day).padStart(2, '0')}`;
        
        // Create a date object to check
        const checkDate = new Date(parseInt(year), parseInt(month) - 1, day);
        const formattedCheckDate = checkDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        let cellValue = '-';
        if (record.presentDates.includes(formattedCheckDate)) {
          cellValue = 'P';
        } else if (record.absentDates.includes(formattedCheckDate)) {
          cellValue = 'A';
        }
        
        row.push(cellValue);
      }
      
      // Add summary columns
      row.push(
        record.presentDays.toString(),
        record.absentDays.toString(),
        record.totalDays.toString(),
        record.attendanceRate
      );
      
      return row;
    });
    
    if (tableData.length === 0) {
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text('No attendance data for this month', 14, 40);
    } else {
      // Calculate available width for day columns
      const pageWidth = doc.internal.pageSize.width;
      const margins = 28; // 14 left + 14 right
      const nameColumnWidth = 25;
      const summaryColumnsWidth = 8 * 4; // 4 summary columns at 8 each
      const availableForDays = pageWidth - margins - nameColumnWidth - summaryColumnsWidth;
      const dayColumnWidth = Math.floor((availableForDays / daysInMonth) * 10) / 10; // Round down to nearest 0.1
      
      // Build column styles dynamically
      const columnStyles: any = {
        0: { 
          cellWidth: nameColumnWidth, 
          halign: 'left',
          fontStyle: 'bold',
          fontSize: 6
        }
      };
      
      // Day columns
      for (let i = 0; i < daysInMonth; i++) {
        columnStyles[i + 1] = { 
          cellWidth: dayColumnWidth, 
          halign: 'center',
          fontSize: 5
        };
      }
      
      // Summary columns
      columnStyles[daysInMonth + 1] = { cellWidth: 8, halign: 'center', fontStyle: 'bold', fillColor: [240, 248, 255], fontSize: 6 };
      columnStyles[daysInMonth + 2] = { cellWidth: 8, halign: 'center', fontStyle: 'bold', fillColor: [255, 240, 240], fontSize: 6 };
      columnStyles[daysInMonth + 3] = { cellWidth: 8, halign: 'center', fontStyle: 'bold', fillColor: [248, 248, 248], fontSize: 6 };
      columnStyles[daysInMonth + 4] = { cellWidth: 8, halign: 'center', fontStyle: 'bold', fillColor: [240, 255, 240], fontSize: 6 };
      
      // Add the table
      autoTable(doc, {
        head: [headers],
        body: tableData,
        startY: 32,
        theme: 'grid',
        styles: {
          fontSize: 5,
          cellPadding: 0.8,
          halign: 'center',
          valign: 'middle',
          overflow: 'linebreak',
          minCellHeight: 4
        },
        headStyles: {
          fillColor: [65, 105, 225], // Red header
          textColor: [255, 255, 255],
          fontSize: 5,
          fontStyle: 'bold',
          halign: 'center',
          cellPadding: 0.8
        },
        columnStyles: columnStyles,
        didParseCell: function(data) {
          // Color code P and A cells
          if (data.section === 'body' && data.column.index > 0 && data.column.index <= dayColumns.length) {
            if (data.cell.raw === 'P') {
              data.cell.styles.textColor = [0, 128, 0]; // Green for Present
              data.cell.styles.fontStyle = 'bold';
            } else if (data.cell.raw === 'A') {
              data.cell.styles.textColor = [65, 105, 225]; // Red for Absent
              data.cell.styles.fontStyle = 'bold';
            } else {
              data.cell.styles.textColor = [200, 200, 200]; // Light gray for no data
            }
          }
        },
        margin: { top: 32, right: 14, bottom: 20, left: 14 },
        tableWidth: 'wrap'
      });
    }
    
    // Add legend
    const finalY = (doc as any).lastAutoTable.finalY || 40;
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text('Legend:', 14, finalY + 10);
    
    doc.setTextColor(0, 128, 0);
    doc.setFont(doc.getFont().fontName, 'bold');
    doc.text('P', 30, finalY + 10);
    doc.setFont(doc.getFont().fontName, 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('= Present', 35, finalY + 10);

    doc.setTextColor(65, 105, 225);
    doc.setFont(doc.getFont().fontName, 'bold');
    doc.text('A', 60, finalY + 10);
    doc.setFont(doc.getFont().fontName, 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('= Absent', 65, finalY + 10);
    
    doc.setTextColor(200, 200, 200);
    doc.text('-', 90, finalY + 10);
    doc.setTextColor(0, 0, 0);
    doc.text('= No Record', 95, finalY + 10);
    
    // Add footer
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        'Powered by GDI Digital Solutions',
        14,
        doc.internal.pageSize.height - 10
      );
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.width - 35,
        doc.internal.pageSize.height - 10
      );
    }
    
    // Save the PDF
    const fileName = `Attendance_Report_${selectedMonth}.pdf`;
    doc.save(fileName);
    
    toast.success("PDF exported successfully!");
  };

  // Export PDF function for financial report
  const exportFinancialPDF = () => {
    // Handle year-end report PDF export
    if (isYearEndReport && yearEndFinancialReport) {
      exportYearEndFinancialPDF();
      return;
    }

    const doc = new jsPDF();

    // Add title
    doc.setFontSize(20);
    doc.setTextColor(65, 105, 225);
    doc.text("KidTrackerApp™ - Financial Report", 14, 22);

    // Add subtitle with month and child filter
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    const monthLabel = monthOptions.find(opt => opt.value === selectedMonth)?.label || selectedMonth;
    let subtitle = `Report Period: ${monthLabel}`;
    if (selectedChildId !== "all") {
      const selectedChild = children.find(c => c.id === selectedChildId);
      if (selectedChild) {
        subtitle += ` - ${selectedChild.firstName} ${selectedChild.lastName}`;
      }
    }
    doc.text(subtitle, 14, 32);
    
    // Add generation date
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 40);
    
    // Financial Summary Box
    doc.setFontSize(14);
    doc.setTextColor(65, 105, 225);
    doc.text('Financial Summary', 14, 55);
    
    // Summary statistics
    const summaryData = [
      ['Metric', 'Amount', 'Details'],
      ['Total Invoiced', `$${financialReport.totalInvoiced.toFixed(2)}`, `${financialReport.invoiceCount} invoices`],
      ['Collected', `$${financialReport.totalPaid.toFixed(2)}`, `${financialReport.paidCount} paid`],
      ['Pending', `$${financialReport.totalPending.toFixed(2)}`, 'Awaiting payment'],
      ['Overdue', `$${financialReport.totalOverdue.toFixed(2)}`, 'Past due date'],
      ['Collection Rate', `${financialReport.collectionRate}%`, 'Success rate']
    ];
    
    autoTable(doc, {
      head: [summaryData[0]],
      body: summaryData.slice(1),
      startY: 60,
      theme: 'grid',
      headStyles: {
        fillColor: [65, 105, 225],
        textColor: [255, 255, 255],
        fontSize: 11,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 10,
        cellPadding: 5
      },
      columnStyles: {
        0: { cellWidth: 55, fontStyle: 'bold' },
        1: { cellWidth: 45, halign: 'right', fontStyle: 'bold' },
        2: { cellWidth: 65 }
      },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 1) {
          const rowIndex = data.row.index;
          if (rowIndex === 1) { // Collected
            data.cell.styles.textColor = [0, 128, 0];
          } else if (rowIndex === 2) { // Pending
            data.cell.styles.textColor = [200, 150, 0];
          } else if (rowIndex === 3) { // Overdue
            data.cell.styles.textColor = [65, 105, 225];
          }
        }
      },
      margin: { top: 60, right: 14, bottom: 20, left: 14 }
    });
    
    // Invoice Details Section
    let monthInvoices = invoices.filter(inv => {
      const invDate = parseLocalDate(inv.dueDate);
      const invMonth = `${invDate.getFullYear()}-${String(invDate.getMonth() + 1).padStart(2, '0')}`;
      return invMonth === selectedMonth;
    });

    if (selectedChildId !== "all") {
      monthInvoices = monthInvoices.filter(inv => inv.childId === selectedChildId);
    }

    if (monthInvoices.length > 0) {
      const summaryFinalY = (doc as any).lastAutoTable.finalY || 120;
      
      doc.setFontSize(14);
      doc.setTextColor(65, 105, 225);
      doc.text('Invoice Details', 14, summaryFinalY + 15);
      
      // Prepare invoice details data
      const invoiceDetailsData: any[] = [
        ['Child Name', 'Invoice #', 'Due Date', 'Status', 'Amount', 'Charges']
      ];
      
      monthInvoices.forEach(invoice => {
        const child = children.find(c => c.id === invoice.childId);
        const childName = child ? `${child.firstName} ${child.lastName}` : 'Unknown';
        const invoiceNum = invoice.invoiceNumber;
        const dueDate = formatLocalDate(invoice.dueDate);
        const status = invoice.status.toUpperCase();
        const amount = `$${invoice.amount.toFixed(2)}`;
        
        // Format charges as bullet points
        let charges = 'No description';
        if (invoice.description) {
          const chargeItems = invoice.description.split(', ');
          charges = chargeItems.join('\n• ');
          charges = '• ' + charges;
        }
        
        invoiceDetailsData.push([
          childName,
          invoiceNum,
          dueDate,
          status,
          amount,
          charges
        ]);
      });
      
      autoTable(doc, {
        head: [invoiceDetailsData[0]],
        body: invoiceDetailsData.slice(1),
        startY: summaryFinalY + 20,
        theme: 'grid',
        headStyles: {
          fillColor: [65, 105, 225],
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 8,
          cellPadding: 3,
          overflow: 'linebreak',
          valign: 'top'
        },
        columnStyles: {
          0: { cellWidth: 30, fontStyle: 'bold' },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 23, halign: 'center', fontSize: 7 },
          3: { cellWidth: 20, halign: 'center', fontSize: 7 },
          4: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
          5: { cellWidth: 'auto', fontSize: 7 }
        },
        didParseCell: function(data) {
          if (data.section === 'body') {
            if (data.column.index === 3) { // Status column
              const status = data.cell.raw as string;
              if (status === 'PAID') {
                data.cell.styles.textColor = [0, 128, 0];
                data.cell.styles.fontStyle = 'bold';
              } else if (status === 'PENDING') {
                data.cell.styles.textColor = [200, 150, 0];
                data.cell.styles.fontStyle = 'bold';
              } else if (status === 'OVERDUE') {
                data.cell.styles.textColor = [65, 105, 225];
                data.cell.styles.fontStyle = 'bold';
              }
            }
          }
        },
        margin: { top: summaryFinalY + 20, right: 14, bottom: 20, left: 14 }
      });
    }
    
    // Add footer
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        'Powered by GDI Digital Solutions',
        14,
        doc.internal.pageSize.height - 10
      );
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.width - 35,
        doc.internal.pageSize.height - 10
      );
    }
    
    // Save the PDF
    const fileName = `Financial_Report_${selectedMonth}.pdf`;
    doc.save(fileName);

    toast.success("PDF exported successfully!");
  };

  // Export PDF function for year-end financial report
  const exportYearEndFinancialPDF = () => {
    if (!yearEndFinancialReport || !selectedYear) return;

    const doc = new jsPDF();

    // Add title
    doc.setFontSize(20);
    doc.setTextColor(65, 105, 225);
    doc.text("KidTrackerApp™ - Year-End Financial Report", 14, 22);

    // Add subtitle
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    let subtitle = `Year: ${selectedYear}`;
    if (selectedChildId !== "all") {
      const selectedChild = children.find(c => c.id === selectedChildId);
      if (selectedChild) {
        subtitle += ` - ${selectedChild.firstName} ${selectedChild.lastName}`;
      }
    }
    doc.text(subtitle, 14, 32);

    // Add generation date
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 40);

    // Year Summary
    doc.setFontSize(14);
    doc.setTextColor(65, 105, 225);
    doc.text('Annual Financial Summary', 14, 55);

    const summaryData = [
      ['Metric', 'Amount', 'Details'],
      ['Total Invoiced', `$${yearEndFinancialReport.totalInvoiced.toFixed(2)}`, `${yearEndFinancialReport.totalInvoices} invoices`],
      ['Total Collected', `$${yearEndFinancialReport.totalRevenue.toFixed(2)}`, `${yearEndFinancialReport.paidCount} paid`],
      ['Pending', `$${yearEndFinancialReport.pendingAmount.toFixed(2)}`, `${yearEndFinancialReport.pendingCount} invoices`],
      ['Overdue', `$${yearEndFinancialReport.overdueAmount.toFixed(2)}`, `${yearEndFinancialReport.overdueCount} invoices`],
      ['Collection Rate', `${yearEndFinancialReport.collectionRate}%`, 'Annual success rate']
    ];

    autoTable(doc, {
      head: [summaryData[0]],
      body: summaryData.slice(1),
      startY: 60,
      theme: 'grid',
      headStyles: {
        fillColor: [65, 105, 225],
        textColor: [255, 255, 255],
        fontSize: 11,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 10,
        cellPadding: 5
      },
      columnStyles: {
        0: { cellWidth: 55, fontStyle: 'bold' },
        1: { cellWidth: 45, halign: 'right', fontStyle: 'bold' },
        2: { cellWidth: 65 }
      },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 1) {
          const rowIndex = data.row.index;
          if (rowIndex === 1) { // Collected
            data.cell.styles.textColor = [0, 128, 0];
          } else if (rowIndex === 2) { // Pending
            data.cell.styles.textColor = [200, 150, 0];
          } else if (rowIndex === 3) { // Overdue
            data.cell.styles.textColor = [65, 105, 225];
          }
        }
      }
    });

    // Monthly Breakdown Section
    const summaryFinalY = (doc as any).lastAutoTable.finalY || 120;

    doc.setFontSize(14);
    doc.setTextColor(65, 105, 225);
    doc.text('Monthly Breakdown', 14, summaryFinalY + 15);

    const monthlyData = [
      ['Month', 'Paid', 'Pending', 'Overdue', 'Total'],
      ...yearEndFinancialReport.monthlyBreakdown.map(m => [
        m.month,
        `$${m.paid.toFixed(2)}`,
        `$${m.pending.toFixed(2)}`,
        `$${m.overdue.toFixed(2)}`,
        `$${m.total.toFixed(2)}`
      ])
    ];

    autoTable(doc, {
      head: [monthlyData[0]],
      body: monthlyData.slice(1),
      startY: summaryFinalY + 20,
      theme: 'grid',
      headStyles: {
        fillColor: [65, 105, 225],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
        halign: 'center'
      },
      columnStyles: {
        0: { fontStyle: 'bold', halign: 'left' },
        1: { textColor: [0, 128, 0] },
        2: { textColor: [200, 150, 0] },
        3: { textColor: [65, 105, 225] },
        4: { fontStyle: 'bold' }
      }
    });

    // Revenue by Child Section (on new page if needed)
    if (yearEndFinancialReport.revenueByChild.length > 0) {
      const monthlyFinalY = (doc as any).lastAutoTable.finalY || 200;

      if (monthlyFinalY > 200) {
        doc.addPage();
        doc.setFontSize(14);
        doc.setTextColor(65, 105, 225);
        doc.text('Revenue by Child', 14, 22);
      } else {
        doc.setFontSize(14);
        doc.setTextColor(65, 105, 225);
        doc.text('Revenue by Child', 14, monthlyFinalY + 15);
      }

      const childData = [
        ['Child Name', 'Parent', 'Paid', 'Outstanding'],
        ...yearEndFinancialReport.revenueByChild.map(r => [
          `${r.child.firstName} ${r.child.lastName}`,
          r.child.parentName || '-',
          `$${r.totalPaid.toFixed(2)}`,
          `$${r.totalPending.toFixed(2)}`
        ])
      ];

      autoTable(doc, {
        head: [childData[0]],
        body: childData.slice(1),
        startY: monthlyFinalY > 200 ? 27 : monthlyFinalY + 20,
        theme: 'grid',
        headStyles: {
          fillColor: [65, 105, 225],
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 9,
          cellPadding: 4
        },
        columnStyles: {
          0: { fontStyle: 'bold' },
          2: { textColor: [0, 128, 0], halign: 'right' },
          3: { textColor: [200, 150, 0], halign: 'right' }
        }
      });
    }

    // Add footer
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        'Powered by GDI Digital Solutions',
        14,
        doc.internal.pageSize.height - 10
      );
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.width - 35,
        doc.internal.pageSize.height - 10
      );
    }

    // Save the PDF
    const fileName = `Year_End_Financial_Report_${selectedYear}.pdf`;
    doc.save(fileName);

    toast.success("Year-End PDF exported successfully!");
  };

  // Export PDF function for enrollment report
  const exportEnrollmentPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.setTextColor(65, 105, 225);
    doc.text("KidTrackerApp™ - Enrollment Report", 14, 22);
    
    // Add generation date
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 32);
    
    // Enrollment Summary
    doc.setFontSize(14);
    doc.setTextColor(65, 105, 225);
    doc.text('Enrollment Summary', 14, 47);
    
    const enrollmentData = [
      ['Status', 'Count'],
      ['Total Enrolled', enrollmentReport.totalCount.toString()],
      ['Active', enrollmentReport.activeCount.toString()],
      ['Inactive', enrollmentReport.inactiveCount.toString()]
    ];
    
    autoTable(doc, {
      head: [enrollmentData[0]],
      body: enrollmentData.slice(1),
      startY: 52,
      theme: 'grid',
      headStyles: {
        fillColor: [65, 105, 225],
        textColor: [255, 255, 255],
        fontSize: 11,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 10,
        cellPadding: 5
      },
      columnStyles: {
        0: { cellWidth: 100, fontStyle: 'bold' },
        1: { cellWidth: 80, halign: 'center', fontStyle: 'bold' }
      },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 1) {
          const rowIndex = data.row.index;
          if (rowIndex === 1) { // Active
            data.cell.styles.textColor = [0, 128, 0];
          } else if (rowIndex === 2) { // Inactive
            data.cell.styles.textColor = [150, 150, 150];
          }
        }
      }
    });
    
    // Age Distribution
    const finalY = (doc as any).lastAutoTable.finalY || 100;
    doc.setFontSize(14);
    doc.setTextColor(65, 105, 225);
    doc.text('Age Distribution', 14, finalY + 15);
    
    const ageData = [
      ['Age Group', 'Number of Children'],
      ...Object.entries(enrollmentReport.ageGroups).map(([age, count]) => [
        `${age} years old`,
        count.toString()
      ])
    ];
    
    autoTable(doc, {
      head: [ageData[0]],
      body: ageData.slice(1),
      startY: finalY + 20,
      theme: 'grid',
      headStyles: {
        fillColor: [65, 105, 225],
        textColor: [255, 255, 255],
        fontSize: 11,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 10,
        cellPadding: 5
      },
      columnStyles: {
        0: { cellWidth: 100, fontStyle: 'bold' },
        1: { cellWidth: 80, halign: 'center' }
      }
    });
    
    // Add footer
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      'Powered by GDI Digital Solutions',
      14,
      doc.internal.pageSize.height - 10
    );
    
    // Save the PDF
    const fileName = `Enrollment_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    toast.success("PDF exported successfully!");
  };

  // Main export function that checks report type
  const handleExportPDF = () => {
    if (reportType === "attendance") {
      exportAttendancePDF();
    } else if (reportType === "financial") {
      exportFinancialPDF();
    } else if (reportType === "enrollment") {
      exportEnrollmentPDF();
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-700 to-blue-600 text-white rounded-lg p-4 sm:p-6 shadow-lg">
        <h1 className="text-white text-xl sm:text-3xl">Reports</h1>
        <p className="text-blue-50 text-xs sm:text-base">Generate and view detailed reports</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="attendance">Attendance Report</SelectItem>
            <SelectItem value="financial">Financial Report</SelectItem>
            <SelectItem value="enrollment">Enrollment Report</SelectItem>
          </SelectContent>
        </Select>

        {reportType === "attendance" && (
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {reportType === "financial" && (
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[220px]">
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
        )}

        {reportType === "financial" && (
          <Select value={selectedChildId} onValueChange={setSelectedChildId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select child" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Children</SelectItem>
              {children.filter(c => c.status === 'active').map(child => (
                <SelectItem key={child.id} value={child.id}>
                  {child.firstName} {child.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button variant="outline" className="ml-auto border-blue-300 text-blue-800 hover:bg-blue-50" onClick={handleExportPDF}>
          <Download className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
      </div>

      {reportType === "attendance" && (
        <div className="space-y-4">
          <Card className="border-blue-200">
            <CardHeader className="bg-blue-50 border-b border-blue-100">
              <CardTitle className="text-blue-900">Attendance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {attendanceReport.filter(r => r.child.status === 'active').map((record) => (
                  <div key={record.child.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-lg">{record.child.firstName} {record.child.lastName}</p>
                      <Badge
                        variant={
                          parseFloat(record.attendanceRate) >= 90 ? 'default' :
                          parseFloat(record.attendanceRate) >= 75 ? 'secondary' :
                          'destructive'
                        }
                      >
                        {record.attendanceRate}% attendance
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-semibold text-green-700">
                          Present Days ({record.presentDays}):
                        </p>
                        {record.presentDates.length > 0 ? (
                          <p className="text-sm text-muted-foreground ml-2">
                            {record.presentDates.join(', ')}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground ml-2 italic">None</p>
                        )}
                      </div>
                      
                      <div>
                        <p className="text-sm font-semibold text-blue-800">
                          Absent Days ({record.absentDays}):
                        </p>
                        {record.absentDates.length > 0 ? (
                          <p className="text-sm text-muted-foreground ml-2">
                            {record.absentDates.join(', ')}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground ml-2 italic">None</p>
                        )}
                      </div>
                      
                      <div className="pt-2 border-t">
                        <p className="text-sm font-medium">
                          Total: {record.totalDays} days tracked
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {attendanceReport.filter(r => r.child.status === 'active').length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No attendance data for this month
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {reportType === "financial" && !isYearEndReport && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Month Revenue</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">${financialReport.totalPaid.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  {financialReport.paidCount} paid invoices
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">${financialReport.totalPending.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  {financialReport.pendingCount} invoices
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">${financialReport.totalOverdue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  {financialReport.overdueCount} invoices
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">All Time Revenue</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${financialReport.allTimeRevenue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  Total collected
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Collection Rate - {monthOptions.find(opt => opt.value === selectedMonth)?.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{financialReport.collectionRate}%</div>
              <p className="text-sm text-muted-foreground mt-2">
                Collected {financialReport.collectionRate}% of ${financialReport.totalInvoiced.toFixed(2)} invoiced this month
              </p>
            </CardContent>
          </Card>

          {/* Detailed Invoice List */}
          <Card className="border-blue-200">
            <CardHeader className="bg-blue-50 border-b border-blue-100">
              <CardTitle className="text-blue-900">Invoice Details - {monthOptions.find(opt => opt.value === selectedMonth)?.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Pending Invoices Section */}
                <div>
                  <h3 className="text-lg font-semibold text-yellow-700 mb-3 flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Pending Invoices
                  </h3>
                  <div className="space-y-3">
                    {(() => {
                      const filteredInvoices = financialReport.monthInvoices.filter(inv => inv.status === 'pending');

                      if (filteredInvoices.length === 0) {
                        return (
                          <p className="text-center text-muted-foreground py-4 bg-gray-50 rounded border border-dashed">
                            No pending invoices for this month
                          </p>
                        );
                      }

                      return filteredInvoices.map((invoice) => {
                        const child = children.find(c => c.id === invoice.childId);
                        return (
                          <div key={invoice.id} className="p-4 border-2 border-yellow-200 bg-yellow-50 rounded-lg space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-lg text-gray-900">
                                  {child?.firstName} {child?.lastName}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Invoice #{invoice.invoiceNumber}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Due: {formatLocalDate(invoice.dueDate)}
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="text-xl font-bold text-yellow-700">${invoice.amount.toFixed(2)}</div>
                                <Badge className="bg-yellow-600">
                                  PENDING
                                </Badge>
                              </div>
                            </div>

                            {invoice.description && (
                              <div className="pt-2 border-t border-yellow-200">
                                <p className="text-sm font-semibold mb-1">Charges:</p>
                                <div className="space-y-1 ml-2">
                                  {invoice.description.split(', ').map((item, idx) => (
                                    <p key={idx} className="text-sm text-muted-foreground">
                                      • {item}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Collected/Paid Invoices Section */}
                <div>
                  <h3 className="text-lg font-semibold text-green-700 mb-3 flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Collected Invoices
                  </h3>
                  <div className="space-y-3">
                    {(() => {
                      const filteredInvoices = financialReport.monthInvoices.filter(inv => inv.status === 'paid');

                      if (filteredInvoices.length === 0) {
                        return (
                          <p className="text-center text-muted-foreground py-4 bg-gray-50 rounded border border-dashed">
                            No collected invoices for this month
                          </p>
                        );
                      }

                      return filteredInvoices.map((invoice) => {
                        const child = children.find(c => c.id === invoice.childId);
                        return (
                          <div key={invoice.id} className="p-4 border-2 border-green-200 bg-green-50 rounded-lg space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-lg text-gray-900">
                                  {child?.firstName} {child?.lastName}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Invoice #{invoice.invoiceNumber}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Due: {formatLocalDate(invoice.dueDate)}
                                </p>
                                {invoice.paidDate && (
                                  <p className="text-sm font-medium text-green-700">
                                    Paid: {formatLocalDate(invoice.paidDate)}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-xl font-bold text-green-700">${invoice.amount.toFixed(2)}</div>
                                <Badge className="bg-green-600">
                                  PAID
                                </Badge>
                              </div>
                            </div>

                            {invoice.description && (
                              <div className="pt-2 border-t border-green-200">
                                <p className="text-sm font-semibold mb-1">Charges:</p>
                                <div className="space-y-1 ml-2">
                                  {invoice.description.split(', ').map((item, idx) => (
                                    <p key={idx} className="text-sm text-muted-foreground">
                                      • {item}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Overdue Invoices Section */}
                <div>
                  <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Overdue Invoices
                  </h3>
                  <div className="space-y-3">
                    {(() => {
                      const filteredInvoices = financialReport.monthInvoices.filter(inv => inv.status === 'overdue');

                      if (filteredInvoices.length === 0) {
                        return (
                          <p className="text-center text-muted-foreground py-4 bg-gray-50 rounded border border-dashed">
                            No overdue invoices for this month
                          </p>
                        );
                      }

                      return filteredInvoices.map((invoice) => {
                        const child = children.find(c => c.id === invoice.childId);
                        return (
                          <div key={invoice.id} className="p-4 border-2 border-blue-200 bg-blue-50 rounded-lg space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-lg text-gray-900">
                                  {child?.firstName} {child?.lastName}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Invoice #{invoice.invoiceNumber}
                                </p>
                                <p className="text-sm font-medium text-blue-800">
                                  Due: {formatLocalDate(invoice.dueDate)}
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="text-xl font-bold text-blue-800">${invoice.amount.toFixed(2)}</div>
                                <Badge className="bg-blue-700">
                                  OVERDUE
                                </Badge>
                              </div>
                            </div>

                            {invoice.description && (
                              <div className="pt-2 border-t border-blue-200">
                                <p className="text-sm font-semibold mb-1">Charges:</p>
                                <div className="space-y-1 ml-2">
                                  {invoice.description.split(', ').map((item, idx) => (
                                    <p key={idx} className="text-sm text-muted-foreground">
                                      • {item}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Year-End Financial Report */}
      {reportType === "financial" && isYearEndReport && yearEndFinancialReport && (
        <div className="space-y-4">
          {/* Year-End Header */}
          <Card className="border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-blue-700" />
                <div>
                  <h3 className="font-semibold text-lg">Year-End Financial Report - {selectedYear}</h3>
                  <p className="text-sm text-muted-foreground">Annual financial summary</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Year Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-900">Year Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">${yearEndFinancialReport.totalRevenue.toFixed(2)}</div>
                <p className="text-xs text-green-600">{yearEndFinancialReport.paidCount} paid invoices</p>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-900">Total Invoiced</CardTitle>
                <FileText className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">${yearEndFinancialReport.totalInvoiced.toFixed(2)}</div>
                <p className="text-xs text-blue-600">{yearEndFinancialReport.totalInvoices} total invoices</p>
              </CardContent>
            </Card>

            <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-yellow-900">Outstanding</CardTitle>
                <TrendingUp className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-700">
                  ${(yearEndFinancialReport.pendingAmount + yearEndFinancialReport.overdueAmount).toFixed(2)}
                </div>
                <p className="text-xs text-yellow-600">
                  {yearEndFinancialReport.pendingCount} pending, {yearEndFinancialReport.overdueCount} overdue
                </p>
              </CardContent>
            </Card>

            <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-900">Collection Rate</CardTitle>
                <BarChart3 className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-700">{yearEndFinancialReport.collectionRate}%</div>
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
                {yearEndFinancialReport.monthlyBreakdown.map((month, index) => {
                  const maxTotal = Math.max(...yearEndFinancialReport.monthlyBreakdown.map(m => m.total));

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
                {yearEndFinancialReport.revenueByChild.map((record) => (
                  <div key={record.child.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{record.child.firstName} {record.child.lastName}</p>
                      <p className="text-sm text-muted-foreground">{record.child.parentName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-green-700">${record.totalPaid.toFixed(2)} paid</p>
                      {record.totalPending > 0 && (
                        <p className="text-sm text-yellow-600">${record.totalPending.toFixed(2)} outstanding</p>
                      )}
                    </div>
                  </div>
                ))}
                {yearEndFinancialReport.revenueByChild.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No revenue data for this year
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {reportType === "enrollment" && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Enrolled</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{enrollmentReport.totalCount}</div>
                <p className="text-xs text-muted-foreground">All children</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{enrollmentReport.activeCount}</div>
                <p className="text-xs text-muted-foreground">Currently enrolled</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inactive</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">{enrollmentReport.inactiveCount}</div>
                <p className="text-xs text-muted-foreground">Not currently enrolled</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Age Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(enrollmentReport.ageGroups).map(([ageGroup, count]) => (
                  <div key={ageGroup} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{ageGroup} years old</p>
                    </div>
                    <Badge>{count} children</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}