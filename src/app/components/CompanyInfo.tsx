import { useState, useRef } from "react";
import { Building2, Save, Mail, Phone, Globe, MapPin, Hash, AlertCircle, Copy, Upload, Clock, ImageIcon, X } from "lucide-react";
import defaultLogo from "../assets/kidtracker-logo.jpg";
import { formatPhone, maskPhoneInput } from "../../lib/formatPhone";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { validateZipCode } from "../utils/zipCodeValidator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import type { OperatingHours } from "../context/DataContext";

export function CompanyInfo() {
  const { companyInfo, updateCompanyInfo } = useData();
  const { currentDaycare } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(companyInfo);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string>("");
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [suggestedCity, setSuggestedCity] = useState("");
  const [suggestedState, setSuggestedState] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be smaller than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData({ ...formData, logo: event.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setFormData({ ...formData, logo: "" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleHoursChange = (day: string, field: "open" | "close", value: string) => {
    setFormData({
      ...formData,
      operatingHours: {
        ...formData.operatingHours,
        [day]: { ...formData.operatingHours[day], [field]: value },
      },
    });
  };

  const handleClosedToggle = (day: string) => {
    setFormData({
      ...formData,
      operatingHours: {
        ...formData.operatingHours,
        [day]: { ...formData.operatingHours[day], closed: !formData.operatingHours[day].closed },
      },
    });
  };

  const formatTime = (time: string) => {
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${h12}:${m} ${ampm}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate zip code before submitting
    setIsValidating(true);
    const validationResult = await validateZipCode(
      formData.zipCode,
      formData.city,
      formData.state
    );
    setIsValidating(false);

    if (!validationResult.isValid) {
      // Show error dialog
      setValidationError(validationResult.message || "Invalid ZIP code");
      setSuggestedCity(validationResult.suggestedCity || "");
      setSuggestedState(validationResult.suggestedState || "");
      setShowValidationDialog(true);
      return;
    }

    // If valid, proceed with save
    try {
      console.log("Saving company info, formData:", { ...formData, logo: formData.logo ? `[base64 ${formData.logo.length} chars]` : "empty" });
      await updateCompanyInfo(formData);
      setIsEditing(false);
      toast.success("Company information updated successfully");
    } catch (err: any) {
      console.error("Error saving company info:", err);
      toast.error("Failed to save: " + (err?.message || "Unknown error"));
    }
  };

  const handleAcceptSuggestion = () => {
    if (suggestedCity && suggestedState) {
      setFormData({
        ...formData,
        city: suggestedCity,
        state: suggestedState,
      });
      toast.info("Address updated with suggested values");
    }
    setShowValidationDialog(false);
  };

  const handleCancel = () => {
    setFormData(companyInfo);
    setIsEditing(false);
  };

  // If no company info, start in edit mode
  const isNewSetup = !companyInfo.name && !isEditing;

  if (isNewSetup) {
    setIsEditing(true);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-600 text-white rounded-lg p-4 sm:p-6 shadow-lg">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-white text-xl sm:text-3xl">Company Information</h1>
            <p className="text-blue-50 text-xs sm:text-base">Manage your daycare center's details</p>
          </div>
          {!isEditing && companyInfo.name && (
            <Button
              onClick={() => setIsEditing(true)}
              className="bg-white text-blue-700 hover:bg-blue-50"
            >
              Edit Information
            </Button>
          )}
        </div>
      </div>

      {isEditing ? (
        // Edit Mode
        <Card>
          <CardHeader>
            <CardTitle>Edit Company Details</CardTitle>
            <CardDescription>
              Update your daycare center's information below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Company Logo */}
              <div className="space-y-4">
                <h3 className="font-medium text-lg">Company Logo</h3>
                <div className="flex items-start gap-6">
                  <div className="flex items-center justify-center w-28 h-28 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0">
                    {formData.logo ? (
                      <img src={formData.logo} alt="Company logo" className="w-full h-full object-contain" />
                    ) : (
                      <ImageIcon className="h-10 w-10 text-gray-300" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Logo
                      </Button>
                      {formData.logo && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleRemoveLogo}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="mr-2 h-4 w-4" />
                          Remove
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, or SVG. Max 2MB. This will appear on invoices and reports.
                    </p>
                  </div>
                </div>
              </div>

              {/* Basic Information */}
              <div className="space-y-4 border-t pt-6">
                <h3 className="font-medium text-lg">Basic Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Daycare Center Name *</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Little Stars Daycare"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  {currentDaycare && (
                    <div className="space-y-2">
                      <Label htmlFor="daycareCode">Daycare Code</Label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <div className="flex gap-2">
                          <Input
                            id="daycareCode"
                            value={currentDaycare.daycareCode}
                            className="pl-10 bg-gray-100 font-mono font-bold tracking-wider"
                            readOnly
                            disabled
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              navigator.clipboard.writeText(currentDaycare.daycareCode);
                              toast.success("Daycare code copied to clipboard");
                            }}
                            title="Copy code"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Share this code with staff to allow them to log in
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="phone"
                        type="tel"
                        value={maskPhoneInput(formData.phone)}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="(555) 123-4567"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="info@littlestars.com"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website (Optional)</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="website"
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://www.littlestars.com"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-4 border-t pt-6">
                <h3 className="font-medium text-lg">Address</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Street Address *</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="123 Main Street"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2 md:col-span-1">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Springfield"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="CA"
                      maxLength={2}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="zipCode">ZIP Code *</Label>
                    <Input
                      id="zipCode"
                      value={formData.zipCode}
                      onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                      placeholder="12345"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Tax Information */}
              <div className="space-y-4 border-t pt-6">
                <h3 className="font-medium text-lg">Tax Information</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="taxId">Tax ID / EIN (Optional)</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="taxId"
                      value={formData.taxId}
                      onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                      placeholder="12-3456789"
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your Employer Identification Number for tax purposes
                  </p>
                </div>
              </div>

              {/* Operating Hours */}
              <div className="space-y-4 border-t pt-6">
                <h3 className="font-medium text-lg">Operating Hours</h3>
                <div className="space-y-3">
                  {DAYS_OF_WEEK.map((day) => (
                    <div key={day} className="flex items-center gap-4">
                      <span className="w-28 text-sm font-medium">{day}</span>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!formData.operatingHours[day]?.closed}
                          onChange={() => handleClosedToggle(day)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-muted-foreground">Open</span>
                      </label>
                      {!formData.operatingHours[day]?.closed ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="time"
                            value={formData.operatingHours[day]?.open || "07:00"}
                            onChange={(e) => handleHoursChange(day, "open", e.target.value)}
                            className="w-32"
                          />
                          <span className="text-sm text-muted-foreground">to</span>
                          <Input
                            type="time"
                            value={formData.operatingHours[day]?.close || "18:00"}
                            onChange={(e) => handleHoursChange(day, "close", e.target.value)}
                            className="w-32"
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">Closed</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t">
                {companyInfo.name && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isValidating}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700"
                  disabled={isValidating}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isValidating ? "Validating..." : "Save Company Information"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        // View Mode
        <div className="grid gap-6 md:grid-cols-2">
          {/* Company Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-700" />
                Company Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Logo Display */}
              <div className="flex justify-center pb-2">
                <img
                  src={companyInfo.logo || defaultLogo}
                  alt="Company logo"
                  className="max-h-24 max-w-[200px] object-contain rounded-lg border p-2"
                />
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Daycare Name</p>
                <p className="text-lg font-semibold">{companyInfo.name || "Not set"}</p>
              </div>

              {/* Daycare Code */}
              {currentDaycare && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-800 mb-1">Daycare Code</p>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xl text-blue-900 tracking-wider">
                      {currentDaycare.daycareCode}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(currentDaycare.daycareCode);
                        toast.success("Daycare code copied to clipboard");
                      }}
                      className="text-blue-700 hover:text-blue-800 p-1"
                      title="Copy code"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">Share this code with staff to allow them to log in</p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  Phone
                </p>
                <p>{companyInfo.phone ? formatPhone(companyInfo.phone) : "Not set"}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  Email
                </p>
                <p>{companyInfo.email || "Not set"}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  Website
                </p>
                <p>{companyInfo.website || "Not set"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Location Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-700" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Address</p>
                <p>{companyInfo.address || "Not set"}</p>
                <p>
                  {companyInfo.city && companyInfo.state && companyInfo.zipCode
                    ? `${companyInfo.city}, ${companyInfo.state} ${companyInfo.zipCode}`
                    : "Not set"}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  Tax ID / EIN
                </p>
                <p>{companyInfo.taxId || "Not set"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Operating Hours Card */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-700" />
                Operating Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {DAYS_OF_WEEK.map((day) => {
                  const hours = companyInfo.operatingHours[day];
                  return (
                    <div
                      key={day}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        hours?.closed ? "bg-gray-50 text-muted-foreground" : "bg-blue-50 border-blue-200"
                      }`}
                    >
                      <span className="font-medium text-sm">{day}</span>
                      <span className="text-sm">
                        {hours?.closed ? "Closed" : `${formatTime(hours?.open || "07:00")} - ${formatTime(hours?.close || "18:00")}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Company Profile Summary</CardTitle>
              <CardDescription>
                This information will appear on invoices, reports, and other official documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 p-6 border-2 border-blue-200">
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-16 h-16 bg-white rounded-lg shadow-lg flex-shrink-0 overflow-hidden">
                    <img src={companyInfo.logo || defaultLogo} alt="Company logo" className="w-full h-full object-contain p-1" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {companyInfo.name || "Your Daycare Name"}
                    </h3>
                    <div className="grid md:grid-cols-2 gap-2 text-sm text-gray-700">
                      <p className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-blue-700" />
                        {companyInfo.address
                          ? `${companyInfo.address}, ${companyInfo.city}, ${companyInfo.state}`
                          : "Address not set"}
                      </p>
                      <p className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-blue-700" />
                        {companyInfo.phone ? formatPhone(companyInfo.phone) : "Phone not set"}
                      </p>
                      <p className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-blue-700" />
                        {companyInfo.email || "Email not set"}
                      </p>
                      <p className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-blue-700" />
                        {companyInfo.website || "Website not set"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Validation Dialog */}
      <AlertDialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Validation Error</AlertDialogTitle>
            <AlertDialogDescription>
              {validationError}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAcceptSuggestion}
            >
              Accept Suggestion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}