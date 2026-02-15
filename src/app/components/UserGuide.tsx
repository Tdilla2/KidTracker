import { useState } from "react";
import { 
  BookOpen, 
  Download, 
  ChevronDown, 
  ChevronRight,
  Users,
  Baby,
  Calendar,
  DollarSign,
  FileText,
  Settings,
  Camera,
  Clock,
  School,
  UtensilsCrossed,
  CheckCircle
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { toast } from "sonner";
import jsPDF from "jspdf";

interface GuideSection {
  id: string;
  title: string;
  icon: any;
  content: {
    subtitle: string;
    steps: string[];
  }[];
}

export function UserGuide() {
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const toggleSection = (sectionId: string) => {
    if (expandedSections.includes(sectionId)) {
      setExpandedSections(expandedSections.filter(id => id !== sectionId));
    } else {
      setExpandedSections([...expandedSections, sectionId]);
    }
  };

  const downloadPDF = () => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const lineHeight = 7;
    let yPosition = margin;

    // Helper function to add text with word wrap
    const addText = (text: string, fontSize: number, isBold: boolean = false, indent: number = 0) => {
      pdf.setFontSize(fontSize);
      pdf.setFont("helvetica", isBold ? "bold" : "normal");
      
      const maxWidth = pageWidth - (2 * margin) - indent;
      const lines = pdf.splitTextToSize(text, maxWidth);
      
      lines.forEach((line: string) => {
        if (yPosition + lineHeight > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
        pdf.text(line, margin + indent, yPosition);
        yPosition += lineHeight;
      });
    };

    // Helper function to add spacing
    const addSpacing = (space: number) => {
      yPosition += space;
      if (yPosition > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }
    };

    // Cover Page
    pdf.setFillColor(65, 105, 225);
    pdf.rect(0, 0, pageWidth, 60, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(28);
    pdf.setFont("helvetica", "bold");
    pdf.text("KIDTRACKERAPP™", pageWidth / 2, 30, { align: 'center' });
    pdf.setFontSize(16);
    pdf.text("USER GUIDE", pageWidth / 2, 45, { align: 'center' });
    
    yPosition = 70;
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(12);
    pdf.text("Powered by GDI Digital Solutions", pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition = 100;
    pdf.setFontSize(10);
    pdf.text("Complete Daycare Management Solution", pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition = 120;
    pdf.setFontSize(9);
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    pdf.text(`Generated: ${currentDate}`, pageWidth / 2, yPosition, { align: 'center' });

    // TABLE OF CONTENTS
    pdf.addPage();
    yPosition = margin;
    
    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(65, 105, 225);
    pdf.text("TABLE OF CONTENTS", margin, yPosition);
    yPosition += 15;
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "normal");
    
    const tocItems = [
      "1. Getting Started",
      "2. Managing Children", 
      "3. Attendance Tracking",
      "4. Daily Activities & Photos",
      "5. Classrooms Management",
      "6. Financial Management",
      "7. Invoicing System",
      "8. Reports & Analytics",
      "9. Meal Menu Management",
      "10. Company Information",
      "11. User Management",
      "12. Parent Portal",
      "Tips & Best Practices",
      "Support Information"
    ];
    
    tocItems.forEach(item => {
      pdf.text(item, margin + 5, yPosition);
      yPosition += 8;
    });

    // SECTION 1: GETTING STARTED
    pdf.addPage();
    yPosition = margin;
    
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(65, 105, 225);
    pdf.text("1. GETTING STARTED", margin, yPosition);
    yPosition += 12;
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    addText("Welcome to KidTrackerApp™, your complete daycare management solution!", 10, false);
    addSpacing(5);
    
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    addText("Logging In", 12, true);
    addSpacing(3);
    
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    const loginSteps = [
      "Navigate to the login page",
      "Enter your username and password",
      "Click 'Sign In' to access the system",
      "Demo credentials are provided on the login screen"
    ];
    loginSteps.forEach((step, i) => {
      addText(`${i + 1}. ${step}`, 10, false, 5);
    });
    
    addSpacing(5);
    pdf.setFont("helvetica", "bold");
    addText("Dashboard Overview", 12, true);
    addSpacing(3);
    
    pdf.setFont("helvetica", "normal");
    const dashboardSteps = [
      "View key statistics at a glance",
      "See today's attendance overview",
      "Access quick action buttons",
      "Review financial summaries"
    ];
    dashboardSteps.forEach((step, i) => {
      addText(`${i + 1}. ${step}`, 10, false, 5);
    });

    // SECTION 2: MANAGING CHILDREN
    pdf.addPage();
    yPosition = margin;
    
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(65, 105, 225);
    pdf.text("2. MANAGING CHILDREN", margin, yPosition);
    yPosition += 12;
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    addText("Add and manage children enrolled in your daycare.", 10, false);
    addSpacing(5);
    
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    addText("Adding a New Child", 12, true);
    addSpacing(3);
    
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    const addChildSteps = [
      "Click 'Manage Children' from the navigation",
      "Click '+ Add Child' button",
      "Fill in required information (name, DOB, parent info, emergency contacts)",
      "Upload a child photo (optional but recommended)",
      "Select at least one recurring charge",
      "Assign to a classroom",
      "Click 'Add Child' to save"
    ];
    addChildSteps.forEach((step, i) => {
      addText(`${i + 1}. ${step}`, 10, false, 5);
    });
    
    addSpacing(5);
    pdf.setFont("helvetica", "bold");
    addText("Editing Child Information", 12, true);
    addSpacing(3);
    
    pdf.setFont("helvetica", "normal");
    const editChildSteps = [
      "Find the child in the list",
      "Click the 'Edit' button",
      "Update any necessary information",
      "Click 'Update Child' to save changes"
    ];
    editChildSteps.forEach((step, i) => {
      addText(`${i + 1}. ${step}`, 10, false, 5);
    });

    addSpacing(5);
    pdf.setFont("helvetica", "bold");
    addText("Viewing Child Details", 12, true);
    addSpacing(3);
    
    pdf.setFont("helvetica", "normal");
    const viewChildDetails = [
      "Profile includes photo, basic info, and medical notes",
      "See assigned classroom",
      "View recurring charges",
      "Check emergency contacts and authorized pickups"
    ];
    viewChildDetails.forEach(detail => {
      addText(`• ${detail}`, 10, false, 5);
    });

    // SECTION 3: ATTENDANCE TRACKING
    pdf.addPage();
    yPosition = margin;
    
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(65, 105, 225);
    pdf.text("3. ATTENDANCE TRACKING", margin, yPosition);
    yPosition += 12;
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    addText("Track daily check-ins and check-outs for all children.", 10, false);
    addSpacing(5);
    
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    addText("Recording Attendance", 12, true);
    addSpacing(3);
    
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    const recordAttendanceSteps = [
      "Go to 'Attendance' from the navigation",
      "Select the date (defaults to today)",
      "Mark each child as 'Present' or 'Absent'",
      "Enter check-in time for present children",
      "Enter check-out time when child leaves",
      "Changes are saved automatically"
    ];
    recordAttendanceSteps.forEach((step, i) => {
      addText(`${i + 1}. ${step}`, 10, false, 5);
    });
    
    addSpacing(5);
    pdf.setFont("helvetica", "bold");
    addText("Viewing Attendance History", 12, true);
    addSpacing(3);
    
    pdf.setFont("helvetica", "normal");
    const viewAttendanceSteps = [
      "Use the calendar to select any date",
      "Filter by status (All, Present, Absent)",
      "View check-in/check-out times",
      "Export attendance data"
    ];
    viewAttendanceSteps.forEach((step, i) => {
      addText(`${i + 1}. ${step}`, 10, false, 5);
    });

    addSpacing(5);
    pdf.setFont("helvetica", "bold");
    addText("Today's Attendance Overview", 12, true);
    addSpacing(3);
    
    pdf.setFont("helvetica", "normal");
    const todayOverview = [
      "Dashboard shows real-time attendance statistics",
      "See total present/absent counts",
      "View children currently checked in"
    ];
    todayOverview.forEach(item => {
      addText(`• ${item}`, 10, false, 5);
    });

    // SECTION 4: DAILY ACTIVITIES & PHOTOS
    pdf.addPage();
    yPosition = margin;
    
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(65, 105, 225);
    pdf.text("4. DAILY ACTIVITIES & PHOTOS", margin, yPosition);
    yPosition += 12;
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    addText("Track and document children's daily activities.", 10, false);
    addSpacing(5);
    
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    addText("Recording Activities", 12, true);
    addSpacing(3);
    
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    const recordActivitiesSteps = [
      "Navigate to 'Activities' tab",
      "Select the child and date",
      "Add bathroom times by clicking '+ Add Time'",
      "Record nap times (start and end)",
      "Set mood/behavior (happy, sad, cranky, energetic, calm)",
      "Add teacher notes about the day",
      "All changes save automatically"
    ];
    recordActivitiesSteps.forEach((step, i) => {
      addText(`${i + 1}. ${step}`, 10, false, 5);
    });
    
    addSpacing(5);
    pdf.setFont("helvetica", "bold");
    addText("Uploading Activity Photos", 12, true);
    addSpacing(3);
    
    pdf.setFont("helvetica", "normal");
    const uploadPhotosSteps = [
      "Go to 'Attendance' screen",
      "Scroll to 'Daily Activity Photos' section",
      "Click 'Upload Photo' for a child",
      "Select image from your computer",
      "Add optional caption",
      "Photo appears in child's gallery and parent portal"
    ];
    uploadPhotosSteps.forEach((step, i) => {
      addText(`${i + 1}. ${step}`, 10, false, 5);
    });

    addSpacing(5);
    pdf.setFont("helvetica", "bold");
    addText("Managing Photos", 12, true);
    addSpacing(3);
    
    pdf.setFont("helvetica", "normal");
    const managePhotos = [
      "Photos display in a grid layout",
      "Hover to see captions and dates",
      "Click trash icon to delete photos",
      "Parents see photos in their portal"
    ];
    managePhotos.forEach(item => {
      addText(`• ${item}`, 10, false, 5);
    });

    // SECTION 5: CLASSROOMS MANAGEMENT
    pdf.addPage();
    yPosition = margin;
    
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(65, 105, 225);
    pdf.text("5. CLASSROOMS MANAGEMENT", margin, yPosition);
    yPosition += 12;
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    addText("Organize children into classrooms with assigned teachers.", 10, false);
    addSpacing(5);
    
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    addText("Creating a Classroom", 12, true);
    addSpacing(3);
    
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    const createClassroomSteps = [
      "Navigate to 'Classrooms' tab",
      "Click '+ Add Classroom'",
      "Enter classroom name",
      "Set age range (min and max age)",
      "Set capacity limit",
      "Assign teacher(s)",
      "Click 'Add Classroom'"
    ];
    createClassroomSteps.forEach((step, i) => {
      addText(`${i + 1}. ${step}`, 10, false, 5);
    });
    
    addSpacing(5);
    pdf.setFont("helvetica", "bold");
    addText("Assigning Children", 12, true);
    addSpacing(3);
    
    pdf.setFont("helvetica", "normal");
    const assignChildren = [
      "Children are assigned through 'Manage Children'",
      "Edit child profile and select classroom",
      "View classroom roster in Classrooms tab"
    ];
    assignChildren.forEach(item => {
      addText(`• ${item}`, 10, false, 5);
    });

    addSpacing(5);
    pdf.setFont("helvetica", "bold");
    addText("Monitoring Capacity", 12, true);
    addSpacing(3);
    
    pdf.setFont("helvetica", "normal");
    const monitorCapacity = [
      "Each classroom shows current/max capacity",
      "Color-coded capacity indicators",
      "Age range clearly displayed"
    ];
    monitorCapacity.forEach(item => {
      addText(`• ${item}`, 10, false, 5);
    });

    // SECTION 6: FINANCIAL MANAGEMENT
    pdf.addPage();
    yPosition = margin;
    
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(65, 105, 225);
    pdf.text("6. FINANCIAL MANAGEMENT", margin, yPosition);
    yPosition += 12;
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    addText("Monitor revenue, expenses, and financial health.", 10, false);
    addSpacing(5);
    
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    addText("Viewing Financial Overview", 12, true);
    addSpacing(3);
    
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    const financialOverviewSteps = [
      "Go to 'Financial' from navigation",
      "View Total Revenue (this month, based on paid date)",
      "Monitor Total Expenses",
      "Check Net Income and Pending Payments",
      "Review month-over-month trends"
    ];
    financialOverviewSteps.forEach((step, i) => {
      addText(`${i + 1}. ${step}`, 10, false, 5);
    });
    
    addSpacing(5);
    pdf.setFont("helvetica", "bold");
    addText("Tracking Revenue", 12, true);
    addSpacing(3);
    
    pdf.setFont("helvetica", "normal");
    const trackRevenue = [
      "Revenue by month chart",
      "Revenue by child breakdown",
      "Payment status overview",
      "Export financial reports"
    ];
    trackRevenue.forEach(item => {
      addText(`• ${item}`, 10, false, 5);
    });

    addSpacing(5);
    pdf.setFont("helvetica", "bold");
    addText("Managing Expenses", 12, true);
    addSpacing(3);
    
    pdf.setFont("helvetica", "normal");
    const manageExpensesSteps = [
      "Click '+ Add Expense'",
      "Enter amount, category, and description",
      "Select date",
      "Click 'Add Expense'",
      "View expenses by category"
    ];
    manageExpensesSteps.forEach((step, i) => {
      addText(`${i + 1}. ${step}`, 10, false, 5);
    });

    // SECTION 7: INVOICING SYSTEM
    pdf.addPage();
    yPosition = margin;
    
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(65, 105, 225);
    pdf.text("7. INVOICING SYSTEM", margin, yPosition);
    yPosition += 12;
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    addText("Create and manage invoices with automatic recurring charges.", 10, false);
    addSpacing(5);
    
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    addText("Creating a Single Invoice", 12, true);
    addSpacing(3);
    
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    const createInvoiceSteps = [
      "Navigate to 'Invoicing'",
      "Click '+ Create Invoice'",
      "Select child from dropdown",
      "Choose invoice date",
      "Add line items (recurring charges auto-populate)",
      "Add custom items as needed",
      "Set due date",
      "Click 'Create Invoice'"
    ];
    createInvoiceSteps.forEach((step, i) => {
      addText(`${i + 1}. ${step}`, 10, false, 5);
    });
    
    addSpacing(5);
    pdf.setFont("helvetica", "bold");
    addText("Creating Multi-Child Invoices", 12, true);
    addSpacing(3);
    
    pdf.setFont("helvetica", "normal");
    const multiInvoiceSteps = [
      "Click 'Create Multi-Child Invoice'",
      "Select invoice date",
      "Check boxes for children to invoice",
      "Recurring charges auto-fill for all selected",
      "Add additional items if needed",
      "Review totals",
      "Click 'Create Invoices'"
    ];
    multiInvoiceSteps.forEach((step, i) => {
      addText(`${i + 1}. ${step}`, 10, false, 5);
    });

    addSpacing(5);
    pdf.setFont("helvetica", "bold");
    addText("Managing Invoices", 12, true);
    addSpacing(3);
    
    pdf.setFont("helvetica", "normal");
    const manageInvoices = [
      "Filter by status (All, Pending, Paid, Overdue)",
      "Search by child or invoice number",
      "Mark invoices as paid",
      "View payment history",
      "System auto-carries forward unpaid recurring charges"
    ];
    manageInvoices.forEach(item => {
      addText(`• ${item}`, 10, false, 5);
    });

    addSpacing(5);
    pdf.setFont("helvetica", "bold");
    addText("Invoice Features", 12, true);
    addSpacing(3);
    
    pdf.setFont("helvetica", "normal");
    const invoiceFeatures = [
      "Auto-generated invoice numbers",
      "Recurring charges from child profiles",
      "Custom line items",
      "Due date tracking",
      "Payment date recording",
      "Status indicators (Pending, Paid, Overdue)"
    ];
    invoiceFeatures.forEach(item => {
      addText(`• ${item}`, 10, false, 5);
    });

    // SECTION 8: REPORTS & ANALYTICS
    pdf.addPage();
    yPosition = margin;
    
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(65, 105, 225);
    pdf.text("8. REPORTS & ANALYTICS", margin, yPosition);
    yPosition += 12;
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    addText("Generate detailed reports for attendance and financials.", 10, false);
    addSpacing(5);
    
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    addText("Attendance Reports", 12, true);
    addSpacing(3);
    
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    const attendanceReportsSteps = [
      "Go to 'Reports' section",
      "Select 'Attendance Report'",
      "Choose date range",
      "Select children (or all)",
      "Click 'Generate Report'",
      "Export to PDF or CSV"
    ];
    attendanceReportsSteps.forEach((step, i) => {
      addText(`${i + 1}. ${step}`, 10, false, 5);
    });
    
    addSpacing(5);
    pdf.setFont("helvetica", "bold");
    addText("Financial Reports", 12, true);
    addSpacing(3);
    
    pdf.setFont("helvetica", "normal");
    const financialReportsSteps = [
      "Select 'Financial Report'",
      "Choose month/year or date range",
      "Select report type (Revenue Summary, Expense Breakdown, Income Statement)",
      "Generate and export"
    ];
    financialReportsSteps.forEach((step, i) => {
      addText(`${i + 1}. ${step}`, 10, false, 5);
    });

    addSpacing(5);
    pdf.setFont("helvetica", "bold");
    addText("Report Features", 12, true);
    addSpacing(3);
    
    pdf.setFont("helvetica", "normal");
    const reportFeatures = [
      "Customizable date ranges",
      "Filter by child, classroom, or category",
      "Visual charts and graphs",
      "Export options (PDF, CSV, Excel)",
      "Print-friendly formats"
    ];
    reportFeatures.forEach(item => {
      addText(`• ${item}`, 10, false, 5);
    });

    // SECTION 9: MEAL MENU MANAGEMENT
    pdf.addPage();
    yPosition = margin;
    
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(65, 105, 225);
    pdf.text("9. MEAL MENU MANAGEMENT", margin, yPosition);
    yPosition += 12;
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    addText("Plan and manage daily meal menus (Regular Users & Admins).", 10, false);
    addSpacing(5);
    
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    addText("Creating Weekly Menu", 12, true);
    addSpacing(3);
    
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    const menuSteps = [
      "Navigate to 'Meal Menu'",
      "Select week and day",
      "Add meals for Breakfast, Morning Snack, Lunch, Afternoon Snack",
      "Click 'Save Menu'"
    ];
    menuSteps.forEach((step, i) => {
      addText(`${i + 1}. ${step}`, 10, false, 5);
    });
    
    addSpacing(5);
    pdf.setFont("helvetica", "bold");
    addText("Editing Menus", 12, true);
    addSpacing(3);
    
    pdf.setFont("helvetica", "normal");
    const editMenus = [
      "Click on any meal field to edit",
      "Changes save automatically",
      "Copy previous week's menu",
      "Print weekly menu"
    ];
    editMenus.forEach(item => {
      addText(`• ${item}`, 10, false, 5);
    });

    // SECTION 10: COMPANY INFORMATION
    pdf.addPage();
    yPosition = margin;
    
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(65, 105, 225);
    pdf.text("10. COMPANY INFORMATION", margin, yPosition);
    yPosition += 12;
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    addText("Manage your daycare center's information and settings (Admin only).", 10, false);
    addSpacing(5);
    
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    addText("Updating Company Details", 12, true);
    addSpacing(3);
    
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    const companySteps = [
      "Navigate to 'Company Info'",
      "Edit business information (name, address, phone, email)",
      "Update operating hours and license information",
      "Upload company logo for branding",
      "ZIP code validation ensures correct format",
      "Click 'Save Changes'"
    ];
    companySteps.forEach((step, i) => {
      addText(`${i + 1}. ${step}`, 10, false, 5);
    });
    
    addSpacing(5);
    pdf.setFont("helvetica", "bold");
    addText("Logo Management", 12, true);
    addSpacing(3);
    
    pdf.setFont("helvetica", "normal");
    const logoManagement = [
      "Upload company logo for branding",
      "Logo appears in header across all screens",
      "Recommended size: 200x200px"
    ];
    logoManagement.forEach(item => {
      addText(`• ${item}`, 10, false, 5);
    });

    // SECTION 11: USER MANAGEMENT
    pdf.addPage();
    yPosition = margin;
    
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(65, 105, 225);
    pdf.text("11. USER MANAGEMENT", margin, yPosition);
    yPosition += 12;
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    addText("Create and manage staff and parent accounts (Admin only).", 10, false);
    addSpacing(5);
    
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    addText("Adding Users", 12, true);
    addSpacing(3);
    
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    const addUserSteps = [
      "Go to 'Manage Users'",
      "Click '+ Add User'",
      "Enter details (name, username, email, password, role)",
      "For parent accounts: system auto-generates mobile app code",
      "Click 'Create User'"
    ];
    addUserSteps.forEach((step, i) => {
      addText(`${i + 1}. ${step}`, 10, false, 5);
    });
    
    addSpacing(5);
    pdf.setFont("helvetica", "bold");
    addText("User Roles", 12, true);
    addSpacing(3);
    
    pdf.setFont("helvetica", "normal");
    const userRoles = [
      "Admin: Full system access",
      "User: Attendance, invoicing, meal menu, activities",
      "Parent: View-only portal for their children",
      "Parents log in with username/password (web) or mobile code (mobile app)"
    ];
    userRoles.forEach(item => {
      addText(`• ${item}`, 10, false, 5);
    });

    addSpacing(5);
    pdf.setFont("helvetica", "bold");
    addText("Parent Account Features", 12, true);
    addSpacing(3);
    
    pdf.setFont("helvetica", "normal");
    const parentFeatures = [
      "System generates unique 8-character mobile app code",
      "Link parents to children via child profiles",
      "Parents see code in their portal with copy button",
      "Mobile app code is for mobile app access only"
    ];
    parentFeatures.forEach(item => {
      addText(`• ${item}`, 10, false, 5);
    });

    addSpacing(5);
    pdf.setFont("helvetica", "bold");
    addText("Managing Users", 12, true);
    addSpacing(3);
    
    pdf.setFont("helvetica", "normal");
    const manageUsers = [
      "Edit user information",
      "Reset passwords",
      "Deactivate accounts",
      "View last login times",
      "Copy parent mobile app codes"
    ];
    manageUsers.forEach(item => {
      addText(`• ${item}`, 10, false, 5);
    });

    // SECTION 12: PARENT PORTAL
    pdf.addPage();
    yPosition = margin;
    
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(65, 105, 225);
    pdf.text("12. PARENT PORTAL", margin, yPosition);
    yPosition += 12;
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    addText("Parents have dedicated portal access to view their child's information.", 10, false);
    addSpacing(5);
    
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    addText("Parent Portal Features", 12, true);
    addSpacing(3);
    
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    const parentPortalFeatures = [
      "View mobile app access code with copy button",
      "See all linked children with photos",
      "Track attendance history by month",
      "View daily activities (bathroom, naps, mood, teacher notes)",
      "Browse activity photos from last 30 days",
      "Review invoices and payment status",
      "Check classroom assignments"
    ];
    parentPortalFeatures.forEach(item => {
      addText(`• ${item}`, 10, false, 5);
    });
    
    addSpacing(5);
    pdf.setFont("helvetica", "bold");
    addText("Linking Children to Parents", 12, true);
    addSpacing(3);
    
    pdf.setFont("helvetica", "normal");
    const linkingSteps = [
      "Admin creates parent user account",
      "Admin edits child profile",
      "Select parent from 'Link to Parent' dropdown",
      "Save changes",
      "Parent can now see child in their portal"
    ];
    linkingSteps.forEach((step, i) => {
      addText(`${i + 1}. ${step}`, 10, false, 5);
    });

    addSpacing(5);
    pdf.setFont("helvetica", "bold");
    addText("Mobile App Access", 12, true);
    addSpacing(3);
    
    pdf.setFont("helvetica", "normal");
    const mobileAccess = [
      "Parents receive unique 8-character code",
      "Code displayed prominently in parent portal",
      "Copy code with one click",
      "Use code to log into mobile app"
    ];
    mobileAccess.forEach(item => {
      addText(`• ${item}`, 10, false, 5);
    });

    // TIPS & BEST PRACTICES
    pdf.addPage();
    yPosition = margin;
    
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(34, 197, 94);
    pdf.text("TIPS & BEST PRACTICES", margin, yPosition);
    yPosition += 12;
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    
    const tips = [
      "Regularly back up your data",
      "Update child information when changes occur",
      "Record attendance daily for accurate tracking",
      "Create invoices at the beginning of each month",
      "Review financial reports monthly",
      "Keep emergency contacts up to date",
      "Upload activity photos to engage parents",
      "Use teacher notes to communicate with parents",
      "Assign children to appropriate classrooms",
      "Monitor classroom capacity limits"
    ];
    
    tips.forEach(tip => {
      addText(`• ${tip}`, 10, false, 5);
    });

    // SUPPORT INFORMATION
    pdf.addPage();
    yPosition = margin;
    
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(147, 51, 234);
    pdf.text("SUPPORT INFORMATION", margin, yPosition);
    yPosition += 12;
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    addText("For technical support or questions:", 10, false);
    addSpacing(5);
    
    addText("Contact: GDI Digital Solutions", 10, false, 5);
    addText("Email: support@gdidigital.com", 10, false, 5);
    addText("Phone: 1-800-KID-TRACK", 10, false, 5);
    
    addSpacing(10);
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    addText(`© ${new Date().getFullYear()} GDI Digital Solutions. All rights reserved.`, 9, false);
    addText("KidTrackerApp™ - Complete Daycare Management Solution", 9, false);

    // Save the PDF
    pdf.save('kidtrackerapp-user-guide.pdf');
    toast.success("User guide PDF downloaded successfully!");
  };

  const guideSections: GuideSection[] = [
    {
      id: "getting-started",
      title: "Getting Started",
      icon: BookOpen,
      content: [
        {
          subtitle: "Logging In",
          steps: [
            "Navigate to the login page",
            "Enter your username and password",
            "Click 'Sign In' to access the system",
            "Demo credentials are provided on the login screen"
          ]
        },
        {
          subtitle: "Dashboard Overview",
          steps: [
            "View key statistics at a glance",
            "See today's attendance overview",
            "Access quick action buttons",
            "Review financial summaries"
          ]
        }
      ]
    },
    {
      id: "children",
      title: "Managing Children",
      icon: Baby,
      content: [
        {
          subtitle: "Adding a New Child",
          steps: [
            "Click 'Manage Children' from the navigation",
            "Click '+ Add Child' button",
            "Fill in required information (name, DOB, parent info, emergency contacts)",
            "Upload a child photo (optional but recommended)",
            "Select at least one recurring charge",
            "Assign to a classroom",
            "Click 'Add Child' to save"
          ]
        },
        {
          subtitle: "Editing Child Information",
          steps: [
            "Find the child in the list",
            "Click the 'Edit' button",
            "Update any necessary information",
            "Click 'Update Child' to save changes"
          ]
        }
      ]
    },
    {
      id: "attendance",
      title: "Attendance Tracking",
      icon: Calendar,
      content: [
        {
          subtitle: "Recording Attendance",
          steps: [
            "Go to 'Attendance' from the navigation",
            "Select the date (defaults to today)",
            "Mark each child as 'Present' or 'Absent'",
            "Enter check-in time for present children",
            "Enter check-out time when child leaves",
            "Changes are saved automatically"
          ]
        },
        {
          subtitle: "Viewing Attendance History",
          steps: [
            "Use the calendar to select any date",
            "Filter by status (All, Present, Absent)",
            "View check-in/check-out times",
            "Export attendance data"
          ]
        }
      ]
    },
    {
      id: "activities",
      title: "Daily Activities & Photos",
      icon: Camera,
      content: [
        {
          subtitle: "Recording Daily Activities",
          steps: [
            "Navigate to 'Activities' tab",
            "Select the child and date",
            "Add bathroom times by clicking '+ Add Time'",
            "Record nap times (start and end)",
            "Set mood/behavior (happy, sad, cranky, energetic, calm)",
            "Add teacher notes about the day",
            "All changes save automatically"
          ]
        },
        {
          subtitle: "Uploading Activity Photos",
          steps: [
            "Go to 'Attendance' screen",
            "Scroll to 'Daily Activity Photos' section",
            "Click 'Upload Photo' for a child",
            "Select image and add optional caption",
            "Photo appears in gallery and parent portal"
          ]
        }
      ]
    },
    {
      id: "classrooms",
      title: "Classrooms Management",
      icon: School,
      content: [
        {
          subtitle: "Creating a Classroom",
          steps: [
            "Navigate to 'Classrooms' tab",
            "Click '+ Add Classroom'",
            "Enter classroom name",
            "Set age range (min and max age)",
            "Set capacity limit",
            "Assign teacher(s)",
            "Click 'Add Classroom'"
          ]
        },
        {
          subtitle: "Assigning Children",
          steps: [
            "Children are assigned through 'Manage Children'",
            "Edit child profile and select classroom",
            "View classroom roster in Classrooms tab",
            "Monitor capacity indicators"
          ]
        }
      ]
    },
    {
      id: "financial",
      title: "Financial Management",
      icon: DollarSign,
      content: [
        {
          subtitle: "Viewing Financial Overview",
          steps: [
            "Go to 'Financial' from navigation",
            "View Total Revenue (this month, based on paid date)",
            "Monitor Total Expenses",
            "Check Net Income and Pending Payments",
            "Review month-over-month trends"
          ]
        },
        {
          subtitle: "Managing Expenses",
          steps: [
            "Click '+ Add Expense'",
            "Enter amount, category, and description",
            "Select date",
            "Click 'Add Expense'",
            "View expenses by category"
          ]
        }
      ]
    },
    {
      id: "invoicing",
      title: "Invoicing System",
      icon: FileText,
      content: [
        {
          subtitle: "Creating Invoices",
          steps: [
            "Navigate to 'Invoicing'",
            "Click '+ Create Invoice' (single) or 'Create Multi-Child Invoice'",
            "Select child(ren) and invoice date",
            "Recurring charges auto-populate from child profiles",
            "Add custom line items as needed",
            "Set due date and create invoice"
          ]
        },
        {
          subtitle: "Managing Invoices",
          steps: [
            "Filter by status (All, Pending, Paid, Overdue)",
            "Search by child or invoice number",
            "Mark invoices as paid with payment date",
            "System auto-carries forward unpaid recurring charges",
            "Export invoice reports"
          ]
        }
      ]
    },
    {
      id: "meal-menu",
      title: "Meal Menu Management",
      icon: UtensilsCrossed,
      content: [
        {
          subtitle: "Creating Weekly Menu",
          steps: [
            "Navigate to 'Meal Menu' (Regular Users & Admins)",
            "Select week and day",
            "Add meals for Breakfast, Morning Snack, Lunch, Afternoon Snack",
            "Click 'Save Menu'",
            "Copy previous week's menu or print weekly menu"
          ]
        }
      ]
    },
    {
      id: "users",
      title: "User Management",
      icon: Users,
      content: [
        {
          subtitle: "Adding Users (Admin Only)",
          steps: [
            "Go to 'Manage Users'",
            "Click '+ Add User'",
            "Enter details (name, username, email, password, role)",
            "For parent accounts: system auto-generates mobile app code",
            "Click 'Create User'"
          ]
        },
        {
          subtitle: "User Roles",
          steps: [
            "Admin: Full system access",
            "User: Attendance, invoicing, meal menu, activities",
            "Parent: View-only portal for their children",
            "Parents log in with username/password (web portal) or mobile app code (mobile app)"
          ]
        },
        {
          subtitle: "Parent Account Features",
          steps: [
            "System generates unique 8-character mobile app code",
            "Link parents to children via child profiles",
            "Parents see code in their portal with copy button",
            "Mobile app code is for mobile app access only"
          ]
        }
      ]
    },
    {
      id: "parent-portal",
      title: "Parent Portal",
      icon: Users,
      content: [
        {
          subtitle: "Parent Portal Features",
          steps: [
            "View mobile app access code with copy button",
            "See all linked children with photos",
            "Track attendance history by month",
            "View daily activities (bathroom, naps, mood, teacher notes)",
            "Browse activity photos from last 30 days",
            "Review invoices and payment status",
            "Check classroom assignments"
          ]
        },
        {
          subtitle: "Linking Children to Parents",
          steps: [
            "Admin creates parent user account",
            "Admin edits child profile",
            "Select parent from 'Link to Parent' dropdown",
            "Save changes",
            "Parent can now see child in their portal"
          ]
        }
      ]
    },
    {
      id: "company-info",
      title: "Company Information",
      icon: Settings,
      content: [
        {
          subtitle: "Updating Company Details (Admin Only)",
          steps: [
            "Navigate to 'Company Info'",
            "Edit business information (name, address, phone, email)",
            "Update operating hours and license information",
            "Upload company logo for branding",
            "ZIP code validation ensures correct format",
            "Click 'Save Changes'"
          ]
        }
      ]
    }
  ];

  return (
    <Card className="border-2 border-blue-200">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-600">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl">How to Use KidTrackerApp™</CardTitle>
              <CardDescription>Complete guide to managing your daycare center</CardDescription>
            </div>
          </div>
          <Button 
            onClick={downloadPDF}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            <Download className="mr-2 h-4 w-4" />
            Download PDF Guide
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-3">
          {guideSections.map((section) => {
            const isExpanded = expandedSections.includes(section.id);
            const Icon = section.icon;

            return (
              <div key={section.id} className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold text-left">{section.title}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  )}
                </button>

                {isExpanded && (
                  <div className="p-4 bg-white border-t space-y-4">
                    {section.content.map((item, index) => (
                      <div key={index}>
                        <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                          {item.subtitle}
                        </h4>
                        <ol className="space-y-2 ml-6">
                          {item.steps.map((step, stepIndex) => (
                            <li key={stepIndex} className="text-sm text-gray-700 flex gap-2">
                              <span className="text-blue-600 font-medium min-w-[20px]">
                                {stepIndex + 1}.
                              </span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Tips Section */}
        <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-600">
              <CheckCircle className="h-4 w-4 text-white" />
            </div>
            <h3 className="font-semibold text-green-900">Tips & Best Practices</h3>
          </div>
          <ul className="space-y-1.5 ml-10 text-sm text-green-800">
            <li>• Regularly back up your data</li>
            <li>• Update child information when changes occur</li>
            <li>• Record attendance daily for accurate tracking</li>
            <li>• Create invoices at the beginning of each month</li>
            <li>• Upload activity photos to engage parents</li>
            <li>• Keep emergency contacts up to date</li>
            <li>• Monitor classroom capacity limits</li>
          </ul>
        </div>

        {/* Support Section */}
        <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-600">
              <Users className="h-4 w-4 text-white" />
            </div>
            <h3 className="font-semibold text-purple-900">Support</h3>
          </div>
          <div className="ml-10 text-sm text-purple-800 space-y-1">
            <p>For technical support or questions:</p>
            <p>• Email: support@gdidigital.com</p>
            <p>• Phone: 1-800-KID-TRACK</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-gray-500 border-t pt-4">
          <p>© {new Date().getFullYear()} GDI Digital Solutions. All rights reserved.</p>
          <p className="mt-1">KidTrackerApp™ - Complete Daycare Management Solution</p>
        </div>
      </CardContent>
    </Card>
  );
}
