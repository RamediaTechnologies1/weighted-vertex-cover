"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  ClipboardList,
  Shield,
  Map,
  Sun,
  Moon,
  LogOut,
  X,
} from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useDashboardStore } from "@/lib/stores/dashboard-store";

interface DashboardSidebarProps {
  email: string;
  open: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { href: "/manager", label: "Overview", icon: LayoutDashboard },
  { href: "/manager/reports", label: "Reports", icon: FileText, badgeKey: "unassigned" as const },
  { href: "/manager/technicians", label: "Technicians", icon: Users },
  { href: "/manager/assignments", label: "Assignments", icon: ClipboardList, badgeKey: "active" as const },
  { href: "/manager/safety", label: "Safety", icon: Shield, badgeKey: "safety" as const },
  { href: "/manager/map", label: "Campus Map", icon: Map },
];

export function DashboardSidebar({ email, open, onClose }: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { reports, assignments } = useDashboardStore();

  const badges: Record<string, number> = {
    unassigned: reports.filter((r) => r.status === "submitted").length,
    active: assignments.filter((a) =>
      ["pending", "accepted", "in_progress"].includes(a.status)
    ).length,
    safety: reports.filter((r) => r.safety_concern && r.status !== "resolved").length,
  };

  async function handleLogout() {
    await fetch("/api/auth/session", { method: "DELETE" });
    router.replace("/login");
  }

  function isActive(href: string) {
    if (href === "/manager") return pathname === "/manager";
    return pathname.startsWith(href);
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-[16px] font-semibold text-[#E5E7EB]">FixIt AI</span>
          <span className="text-[11px] font-medium text-[#60A5FA] bg-[#1E293B] px-1.5 py-0.5 rounded-[3px] border border-[#3B82F6]/20">
            Manager
          </span>
        </div>
        <button
          onClick={onClose}
          className="md:hidden h-7 w-7 flex items-center justify-center rounded-[4px] text-[#6B7280] hover:text-[#E5E7EB] hover:bg-[#1C1C1E]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const badge = item.badgeKey ? badges[item.badgeKey] : 0;
          return (
            <button
              key={item.href}
              onClick={() => {
                router.push(item.href);
                onClose();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-[6px] text-[13px] font-medium transition-colors duration-150 ${
                active
                  ? "bg-[#1C1C1E] text-[#E5E7EB] border-l-2 border-[#3B82F6] pl-[10px]"
                  : "text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#1C1C1E]/50"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {badge > 0 && (
                <span className="min-w-[20px] h-5 flex items-center justify-center rounded-full bg-[#3B82F6]/20 text-[#60A5FA] text-[11px] font-medium px-1.5">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-[#262626] space-y-2">
        <p className="px-3 text-[12px] text-[#6B7280] truncate">{email}</p>
        <div className="flex items-center gap-1 px-1">
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="flex-1 flex items-center justify-center gap-2 h-8 rounded-[4px] text-[12px] text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#1C1C1E] transition-colors duration-150"
          >
            {resolvedTheme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            <span>{resolvedTheme === "dark" ? "Light" : "Dark"}</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 flex items-center justify-center gap-2 h-8 rounded-[4px] text-[12px] text-[#9CA3AF] hover:text-[#DC2626] hover:bg-[#DC2626]/10 transition-colors duration-150"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:block fixed left-0 top-0 bottom-0 w-[240px] bg-[#111112] border-r border-[#262626] z-40">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40 md:hidden"
            onClick={onClose}
          />
          <aside className="fixed left-0 top-0 bottom-0 w-[280px] bg-[#111112] border-r border-[#262626] z-50 md:hidden animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
