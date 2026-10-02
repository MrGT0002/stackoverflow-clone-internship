import Link from "next/link";
import { useState } from "react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import axiosInstance from "@/lib/axiosinstance";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: any) => {
    event.preventDefault();
    if (!identifier.trim()) {
      toast.error("Enter your registered email address or phone number");
      return;
    }

    setLoading(true);
    try {
      const response = await axiosInstance.post("/password/forgot", {
        identifier: identifier.trim(),
      });
      setSent(true);
      toast.success(response.data?.message || "Your new password has been sent.");
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Unable to reset your password"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 lg:mb-8">
          <Link href="/" className="flex items-center justify-center mb-4">
            <div className="w-6 h-6 lg:w-8 lg:h-8 bg-orange-500 rounded mr-2 flex items-center justify-center">
              <div className="w-4 h-4 lg:w-6 lg:h-6 bg-white rounded-sm flex items-center justify-center">
                <div className="w-3 h-3 lg:w-4 lg:h-4 bg-orange-500 rounded-sm"></div>
              </div>
            </div>
            <span className="text-lg lg:text-xl font-bold text-gray-800">
              stack<span className="font-normal">overflow</span>
            </span>
          </Link>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-xl lg:text-2xl">
                Reset your password
              </CardTitle>
              <CardDescription>
                Enter the email address or phone number registered with your
                account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier" className="text-sm">
                  Email or phone number
                </Label>
                <Input
                  id="identifier"
                  type="text"
                  autoComplete="username"
                  placeholder="you@example.com or +91 9876543210"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  disabled={loading || sent}
                />
              </div>

              <div className="rounded-md border bg-gray-50 p-3 text-xs text-gray-600">
                For security, you can use this option only{" "}
                <strong>one time per day</strong>. A temporary password
                containing only uppercase and lowercase letters will be sent to
                your registered email or phone.
              </div>

              <Button
                type="submit"
                disabled={loading || sent}
                className="w-full bg-blue-600 hover:bg-blue-700 text-sm"
              >
                {loading ? "Sending..." : sent ? "Password sent" : "Reset password"}
              </Button>

              <div className="text-center text-sm">
                Remember your password?{" "}
                <Link href="/auth" className="text-blue-600 hover:underline">
                  Log in
                </Link>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
