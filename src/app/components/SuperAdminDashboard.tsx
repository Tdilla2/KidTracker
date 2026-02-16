import { useState } from "react";
import { Building2, Plus, Edit, Trash2, Users, Copy, Search, Clock, CheckCircle, AlertTriangle, RefreshCw, Zap, Settings, Lock, User as UserIcon } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useAuth, Daycare } from "../context/AuthContext";
import { toast } from "sonner";
import { getTrialInfo, computeTrialEndDate } from "../../utils/trialUtils";

export function SuperAdminDashboard() {
  const { daycares, users, addDaycare, updateDaycare, deleteDaycare, currentUser, updateUser } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDaycare, setEditingDaycare] = useState<Daycare | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    username: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    daycareCode: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    phone: "",
    email: "",
    status: "active" as "active" | "inactive",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      daycareCode: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      phone: "",
      email: "",
      status: "active",
    });
    setEditingDaycare(null);
  };

  const handleEdit = (daycare: Daycare) => {
    setEditingDaycare(daycare);
    setFormData({
      name: daycare.name,
      daycareCode: daycare.daycareCode,
      address: daycare.address || "",
      city: daycare.city || "",
      state: daycare.state || "",
      zipCode: daycare.zipCode || "",
      phone: daycare.phone || "",
      email: daycare.email || "",
      status: daycare.status,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error("Daycare name is required");
      return;
    }

    try {
      if (editingDaycare) {
        await updateDaycare(editingDaycare.id, {
          name: formData.name,
          daycareCode: formData.daycareCode || undefined,
          address: formData.address || undefined,
          city: formData.city || undefined,
          state: formData.state || undefined,
          zipCode: formData.zipCode || undefined,
          phone: formData.phone || undefined,
          email: formData.email || undefined,
          status: formData.status,
        });
        toast.success("Daycare updated successfully");
      } else {
        const newDaycare = await addDaycare({
          name: formData.name,
          daycareCode: formData.daycareCode || "",
          address: formData.address || undefined,
          city: formData.city || undefined,
          state: formData.state || undefined,
          zipCode: formData.zipCode || undefined,
          phone: formData.phone || undefined,
          email: formData.email || undefined,
          status: formData.status,
          ownerUserId: currentUser?.id,
        });
        toast.success(
          `Daycare created! Default login: Code: ${newDaycare.daycareCode}, Username: admin_${newDaycare.daycareCode.toLowerCase()}, Password: Password123!`,
          { duration: 10000 }
        );
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Failed to save daycare");
    }
  };

  const handleDelete = async (daycare: Daycare) => {
    if (!confirm(`Are you sure you want to delete "${daycare.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteDaycare(daycare.id);
      toast.success("Daycare deleted successfully");
    } catch (error) {
      toast.error("Failed to delete daycare");
    }
  };

  const copyDaycareCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Daycare code copied to clipboard");
  };

  // Get stats for a daycare
  const getDaycareStats = (daycareId: string) => {
    const daycareUsers = users.filter(u => u.daycareId === daycareId);
    return {
      staffCount: daycareUsers.filter(u => u.role === "admin" || u.role === "user").length,
      parentCount: daycareUsers.filter(u => u.role === "parent").length,
    };
  };

  // Filter daycares by search term
  const filteredDaycares = daycares.filter(dc =>
    dc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dc.daycareCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (dc.city && dc.city.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Trial action handlers
  const handleExtendTrial = async (daycare: Daycare) => {
    try {
      await updateDaycare(daycare.id, {
        trialEndsAt: computeTrialEndDate(),
        subscriptionStatus: "trial",
      });
      toast.success(`Trial extended 14 days for ${daycare.name}`);
    } catch {
      toast.error("Failed to extend trial");
    }
  };

  const handleActivateSubscription = async (daycare: Daycare) => {
    try {
      await updateDaycare(daycare.id, {
        subscriptionStatus: "active",
      });
      toast.success(`Subscription activated for ${daycare.name}`);
    } catch {
      toast.error("Failed to activate subscription");
    }
  };

  // Handle opening settings dialog
  const handleOpenSettings = () => {
    setSettingsForm({
      username: currentUser?.username || "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setIsSettingsOpen(true);
  };

  // Handle updating super admin credentials
  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!settingsForm.currentPassword) {
      toast.error("Current password is required");
      return;
    }

    // Verify current password
    if (settingsForm.currentPassword !== currentUser?.password) {
      toast.error("Current password is incorrect");
      return;
    }

    // Check if anything is being changed
    const isUsernameChanged = settingsForm.username !== currentUser?.username;
    const isPasswordChanged = settingsForm.newPassword.length > 0;

    if (!isUsernameChanged && !isPasswordChanged) {
      toast.error("No changes to save");
      return;
    }

    // Validate new password if being changed
    if (isPasswordChanged) {
      if (settingsForm.newPassword.length < 8) {
        toast.error("New password must be at least 8 characters");
        return;
      }
      if (settingsForm.newPassword !== settingsForm.confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
    }

    try {
      const updates: any = {};
      if (isUsernameChanged) {
        updates.username = settingsForm.username;
      }
      if (isPasswordChanged) {
        updates.password = settingsForm.newPassword;
      }

      await updateUser(currentUser!.id, updates);

      toast.success("Credentials updated successfully! Please log in again with your new credentials.", { duration: 5000 });
      setIsSettingsOpen(false);
    } catch (error) {
      toast.error("Failed to update credentials");
    }
  };

  // Overall stats
  const trialCounts = daycares.reduce(
    (acc, dc) => {
      const info = getTrialInfo(dc);
      if (info.isPermanentlyActive) acc.active++;
      else if (info.isOnTrial) acc.onTrial++;
      else if (info.isTrialExpired) acc.expired++;
      else acc.noStatus++;
      return acc;
    },
    { onTrial: 0, expired: 0, active: 0, noStatus: 0 }
  );

  const totalStats = {
    daycares: daycares.length,
    activeDaycares: daycares.filter(d => d.status === "active").length,
    totalStaff: users.filter(u => u.role === "admin" || u.role === "user").length,
    totalParents: users.filter(u => u.role === "parent").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-600 text-white rounded-lg p-6 shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Super Admin Dashboard</h1>
            <p className="text-blue-50">Manage all daycares in the KidTrackerApp™ system</p>
          </div>
          <Button
            className="bg-blue-800 text-white hover:bg-blue-900"
            onClick={handleOpenSettings}
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Daycares</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-700" />
              <p className="text-2xl font-bold">{totalStats.daycares}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalStats.activeDaycares} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-700" />
              <p className="text-2xl font-bold">{totalStats.totalStaff}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all daycares
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Parents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-700" />
              <p className="text-2xl font-bold">{totalStats.totalParents}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Registered accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Subscription Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-600" /> Active</span>
                <span className="font-bold">{trialCounts.active}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-yellow-600" /> On Trial</span>
                <span className="font-bold">{trialCounts.onTrial}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-red-600" /> Expired</span>
                <span className="font-bold">{trialCounts.expired}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="w-full bg-blue-700 hover:bg-blue-800">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Daycare
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editingDaycare ? "Edit Daycare" : "Add New Daycare"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingDaycare
                      ? "Update daycare information"
                      : "Create a new daycare center. A unique code will be generated automatically."}
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="name">Daycare Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Happy Kids Daycare"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="daycareCode">Daycare Code</Label>
                      <Input
                        id="daycareCode"
                        value={formData.daycareCode}
                        onChange={(e) => setFormData({ ...formData, daycareCode: e.target.value.toUpperCase() })}
                        placeholder="Auto-generated"
                        maxLength={6}
                        className="uppercase font-mono"
                      />
                      <p className="text-xs text-muted-foreground">Leave blank to auto-generate</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value: "active" | "inactive") =>
                          setFormData({ ...formData, status: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="123 Main Street"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="City"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        placeholder="State"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="zipCode">ZIP Code</Label>
                      <Input
                        id="zipCode"
                        value={formData.zipCode}
                        onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                        placeholder="12345"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="(555) 123-4567"
                      />
                    </div>

                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="contact@daycare.com"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        resetForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-blue-700 hover:bg-blue-800">
                      {editingDaycare ? "Update" : "Create"} Daycare
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search daycares..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Daycares Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredDaycares.length === 0 ? (
          <Card className="col-span-full border-blue-200">
            <CardContent className="py-12">
              <div className="text-center">
                <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? "No daycares found" : "No daycares yet"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchTerm
                    ? "Try adjusting your search"
                    : "Get started by adding your first daycare center"}
                </p>
                {!searchTerm && (
                  <Button
                    className="bg-blue-700 hover:bg-blue-800"
                    onClick={() => setIsDialogOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Daycare
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredDaycares.map((daycare) => {
            const stats = getDaycareStats(daycare.id);
            const trialInfo = getTrialInfo(daycare);

            const trialBadge = trialInfo.isPermanentlyActive ? (
              <Badge variant="outline" className="border-green-500 bg-green-50 text-green-700">
                <CheckCircle className="h-3 w-3 mr-1" />
                Active
              </Badge>
            ) : trialInfo.isOnTrial ? (
              <Badge variant="outline" className="border-yellow-500 bg-yellow-50 text-yellow-700">
                <Clock className="h-3 w-3 mr-1" />
                Trial: {trialInfo.daysRemaining}d left
              </Badge>
            ) : trialInfo.isTrialExpired ? (
              <Badge variant="outline" className="border-red-500 bg-red-50 text-red-700">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Trial Expired
              </Badge>
            ) : (
              <Badge variant="outline" className="border-gray-500 bg-gray-50 text-gray-700">
                {daycare.status}
              </Badge>
            );

            return (
              <Card key={daycare.id} className="border-blue-200 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{daycare.name}</CardTitle>
                      <CardDescription>
                        {daycare.city && daycare.state
                          ? `${daycare.city}, ${daycare.state}`
                          : "Location not set"}
                      </CardDescription>
                    </div>
                    {trialBadge}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Daycare Code */}
                  <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <Building2 className="h-4 w-4 text-blue-700" />
                    <span className="text-sm font-medium text-blue-800">Code:</span>
                    <span className="font-mono font-bold text-blue-900 tracking-wider">
                      {daycare.daycareCode}
                    </span>
                    <button
                      onClick={() => copyDaycareCode(daycare.daycareCode)}
                      className="ml-auto text-blue-700 hover:text-blue-800"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span>{stats.staffCount} Staff</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span>{stats.parentCount} Parents</span>
                    </div>
                  </div>

                  {/* Trial Actions */}
                  {!trialInfo.isPermanentlyActive && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => handleExtendTrial(daycare)}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Extend Trial
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 text-xs bg-green-600 hover:bg-green-700"
                        onClick={() => handleActivateSubscription(daycare)}
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        Activate
                      </Button>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(daycare)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(daycare)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Super Admin Settings</DialogTitle>
            <DialogDescription>
              Update your super admin username and password
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateCredentials} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="settings-username">Username</Label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="settings-username"
                  value={settingsForm.username}
                  onChange={(e) => setSettingsForm({ ...settingsForm, username: e.target.value })}
                  className="pl-10"
                  placeholder="Enter new username"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Current: <span className="font-mono">{currentUser?.username}</span>
              </p>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-medium mb-3">Change Password</h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="current-password"
                      type="password"
                      value={settingsForm.currentPassword}
                      onChange={(e) => setSettingsForm({ ...settingsForm, currentPassword: e.target.value })}
                      className="pl-10"
                      placeholder="Enter current password"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="new-password"
                      type="password"
                      value={settingsForm.newPassword}
                      onChange={(e) => setSettingsForm({ ...settingsForm, newPassword: e.target.value })}
                      className="pl-10"
                      placeholder="Enter new password (optional)"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Leave blank to keep current password
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="confirm-password"
                      type="password"
                      value={settingsForm.confirmPassword}
                      onChange={(e) => setSettingsForm({ ...settingsForm, confirmPassword: e.target.value })}
                      className="pl-10"
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> After updating your credentials, you will need to log in again with your new username and password.
              </p>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSettingsOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-700 hover:bg-blue-800">
                Update Credentials
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
