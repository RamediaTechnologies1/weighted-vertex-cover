"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface BottomNavProps {
  items: NavItem[];
}

export function BottomNav({ items }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#141415] border-t border-[#E5E7EB] dark:border-[#262626] px-2 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around max-w-lg mx-auto h-14">
        {items.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-[6px] transition-colors duration-150 ${
                isActive
                  ? "text-[#00539F] dark:text-[#60A5FA]"
                  : "text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#111111] dark:hover:text-[#E5E7EB] hover:bg-[#F3F4F6] dark:hover:bg-[#1C1C1E]"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className={`text-[11px] ${isActive ? "font-medium" : ""}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
