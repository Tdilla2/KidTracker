import { useState, useEffect } from "react";
import { Users, Lock, User, Eye, EyeOff, Building2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

interface LoginProps {
  onStartTrial?: () => void;
  onForgotPassword?: () => void;
}

export function Login({ onStartTrial, onForgotPassword }: LoginProps) {
  const { login } = useAuth();
  const [daycareCode, setDaycareCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Clear form fields when component mounts (e.g., after logout)
  useEffect(() => {
    setDaycareCode("");
    setUsername("");
    setPassword("");
    setShowPassword(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      toast.error("Please enter username and password");
      return;
    }

    setIsLoading(true);

    try {
      // Pass daycare code if provided (empty string becomes undefined)
      const result = await login(
        username,
        password,
        daycareCode.trim() || undefined
      );

      if (result.success) {
        if (result.daycareName) {
          toast.success(`Welcome to ${result.daycareName}!`);
        } else {
          toast.success("Login successful!");
        }
      } else if (result.trialExpired) {
        toast.error(
          `The free trial for ${result.daycareName} has expired. Contact GDI Digital Solutions to activate your subscription.`,
          { duration: 8000 }
        );
      } else {
        toast.error("Invalid credentials. Please check your daycare code, username, and password.");
      }
    } catch (error) {
      toast.error("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
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

        {/* Login Card */}
        <Card className="border-2 border-blue-200 shadow-xl">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>Sign in to your KidTrackerApp™ account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
              {/* Hidden fields to trick browser autofill */}
              <input type="text" name="prevent_autofill" id="prevent_autofill" style={{ display: 'none' }} />
              <input type="password" name="prevent_autofill_pass" id="prevent_autofill_pass" style={{ display: 'none' }} />

              {/* Daycare Code */}
              <div className="space-y-2">
                <Label htmlFor="login-daycare-code">Daycare Code</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="login-daycare-code"
                    name="login-daycare-code"
                    type="text"
                    placeholder="Enter your daycare code"
                    value={daycareCode}
                    onChange={(e) => setDaycareCode(e.target.value.toUpperCase())}
                    className="pl-10 uppercase font-mono tracking-wider"
                    disabled={isLoading}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="characters"
                    spellCheck="false"
                    maxLength={6}
                  />
                </div>
                <p className="text-xs text-gray-500">Enter the 6-character code provided by your daycare</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="login-username"
                    name="login-username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                    autoComplete="new-password"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="login-password"
                    name="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>

              {onForgotPassword && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={onForgotPassword}
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              {onStartTrial && (
                <div className="text-center pt-2 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Don't have an account?{" "}
                    <button
                      type="button"
                      onClick={onStartTrial}
                      className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
                    >
                      Start your 14-day free trial
                    </button>
                  </p>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} GDI Digital Solutions. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}