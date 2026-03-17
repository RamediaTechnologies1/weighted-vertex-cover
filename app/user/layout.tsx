"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PortalHeader } from "@/components/layout/portal-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Camera, ClipboardList } from "lucide-react";
import { EmergencyButton } from "@/components/report/emergency-button";
import { SafetyAlerts } from "@/components/report/safety-alerts";

const NAV_ITEMS = [
  { href: "/user", label: "Report", icon: Camera },
  { href: "/user/reports", label: "My Reports", icon: ClipboardList },
];

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function check() {
      const res = await fetch("/api/auth/session");
      if (!res.ok) { router.replace("/login"); return; }
      const data = await res.json();
      if (data.role !== "user") { router.replace(`/${data.role}`); return; }
      setEmail(data.email);
      setReady(true);
    }
    check();
  }, [router]);

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0A0A0B]">
      <PortalHeader role="user" email={email} />
      <SafetyAlerts />
      <main className="pb-20 max-w-[480px] mx-auto">{children}</main>
      <EmergencyButton />
      <BottomNav items={NAV_ITEMS} />
    </div>
  );
}
