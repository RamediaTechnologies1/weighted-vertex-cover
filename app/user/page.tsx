"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ReportForm } from "@/components/report/report-form";

function UserPortalInner() {
  const searchParams = useSearchParams();
  const prefill = {
    building: searchParams.get("building") || "",
    floor: searchParams.get("floor") || "",
    room: searchParams.get("room") || "",
  };

  return <ReportForm prefill={prefill.building ? prefill : undefined} />;
}

export default function UserPortal() {
  return (
    <Suspense>
      <UserPortalInner />
    </Suspense>
  );
}
