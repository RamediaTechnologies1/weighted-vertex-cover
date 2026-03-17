"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Users,
  Wrench,
  AlertTriangle,
  ThermometerSun,
  Zap,
  Droplets,
  Monitor,
  Projector,
  Shield,
} from "lucide-react";
import type { FloorPlanRoom } from "@/lib/types";

interface RoomDetailCardProps {
  room: FloorPlanRoom | null;
  onClose: () => void;
  onSelect?: () => void;
  reportCount?: number;
  showSelectButton?: boolean;
}

const EQUIPMENT_CONFIG: Record<string, { icon: React.ElementType; label: string }> = {
  hvac_units: { icon: ThermometerSun, label: "HVAC" },
  plumbing_fixtures: { icon: Droplets, label: "Plumbing" },
  electrical_panels: { icon: Zap, label: "Electrical" },
  projectors: { icon: Projector, label: "Projectors" },
  computers: { icon: Monitor, label: "Computers" },
  fire_extinguishers: { icon: Shield, label: "Fire ext." },
};

const TYPE_LABELS: Record<string, string> = {
  classroom: "Classroom",
  seminar: "Seminar Room",
  "lecture-hall": "Lecture Hall",
  office: "Office",
  restroom: "Restroom",
  utility: "Utility",
  common: "Common Area",
  hallway: "Hallway",
  stairwell: "Stairwell",
  lab: "Computer Lab",
  cafe: "Cafe",
};

export function RoomDetailCard({
  room,
  onClose,
  onSelect,
  reportCount,
  showSelectButton = true,
}: RoomDetailCardProps) {
  return (
    <AnimatePresence mode="wait">
      {room && (
        <motion.div
          key={room.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2 }}
          className="bg-[#1C1C1E] border border-[#262626] rounded-[8px] p-4 space-y-3"
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-[15px] font-medium text-[#E5E7EB]">
                Room {room.label}
              </h3>
              <p className="text-[12px] text-[#9CA3AF]">
                {TYPE_LABELS[room.type] || room.type}
                {room.capacity ? ` \u00B7 ${room.capacity} seats` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-[4px] text-[#6B7280] hover:text-[#E5E7EB] hover:bg-[#262626] transition-colors duration-150"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Description */}
          {room.description && (
            <p className="text-[13px] text-[#9CA3AF] leading-relaxed">
              {room.description}
            </p>
          )}

          {/* Equipment grid */}
          {room.equipment && (
            <div className="space-y-2">
              <p className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wide">Equipment</p>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(room.equipment)
                  .filter(([key, val]) => key !== "description" && typeof val === "number" && val > 0)
                  .map(([key, val]) => {
                    const config = EQUIPMENT_CONFIG[key];
                    const Icon = config?.icon || Wrench;
                    return (
                      <div
                        key={key}
                        className="flex items-center gap-1.5 text-[12px] text-[#9CA3AF] bg-[#141415] rounded-[4px] px-2 py-1.5 border border-[#262626]"
                      >
                        <Icon className="h-3.5 w-3.5 flex-shrink-0 text-[#6B7280]" />
                        <span>{val} {config?.label || key}</span>
                      </div>
                    );
                  })}
              </div>
              {room.equipment.description && (
                <p className="text-[11px] text-[#6B7280] leading-relaxed">
                  {room.equipment.description}
                </p>
              )}
            </div>
          )}

          {/* Common issues */}
          {room.commonIssues && room.commonIssues.length > 0 && (
            <div>
              <p className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wide mb-1.5">Common Issues</p>
              <div className="flex flex-wrap gap-1.5">
                {room.commonIssues.map((issue) => (
                  <span
                    key={issue}
                    className="px-2 py-0.5 rounded-[4px] text-[11px] font-medium bg-[#262626] text-[#9CA3AF] border border-[#3F3F46]"
                  >
                    {issue.replace("_", " ")}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Past reports */}
          {typeof reportCount === "number" && reportCount > 0 && (
            <div className="flex items-center gap-1.5 text-[12px] text-[#F59E0B] bg-[#F59E0B]/10 rounded-[4px] px-2.5 py-1.5 border border-[#F59E0B]/20">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{reportCount} past report{reportCount !== 1 ? "s" : ""} in this room</span>
            </div>
          )}

          {/* Select button */}
          {showSelectButton && onSelect && (
            <button
              type="button"
              onClick={onSelect}
              className="w-full h-9 rounded-[6px] bg-[#00539F] hover:bg-[#003d75] text-white text-[13px] font-medium transition-colors duration-150"
            >
              Select this room
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
