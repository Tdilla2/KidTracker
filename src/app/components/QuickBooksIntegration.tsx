import { useState, useEffect } from "react";
import { RefreshCw, Check, X, Download, Upload, Settings, Calendar, DollarSign, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useData } from "../context/DataContext";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface QuickBooksConnection {
  isConnected: boolean;
  companyName: string;
  lastSync: Date | null;
  accountId: string;
}

interface SyncHistory {
  id: string;
  timestamp: Date;
  type: "invoice" | "payment" | "customer";
  status: "success" | "failed" | "partial";
  itemsProcessed: number;
  message: string;
}

export function QuickBooksIntegration() {
  const { invoices, children } = useData();
  const [connection, setConnection] = useState<QuickBooksConnection>(() => {
    const saved = localStorage.getItem("quickbooks-connection");
    return saved ? JSON.parse(saved) : {
      isConnected: false,
      companyName: "",
      lastSync: null,
      accountId: ""
    };
  });

  const [syncHistory, setSyncHistory] = useState<SyncHistory[]>(() => {
    const saved = localStorage.getItem("quickbooks-sync-history");
    return saved ? JSON.parse(saved, (key, value) => {
      if (key === 'timestamp') return new Date(value);
      return value;
    }) : [];
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [accountId, setAccountId] = useState("");
  const [syncSettings, setSyncSettings] = useState({
    autoSync: false,
    syncInterval: "daily",
    syncInvoices: true,
    syncPayments: true,
    syncCustomers: true,
  });

  useEffect(() => {
    localStorage.setItem("quickbooks-connection", JSON.stringify(connection));
  }, [connection]);

  useEffect(() => {
    localStorage.setItem("quickbooks-sync-history", JSON.stringify(syncHistory));
  }, [syncHistory]);

  const handleConnect = () => {
    if (!companyName || !accountId) {
      toast.error("Please fill in all fields");
      return;
    }

    // Simulate connection
    setTimeout(() => {
      setConnection({
        isConnected: true,
        companyName,
        lastSync: null,
        accountId
      });
      setShowConnectionDialog(false);
      toast.success(`Successfully connected to QuickBooks - ${companyName}`);
      
      // Add connection to history
      const newHistory: SyncHistory = {
        id: Date.now().toString(),
        timestamp: new Date(),
        type: "customer",
        status: "success",
        itemsProcessed: 1,
        message: "Connected to QuickBooks"
      };
      setSyncHistory(prev => [newHistory, ...prev]);
    }, 1500);
  };

  const handleDisconnect = () => {
    setConnection({
      isConnected: false,
      companyName: "",
      lastSync: null,
      accountId: ""
    });
    toast.info("Disconnected from QuickBooks");
  };

  const handleSync = async (type: "all" | "invoices" | "payments" | "customers") => {
    setIsSyncing(true);
    
    // Simulate sync delay
    setTimeout(() => {
      const newHistory: SyncHistory[] = [];

      if (type === "all" || type === "invoices") {
        newHistory.push({
          id: `${Date.now()}-invoices`,
          timestamp: new Date(),
          type: "invoice",
          status: "success",
          itemsProcessed: invoices.length,
          message: `Synced ${invoices.length} invoices to QuickBooks`
        });
      }

      if (type === "all" || type === "payments") {
        const paidInvoices = invoices.filter(inv => inv.status === "paid").length;
        newHistory.push({
          id: `${Date.now()}-payments`,
          timestamp: new Date(),
          type: "payment",
          status: "success",
          itemsProcessed: paidInvoices,
          message: `Synced ${paidInvoices} payments to QuickBooks`
        });
      }

      if (type === "all" || type === "customers") {
        const uniqueCustomers = new Set(invoices.map(inv => {
          const child = children.find(c => c.id === inv.childId);
          return child ? `${child.firstName} ${child.lastName}` : 'Unknown';
        })).size;
        newHistory.push({
          id: `${Date.now()}-customers`,
          timestamp: new Date(),
          type: "customer",
          status: "success",
          itemsProcessed: uniqueCustomers,
          message: `Synced ${uniqueCustomers} customers to QuickBooks`
        });
      }

      setSyncHistory(prev => [...newHistory, ...prev]);
      setConnection(prev => ({ ...prev, lastSync: new Date() }));
      setIsSyncing(false);

      toast.success(`Successfully synced ${type} with QuickBooks`);
    }, 2000);
  };

  const exportToQuickBooks = () => {
    // Prepare invoice data for Excel export
    const invoiceData = invoices.map(inv => {
      const child = children.find(c => c.id === inv.childId);
      const familyName = child ? `${child.firstName} ${child.lastName} Family` : 'Unknown Family';

      return {
        "Customer": familyName,
        "Invoice Date": inv.createdAt,
        "Due Date": inv.dueDate,
        "Description": inv.description,
        "Quantity": 1,
        "Unit Price": inv.amount,
        "Total Amount": inv.amount,
        "Status": inv.status
      };
    });

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(invoiceData);

    // Set column widths for better readability
    worksheet['!cols'] = [
      { wch: 25 }, // Customer
      { wch: 12 }, // Invoice Date
      { wch: 12 }, // Due Date
      { wch: 40 }, // Description
      { wch: 10 }, // Quantity
      { wch: 12 }, // Unit Price
      { wch: 12 }, // Total Amount
      { wch: 10 }, // Status
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Invoices");

    // Generate Excel file and trigger download
    XLSX.writeFile(workbook, `quickbooks-export-${new Date().toISOString().split('T')[0]}.xlsx`);

    toast.success("QuickBooks data exported to Excel successfully");
  };

  const stats = {
    totalInvoices: invoices.length,
    totalRevenue: invoices.reduce((sum, inv) => sum + inv.amount, 0),
    paidInvoices: invoices.filter(inv => inv.status === "paid").length,
    unpaidInvoices: invoices.filter(inv => inv.status === "pending").length,
    overdueInvoices: invoices.filter(inv => inv.status === "overdue").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-1 flex items-center gap-2">QuickBooks Integration <Badge className="bg-amber-500 text-white hover:bg-amber-500">Coming Soon</Badge></h1>
          <p className="text-muted-foreground">Sync your KidTrackerApp™ data with QuickBooks Online</p>
        </div>
        <div className="flex items-center gap-2">
          {connection.isConnected ? (
            <Badge variant="outline" className="border-green-500 bg-green-50 text-green-700">
              <CheckCircle className="mr-1 h-3 w-3" />
              Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="border-gray-300">
              <X className="mr-1 h-3 w-3" />
              Not Connected
            </Badge>
          )}
        </div>
      </div>

      {/* Connection Status Card */}
      <Card className="border-2 border-blue-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Connection Status</CardTitle>
              <CardDescription>
                {connection.isConnected 
                  ? `Connected to ${connection.companyName}`
                  : "Connect your QuickBooks Online account"
                }
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {!connection.isConnected ? (
                <Dialog open={showConnectionDialog} onOpenChange={setShowConnectionDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700">
                      <Upload className="mr-2 h-4 w-4" />
                      Connect to QuickBooks
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Connect to QuickBooks Online</DialogTitle>
                      <DialogDescription>
                        Enter your QuickBooks company information to establish a connection
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="companyName">Company Name</Label>
                        <Input
                          id="companyName"
                          placeholder="My Daycare LLC"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="accountId">QuickBooks Account ID</Label>
                        <Input
                          id="accountId"
                          placeholder="QB-123456789"
                          value={accountId}
                          onChange={(e) => setAccountId(e.target.value)}
                        />
                      </div>
                      <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                        <div className="flex gap-2">
                          <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-blue-900">
                            <p className="font-medium">Demonstration Mode</p>
                            <p className="text-blue-700 mt-1">
                              This is a demonstration. When completed, you will be able to authenticate to QuickBooks Online.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowConnectionDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleConnect} className="bg-gradient-to-r from-blue-700 to-blue-600">
                        Connect
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => handleSync("all")}
                    disabled={isSyncing}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? "Syncing..." : "Sync Now"}
                  </Button>
                  <Button variant="outline" onClick={handleDisconnect}>
                    Disconnect
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        {connection.isConnected && (
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Company Name</p>
                <p className="font-medium">{connection.companyName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Account ID</p>
                <p className="font-medium">{connection.accountId}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Sync</p>
                <p className="font-medium">
                  {connection.lastSync 
                    ? new Date(connection.lastSync).toLocaleString()
                    : "Never"
                  }
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <p className="font-medium text-green-700">Active</p>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {connection.isConnected && (
        <>
          {/* Sync Statistics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-700" />
                  <p className="text-2xl font-bold">{stats.totalInvoices}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <p className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Paid Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <p className="text-2xl font-bold">{stats.paidInvoices}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Unpaid</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-yellow-600" />
                  <p className="text-2xl font-bold">{stats.unpaidInvoices}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Overdue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-700" />
                  <p className="text-2xl font-bold">{stats.overdueInvoices}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sync Actions and History */}
          <Tabs defaultValue="sync" className="space-y-4">
            <TabsList>
              <TabsTrigger value="sync">Sync Actions</TabsTrigger>
              <TabsTrigger value="history">Sync History</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="sync" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Sync Data to QuickBooks</CardTitle>
                  <CardDescription>
                    Choose what data you want to sync with your QuickBooks account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Button
                      variant="outline"
                      className="h-24 flex-col gap-2"
                      onClick={() => handleSync("invoices")}
                      disabled={isSyncing}
                    >
                      <FileText className="h-6 w-6 text-blue-700" />
                      <div className="text-center">
                        <p className="font-medium">Sync Invoices</p>
                        <p className="text-xs text-muted-foreground">{stats.totalInvoices} items</p>
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-24 flex-col gap-2"
                      onClick={() => handleSync("payments")}
                      disabled={isSyncing}
                    >
                      <DollarSign className="h-6 w-6 text-green-600" />
                      <div className="text-center">
                        <p className="font-medium">Sync Payments</p>
                        <p className="text-xs text-muted-foreground">{stats.paidInvoices} items</p>
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-24 flex-col gap-2"
                      onClick={() => handleSync("customers")}
                      disabled={isSyncing}
                    >
                      <FileText className="h-6 w-6 text-blue-600" />
                      <div className="text-center">
                        <p className="font-medium">Sync Customers</p>
                        <p className="text-xs text-muted-foreground">
                          {new Set(invoices.map(inv => {
                            const child = children.find(c => c.id === inv.childId);
                            return child ? `${child.firstName} ${child.lastName}` : 'Unknown';
                          })).size} items
                        </p>
                      </div>
                    </Button>
                  </div>

                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      onClick={() => handleSync("all")}
                      disabled={isSyncing}
                      className="flex-1 bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700"
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                      Sync All Data
                    </Button>
                    <Button variant="outline" onClick={exportToQuickBooks}>
                      <Download className="mr-2 h-4 w-4" />
                      Export to Excel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Sync History</CardTitle>
                  <CardDescription>
                    View recent synchronization activities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {syncHistory.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <RefreshCw className="h-12 w-12 mx-auto mb-2 opacity-20" />
                      <p>No sync history yet</p>
                      <p className="text-sm">Sync data to see history here</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {syncHistory.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className={`rounded-full p-2 ${
                            item.status === 'success' ? 'bg-green-100' :
                            item.status === 'failed' ? 'bg-blue-100' :
                            'bg-yellow-100'
                          }`}>
                            {item.status === 'success' ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : item.status === 'failed' ? (
                              <X className="h-4 w-4 text-blue-700" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-yellow-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="capitalize">
                                {item.type}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {item.timestamp.toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm font-medium">{item.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.itemsProcessed} items processed
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Sync Settings</CardTitle>
                  <CardDescription>
                    Configure your QuickBooks synchronization preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="syncInterval">Sync Interval</Label>
                    <Select
                      value={syncSettings.syncInterval}
                      onValueChange={(value) => setSyncSettings(prev => ({ ...prev, syncInterval: value }))}
                    >
                      <SelectTrigger id="syncInterval">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="realtime">Real-time</SelectItem>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="manual">Manual Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3 pt-4 border-t">
                    <p className="font-medium text-sm">Data to Sync</p>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={syncSettings.syncInvoices}
                          onChange={(e) => setSyncSettings(prev => ({ ...prev, syncInvoices: e.target.checked }))}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">Sync Invoices</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={syncSettings.syncPayments}
                          onChange={(e) => setSyncSettings(prev => ({ ...prev, syncPayments: e.target.checked }))}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">Sync Payments</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={syncSettings.syncCustomers}
                          onChange={(e) => setSyncSettings(prev => ({ ...prev, syncCustomers: e.target.checked }))}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">Sync Customers</span>
                      </label>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <Button
                      onClick={() => toast.success("Settings saved successfully")}
                      className="bg-gradient-to-r from-blue-700 to-blue-600"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Save Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}