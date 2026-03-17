"use client";

import { useState, useCallback } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getFloorPlan, ROOM_TYPE_COLORS } from "@/lib/floor-plans";
import { RoomDetailCard } from "./room-detail-card";
import type { FloorPlanRoom } from "@/lib/types";

interface FloorPlanViewerProps {
  building: string;
  onRoomSelect?: (room: FloorPlanRoom) => void;
  selectedRoomId?: string | null;
  highlightedRooms?: Record<string, string>;
  initialFloor?: string;
  showRoomDetails?: boolean;
  roomReportCounts?: Record<string, number>;
}

export function FloorPlanViewer({
  building,
  onRoomSelect,
  selectedRoomId,
  highlightedRooms,
  initialFloor = "1",
  showRoomDetails = true,
  roomReportCounts,
}: FloorPlanViewerProps) {
  const floorPlan = getFloorPlan(building);
  const [activeFloor, setActiveFloor] = useState(initialFloor);
  const [previewedRoom, setPreviewedRoom] = useState<FloorPlanRoom | null>(null);

  const handleRoomClick = useCallback(
    (room: FloorPlanRoom) => {
      if (showRoomDetails) {
        setPreviewedRoom((prev) => (prev?.id === room.id ? null : room));
      } else if (onRoomSelect) {
        onRoomSelect(room);
      }
    },
    [showRoomDetails, onRoomSelect]
  );

  const handleRoomConfirm = useCallback(() => {
    if (previewedRoom && onRoomSelect) {
      onRoomSelect(previewedRoom);
      setPreviewedRoom(null);
    }
  }, [previewedRoom, onRoomSelect]);

  if (!floorPlan) return null;

  const rooms = floorPlan.rooms.filter((r) => r.floor === activeFloor);
  const hallways = floorPlan.hallways;

  function getRoomFill(room: FloorPlanRoom): string {
    if (selectedRoomId === room.id) return "#ffffff";
    if (previewedRoom?.id === room.id) return "rgba(59,130,246,0.3)";
    if (highlightedRooms?.[room.id]) return highlightedRooms[room.id];
    return ROOM_TYPE_COLORS[room.type] || "rgba(255,255,255,0.03)";
  }

  function getRoomStroke(room: FloorPlanRoom): string {
    if (selectedRoomId === room.id) return "#ffffff";
    if (previewedRoom?.id === room.id) return "#3B82F6";
    if (highlightedRooms?.[room.id]) return "#ef4444";
    return "rgba(255,255,255,0.1)";
  }

  function getRoomStrokeWidth(room: FloorPlanRoom): number {
    if (selectedRoomId === room.id) return 3;
    if (previewedRoom?.id === room.id) return 2.5;
    if (highlightedRooms?.[room.id]) return 2;
    return 1;
  }

  // Octagonal atrium points for Gore Hall
  const atriumCenterX = 460;
  const atriumCenterY = 310;
  const atriumRx = 140;
  const atriumRy = 70;
  const atriumPoints = Array.from({ length: 8 }, (_, i) => {
    const angle = (i * Math.PI * 2) / 8 - Math.PI / 8;
    return `${atriumCenterX + atriumRx * Math.cos(angle)},${atriumCenterY + atriumRy * Math.sin(angle)}`;
  }).join(" ");

  return (
    <div className="space-y-3">
      {/* Floor Tabs */}
      <Tabs value={activeFloor} onValueChange={(f) => { setActiveFloor(f); setPreviewedRoom(null); }}>
        <TabsList className="w-full bg-[#141415] border border-[#262626] rounded-[6px] h-9 p-0.5">
          {floorPlan.floors.map((floor) => (
            <TabsTrigger
              key={floor}
              value={floor}
              className="flex-1 rounded-[4px] text-[13px] font-medium data-[state=active]:bg-[#262626] data-[state=active]:text-[#E5E7EB] text-[#6B7280] h-8"
            >
              {floor === "LL" ? "Lower Level" : `Floor ${floor}`}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* SVG Floor Plan with Zoom/Pan */}
      <div className="border border-[#262626] rounded-[8px] overflow-hidden bg-[#0A0A0B] relative">
        <TransformWrapper
          initialScale={1}
          minScale={0.5}
          maxScale={4}
          centerOnInit
          doubleClick={{ mode: "zoomIn", step: 0.7 }}
          wheel={{ step: 0.08 }}
          limitToBounds
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              {/* Zoom controls */}
              <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => zoomIn()}
                  className="w-7 h-7 rounded-[4px] bg-[#1C1C1E]/90 border border-[#262626] flex items-center justify-center text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#262626] transition-colors duration-150"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => zoomOut()}
                  className="w-7 h-7 rounded-[4px] bg-[#1C1C1E]/90 border border-[#262626] flex items-center justify-center text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#262626] transition-colors duration-150"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => resetTransform()}
                  className="w-7 h-7 rounded-[4px] bg-[#1C1C1E]/90 border border-[#262626] flex items-center justify-center text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#262626] transition-colors duration-150"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <TransformComponent
                wrapperStyle={{ width: "100%", maxHeight: "450px" }}
                contentStyle={{ width: "100%" }}
              >
                <svg
                  viewBox={floorPlan.svgViewBox}
                  className="w-full h-auto"
                  style={{ padding: "8px" }}
                  role="img"
                  aria-label={`Floor plan of ${building}, ${activeFloor === "LL" ? "Lower Level" : `Floor ${activeFloor}`}`}
                >
                  {/* Building outline */}
                  <rect
                    x="5"
                    y="5"
                    width={parseInt(floorPlan.svgViewBox.split(" ")[2]) - 10}
                    height={parseInt(floorPlan.svgViewBox.split(" ")[3]) - 10}
                    fill="none"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth="2"
                    rx="6"
                  />

                  {/* Hallways */}
                  {hallways.map((h) => (
                    <rect
                      key={h.id}
                      x={h.x}
                      y={h.y}
                      width={h.width}
                      height={h.height}
                      fill="rgba(255,255,255,0.02)"
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth="0.5"
                    />
                  ))}

                  {/* Central Octagonal Atrium (Gore Hall only) */}
                  {building === "Gore Hall" && (
                    <g>
                      <polygon
                        points={atriumPoints}
                        fill="#000000"
                        stroke="rgba(255,210,0,0.2)"
                        strokeWidth="1.5"
                        strokeDasharray="6 3"
                      />
                      <text
                        x={atriumCenterX}
                        y={atriumCenterY - 8}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize="12"
                        fill="#6B7280"
                        fontWeight="500"
                      >
                        Central Atrium
                      </text>
                      <text
                        x={atriumCenterX}
                        y={atriumCenterY + 8}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize="9"
                        fill="#4B5563"
                      >
                        Skylight
                      </text>
                    </g>
                  )}

                  {/* Rooms */}
                  {rooms.map((room) => (
                    <g
                      key={room.id}
                      onClick={() => handleRoomClick(room)}
                      className="cursor-pointer"
                      role="button"
                      tabIndex={0}
                      aria-label={`Room ${room.label}${room.capacity ? `, ${room.capacity} seats` : ""}${selectedRoomId === room.id ? " (selected)" : ""}`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleRoomClick(room);
                        }
                      }}
                    >
                      <rect
                        x={room.x}
                        y={room.y}
                        width={room.width}
                        height={room.height}
                        fill={getRoomFill(room)}
                        stroke={getRoomStroke(room)}
                        strokeWidth={getRoomStrokeWidth(room)}
                        rx="4"
                        style={{ transition: "fill 0.2s, stroke 0.2s, stroke-width 0.15s" }}
                      />
                      <text
                        x={room.x + room.width / 2}
                        y={room.y + room.height / 2 - (room.height > 70 ? 6 : 0)}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={room.width < 100 ? "10" : room.width < 140 ? "11" : "13"}
                        fill={
                          selectedRoomId === room.id ? "#ffffff"
                            : previewedRoom?.id === room.id ? "#93C5FD"
                              : "#a1a1a1"
                        }
                        fontWeight={selectedRoomId === room.id || previewedRoom?.id === room.id ? "700" : "500"}
                        className="pointer-events-none select-none"
                      >
                        {room.label}
                      </text>
                      {room.height > 60 && (
                        <text
                          x={room.x + room.width / 2}
                          y={room.y + room.height / 2 + (room.height > 70 ? 10 : 12)}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize="8"
                          fill="#4B5563"
                          className="pointer-events-none select-none"
                        >
                          {room.type === "lecture-hall" ? "Lecture Hall"
                            : room.type === "restroom" ? ""
                              : room.type === "stairwell" ? ""
                                : room.type === "lab" ? "Lab"
                                  : room.type === "cafe" ? ""
                                    : room.type.charAt(0).toUpperCase() + room.type.slice(1)}
                        </text>
                      )}
                      {/* Capacity indicator for large rooms */}
                      {room.capacity && room.capacity >= 100 && room.height > 80 && (
                        <text
                          x={room.x + room.width / 2}
                          y={room.y + room.height / 2 + 22}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize="8"
                          fill="#6B7280"
                          className="pointer-events-none select-none"
                        >
                          {room.capacity} seats
                        </text>
                      )}
                    </g>
                  ))}

                  {/* Selected room pulse animation */}
                  {selectedRoomId && rooms.find((r) => r.id === selectedRoomId) && (() => {
                    const sr = rooms.find((r) => r.id === selectedRoomId)!;
                    return (
                      <rect
                        x={sr.x - 2}
                        y={sr.y - 2}
                        width={sr.width + 4}
                        height={sr.height + 4}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="2"
                        rx="6"
                        opacity="0.6"
                      >
                        <animate
                          attributeName="opacity"
                          values="0.6;0.2;0.6"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                      </rect>
                    );
                  })()}

                  {/* Previewed room highlight */}
                  {previewedRoom && rooms.find((r) => r.id === previewedRoom.id) && (() => {
                    const pr = rooms.find((r) => r.id === previewedRoom.id)!;
                    return (
                      <rect
                        x={pr.x - 2}
                        y={pr.y - 2}
                        width={pr.width + 4}
                        height={pr.height + 4}
                        fill="none"
                        stroke="#3B82F6"
                        strokeWidth="2"
                        rx="6"
                        opacity="0.5"
                      >
                        <animate
                          attributeName="opacity"
                          values="0.5;0.2;0.5"
                          dur="1.5s"
                          repeatCount="indefinite"
                        />
                      </rect>
                    );
                  })()}
                </svg>
              </TransformComponent>
            </>
          )}
        </TransformWrapper>

        {/* Pinch hint */}
        <div className="absolute bottom-2 left-2 text-[10px] text-[#4B5563] pointer-events-none">
          Pinch to zoom
        </div>
      </div>

      {/* Room Detail Card */}
      {showRoomDetails && (
        <RoomDetailCard
          room={previewedRoom}
          onClose={() => setPreviewedRoom(null)}
          onSelect={onRoomSelect ? handleRoomConfirm : undefined}
          reportCount={previewedRoom ? roomReportCounts?.[previewedRoom.id] : undefined}
          showSelectButton={!!onRoomSelect}
        />
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-2 px-1">
        {[
          { label: "Classroom", color: "rgba(255,255,255,0.15)" },
          { label: "Lecture Hall", color: "rgba(255,255,255,0.10)" },
          { label: "Lab", color: "rgba(147,197,253,0.15)" },
          { label: "Office", color: "rgba(255,255,255,0.08)" },
          { label: "Selected", color: "#ffffff" },
          { label: "Previewing", color: "rgba(59,130,246,0.3)" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1 text-[10px] text-[#6B7280]">
            <div
              className="w-3 h-3 rounded border border-[#262626]"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}
