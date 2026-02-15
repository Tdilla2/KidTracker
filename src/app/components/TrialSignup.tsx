import { useState } from "react";
import { Users, Building2, User, Mail, Phone, MapPin, ArrowLeft, Copy, Check, PartyPopper } from "lucide-react";
import { maskPhoneInput } from "../../lib/formatPhone";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

interface TrialSignupProps {
  onBackToLogin: () => void;
}

interface SignupResult {
  daycareCode: string;
  adminUsername: string;
  adminPassword: string;
  daycareName: string;
}

export function TrialSignup({ onBackToLogin }: TrialSignupProps) {
  const { addDaycare } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [signupResult, setSignupResult] = useState<SignupResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Form fields
  const [daycareName, setDaycareName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!daycareName.trim()) {
      toast.error("Daycare name is required");
      return;
    }
    if (!ownerName.trim()) {
      toast.error("Owner name is required");
      return;
    }
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }

    setIsLoading(true);

    try {
      const newDaycare = await addDaycare({
        name: daycareName.trim(),
        daycareCode: "",
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        zipCode: zip.trim(),
        phone: phone.trim(),
        email: email.trim(),
        status: "active",
      });

      const code = newDaycare.daycareCode;
      setSignupResult({
        daycareCode: code,
        adminUsername: `admin_${code.toLowerCase()}`,
        adminPassword: "Password123!",
        daycareName: newDaycare.name,
      });

      toast.success("Your free trial has been created!");
    } catch (error) {
      console.error("Signup error:", error);
      toast.error("Failed to create your trial. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Success screen after signup
  if (signupResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo and Branding */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-700 to-blue-600 rounded-2xl shadow-lg">
                <PartyPopper className="h-10 w-10 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">KidTrackerApp™</h1>
            <p className="text-blue-700">Powered by GDI Digital Solutions</p>
          </div>

          <Card className="border-2 border-green-200 shadow-xl">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl text-green-700">Your 14-day free trial has started!</CardTitle>
              <CardDescription>
                Welcome, <strong>{signupResult.daycareName}</strong>! Here are your login credentials.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Daycare Code */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <p className="text-sm text-blue-600 mb-1">Your Daycare Code</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl font-bold font-mono tracking-widest text-blue-800">
                    {signupResult.daycareCode}
                  </span>
                  <button
                    onClick={() => handleCopy(signupResult.daycareCode, "code")}
                    className="text-blue-500 hover:text-blue-700 p-1"
                    title="Copy daycare code"
                  >
                    {copied === "code" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Admin Credentials */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-gray-700 text-center">Admin Login Credentials</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Username:</span>
                    <div className="flex items-center gap-1">
                      <code className="bg-white px-2 py-1 rounded text-sm font-mono border">
                        {signupResult.adminUsername}
                      </code>
                      <button
                        onClick={() => handleCopy(signupResult.adminUsername, "username")}
                        className="text-gray-400 hover:text-gray-600 p-1"
                        title="Copy username"
                      >
                        {copied === "username" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Password:</span>
                    <div className="flex items-center gap-1">
                      <code className="bg-white px-2 py-1 rounded text-sm font-mono border">
                        {signupResult.adminPassword}
                      </code>
                      <button
                        onClick={() => handleCopy(signupResult.adminPassword, "password")}
                        className="text-gray-400 hover:text-gray-600 p-1"
                        title="Copy password"
                      >
                        {copied === "password" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-500 text-center">
                Please save these credentials. You can change your password after logging in.
              </p>

              <Button
                onClick={onBackToLogin}
                className="w-full bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700"
              >
                Go to Login
              </Button>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>&copy; {new Date().getFullYear()} GDI Digital Solutions. All rights reserved.</p>
          </div>
        </div>
      </div>
    );
  }

  // Registration form
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-700 to-blue-600 rounded-2xl shadow-lg">
              <Users className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">KidTrackerApp™</h1>
          <p className="text-blue-700">Powered by GDI Digital Solutions</p>
        </div>

        <Card className="border-2 border-blue-200 shadow-xl">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl">Start Your Free Trial</CardTitle>
            <CardDescription>Get 14 days of full access — no credit card required</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Daycare Name */}
              <div className="space-y-2">
                <Label htmlFor="signup-daycare-name">Daycare Name <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="signup-daycare-name"
                    type="text"
                    placeholder="e.g. Sunshine Daycare"
                    value={daycareName}
                    onChange={(e) => setDaycareName(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              {/* Owner Name */}
              <div className="space-y-2">
                <Label htmlFor="signup-owner-name">Owner Full Name <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="signup-owner-name"
                    type="text"
                    placeholder="e.g. Jane Smith"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="e.g. jane@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="signup-phone">Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="signup-phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={maskPhoneInput(phone)}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="signup-address">Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="signup-address"
                    type="text"
                    placeholder="Street address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* City, State, ZIP in a row */}
              <div className="grid grid-cols-6 gap-2">
                <div className="col-span-3 space-y-2">
                  <Label htmlFor="signup-city">City</Label>
                  <Input
                    id="signup-city"
                    type="text"
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="col-span-1 space-y-2">
                  <Label htmlFor="signup-state">State</Label>
                  <Input
                    id="signup-state"
                    type="text"
                    placeholder="ST"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    disabled={isLoading}
                    maxLength={2}
                    className="uppercase"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="signup-zip">ZIP</Label>
                  <Input
                    id="signup-zip"
                    type="text"
                    placeholder="ZIP"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    disabled={isLoading}
                    maxLength={10}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700"
                disabled={isLoading}
              >
                {isLoading ? "Creating your trial..." : "Start Free Trial"}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={onBackToLogin}
                className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to Login
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} GDI Digital Solutions. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
