import { useState, useEffect } from "react";
import { FileText, Plus, DollarSign, Calendar as CalendarIcon, Search, Check, X, Download, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { formatPhone } from "../../lib/formatPhone";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useData } from "../context/DataContext";
import type { Invoice } from "../context/DataContext";
import { toast } from "sonner";
import { parseLocalDate, formatLocalDate } from "../../utils/dateUtils";

export function Invoicing() {
  const { children, invoices, addInvoice, updateInvoice } = useData();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [selectedDescriptions, setSelectedDescriptions] = useState<string[]>([]);
  const [descriptionAmounts, setDescriptionAmounts] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    dueDate: "",
  });

  const descriptionOptions = [
    { category: "Tuition", items: ["Monthly Tuition", "Weekly Tuition", "Daily Tuition"] },
    { category: "Meal Plans", items: ["Breakfast Plan", "Lunch Plan", "Snack Plan", "Full Meal Plan"] },
    { category: "Fees", items: ["Registration Fee", "Late Fees", "Late Pickup Fee", "Early Drop-off Fee"] },
    { category: "Activities", items: ["Activity Fee", "Field Trip Fee", "Supply Fee", "Extended Care Fee"] }
  ];

  const filteredInvoices = invoices.filter(invoice => {
    const child = children.find(c => c.id === invoice.childId);
    const matchesSearch = child
      ? `${child.firstName} ${child.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
      : false;
    const matchesStatus = filterStatus === "all" || invoice.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedChildId || selectedDescriptions.length === 0) {
      toast.error("Please select a child and at least one charge");
      return;
    }

    const child = children.find(c => c.id === selectedChildId);

    // Calculate amount and description
    const invoiceAmount = selectedDescriptions.reduce((total, item) => {
      return total + parseFloat(descriptionAmounts[item] || '0');
    }, 0);

    const invoiceDescription = selectedDescriptions
      .map(item => `${item}: $${(parseFloat(descriptionAmounts[item] || '0')).toFixed(2)}`)
      .join(', ');

    addInvoice({
      childId: selectedChildId,
      amount: invoiceAmount,
      dueDate: formData.dueDate,
      description: invoiceDescription,
    });

    toast.success(`Invoice created for ${child?.firstName}: $${invoiceAmount.toFixed(2)}`);
    resetForm();
    setIsDialogOpen(false);
  };

  const resetForm = () => {
    setFormData({
      dueDate: "",
    });
    setSelectedChildId("");
    setSelectedDescriptions([]);
    setDescriptionAmounts({});
  };

  // Handle child selection - auto-populate recurring charges if available
  const handleChildSelect = (childId: string) => {
    setSelectedChildId(childId);

    const child = children.find(c => c.id === childId);
    if (child?.recurringCharges && child.recurringCharges.length > 0) {
      const descriptions = child.recurringCharges.map(c => c.description);
      const amounts: Record<string, string> = {};
      child.recurringCharges.forEach(c => {
        amounts[c.description] = c.amount.toString();
      });
      setSelectedDescriptions(descriptions);
      setDescriptionAmounts(amounts);
      toast.info(`Pre-filled ${descriptions.length} recurring charge(s) from child profile`);
    } else {
      setSelectedDescriptions([]);
      setDescriptionAmounts({});
    }
  };

  const handleDescriptionToggle = (item: string) => {
    setSelectedDescriptions(prev =>
      prev.includes(item)
        ? prev.filter(i => i !== item)
        : [...prev, item]
    );
  };

  const handleDescriptionAmountChange = (item: string, amount: string) => {
    setDescriptionAmounts(prev => ({
      ...prev,
      [item]: amount,
    }));
  };

  // Calculate total
  const getTotal = (): number => {
    return selectedDescriptions.reduce((total, item) => {
      return total + parseFloat(descriptionAmounts[item] || '0');
    }, 0);
  };

  // Export current draft charges to QB-importable Excel (one row per line item)
  const handleExportDraftToQB = () => {
    if (!selectedChildId || selectedDescriptions.length === 0) {
      toast.error("Please select a child and at least one charge first");
      return;
    }
    const child = children.find(c => c.id === selectedChildId);
    const customerName = child ? `${child.firstName} ${child.lastName} Family` : "Unknown";
    const invoiceDate = format(new Date(), "MM/dd/yyyy");
    const dueDateFmt = formData.dueDate
      ? format(parseLocalDate(formData.dueDate), "MM/dd/yyyy")
      : format(new Date(), "MM/dd/yyyy");
    const invoiceNo = `INV-${Date.now()}`;

    const rows = selectedDescriptions.map((item) => ({
      "*InvoiceNo": invoiceNo,
      "*Customer": customerName,
      "*InvoiceDate": invoiceDate,
      "*DueDate": dueDateFmt,
      "*ItemName": item,
      "ItemDescription": item,
      "*Qty": 1,
      "*Rate": parseFloat(descriptionAmounts[item] || "0"),
      "Amount": parseFloat(descriptionAmounts[item] || "0"),
      "*Tax": "NON",
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 18 }, { wch: 28 }, { wch: 14 }, { wch: 14 },
      { wch: 22 }, { wch: 28 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 8 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Invoices");
    XLSX.writeFile(wb, `qb-invoice-${customerName.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("QB Excel file exported — ready to import into QuickBooks");
  };

  // Export an existing saved invoice to QB-importable Excel (one row per line item)
  const handleExportInvoiceToQB = (invoice: Invoice) => {
    const child = children.find(c => c.id === invoice.childId);
    const customerName = child ? `${child.firstName} ${child.lastName} Family` : "Unknown";
    const invoiceDate = format(new Date(invoice.createdAt), "MM/dd/yyyy");
    const dueDateFmt = format(parseLocalDate(invoice.dueDate), "MM/dd/yyyy");

    // Parse "Monthly Tuition: $450.00, Lunch Plan: $80.00" into individual rows
    const lines = invoice.description
      ? invoice.description.split(", ").map((seg) => {
          const match = seg.match(/^(.+):\s*\$?([\d.]+)$/);
          if (match) return { item: match[1].trim(), amount: parseFloat(match[2]) };
          return { item: seg.trim(), amount: invoice.amount };
        })
      : [{ item: "Childcare Services", amount: invoice.amount }];

    const rows = lines.map((line) => ({
      "*InvoiceNo": invoice.invoiceNumber,
      "*Customer": customerName,
      "*InvoiceDate": invoiceDate,
      "*DueDate": dueDateFmt,
      "*ItemName": line.item,
      "ItemDescription": line.item,
      "*Qty": 1,
      "*Rate": line.amount,
      "Amount": line.amount,
      "*Tax": "NON",
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 18 }, { wch: 28 }, { wch: 14 }, { wch: 14 },
      { wch: 22 }, { wch: 28 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 8 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Invoices");
    XLSX.writeFile(wb, `qb-invoice-${invoice.invoiceNumber}-${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success(`QB Excel exported for Invoice #${invoice.invoiceNumber}`);
  };

  const handleMarkAsPaid = (invoiceId: string, invoiceNumber: string) => {
    updateInvoice(invoiceId, {
      status: 'paid',
      paidDate: new Date().toISOString().split('T')[0],
    });
    toast.success(`Invoice ${invoiceNumber} marked as paid`);
  };

  const handleMarkAsOverdue = (invoiceId: string, invoiceNumber: string) => {
    updateInvoice(invoiceId, { status: 'overdue' });
    toast.info(`Invoice ${invoiceNumber} marked as overdue`);
  };

  const handleDownloadPDF = (invoice: any) => {
    const child = children.find(c => c.id === invoice.childId);

    // Create a printable invoice window
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
            * {
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 40px auto;
              padding: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              border-bottom: 3px solid #dc2626;
              padding-bottom: 20px;
            }
            .header h1 {
              color: #dc2626;
              margin: 0;
              font-size: 28px;
            }
            .header p {
              color: #666;
              margin: 5px 0 0 0;
              font-size: 14px;
            }
            .invoice-details {
              display: table;
              width: 100%;
              margin-bottom: 30px;
            }
            .invoice-details > div {
              display: table-cell;
              width: 50%;
              padding: 5px;
            }
            .section {
              margin-bottom: 20px;
              word-wrap: break-word;
            }
            .section-title {
              font-weight: bold;
              color: #dc2626;
              margin-bottom: 5px;
              font-size: 14px;
            }
            .amount {
              font-size: 32px;
              font-weight: bold;
              color: #dc2626;
              margin: 20px 0;
            }
            .status {
              display: inline-block;
              padding: 5px 15px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: bold;
              text-transform: uppercase;
            }
            .status.paid {
              background-color: #22c55e;
              color: white;
            }
            .status.pending {
              background-color: #f59e0b;
              color: white;
            }
            .status.overdue {
              background-color: #dc2626;
              color: white;
            }
            .footer {
              margin-top: 60px;
              text-align: center;
              color: #666;
              font-size: 12px;
              border-top: 1px solid #ddd;
              padding-top: 20px;
            }
            @media print {
              body {
                margin: 0;
                padding: 15px;
                max-width: 100%;
              }
              .invoice-details {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>KidTrackerApp™</h1>
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
            <div style="color: #666; font-size: 14px;">${child?.parentName}</div>
            <div style="color: #666; font-size: 14px;">${child?.parentEmail}</div>
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

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
    toast.success('Invoice ready for download');
  };

  // Auto-mark pending invoices as overdue when past due date
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    invoices.forEach(invoice => {
      if (invoice.status === 'pending') {
        const dueDate = parseLocalDate(invoice.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        if (dueDate < today) {
          updateInvoice(invoice.id, { status: 'overdue' });
        }
      }
    });
  }, [invoices]);

  const activeChildren = children.filter(c => c.status === 'active');

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-700 to-blue-600 text-white rounded-lg p-6 shadow-lg">
        <h1 className="text-white">Invoicing</h1>
        <p className="text-blue-50">Create and manage invoices</p>
      </div>

      <div className="flex items-center justify-between">
        <div></div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-700 hover:bg-blue-800">
              <Plus className="mr-2 h-4 w-4" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
              <DialogDescription>
                Select a child and add charges for their invoice.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Select Child *</Label>
                <Select value={selectedChildId} onValueChange={handleChildSelect}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a child" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeChildren.map((child) => (
                      <SelectItem key={child.id} value={child.id}>
                        {child.firstName} {child.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      type="button"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.dueDate ? formatLocalDate(formData.dueDate, { year: 'numeric', month: 'long', day: 'numeric' }) : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.dueDate ? parseLocalDate(formData.dueDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          setFormData({ ...formData, dueDate: format(date, "yyyy-MM-dd") });
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Charges section */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Charges *</Label>
                  <span className="text-sm font-bold text-green-600">
                    Total: ${getTotal().toFixed(2)}
                  </span>
                </div>
                <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-4">
                  {descriptionOptions.map((category) => (
                    <div key={category.category} className="space-y-2">
                      <p className="font-medium text-sm text-blue-700">{category.category}</p>
                      <div className="space-y-2 pl-2">
                        {category.items.map((item) => (
                          <div key={item} className="flex items-center space-x-2">
                            <Checkbox
                              id={item}
                              checked={selectedDescriptions.includes(item)}
                              onCheckedChange={() => handleDescriptionToggle(item)}
                            />
                            <label
                              htmlFor={item}
                              className="text-sm font-normal leading-none cursor-pointer"
                            >
                              {item}
                            </label>
                            {selectedDescriptions.includes(item) && (
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={descriptionAmounts[item] || ''}
                                onChange={(e) => handleDescriptionAmountChange(item, e.target.value)}
                                placeholder="0.00"
                                className="ml-2 w-24"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {selectedDescriptions.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Selected: {selectedDescriptions.join(', ')}
                  </div>
                )}
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-green-500 text-green-700 hover:bg-green-50"
                  disabled={!selectedChildId || selectedDescriptions.length === 0}
                  onClick={handleExportDraftToQB}
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Export for QuickBooks
                </Button>
                <Button
                  type="submit"
                  disabled={!selectedChildId || !formData.dueDate || selectedDescriptions.length === 0}
                >
                  Create Invoice
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
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

      <div className="grid gap-4">
        {filteredInvoices.map((invoice) => {
          const child = children.find(c => c.id === invoice.childId);
          return (
            <Card key={invoice.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>Invoice #{invoice.invoiceNumber}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {child?.firstName} {child?.lastName}
                    </p>
                  </div>
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
                      <p className="font-medium">{formatLocalDate(invoice.dueDate)}</p>
                      {invoice.paidDate && (
                        <>
                          <p className="text-sm text-muted-foreground mt-2">Paid Date</p>
                          <p className="text-sm">{formatLocalDate(invoice.paidDate)}</p>
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

                  <div className="flex gap-2 pt-4 border-t">
                    {invoice.status !== 'paid' && (
                      <Button
                        size="sm"
                        onClick={() => handleMarkAsPaid(invoice.id, invoice.invoiceNumber)}
                      >
                        <Check className="mr-2 h-4 w-4" />
                        Mark as Paid
                      </Button>
                    )}
                    {invoice.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkAsOverdue(invoice.id, invoice.invoiceNumber)}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Overdue
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => handleDownloadPDF(invoice)}>
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-500 text-green-700 hover:bg-green-50"
                      onClick={() => handleExportInvoiceToQB(invoice)}
                    >
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Export to QB
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filteredInvoices.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No invoices found. Create your first invoice to get started.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
