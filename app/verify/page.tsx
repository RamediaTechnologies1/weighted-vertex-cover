"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTheme } from "@/lib/theme";

function maskEmail(value: string): string {
  const at = value.indexOf("@");
  if (at > 1) {
    return `${value[0]}***${value.slice(at)}`;
  }
  return value;
}

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resolvedTheme, setTheme } = useTheme();
  const email = searchParams.get("email") || "";
  const role = searchParams.get("role") || "";

  const maskedEmail = maskEmail(email);

  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email || !role) router.replace("/login");
  }, [email, role, router]);

  function toggleTheme() {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }

  function handleChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
    if (newPin.every((d) => d !== "")) verifyPin(newPin.join(""));
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setPin(pasted.split(""));
      verifyPin(pasted);
    }
  }

  async function verifyPin(code: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, pin: code, role }),
      });
      if (!res.ok) {
        toast.error("Invalid or expired code");
        setPin(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        return;
      }
      toast.success("Welcome to FixIt AI!");
      router.replace(`/${role}`);
    } catch {
      toast.error("Verification failed");
      setPin(["", "", "", "", "", ""]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#FAFAFA] dark:bg-[#0A0A0B]">
      {/* Theme toggle */}
      <div className="fixed top-4 right-4">
        <button
          onClick={toggleTheme}
          className="h-9 w-9 flex items-center justify-center rounded-[6px] border border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-[#141415] text-[#6B7280] dark:text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-[#1C1C1E] transition-colors duration-150"
        >
          {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      <div className="w-full max-w-[400px]">
        <div className="bg-white dark:bg-[#141415] border border-[#E5E7EB] dark:border-[#262626] rounded-[6px] p-8 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.2)]">
          <div className="text-center mb-6">
            <h1 className="text-[20px] font-medium text-[#111111] dark:text-[#E5E7EB] tracking-[-0.01em]">
              FixIt AI
            </h1>
            <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF] mt-1">
              University of Delaware
            </p>
          </div>

          <div className="text-center mb-6">
            <p className="text-[14px] text-[#111111] dark:text-[#E5E7EB]">
              Enter the 6-digit code sent to
            </p>
            <p className="text-[13px] font-medium text-[#00539F] dark:text-[#60A5FA] mt-1">{maskedEmail}</p>
            <p className="text-[11px] text-[#9CA3AF] dark:text-[#6B7280] mt-1">
              via email
            </p>
          </div>

          <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
            {pin.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={loading}
                className={`w-11 h-12 text-center text-[18px] font-semibold rounded-[6px] border outline-none transition-colors duration-150 disabled:opacity-50 ${
                  digit
                    ? "border-[#00539F] dark:border-[#3B82F6] bg-[#EFF6FF] dark:bg-[#1E293B] text-[#111111] dark:text-[#E5E7EB]"
                    : "border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-[#1C1C1E] text-[#111111] dark:text-[#E5E7EB] focus:border-[#00539F] dark:focus:border-[#3B82F6]"
                }`}
                autoFocus={i === 0}
              />
            ))}
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 mb-4">
              <Loader2 className="h-4 w-4 animate-spin text-[#00539F] dark:text-[#3B82F6]" />
              <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF]">Verifying...</p>
            </div>
          )}

          {!loading && (
            <p className="text-center text-[13px] text-[#9CA3AF] dark:text-[#6B7280] mb-6">
              Didn&apos;t receive the code? Check your spam folder.
            </p>
          )}

          <Button
            variant="ghost"
            className="w-full text-[14px] text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#111111] dark:hover:text-[#E5E7EB] hover:bg-[#F3F4F6] dark:hover:bg-[#1C1C1E] rounded-[6px] h-10"
            onClick={() => router.push("/login")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to login
          </Button>
        </div>

        <p className="text-center mt-4 text-[13px] text-[#9CA3AF] dark:text-[#6B7280]">
          HenHacks 2026
        </p>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] dark:bg-[#0A0A0B]">
          <div className="w-48 h-1 rounded-full overflow-hidden bg-[#E5E7EB] dark:bg-[#262626]">
            <div className="h-full w-1/3 bg-[#00539F] dark:bg-[#3B82F6] rounded-full skeleton-pulse" />
          </div>
        </div>
      }
    >
      <VerifyForm />
    </Suspense>
  );
}
