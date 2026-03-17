"use client";

import { Sparkles, AlertTriangle, TrendingUp, Zap, XCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { AIActivity } from "@/lib/types";

const TYPE_CONFIG: Record<AIActivity["type"], { icon: typeof Sparkles; color: string; bg: string }> = {
  assign: { icon: Sparkles, color: "text-[#60A5FA]", bg: "bg-[#3B82F6]/10" },
  analyze: { icon: Zap, color: "text-[#A78BFA]", bg: "bg-[#8B5CF6]/10" },
  escalate: { icon: AlertTriangle, color: "text-[#F87171]", bg: "bg-[#DC2626]/10" },
  pattern: { icon: TrendingUp, color: "text-[#FBBF24]", bg: "bg-[#F59E0B]/10" },
  error: { icon: XCircle, color: "text-[#6B7280]", bg: "bg-[#374151]/10" },
};

interface AIActivityFeedProps {
  activities: AIActivity[];
  maxHeight?: string;
}

export function AIActivityFeed({ activities, maxHeight = "400px" }: AIActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="bg-[#141415] border border-[#262626] rounded-[8px] p-6">
        <h3 className="text-[13px] font-medium text-[#E5E7EB] mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#3B82F6]" />
          AI Agent Activity
        </h3>
        <div className="text-center py-8">
          <div className="w-10 h-10 rounded-full bg-[#1C1C1E] flex items-center justify-center mx-auto mb-3">
            <Sparkles className="h-5 w-5 text-[#6B7280]" />
          </div>
          <p className="text-[13px] text-[#6B7280]">No AI activity yet</p>
          <p className="text-[12px] text-[#4B5563] mt-1">Use &quot;AI Assign&quot; to see agent actions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#141415] border border-[#262626] rounded-[8px] p-4">
      <h3 className="text-[13px] font-medium text-[#E5E7EB] mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[#3B82F6]" />
        AI Agent Activity
        <span className="ml-auto text-[11px] text-[#4B5563] font-normal">{activities.length} events</span>
      </h3>
      <div className="space-y-1 overflow-y-auto" style={{ maxHeight }}>
        <AnimatePresence initial={false}>
          {activities.map((activity) => {
            const config = TYPE_CONFIG[activity.type];
            const Icon = config.icon;
            const time = new Date(activity.timestamp);
            const timeStr = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-2.5 py-2 px-2 rounded-[4px] hover:bg-[#1C1C1E] transition-colors duration-100"
              >
                <div className={`mt-0.5 w-6 h-6 rounded-[4px] ${config.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-3 w-3 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-[#E5E7EB] leading-relaxed">{activity.message}</p>
                  {activity.details && (
                    <p className="text-[11px] text-[#6B7280] mt-0.5">{activity.details}</p>
                  )}
                </div>
                <span className="text-[10px] text-[#4B5563] shrink-0 mt-0.5">{timeStr}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
