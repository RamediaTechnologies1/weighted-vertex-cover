"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Sun, Moon, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useTheme } from "@/lib/theme";
import type { UserRole } from "@/lib/types";

const ROLES: {
  value: UserRole;
  label: string;
  desc: string;
}[] = [
  {
    value: "user",
    label: "Report",
    desc: "Report a maintenance issue",
  },
  {
    value: "technician",
    label: "Technician",
    desc: "View & complete work orders",
  },
  {
    value: "manager",
    label: "Manager",
    desc: "AI dashboard & oversight",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleTheme() {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !role) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to send PIN");
        return;
      }

      toast.success("PIN sent! Check your email.");
      router.push(`/verify?email=${encodeURIComponent(email)}&role=${role}`);
    } catch {
      toast.error("Something went wrong. Try again.");
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

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-[#374151] dark:text-[#D1D5DB]">
                Select your role
              </label>
              <div className="space-y-2">
                {ROLES.map((r) => {
                  const isActive = role === r.value;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => { setRole(r.value); setEmail(""); }}
                      className={`w-full flex items-center justify-between rounded-[6px] p-3 border text-left transition-colors duration-150 ${
                        isActive
                          ? "border-[#00539F] dark:border-[#3B82F6] bg-[#EFF6FF] dark:bg-[#1E293B]"
                          : "border-[#E5E7EB] dark:border-[#262626] hover:bg-[#F3F4F6] dark:hover:bg-[#1C1C1E]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-[6px] flex items-center justify-center ${
                          isActive ? "bg-[#00539F]/10 dark:bg-[#3B82F6]/10" : "bg-[#F3F4F6] dark:bg-[#1C1C1E]"
                        }`}>
                          <Mail className={`h-4 w-4 ${isActive ? "text-[#00539F] dark:text-[#60A5FA]" : "text-[#6B7280]"}`} />
                        </div>
                        <div>
                          <p className={`text-[14px] font-medium ${isActive ? "text-[#00539F] dark:text-[#60A5FA]" : "text-[#111111] dark:text-[#E5E7EB]"}`}>
                            {r.label}
                          </p>
                          <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF]">{r.desc}</p>
                        </div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          isActive
                            ? "border-[#00539F] dark:border-[#3B82F6]"
                            : "border-[#D1D5DB] dark:border-[#4B5563]"
                        }`}
                      >
                        {isActive && (
                          <div className="w-2 h-2 rounded-full bg-[#00539F] dark:bg-[#3B82F6]" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-[#374151] dark:text-[#D1D5DB] flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> Email address
              </label>
              <Input
                type="email"
                placeholder="you@udel.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10 text-[14px] rounded-[6px] border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-[#1C1C1E] text-[#111111] dark:text-[#E5E7EB] placeholder:text-[#9CA3AF] dark:placeholder:text-[#6B7280] focus:border-[#00539F] dark:focus:border-[#3B82F6] focus:ring-0"
              />
            </div>

            <Button
              type="submit"
              disabled={!email || !role || loading}
              className="w-full h-11 rounded-[6px] text-[14px] font-medium bg-[#00539F] dark:bg-[#3B82F6] hover:bg-[#003d75] dark:hover:bg-[#2563EB] text-white transition-colors duration-150 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Send login PIN
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </div>

        <p className="text-center mt-4 text-[13px] text-[#9CA3AF] dark:text-[#6B7280]">
          HenHacks 2026
        </p>
      </div>
    </div>
  );
}
