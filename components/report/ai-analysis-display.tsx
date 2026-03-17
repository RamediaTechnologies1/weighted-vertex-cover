"use client";

import { AlertTriangle, Clock, ShieldAlert, TrendingUp } from "lucide-react";
import type { AIAnalysis } from "@/lib/types";

interface AIAnalysisDisplayProps {
  analysis: AIAnalysis;
}

const PRIORITY_CONFIG: Record<string, { border: string; text: string; bg: string }> = {
  critical: { border: "border-[#DC2626]", text: "text-[#DC2626]", bg: "bg-[#FEF2F2] dark:bg-[#DC2626]/10" },
  high: { border: "border-[#F59E0B]", text: "text-[#F59E0B]", bg: "bg-[#FFFBEB] dark:bg-[#F59E0B]/10" },
  medium: { border: "border-[#00539F] dark:border-[#3B82F6]", text: "text-[#00539F] dark:text-[#60A5FA]", bg: "bg-[#EFF6FF] dark:bg-[#3B82F6]/10" },
  low: { border: "border-[#10B981]", text: "text-[#10B981]", bg: "bg-[#ECFDF5] dark:bg-[#10B981]/10" },
};

const RISK_LABELS: Record<string, string> = {
  slip_fall: "Slip / Fall",
  fire_hazard: "Fire Hazard",
  electrical_shock: "Electrical Shock",
  structural_failure: "Structural Failure",
  water_damage: "Water Damage",
  air_quality: "Air Quality",
  security_vulnerability: "Security Risk",
  chemical_exposure: "Chemical Exposure",
};

export function AIAnalysisDisplay({ analysis }: AIAnalysisDisplayProps) {
  const priority = PRIORITY_CONFIG[analysis.priority] || PRIORITY_CONFIG.medium;
  const confidence = Math.round(analysis.confidence_score * 100);
  const safetyRisks = (analysis.safety_risks || []).filter((r) => r !== "none");
  const safetyScore = analysis.safety_score ?? 0;

  return (
    <div className={`rounded-[6px] border bg-white dark:bg-[#141415] overflow-hidden ${priority.border}`} style={{ borderLeftWidth: '3px' }}>
      <div className="p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-[12px] font-medium border ${priority.bg} ${priority.text} ${priority.border}`}>
            {analysis.priority}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[12px] font-medium bg-[#F3F4F6] dark:bg-[#1C1C1E] text-[#6B7280] dark:text-[#9CA3AF] border border-[#E5E7EB] dark:border-[#262626]">
            {analysis.trade.replace("_", " ")}
          </span>
          {analysis.safety_concern && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[12px] font-medium bg-[#FEF2F2] dark:bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/20">
              <AlertTriangle className="h-3 w-3" /> safety hazard
            </span>
          )}
        </div>

        <p className="text-[14px] text-[#111111] dark:text-[#E5E7EB] leading-relaxed">{analysis.description}</p>

        {(safetyRisks.length > 0 || safetyScore > 0) && (
          <div className="bg-[#FAFAFA] dark:bg-[#1C1C1E] rounded-[6px] p-3 border border-[#E5E7EB] dark:border-[#262626] space-y-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-[#DC2626]" />
              <span className="text-[13px] font-medium text-[#111111] dark:text-[#E5E7EB]">Safety risk assessment</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-[#E5E7EB] dark:bg-[#262626] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${safetyScore * 10}%`,
                    backgroundColor: safetyScore >= 7 ? "#DC2626" : safetyScore >= 4 ? "#F59E0B" : "#10B981",
                  }}
                />
              </div>
              <span className="text-[12px] font-medium text-[#6B7280] dark:text-[#9CA3AF]">{safetyScore}/10</span>
            </div>

            {safetyRisks.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {safetyRisks.map((risk) => (
                  <span key={risk} className="px-2 py-0.5 rounded-[4px] text-[11px] font-medium bg-[#FEF2F2] dark:bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/15">
                    {RISK_LABELS[risk] || risk}
                  </span>
                ))}
              </div>
            )}

            {analysis.risk_escalation && (
              <div className="flex gap-2 mt-1">
                <TrendingUp className="h-3.5 w-3.5 text-[#F59E0B] mt-0.5 flex-shrink-0" />
                <p className="text-[12px] text-[#6B7280] dark:text-[#9CA3AF] leading-relaxed">
                  <span className="font-medium text-[#F59E0B]">If unfixed: </span>
                  {analysis.risk_escalation}
                </p>
              </div>
            )}
          </div>
        )}

        <div>
          <p className="text-[13px] font-medium text-[#6B7280] dark:text-[#9CA3AF] mb-1">Recommended action</p>
          <p className="text-[14px] text-[#111111] dark:text-[#E5E7EB] leading-relaxed">{analysis.suggested_action}</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF]">Est. time</p>
            <p className="text-[14px] font-medium text-[#111111] dark:text-[#E5E7EB]">{analysis.estimated_time}</p>
          </div>
          <div>
            <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF]">Est. cost</p>
            <p className="text-[14px] font-medium text-[#111111] dark:text-[#E5E7EB]">{analysis.estimated_cost}</p>
          </div>
          <div>
            <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF]">Confidence</p>
            <p className="text-[14px] font-medium text-[#111111] dark:text-[#E5E7EB]">{confidence}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
