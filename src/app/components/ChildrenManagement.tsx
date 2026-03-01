import { useState, useEffect } from "react";
import { Baby, Plus, Edit, Trash2, Search, UserCheck, UserX, Camera, X, User, AlertTriangle, ArrowUpCircle } from "lucide-react";
import { format } from "date-fns";
import { formatPhone, maskPhoneInput } from "../../lib/formatPhone";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
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
import { Checkbox } from "./ui/checkbox";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import type { Child, RecurringCharge } from "../context/DataContext";
import { parseLocalDate, formatLocalDate } from "../../utils/dateUtils";
import { getChildLimit } from "../../utils/trialUtils";
import { toast } from "sonner";

interface ChildrenManagementProps {
  onNavigate?: (page: string) => void;
}

export function ChildrenManagement({ onNavigate }: ChildrenManagementProps) {
  const { children, addChild, updateChild, deleteChild } = useData();
  const { users, updateUser, currentDaycare } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [showLimitDialog, setShowLimitDialog] = useState(false);

  // Child limit based on subscription plan
  const childLimit = currentDaycare?.subscriptionStatus === "trial"
    ? Infinity // No limit during trial
    : getChildLimit(currentDaycare?.subscriptionPlan);
  const activeChildren = children.filter(c => c.status === "active").length;
  const isAtLimit = activeChildren >= childLimit;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  
  // Recurring charges state
  const [selectedCharges, setSelectedCharges] = useState<string[]>([]);
  const [chargeAmounts, setChargeAmounts] = useState<Record<string, string>>({});
  const [photoPreview, setPhotoPreview] = useState<string>("");
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    photo: "",
    parentName: "",
    parentEmail: "",
    parentPhone: "",
    emergencyContact: "",
    emergencyPhone: "",
    emergencyContact2: "",
    emergencyPhone2: "",
    authorizedPickup1: "",
    authorizedPickup1Phone: "",
    authorizedPickup2: "",
    authorizedPickup2Phone: "",
    authorizedPickup3: "",
    authorizedPickup3Phone: "",
    allergies: "",
    medicalNotes: "",
    status: "active" as "active" | "inactive",
    parentUserId: "",
  });

  // Charge options (similar to invoice creation)
  const chargeOptions = [
    { category: "Tuition", items: ["Monthly Tuition", "Weekly Tuition", "Daily Tuition"] },
    { category: "Meal Plans", items: ["Breakfast Plan", "Lunch Plan", "Snack Plan", "Full Meal Plan"] },
    { category: "Fees", items: ["Registration Fee", "Late Fees", "Late Pickup Fee", "Early Drop-off Fee"] },
    { category: "Activities", items: ["Activity Fee", "Field Trip Fee", "Supply Fee", "Extended Care Fee"] }
  ];

  // Get parent users for selection - only show parents from the current daycare
  const parentUsers = users.filter(u => u.role === "parent" && currentDaycare && u.daycareId === currentDaycare.id);

  const filteredChildren = children.filter(child =>
    `${child.firstName} ${child.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    child.parentName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Build recurring charges array
    const recurringCharges: RecurringCharge[] = selectedCharges.map(charge => ({
      description: charge,
      amount: parseFloat(chargeAmounts[charge] || "0")
    }));
    
    const childData = {
      ...formData,
      recurringCharges: recurringCharges.length > 0 ? recurringCharges : undefined
    };
    
    if (editingChild) {
      updateChild(editingChild.id, childData);
      toast.success("Child information updated successfully");
    } else {
      addChild(childData);
      
      // If parent user selected, update their childIds
      if (formData.parentUserId) {
        const parent = users.find(u => u.id === formData.parentUserId);
        if (parent) {
          const newChildId = Date.now().toString(); // This matches the ID generation in addChild
          updateUser(formData.parentUserId, {
            childIds: [...(parent.childIds || []), newChildId]
          });
        }
      }
      
      toast.success("Child added successfully");
    }
    
    resetForm();
    setIsDialogOpen(false);
  };

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      photo: "",
      parentName: "",
      parentEmail: "",
      parentPhone: "",
      emergencyContact: "",
      emergencyPhone: "",
      emergencyContact2: "",
      emergencyPhone2: "",
      authorizedPickup1: "",
      authorizedPickup1Phone: "",
      authorizedPickup2: "",
      authorizedPickup2Phone: "",
      authorizedPickup3: "",
      authorizedPickup3Phone: "",
      allergies: "",
      medicalNotes: "",
      status: "active",
      parentUserId: "",
    });
    setEditingChild(null);
    setSelectedCharges([]);
    setChargeAmounts({});
    setPhotoPreview("");
  };

  const handleEdit = (child: Child) => {
    setEditingChild(child);
    setFormData({
      firstName: child.firstName,
      lastName: child.lastName,
      dateOfBirth: child.dateOfBirth,
      photo: child.photo || "",
      parentName: child.parentName,
      parentEmail: child.parentEmail,
      parentPhone: child.parentPhone,
      emergencyContact: child.emergencyContact || "",
      emergencyPhone: child.emergencyPhone || "",
      emergencyContact2: child.emergencyContact2 || "",
      emergencyPhone2: child.emergencyPhone2 || "",
      authorizedPickup1: child.authorizedPickup1 || "",
      authorizedPickup1Phone: child.authorizedPickup1Phone || "",
      authorizedPickup2: child.authorizedPickup2 || "",
      authorizedPickup2Phone: child.authorizedPickup2Phone || "",
      authorizedPickup3: child.authorizedPickup3 || "",
      authorizedPickup3Phone: child.authorizedPickup3Phone || "",
      allergies: child.allergies || "",
      medicalNotes: child.medicalNotes || "",
      status: child.status,
      parentUserId: child.parentUserId || "",
    });
    
    // Set photo preview if photo exists
    if (child.photo) {
      setPhotoPreview(child.photo);
    }
    
    // Set recurring charges if exists, otherwise clear them
    if (child.recurringCharges && child.recurringCharges.length > 0) {
      const charges = child.recurringCharges.map((c: RecurringCharge) => c.description);
      setSelectedCharges(charges);
      const amounts: Record<string, string> = {};
      child.recurringCharges.forEach((c: RecurringCharge) => {
        amounts[c.description] = c.amount.toString();
      });
      setChargeAmounts(amounts);
    } else {
      // Clear recurring charges if this child doesn't have any
      setSelectedCharges([]);
      setChargeAmounts({});
    }
    
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      deleteChild(id);
      toast.success("Child removed successfully");
    }
  };

  const handleToggleCharge = (charge: string, checked: boolean) => {
    if (checked) {
      setSelectedCharges([...selectedCharges, charge]);
    } else {
      setSelectedCharges(selectedCharges.filter(c => c !== charge));
      const newAmounts = { ...chargeAmounts };
      delete newAmounts[charge];
      setChargeAmounts(newAmounts);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
        setFormData({ ...formData, photo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-700 to-blue-600 text-white rounded-lg p-4 sm:p-6 shadow-lg">
        <h1 className="text-white text-xl sm:text-3xl">Children Management</h1>
        <p className="text-blue-50 text-xs sm:text-base">Manage enrolled children and family information</p>
      </div>
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            placeholder="Search children or parents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {/* Upgrade prompt dialog */}
        <Dialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
                Child Limit Reached
              </DialogTitle>
              <DialogDescription>
                Your <span className="font-semibold capitalize">{currentDaycare?.subscriptionPlan}</span> plan allows up to <span className="font-semibold">{childLimit}</span> children.
                You currently have <span className="font-semibold">{activeChildren}</span> active children enrolled.
              </DialogDescription>
            </DialogHeader>
            <p className="text-sm text-gray-600">
              Upgrade your plan to enroll more children and unlock additional features.
            </p>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setShowLimitDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => { setShowLimitDialog(false); onNavigate?.("billing"); }}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                <ArrowUpCircle className="h-4 w-4 mr-2" />
                Upgrade Plan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button
              className="bg-blue-700 hover:bg-blue-800"
              onClick={(e) => {
                if (isAtLimit) {
                  e.preventDefault();
                  setShowLimitDialog(true);
                }
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Child
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingChild ? "Edit Child" : "Add New Child"}</DialogTitle>
              <DialogDescription>
                {editingChild ? "Update the child's information below." : "Enter the child's information to add them to the system."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                <div className="flex gap-2">
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="flex-1"
                    required
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        type="button"
                        className="px-3"
                      >
                        <CalendarIcon className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={formData.dateOfBirth ? parseLocalDate(formData.dateOfBirth) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            setFormData({ ...formData, dateOfBirth: format(date, "yyyy-MM-dd") });
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: "active" | "inactive") => setFormData({ ...formData, status: value })}
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

              {/* Photo Upload */}
              <div className="border-t pt-4">
                <h3 className="font-medium mb-4">Child Photo</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    {(photoPreview || formData.photo) ? (
                      <div className="relative">
                        <img
                          src={photoPreview || formData.photo}
                          alt="Child photo preview"
                          className="w-24 h-24 rounded-full object-cover border-2 border-blue-200"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                          onClick={() => {
                            setPhotoPreview("");
                            setFormData({ ...formData, photo: "" });
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
                        <User className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <Label htmlFor="photo" className="cursor-pointer">
                        <div className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors w-fit">
                          <Camera className="h-4 w-4" />
                          <span className="text-sm">{formData.photo ? "Change Photo" : "Upload Photo"}</span>
                        </div>
                      </Label>
                      <Input
                        id="photo"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Recommended: Square image, at least 200x200px
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Parent/Guardian Information */}
              <div className="border-t pt-4">
                <h3 className="font-medium mb-4">Parent/Guardian Information</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="parentUserId">Link to Parent Account (Optional)</Label>
                    <Select
                      value={formData.parentUserId || "none"}
                      onValueChange={(value) => setFormData({ ...formData, parentUserId: value === "none" ? "" : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select parent user account..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No parent account</SelectItem>
                        {parentUsers.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.fullName} ({user.username})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Link this child to a parent user account to give them portal access
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="parentName">Parent/Guardian Name *</Label>
                    <Input
                      id="parentName"
                      value={formData.parentName}
                      onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="parentEmail">Email *</Label>
                      <Input
                        id="parentEmail"
                        type="email"
                        value={formData.parentEmail}
                        onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parentPhone">Phone *</Label>
                      <Input
                        id="parentPhone"
                        type="tel"
                        value={maskPhoneInput(formData.parentPhone)}
                        onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                        placeholder="(555) 123-4567"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="border-t pt-4">
                <h3 className="font-medium mb-4">Emergency Contact</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContact">Contact Name</Label>
                    <Input
                      id="emergencyContact"
                      value={formData.emergencyContact}
                      onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergencyPhone">Contact Phone</Label>
                    <Input
                      id="emergencyPhone"
                      type="tel"
                      value={maskPhoneInput(formData.emergencyPhone)}
                      onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Contact 2 */}
              <div className="border-t pt-4">
                <h3 className="font-medium mb-4">Additional Emergency Contact</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContact2">Contact Name</Label>
                    <Input
                      id="emergencyContact2"
                      value={formData.emergencyContact2}
                      onChange={(e) => setFormData({ ...formData, emergencyContact2: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergencyPhone2">Contact Phone</Label>
                    <Input
                      id="emergencyPhone2"
                      type="tel"
                      value={maskPhoneInput(formData.emergencyPhone2)}
                      onChange={(e) => setFormData({ ...formData, emergencyPhone2: e.target.value })}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </div>

              {/* Authorized Pickup */}
              <div className="border-t pt-4">
                <h3 className="font-medium mb-4">Authorized Pickup Persons</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  List people authorized to pick up this child (in addition to parent/guardian)
                </p>
                
                {/* Authorized Pickup 1 */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="authorizedPickup1">Authorized Person 1</Label>
                      <Input
                        id="authorizedPickup1"
                        value={formData.authorizedPickup1}
                        onChange={(e) => setFormData({ ...formData, authorizedPickup1: e.target.value })}
                        placeholder="Full Name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="authorizedPickup1Phone">Phone Number</Label>
                      <Input
                        id="authorizedPickup1Phone"
                        type="tel"
                        value={maskPhoneInput(formData.authorizedPickup1Phone)}
                        onChange={(e) => setFormData({ ...formData, authorizedPickup1Phone: e.target.value })}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>

                  {/* Authorized Pickup 2 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="authorizedPickup2">Authorized Person 2</Label>
                      <Input
                        id="authorizedPickup2"
                        value={formData.authorizedPickup2}
                        onChange={(e) => setFormData({ ...formData, authorizedPickup2: e.target.value })}
                        placeholder="Full Name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="authorizedPickup2Phone">Phone Number</Label>
                      <Input
                        id="authorizedPickup2Phone"
                        type="tel"
                        value={maskPhoneInput(formData.authorizedPickup2Phone)}
                        onChange={(e) => setFormData({ ...formData, authorizedPickup2Phone: e.target.value })}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>

                  {/* Authorized Pickup 3 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="authorizedPickup3">Authorized Person 3</Label>
                      <Input
                        id="authorizedPickup3"
                        value={formData.authorizedPickup3}
                        onChange={(e) => setFormData({ ...formData, authorizedPickup3: e.target.value })}
                        placeholder="Full Name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="authorizedPickup3Phone">Phone Number</Label>
                      <Input
                        id="authorizedPickup3Phone"
                        type="tel"
                        value={maskPhoneInput(formData.authorizedPickup3Phone)}
                        onChange={(e) => setFormData({ ...formData, authorizedPickup3Phone: e.target.value })}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Medical Information */}
              <div className="border-t pt-4">
                <h3 className="font-medium mb-4">Medical Information</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="allergies">Allergies</Label>
                    <Input
                      id="allergies"
                      value={formData.allergies}
                      onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                      placeholder="e.g., Peanuts, Dairy"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="medicalNotes">Medical Notes</Label>
                    <Input
                      id="medicalNotes"
                      value={formData.medicalNotes}
                      onChange={(e) => setFormData({ ...formData, medicalNotes: e.target.value })}
                      placeholder="Any special medical conditions or notes"
                    />
                  </div>
                </div>
              </div>

              {/* Recurring Charges */}
              <div className="border-t pt-4">
                <h3 className="font-medium mb-2">Monthly Recurring Charges</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Select charges that will be applied to this child monthly
                </p>
                <div className="space-y-4">
                  {chargeOptions.map((category) => (
                    <div key={category.category}>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">{category.category}</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {category.items.map((item) => (
                          <div key={item} className="flex items-center space-x-2">
                            <Checkbox
                              id={`charge-${item}`}
                              checked={selectedCharges.includes(item)}
                              onCheckedChange={(checked) => handleToggleCharge(item, checked as boolean)}
                            />
                            <Label htmlFor={`charge-${item}`} className="text-sm cursor-pointer">
                              {item}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Charge Amounts */}
              {selectedCharges.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-4">Set Charge Amounts</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedCharges.map((charge) => (
                      <div key={charge} className="space-y-2">
                        <Label htmlFor={`amount-${charge}`}>{charge}</Label>
                        <div className="flex items-center">
                          <span className="mr-2">$</span>
                          <Input
                            id={`amount-${charge}`}
                            type="number"
                            step="0.01"
                            min="0"
                            value={chargeAmounts[charge] || ""}
                            onChange={(e) => setChargeAmounts({ ...chargeAmounts, [charge]: e.target.value })}
                            placeholder="0.00"
                            required
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-blue-700 to-blue-600"
                >
                  {editingChild ? "Update" : "Add"} Child
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Children List */}
      <div className="grid gap-4">
        {filteredChildren.map((child) => {
          const parentUser = child.parentUserId ? users.find(u => u.id === child.parentUserId) : null;
          
          return (
            <Card key={child.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2 sm:gap-4">
                  <div className="flex items-start gap-2 sm:gap-4 flex-1 min-w-0">
                    {/* Child Photo */}
                    {child.photo ? (
                      <img
                        src={child.photo}
                        alt={`${child.firstName} ${child.lastName}`}
                        className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-blue-200 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-200 shrink-0">
                        <User className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <CardTitle className="text-base sm:text-lg truncate">{child.firstName} {child.lastName}</CardTitle>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        DOB: {formatLocalDate(child.dateOfBirth)}
                      </p>
                      {parentUser && (
                        <Badge variant="outline" className="mt-2 text-xs">
                          <span className="hidden sm:inline">Connected Parent Portal Access: </span>
                          <span className="sm:hidden">Parent: </span>
                          {parentUser.fullName}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <Badge variant={child.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                      {child.status}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(child)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(child.id, `${child.firstName} ${child.lastName}`)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Parent/Guardian</h4>
                    <p className="text-sm">{child.parentName}</p>
                    <p className="text-sm text-muted-foreground">{child.parentEmail}</p>
                    <p className="text-sm text-muted-foreground">{formatPhone(child.parentPhone)}</p>
                  </div>
                  {child.emergencyContact && (
                    <div>
                      <h4 className="font-medium mb-2">Emergency Contact</h4>
                      <p className="text-sm">{child.emergencyContact}</p>
                      <p className="text-sm text-muted-foreground">{formatPhone(child.emergencyPhone)}</p>
                    </div>
                  )}
                </div>
                {(child.allergies || child.medicalNotes) && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-medium mb-2">Medical Information</h4>
                    {child.allergies && (
                      <p className="text-sm">
                        <span className="font-medium">Allergies:</span> {child.allergies}
                      </p>
                    )}
                    {child.medicalNotes && (
                      <p className="text-sm">
                        <span className="font-medium">Notes:</span> {child.medicalNotes}
                      </p>
                    )}
                  </div>
                )}
                {child.recurringCharges && child.recurringCharges.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-medium mb-2">Monthly Recurring Charges</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {child.recurringCharges.map((charge: RecurringCharge, idx: number) => (
                        <div key={idx} className="text-sm flex justify-between">
                          <span>{charge.description}:</span>
                          <span className="font-medium">${charge.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Total: ${child.recurringCharges.reduce((sum: number, c: RecurringCharge) => sum + c.amount, 0).toFixed(2)}/month
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {filteredChildren.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No children found. Add your first child to get started.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}