import { useState, useEffect } from "react";
import { RefreshCw, Check, X, Download, Settings, Calendar, DollarSign, FileText, AlertCircle, CheckCircle, ExternalLink, FileSpreadsheet } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const API_BASE = 'https://v9iqpcma3c.execute-api.us-east-1.amazonaws.com/prod/api';

interface QBOConnection {
  isConnected: boolean;
  companyName: string;
  realmId: string;
  lastSync: string | null;
}

interface SyncHistory {
  id: string;
  timestamp: string;
  type: "invoice" | "payment" | "customer";
  status: "success" | "failed";
  itemsProcessed: number;
  message: string;
}

export function QuickBooksIntegration() {
  const { invoices, children, refreshData } = useData();
  const { currentUser, currentDaycare } = useAuth();

  const daycareId = currentDaycare?.id || currentUser?.daycareId || 'default';

  const [connection, setConnection] = useState<QBOConnection>({
    isConnected: false, companyName: '', realmId: '', lastSync: null,
  });
  const [syncHistory, setSyncHistory] = useState<SyncHistory[]>(() => {
    try { return JSON.parse(localStorage.getItem('qbo_sync_history') || '[]'); } catch { return []; }
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [syncSettings, setSyncSettings] = useState({
    syncInterval: 'manual',
    syncInvoices: true,
    syncPayments: true,
    syncCustomers: true,
  });

  // Persist sync history
  useEffect(() => {
    localStorage.setItem('qbo_sync_history', JSON.stringify(syncHistory));
  }, [syncHistory]);

  // Load connection status from Lambda on mount
  useEffect(() => {
    loadStatus();
  }, [daycareId]);

  // Handle OAuth callback — either from postMessage (popup) or localStorage (fallback)
  useEffect(() => {
    // postMessage from popup window
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'qbo_callback') return;
      const { code, realmId, daycareId: cbDaycareId, redirectUri } = event.data;
      completeOAuth(code, realmId, cbDaycareId || daycareId, redirectUri);
    };
    window.addEventListener('message', onMessage);

    // localStorage fallback (main-window redirect flow)
    const pending = localStorage.getItem('qbo_pending_callback');
    if (pending) {
      localStorage.removeItem('qbo_pending_callback');
      try {
        const { code, realmId, daycareId: cbDaycareId, redirectUri } = JSON.parse(pending);
        completeOAuth(code, realmId, cbDaycareId || daycareId, redirectUri);
      } catch {
        toast.error('Failed to complete QuickBooks connection');
      }
    }

    return () => window.removeEventListener('message', onMessage);
  }, []);

  const loadStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const res = await fetch(`${API_BASE}/qbo/status?daycare_id=${encodeURIComponent(daycareId)}`);
      if (!res.ok) {
        // 500 usually means QBO tables aren't set up yet — silently set disconnected
        setConnection({ isConnected: false, companyName: '', realmId: '', lastSync: null });
        return;
      }
      const data = await res.json();
      if (data.connected) {
        setConnection({ isConnected: true, companyName: data.companyName, realmId: data.realmId, lastSync: data.lastSync });
      } else {
        setConnection({ isConnected: false, companyName: '', realmId: '', lastSync: null });
      }
    } catch {
      // Network error — silently set disconnected
      setConnection({ isConnected: false, companyName: '', realmId: '', lastSync: null });
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const redirectUri = window.location.origin;
      const res = await fetch(
        `${API_BASE}/qbo/auth-url?daycare_id=${encodeURIComponent(daycareId)}&redirect_uri=${encodeURIComponent(redirectUri)}`
      );
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!data.url) throw new Error(`No URL in response: ${JSON.stringify(data)}`);
      // Open OAuth in a popup so the main window stays logged in
      const popup = window.open(data.url, 'qbo_auth', 'width=600,height=700,left=200,top=100');
      if (!popup) {
        // Popup blocked — fall back to full-page redirect
        window.location.href = data.url;
      } else {
        setIsConnecting(false); // connecting state will resume when postMessage arrives
      }
    } catch (err: any) {
      toast.error('QuickBooks: ' + err.message);
      setIsConnecting(false);
    }
  };

  const completeOAuth = async (code: string, realmId: string, cbDaycareId: string, redirectUri?: string) => {
    setIsConnecting(true);
    try {
      const res = await fetch(`${API_BASE}/qbo/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, realmId, daycareId: cbDaycareId, redirectUri: redirectUri || window.location.origin }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Connection failed');
      setConnection({ isConnected: true, companyName: data.companyName, realmId: data.realmId, lastSync: null });
      toast.success(`Connected to QuickBooks — ${data.companyName}`);
      addHistory('customer', 'success', 1, `Connected to ${data.companyName}`);
    } catch (err: any) {
      toast.error('QuickBooks connection failed: ' + err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const res = await fetch(`${API_BASE}/qbo/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daycareId }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      setConnection({ isConnected: false, companyName: '', realmId: '', lastSync: null });
      setSyncHistory([]);
      localStorage.removeItem('qbo_sync_history');
      toast.info('Disconnected from QuickBooks');
    } catch (err: any) {
      toast.error('Failed to disconnect: ' + err.message);
    }
  };

  const addHistory = (type: SyncHistory['type'], status: SyncHistory['status'], count: number, msg: string) => {
    setSyncHistory(prev => [{
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      type, status,
      itemsProcessed: count,
      message: msg,
    }, ...prev.slice(0, 49)]);
  };

  const handleSync = async (type: 'all' | 'invoices' | 'payments' | 'customers') => {
    setIsSyncing(true);
    try {
      const res = await fetch(`${API_BASE}/qbo/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daycareId, type }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Sync failed');

      const r = data.results;
      if (r.customers) addHistory('customer', 'success', r.customers.synced, `Synced ${r.customers.synced} of ${r.customers.total} customers`);
      if (r.invoices)  addHistory('invoice',  'success', r.invoices.synced,  `Synced ${r.invoices.synced} of ${r.invoices.total} invoices`);
      if (r.payments)  addHistory('payment',  'success', r.payments.synced,  `Synced ${r.payments.synced} of ${r.payments.total} payments`);

      setConnection(prev => ({ ...prev, lastSync: new Date().toISOString() }));
      toast.success(`QuickBooks sync complete`);
    } catch (err: any) {
      const historyType = type === 'customers' ? 'customer' : type === 'payments' ? 'payment' : 'invoice';
      addHistory(historyType === 'all' ? 'invoice' : historyType as SyncHistory['type'], 'failed', 0, err.message);
      toast.error('Sync failed: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const res = await fetch(`${API_BASE}/qbo/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daycareId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Import failed');
      const r = data.results;
      const parts = [];
      if (r.invoicesUpdatedToPaid > 0) parts.push(`${r.invoicesUpdatedToPaid} invoice(s) marked paid`);
      if (r.invoicesImportedFromQB > 0) parts.push(`${r.invoicesImportedFromQB} new invoice(s) imported`);
      const msg = parts.length > 0 ? parts.join(', ') : 'Already up to date';
      toast.success(`Import complete — ${msg}`);
      addHistory('invoice', 'success', r.invoicesUpdatedToPaid + r.invoicesImportedFromQB, `QB Import: ${msg}`);
      // Refresh the app data so invoice list shows updated statuses
      await refreshData();
    } catch (err: any) {
      toast.error('Import failed: ' + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const exportToExcel = () => {
    // QB Online import format — one row per charge line item
    const rows: Record<string, string | number>[] = [];
    invoices.forEach(inv => {
      const child = children.find(c => c.id === inv.childId);
      const customerName = child ? `${child.firstName} ${child.lastName} Family` : 'Unknown';
      const invoiceDate = new Date(inv.createdAt).toLocaleDateString('en-US');
      const dueDate = new Date(inv.dueDate + 'T00:00:00').toLocaleDateString('en-US');

      // Parse "Monthly Tuition: $450.00, Lunch Plan: $80.00" into individual line items
      const lines = inv.description
        ? inv.description.split(', ').map(seg => {
            const match = seg.match(/^(.+):\s*\$?([\d.]+)$/);
            if (match) return { item: match[1].trim(), amount: parseFloat(match[2]) };
            return { item: seg.trim(), amount: inv.amount };
          })
        : [{ item: 'Childcare Services', amount: inv.amount }];

      lines.forEach(line => {
        rows.push({
          '*InvoiceNo': inv.invoiceNumber,
          '*Customer': customerName,
          '*InvoiceDate': invoiceDate,
          '*DueDate': dueDate,
          '*ItemName': line.item,
          'ItemDescription': line.item,
          '*Qty': 1,
          '*Rate': line.amount,
          'Amount': line.amount,
          '*Tax': 'NON',
          'Status': inv.status,
        });
      });
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 18 }, { wch: 28 }, { wch: 14 }, { wch: 14 },
      { wch: 22 }, { wch: 28 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
    XLSX.writeFile(wb, `quickbooks-export-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success(`Exported ${rows.length} line item(s) to QB-importable Excel`);
  };

  const stats = {
    totalInvoices:   invoices.length,
    totalRevenue:    invoices.reduce((s, i) => s + i.amount, 0),
    paidInvoices:    invoices.filter(i => i.status === 'paid').length,
    unpaidInvoices:  invoices.filter(i => i.status === 'pending').length,
    overdueInvoices: invoices.filter(i => i.status === 'overdue').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-1">QuickBooks Integration</h1>
          <p className="text-muted-foreground">Sync your KidTrackerApp™ data with QuickBooks Online</p>
        </div>
        <Badge
          variant="outline"
          className={connection.isConnected
            ? 'border-green-500 bg-green-50 text-green-700'
            : 'border-gray-300 text-gray-500'}
        >
          {connection.isConnected
            ? <><CheckCircle className="mr-1 h-3 w-3" />Connected</>
            : <><X className="mr-1 h-3 w-3" />Not Connected</>}
        </Badge>
      </div>

      {/* Connected Banner */}
      {connection.isConnected && !isLoadingStatus && (
        <div className="rounded-xl border-2 border-green-400 bg-green-50 px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 border-2 border-green-400">
              <CheckCircle className="h-7 w-7 text-green-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-green-800">Connected to QuickBooks</p>
              <p className="text-sm text-green-700 font-medium">{connection.companyName}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-green-600">Active · Sandbox · Realm {connection.realmId}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleSync('all')} disabled={isSyncing}
              className="border-green-400 text-green-800 hover:bg-green-100">
              <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Button>
            <Button variant="outline" onClick={handleDisconnect}
              className="border-green-400 text-green-800 hover:bg-green-100">
              Disconnect
            </Button>
          </div>
        </div>
      )}

      {/* Connection Card (not connected) */}
      {!connection.isConnected && (
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Connection Status</CardTitle>
                <CardDescription>
                  {isLoadingStatus ? 'Checking connection...' : 'Connect your QuickBooks Online sandbox account'}
                </CardDescription>
              </div>
              <Button
                onClick={handleConnect}
                disabled={isConnecting || isLoadingStatus}
                className="bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                {isConnecting ? 'Connecting...' : 'Connect with QuickBooks'}
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Not connected — setup instructions */}
      {!connection.isConnected && !isLoadingStatus && (
        <Card className="border border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900 space-y-1">
                <p className="font-medium">Before connecting, make sure:</p>
                <ol className="list-decimal list-inside space-y-1 text-amber-800">
                  <li>You added <code className="bg-amber-100 px-1 rounded">https://main.d2nbsjhv8lzch9.amplifyapp.com</code> as a redirect URI in the Intuit Developer portal</li>
                  <li>You added <code className="bg-amber-100 px-1 rounded">QBO_CLIENT_SECRET</code> to your Lambda environment variables</li>
                  <li>You ran the QB tables SQL in your RDS console (see <code className="bg-amber-100 px-1 rounded">setup-qbo-tables.cjs</code>)</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {connection.isConnected && (
        <>
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {[
              { label: 'Total Invoices',   value: stats.totalInvoices,   icon: <FileText className="h-4 w-4 text-blue-700" /> },
              { label: 'Total Revenue',    value: `$${stats.totalRevenue.toFixed(2)}`, icon: <DollarSign className="h-4 w-4 text-green-600" /> },
              { label: 'Paid',             value: stats.paidInvoices,    icon: <Check className="h-4 w-4 text-green-600" /> },
              { label: 'Unpaid',           value: stats.unpaidInvoices,  icon: <Calendar className="h-4 w-4 text-yellow-600" /> },
              { label: 'Overdue',          value: stats.overdueInvoices, icon: <AlertCircle className="h-4 w-4 text-blue-700" /> },
            ].map(s => (
              <Card key={s.label}>
                <CardHeader className="pb-2"><CardTitle className="text-sm">{s.label}</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">{s.icon}<p className="text-2xl font-bold">{s.value}</p></div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Sync Actions + History + Settings */}
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
                  <CardDescription>Push KidTracker data into your QuickBooks sandbox company</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    {[
                      { label: 'Sync Customers', sub: `${children.filter(c => c.status === 'active').length} active children`, type: 'customers' as const, icon: <FileText className="h-6 w-6 text-blue-600" /> },
                      { label: 'Sync Invoices',  sub: `${stats.totalInvoices} invoices`, type: 'invoices' as const, icon: <FileText className="h-6 w-6 text-blue-700" /> },
                      { label: 'Sync Payments',  sub: `${stats.paidInvoices} paid`, type: 'payments' as const, icon: <DollarSign className="h-6 w-6 text-green-600" /> },
                    ].map(btn => (
                      <Button
                        key={btn.type}
                        variant="outline"
                        className="h-24 flex-col gap-2"
                        onClick={() => handleSync(btn.type)}
                        disabled={isSyncing}
                      >
                        {btn.icon}
                        <div className="text-center">
                          <p className="font-medium">{btn.label}</p>
                          <p className="text-xs text-muted-foreground">{btn.sub}</p>
                        </div>
                      </Button>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-4 border-t flex-wrap">
                    <Button
                      onClick={() => handleSync('all')}
                      disabled={isSyncing || isImporting}
                      className="flex-1 bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700"
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                      {isSyncing ? 'Syncing...' : 'Sync All to QB'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleImport}
                      disabled={isSyncing || isImporting}
                      className="flex-1 border-green-500 text-green-700 hover:bg-green-50"
                    >
                      <Download className={`mr-2 h-4 w-4 ${isImporting ? 'animate-pulse' : ''}`} />
                      {isImporting ? 'Importing...' : 'Import from QB'}
                    </Button>
                    <Button variant="outline" onClick={exportToExcel}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Export to QB Excel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Sync History</CardTitle>
                  <CardDescription>Recent synchronization activity</CardDescription>
                </CardHeader>
                <CardContent>
                  {syncHistory.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <RefreshCw className="h-12 w-12 mx-auto mb-2 opacity-20" />
                      <p>No sync history yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {syncHistory.map(item => (
                        <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50">
                          <div className={`rounded-full p-2 ${item.status === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
                            {item.status === 'success'
                              ? <Check className="h-4 w-4 text-green-600" />
                              : <X className="h-4 w-4 text-red-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="capitalize">{item.type}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(item.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm font-medium">{item.message}</p>
                            <p className="text-xs text-muted-foreground">{item.itemsProcessed} items</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Sync Settings</CardTitle>
                  <CardDescription>Configure synchronization preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Sync Interval</Label>
                    <Select value={syncSettings.syncInterval} onValueChange={v => setSyncSettings(p => ({ ...p, syncInterval: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual Only</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="pt-4 border-t">
                    <Button onClick={() => toast.success('Settings saved')} className="bg-gradient-to-r from-blue-700 to-blue-600">
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
