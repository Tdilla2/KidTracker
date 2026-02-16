import { useState } from "react";
import { Users, Building2, User, Mail, KeyRound, ArrowLeft, Copy, CheckCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

interface ForgotPasswordProps {
  onBackToLogin: () => void;
}

export function ForgotPassword({ onBackToLogin }: ForgotPasswordProps) {
  const { resetPassword } = useAuth();
  const [daycareCode, setDaycareCode] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!daycareCode || !username || !email) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);

    try {
      const result = await resetPassword(daycareCode, username, email);

      if (result.success && result.tempPassword) {
        setTempPassword(result.tempPassword);
        toast.success("Password has been reset!");
      } else {
        toast.error("No matching account found. Please check your daycare code, username, and email.");
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyPassword = () => {
    if (!tempPassword) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(tempPassword).then(() => {
          setCopied(true);
          toast.success("Temporary password copied!");
          setTimeout(() => setCopied(false), 3000);
        }).catch(() => {
          fallbackCopy(tempPassword);
        });
      } else {
        fallbackCopy(tempPassword);
      }
    } catch {
      fallbackCopy(tempPassword);
    }
  };

  const fallbackCopy = (text: string) => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    try {
      textarea.select();
      document.execCommand("copy");
      setCopied(true);
      toast.success("Temporary password copied!");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("Failed to copy. Please copy manually: " + text);
    } finally {
      document.body.removeChild(textarea);
    }
  };

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
            <div className="flex justify-center mb-2">
              <KeyRound className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Forgot Password</CardTitle>
            <CardDescription>
              {tempPassword
                ? "Your password has been reset. Use the temporary password below to log in."
                : "Verify your identity to reset your password."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tempPassword ? (
              /* Success state - show temp password */
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                  <p className="text-sm text-green-700 mb-2 font-medium">Your temporary password:</p>
                  <div className="flex items-center justify-center gap-2">
                    <code className="text-lg font-mono font-bold text-green-800 bg-white px-4 py-2 rounded border border-green-300">
                      {tempPassword}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyPassword}
                      className="border-green-300 hover:bg-green-100"
                    >
                      {copied ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4 text-green-600" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-green-600 mt-2">
                    You will be asked to set a new password after logging in.
                  </p>
                </div>

                <Button
                  className="w-full bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700"
                  onClick={onBackToLogin}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Button>
              </div>
            ) : (
              /* Form state */
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-daycare-code">Daycare Code</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="forgot-daycare-code"
                      type="text"
                      placeholder="Enter your daycare code"
                      value={daycareCode}
                      onChange={(e) => setDaycareCode(e.target.value.toUpperCase())}
                      className="pl-10 uppercase font-mono tracking-wider"
                      disabled={isLoading}
                      maxLength={6}
                      autoFocus
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="forgot-username">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="forgot-username"
                      type="text"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700"
                  disabled={isLoading}
                >
                  {isLoading ? "Verifying..." : "Reset Password"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-gray-600 hover:text-gray-800"
                  onClick={onBackToLogin}
                  disabled={isLoading}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Button>
              </form>
            )}
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
