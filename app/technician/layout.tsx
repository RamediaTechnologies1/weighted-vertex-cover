"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PortalHeader } from "@/components/layout/portal-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { GlassesAssistant } from "@/components/technician/glasses-assistant";
import { ClipboardList, MapPin } from "lucide-react";

const NAV_ITEMS = [
  { href: "/technician", label: "Jobs", icon: ClipboardList },
  { href: "/technician/map", label: "Map", icon: MapPin },
];

export default function TechnicianLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function check() {
      const res = await fetch("/api/auth/session");
      if (!res.ok) { router.replace("/login"); return; }
      const data = await res.json();
      if (data.role !== "technician") { router.replace(`/${data.role}`); return; }
      setEmail(data.email);
      setReady(true);
    }
    check();
  }, [router]);

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0A0A0B]">
      <PortalHeader role="technician" email={email} />
      <main className="pb-20 max-w-[640px] mx-auto">{children}</main>
      <BottomNav items={NAV_ITEMS} />
      <GlassesAssistant email={email} />
    </div>
  );
}
