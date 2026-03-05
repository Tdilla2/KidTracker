import { useState } from "react";
import { Building2, Plus, Edit, Trash2, Users, Copy, Search, Clock, CheckCircle, AlertTriangle, RefreshCw, Zap, Lock, User as UserIcon, Archive, ArchiveRestore, Shield, Mail, Eye, EyeOff } from "lucide-react";
import kidtrackerLogo from "../assets/kidtracker-logo.jpg";
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
import { getTrialInfo, computeTrialEndDate, SubscriptionPlan } from "../../utils/trialUtils";

export function SuperAdminDashboard() {
  const { daycares, users, addDaycare, updateDaycare, deleteDaycare, archiveDaycare, currentUser, updateUser, addUser, deleteUser } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDaycare, setEditingDaycare] = useState<Daycare | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [isAddSuperAdminOpen, setIsAddSuperAdminOpen] = useState(false);
  const [editingSuperAdmin, setEditingSuperAdmin] = useState<any | null>(null);
  const [isEditSuperAdminOpen, setIsEditSuperAdminOpen] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [superAdminForm, setSuperAdminForm] = useState({
    username: "",
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [editSuperAdminForm, setEditSuperAdminForm] = useState({
    username: "",
    fullName: "",
    email: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Get all super admin users
  const superAdmins = users.filter(u => u.role === "super_admin");

  const resetSuperAdminForm = () => {
    setSuperAdminForm({ username: "", fullName: "", email: "", password: "", confirmPassword: "" });
    setShowNewPassword(false);
  };

  const handleAddSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!superAdminForm.username || !superAdminForm.fullName || !superAdminForm.email || !superAdminForm.password) {
      toast.error("All fields are required");
      return;
    }
    if (superAdminForm.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (superAdminForm.password !== superAdminForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    try {
      await addUser({
        username: superAdminForm.username,
        fullName: superAdminForm.fullName,
        email: superAdminForm.email,
        password: superAdminForm.password,
        role: "super_admin",
        status: "active",
        childIds: [],
        mustChangePassword: false,
      });
      toast.success(`Super admin "${superAdminForm.username}" created successfully`);
      resetSuperAdminForm();
      setIsAddSuperAdminOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to create super admin");
    }
  };

  const handleEditSuperAdmin = (admin: any) => {
    setEditingSuperAdmin(admin);
    setEditSuperAdminForm({
      username: admin.username,
      fullName: admin.fullName,
      email: admin.email,
      newPassword: "",
      confirmPassword: "",
    });
    setShowEditPassword(false);
    setIsEditSuperAdminOpen(true);
  };

  const handleUpdateSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSuperAdmin) return;

    if (!editSuperAdminForm.username || !editSuperAdminForm.fullName || !editSuperAdminForm.email) {
      toast.error("Username, full name, and email are required");
      return;
    }

    if (editSuperAdminForm.newPassword) {
      if (editSuperAdminForm.newPassword.length < 8) {
        toast.error("Password must be at least 8 characters");
        return;
      }
      if (editSuperAdminForm.newPassword !== editSuperAdminForm.confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
    }

    try {
      const updates: any = {
        username: editSuperAdminForm.username,
        fullName: editSuperAdminForm.fullName,
        email: editSuperAdminForm.email,
      };
      if (editSuperAdminForm.newPassword) {
        updates.password = editSuperAdminForm.newPassword;
      }

      await updateUser(editingSuperAdmin.id, updates);
      toast.success(`Super admin "${editSuperAdminForm.username}" updated successfully`);
      setIsEditSuperAdminOpen(false);
      setEditingSuperAdmin(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to update super admin");
    }
  };

  const handleDeleteSuperAdmin = async (user: { id: string; username: string }) => {
    if (user.id === currentUser?.id) {
      toast.error("You cannot delete your own account");
      return;
    }
    if (superAdmins.length <= 1) {
      toast.error("Cannot delete the last super admin");
      return;
    }
    if (!confirm(`Are you sure you want to delete super admin "${user.username}"?`)) return;
    try {
      await deleteUser(user.id);
      toast.success(`Super admin "${user.username}" deleted`);
    } catch {
      toast.error("Failed to delete super admin");
    }
  };

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
    status: "active" as "active" | "inactive" | "archived",
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
          `Daycare created! Default login: Code: ${newDaycare.daycareCode}, Username: admin_${newDaycare.daycareCode.toLowerCase()}, Password: ${newDaycare.adminPassword || '(check logs)'}`,
          { duration: 15000 }
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

  const handleArchive = async (daycare: Daycare) => {
    if (!confirm(`Archive "${daycare.name}"? It will be hidden from the main list but can be restored later.`)) {
      return;
    }

    try {
      await archiveDaycare(daycare.id);
      toast.success(`"${daycare.name}" archived successfully`);
    } catch (error) {
      toast.error("Failed to archive daycare");
    }
  };

  const handleRestore = async (daycare: Daycare) => {
    try {
      await updateDaycare(daycare.id, { status: "active" });
      toast.success(`"${daycare.name}" restored successfully`);
    } catch (error) {
      toast.error("Failed to restore daycare");
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

  // Filter daycares by search term and archived status
  const filteredDaycares = daycares.filter(dc => {
    const matchesSearch = dc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dc.daycareCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (dc.city && dc.city.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesArchiveFilter = showArchived ? dc.status === "archived" : dc.status !== "archived";
    return matchesSearch && matchesArchiveFilter;
  });

  const archivedCount = daycares.filter(dc => dc.status === "archived").length;

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

  const handleActivateSubscription = async (daycare: Daycare, plan: SubscriptionPlan = "enterprise") => {
    try {
      await updateDaycare(daycare.id, {
        subscriptionStatus: "active",
        subscriptionPlan: plan,
      });
      toast.success(`Subscription activated for ${daycare.name} (${plan})`);
    } catch {
      toast.error("Failed to activate subscription");
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
      <div className="bg-gradient-to-r from-blue-700 to-blue-600 text-white rounded-lg p-4 sm:p-6 shadow-lg">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4">
            <img src={kidtrackerLogo} alt="KidTrackerApp Logo" className="h-10 sm:h-14 object-contain bg-white rounded-lg p-1 shrink-0" />
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-white mb-1">Super Admin Dashboard</h1>
              <p className="text-blue-50 text-xs sm:text-base">Manage all daycares in the KidTrackerApp™ system</p>
            </div>
          </div>
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

      {/* Search & Filter */}
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
        {archivedCount > 0 && (
          <Button
            variant={showArchived ? "default" : "outline"}
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
            className={showArchived ? "bg-amber-600 hover:bg-amber-700" : ""}
          >
            <Archive className="h-4 w-4 mr-2" />
            Archived ({archivedCount})
          </Button>
        )}
      </div>

      {/* Daycares Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredDaycares.length === 0 ? (
          <Card className="col-span-full border-blue-200">
            <CardContent className="py-12">
              <div className="text-center">
                <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? "No daycares found" : showArchived ? "No archived daycares" : "No daycares yet"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchTerm
                    ? "Try adjusting your search"
                    : showArchived
                    ? "Archived daycares will appear here"
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

            const trialBadge = daycare.status === "archived" ? (
              <Badge variant="outline" className="border-amber-500 bg-amber-50 text-amber-700">
                <Archive className="h-3 w-3 mr-1" />
                Archived
              </Badge>
            ) : trialInfo.isPermanentlyActive ? (
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
                    <div className="flex flex-col items-end gap-1">
                      {trialBadge}
                      {daycare.subscriptionPlan && daycare.subscriptionPlan !== "none" && (
                        <Badge variant="outline" className="text-xs border-purple-300 text-purple-700 bg-purple-50">
                          {daycare.subscriptionPlan.charAt(0).toUpperCase() + daycare.subscriptionPlan.slice(1)}
                        </Badge>
                      )}
                    </div>
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
                    <div className="space-y-2">
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
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          className="flex-1 text-xs bg-blue-600 hover:bg-blue-700"
                          onClick={() => handleActivateSubscription(daycare, "starter")}
                        >
                          Starter
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 text-xs bg-purple-600 hover:bg-purple-700"
                          onClick={() => handleActivateSubscription(daycare, "professional")}
                        >
                          Pro
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 text-xs bg-amber-600 hover:bg-amber-700"
                          onClick={() => handleActivateSubscription(daycare, "enterprise")}
                        >
                          Enterprise
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t justify-end">
                    {daycare.status === "archived" ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRestore(daycare)}
                          title="Restore daycare"
                        >
                          <ArchiveRestore className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(daycare)}
                          title="Permanently delete"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(daycare)}
                          title="Edit daycare"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleArchive(daycare)}
                          title="Archive daycare"
                        >
                          <Archive className="h-4 w-4 text-amber-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(daycare)}
                          title="Delete daycare"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Super Admins Section */}
      <Card className="border-purple-200">
        <CardHeader className="bg-purple-50 border-b border-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-purple-900 flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Super Admins
              </CardTitle>
              <CardDescription>Manage super admin accounts with full system access</CardDescription>
            </div>
            <Dialog open={isAddSuperAdminOpen} onOpenChange={(open) => {
              setIsAddSuperAdminOpen(open);
              if (!open) resetSuperAdminForm();
            }}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-purple-700 hover:bg-purple-800">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Super Admin
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Super Admin</DialogTitle>
                  <DialogDescription>
                    Create a new super admin account with full system access to all daycares.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddSuperAdmin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sa-username">Username *</Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="sa-username"
                        value={superAdminForm.username}
                        onChange={(e) => setSuperAdminForm({ ...superAdminForm, username: e.target.value })}
                        className="pl-10"
                        placeholder="Enter username"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sa-fullName">Full Name *</Label>
                    <Input
                      id="sa-fullName"
                      value={superAdminForm.fullName}
                      onChange={(e) => setSuperAdminForm({ ...superAdminForm, fullName: e.target.value })}
                      placeholder="Enter full name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sa-email">Email *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="sa-email"
                        type="email"
                        value={superAdminForm.email}
                        onChange={(e) => setSuperAdminForm({ ...superAdminForm, email: e.target.value })}
                        className="pl-10"
                        placeholder="Enter email"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sa-password">Password *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="sa-password"
                        type={showNewPassword ? "text" : "password"}
                        value={superAdminForm.password}
                        onChange={(e) => setSuperAdminForm({ ...superAdminForm, password: e.target.value })}
                        className="pl-10 pr-10"
                        placeholder="Min 8 characters"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sa-confirmPassword">Confirm Password *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="sa-confirmPassword"
                        type="password"
                        value={superAdminForm.confirmPassword}
                        onChange={(e) => setSuperAdminForm({ ...superAdminForm, confirmPassword: e.target.value })}
                        className="pl-10"
                        placeholder="Confirm password"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsAddSuperAdminOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-purple-700 hover:bg-purple-800">
                      Create Super Admin
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-3">
            {superAdmins.map((admin) => (
              <div key={admin.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center">
                    <Shield className="h-4 w-4 text-purple-700" />
                  </div>
                  <div>
                    <p className="font-medium">{admin.fullName}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-mono">{admin.username}</span>
                      <span>-</span>
                      <span>{admin.email}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {admin.id === currentUser?.id && (
                    <Badge variant="outline" className="border-purple-300 text-purple-700">You</Badge>
                  )}
                  <Badge variant="outline" className="border-green-300 text-green-700">{admin.status}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditSuperAdmin(admin)}
                    title="Edit super admin"
                  >
                    <Edit className="h-4 w-4 text-purple-600" />
                  </Button>
                  {admin.id !== currentUser?.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSuperAdmin(admin)}
                      title="Delete super admin"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {superAdmins.length === 0 && (
              <p className="text-center text-muted-foreground py-4">No super admins found</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Super Admin Dialog */}
      <Dialog open={isEditSuperAdminOpen} onOpenChange={(open) => {
        setIsEditSuperAdminOpen(open);
        if (!open) setEditingSuperAdmin(null);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Super Admin</DialogTitle>
            <DialogDescription>
              Update super admin account details
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateSuperAdmin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-sa-username">Username *</Label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="edit-sa-username"
                  value={editSuperAdminForm.username}
                  onChange={(e) => setEditSuperAdminForm({ ...editSuperAdminForm, username: e.target.value })}
                  className="pl-10"
                  placeholder="Enter username"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-sa-fullName">Full Name *</Label>
              <Input
                id="edit-sa-fullName"
                value={editSuperAdminForm.fullName}
                onChange={(e) => setEditSuperAdminForm({ ...editSuperAdminForm, fullName: e.target.value })}
                placeholder="Enter full name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-sa-email">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="edit-sa-email"
                  type="email"
                  value={editSuperAdminForm.email}
                  onChange={(e) => setEditSuperAdminForm({ ...editSuperAdminForm, email: e.target.value })}
                  className="pl-10"
                  placeholder="Enter email"
                  required
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-medium mb-3">Change Password (optional)</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-sa-password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="edit-sa-password"
                      type={showEditPassword ? "text" : "password"}
                      value={editSuperAdminForm.newPassword}
                      onChange={(e) => setEditSuperAdminForm({ ...editSuperAdminForm, newPassword: e.target.value })}
                      className="pl-10 pr-10"
                      placeholder="Leave blank to keep current"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {editSuperAdminForm.newPassword && (
                  <div className="space-y-2">
                    <Label htmlFor="edit-sa-confirmPassword">Confirm New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="edit-sa-confirmPassword"
                        type="password"
                        value={editSuperAdminForm.confirmPassword}
                        onChange={(e) => setEditSuperAdminForm({ ...editSuperAdminForm, confirmPassword: e.target.value })}
                        className="pl-10"
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditSuperAdminOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-purple-700 hover:bg-purple-800">
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
