"use client";

import { Shield, ShieldAlert, AlertTriangle, TrendingUp, Clock } from "lucide-react";
import type { Report, Assignment } from "@/lib/types";

interface SafetyDashboardProps {
  reports: Report[];
  assignments: Assignment[];
}

interface BuildingSafety {
  name: string;
  score: number;
  openSafety: number;
  totalOpen: number;
  avgResolutionHours: number | null;
  risks: string[];
}

function computeBuildingSafety(reports: Report[], assignments: Assignment[]): BuildingSafety[] {
  const buildingMap = new Map<string, Report[]>();

  for (const r of reports) {
    const list = buildingMap.get(r.building) || [];
    list.push(r);
    buildingMap.set(r.building, list);
  }

  const results: BuildingSafety[] = [];

  for (const [name, bReports] of buildingMap) {
    const open = bReports.filter((r) => r.status !== "resolved");
    const openSafety = open.filter((r) => r.safety_concern).length;
    const totalOpen = open.length;

    const resolved = bReports.filter((r) => r.status === "resolved");
    let avgResolutionHours: number | null = null;
    if (resolved.length > 0) {
      const totalHours = resolved.reduce((acc, r) => {
        const created = new Date(r.created_at).getTime();
        const updated = new Date(r.updated_at).getTime();
        return acc + (updated - created) / (1000 * 60 * 60);
      }, 0);
      avgResolutionHours = Math.round(totalHours / resolved.length);
    }

    const risks = new Set<string>();
    for (const r of open) {
      if (r.safety_concern) {
        const trade = r.trade;
        if (trade === "electrical") risks.add("electrical_shock");
        if (trade === "plumbing") risks.add("water_damage");
        if (trade === "hvac") risks.add("air_quality");
        if (trade === "structural") risks.add("structural_failure");
        if (trade === "safety_hazard") risks.add("fire_hazard");
      }
    }

    const criticalCount = open.filter((r) => r.priority === "critical").length;
    const highCount = open.filter((r) => r.priority === "high").length;
    const score = Math.min(10, Math.round(
      openSafety * 3 + criticalCount * 2.5 + highCount * 1.5 + totalOpen * 0.3
    ));

    results.push({ name, score, openSafety, totalOpen, avgResolutionHours, risks: Array.from(risks) });
  }

  return results.sort((a, b) => b.score - a.score);
}

function getScoreColor(score: number): string {
  if (score >= 7) return "#DC2626";
  if (score >= 4) return "#F59E0B";
  if (score >= 2) return "#F59E0B";
  return "#10B981";
}

function getScoreLabel(score: number): string {
  if (score >= 7) return "Critical";
  if (score >= 4) return "At risk";
  if (score >= 2) return "Caution";
  return "Safe";
}

const RISK_LABELS: Record<string, string> = {
  slip_fall: "Slip/Fall",
  fire_hazard: "Fire",
  electrical_shock: "Electrical",
  structural_failure: "Structural",
  water_damage: "Water",
  air_quality: "Air Quality",
  security_vulnerability: "Security",
  chemical_exposure: "Chemical",
};

export function SafetyDashboard({ reports, assignments }: SafetyDashboardProps) {
  const buildingSafety = computeBuildingSafety(reports, assignments);
  const totalSafetyIssues = reports.filter((r) => r.safety_concern && r.status !== "resolved").length;
  const criticalUnresolved = reports.filter((r) => r.priority === "critical" && r.status !== "resolved").length;
  const safetyResolvedToday = reports.filter((r) => {
    if (r.status !== "resolved" || !r.safety_concern) return false;
    const today = new Date();
    const updated = new Date(r.updated_at);
    return updated.toDateString() === today.toDateString();
  }).length;

  const campusScore = buildingSafety.length > 0
    ? Math.round(buildingSafety.reduce((acc, b) => acc + b.score, 0) / buildingSafety.length)
    : 0;

  const buildingTradeMap = new Map<string, Map<string, number>>();
  for (const r of reports.filter((r) => r.status !== "resolved")) {
    const key = r.building;
    if (!buildingTradeMap.has(key)) buildingTradeMap.set(key, new Map());
    const tradeMap = buildingTradeMap.get(key)!;
    tradeMap.set(r.trade, (tradeMap.get(r.trade) || 0) + 1);
  }

  const predictions: { building: string; message: string; severity: string }[] = [];
  for (const [building, tradeMap] of buildingTradeMap) {
    for (const [trade, count] of tradeMap) {
      if (count >= 2) {
        const messages: Record<string, string> = {
          plumbing: `${count} plumbing reports — potential pipe deterioration`,
          electrical: `${count} electrical reports — possible wiring degradation`,
          hvac: `${count} HVAC reports — system may be failing`,
          structural: `${count} structural reports — building integrity concern`,
          safety_hazard: `${count} safety reports — active danger zone`,
        };
        predictions.push({
          building,
          message: messages[trade] || `${count} ${trade} reports clustered`,
          severity: count >= 3 ? "critical" : "warning",
        });
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Campus Safety", value: getScoreLabel(campusScore), borderColor: getScoreColor(campusScore) },
          { label: "Active Hazards", value: totalSafetyIssues, borderColor: "#DC2626" },
          { label: "Critical Unresolved", value: criticalUnresolved, borderColor: "#F59E0B" },
          { label: "Resolved Today", value: safetyResolvedToday, borderColor: "#10B981" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-[#141415] border border-[#E5E7EB] dark:border-[#262626] rounded-[6px] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none"
            style={{ borderBottomWidth: '3px', borderBottomColor: stat.borderColor }}
          >
            <p className="text-[28px] font-semibold text-[#111111] dark:text-[#E5E7EB]">{stat.value}</p>
            <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF]">{stat.label}</p>
          </div>
        ))}
      </div>

      {predictions.length > 0 && (
        <div className="bg-white dark:bg-[#141415] border border-[#DC2626]/20 rounded-[6px] p-4 space-y-3 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#DC2626]" />
            <span className="text-[14px] font-medium text-[#111111] dark:text-[#E5E7EB]">Predictive safety alerts</span>
            <span className="text-[12px] bg-[#FEF2F2] dark:bg-[#DC2626]/10 text-[#DC2626] px-2 py-0.5 rounded-[4px] font-medium">
              {predictions.length} detected
            </span>
          </div>
          <div className="space-y-2">
            {predictions.map((p, i) => (
              <div key={i} className={`flex gap-3 p-3 rounded-[6px] border ${
                p.severity === "critical"
                  ? "bg-[#FEF2F2] dark:bg-[#DC2626]/10 border-[#DC2626]/20"
                  : "bg-[#FFFBEB] dark:bg-[#F59E0B]/10 border-[#F59E0B]/20"
              }`}>
                <div className={`w-1.5 rounded-full flex-shrink-0 ${
                  p.severity === "critical" ? "bg-[#DC2626]" : "bg-[#F59E0B]"
                }`} />
                <div>
                  <p className="text-[13px] font-medium text-[#111111] dark:text-[#E5E7EB]">{p.building}</p>
                  <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">{p.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-[16px] font-medium text-[#111111] dark:text-[#E5E7EB] mb-1">Building safety index</h2>
        <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF] mb-3">Real-time safety scoring per building</p>

        {buildingSafety.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[14px] text-[#10B981] font-medium">All clear</p>
            <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF] mt-1">No safety concerns detected across campus.</p>
          </div>
        )}

        <div className="space-y-2">
          {buildingSafety.map((b) => {
            const color = getScoreColor(b.score);
            return (
              <div key={b.name} className="bg-white dark:bg-[#141415] border border-[#E5E7EB] dark:border-[#262626] rounded-[6px] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none hover:border-[#D1D5DB] dark:hover:border-[#3F3F46] transition-colors duration-150">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[14px] font-medium text-[#111111] dark:text-[#E5E7EB]">{b.name}</p>
                  <span className="text-[12px] font-medium px-2 py-0.5 rounded-[4px]" style={{
                    backgroundColor: `${color}15`,
                    color,
                  }}>
                    {getScoreLabel(b.score)} ({b.score}/10)
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-1.5 bg-[#E5E7EB] dark:bg-[#262626] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${b.score * 10}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[12px] text-[#6B7280] dark:text-[#9CA3AF]">
                  <span>{b.totalOpen} open</span>
                  {b.openSafety > 0 && (
                    <span className="text-[#DC2626] font-medium">{b.openSafety} safety</span>
                  )}
                  {b.avgResolutionHours !== null && (
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-3 w-3" />
                      avg {b.avgResolutionHours}h resolution
                    </span>
                  )}
                </div>
                {b.risks.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {b.risks.map((risk) => (
                      <span key={risk} className="px-1.5 py-0.5 rounded-[4px] text-[11px] font-medium bg-[#FEF2F2] dark:bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/15">
                        {RISK_LABELS[risk] || risk}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
