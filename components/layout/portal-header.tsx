"use client";

import { useRouter } from "next/navigation";
import { LogOut, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";
import type { UserRole } from "@/lib/types";

const ROLE_LABELS: Record<UserRole, string> = {
  user: "Report",
  technician: "Technician",
  manager: "Manager",
};

interface PortalHeaderProps {
  role: UserRole;
  email: string;
}

export function PortalHeader({ role, email }: PortalHeaderProps) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  async function handleLogout() {
    await fetch("/api/auth/session", { method: "DELETE" });
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-[#141415] border-b border-[#E5E7EB] dark:border-[#262626]">
      <div className="flex items-center justify-between max-w-5xl mx-auto px-4 h-12">
        <div className="flex items-center gap-3">
          <span className="text-[16px] font-medium text-[#111111] dark:text-[#E5E7EB]">
            FixIt AI
          </span>
          <span className="text-[12px] font-medium text-[#00539F] dark:text-[#60A5FA] bg-[#EFF6FF] dark:bg-[#1E293B] px-2 py-0.5 rounded-[4px] border border-[#00539F]/20 dark:border-[#3B82F6]/20">
            {ROLE_LABELS[role]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF] hidden sm:block max-w-[160px] truncate">
            {email}
          </span>
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="h-8 w-8 flex items-center justify-center rounded-[6px] text-[#6B7280] dark:text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-[#1C1C1E] transition-colors duration-150"
          >
            {resolvedTheme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="h-8 w-8 p-0 rounded-[6px] text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#DC2626] hover:bg-[#FEF2F2] dark:hover:bg-[#DC2626]/10 transition-colors duration-150"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
