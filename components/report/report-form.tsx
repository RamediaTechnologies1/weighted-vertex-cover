"use client";

import { useState } from "react";
import {
  Send,
  Loader2,
  MapPin,
  MessageSquare,
  CheckCircle2,
  Camera,
  ArrowLeft,
  ArrowRight,
  EyeOff,
  Eye,
  ShieldAlert,
  Navigation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CameraCapture } from "./camera-capture";
import { VoiceInput } from "./voice-input";
import { AIAnalysisDisplay } from "./ai-analysis-display";
import { FloorPlanViewer } from "@/components/floor-plan/floor-plan-viewer";
import { hasFloorPlan } from "@/lib/floor-plans";
import { DEMO_BUILDINGS } from "@/lib/constants";
import { findNearestBuilding, guessFloor } from "@/lib/utils";
import type { AIAnalysis, FloorPlanRoom } from "@/lib/types";

type Step = "photo" | "location" | "details" | "analyzing" | "review" | "submitted";

const STEPS = [
  { key: "photo", label: "Photo" },
  { key: "location", label: "Location" },
  { key: "details", label: "Details" },
  { key: "review", label: "Review" },
];

interface ReportFormProps {
  prefill?: { building: string; floor: string; room: string };
}

export function ReportForm({ prefill }: ReportFormProps) {
  const [step, setStep] = useState<Step>("photo");
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [building, setBuilding] = useState(prefill?.building || "");
  const [selectedRoom, setSelectedRoom] = useState<FloorPlanRoom | null>(null);
  const [floor, setFloor] = useState(prefill?.floor || "");
  const [room, setRoom] = useState(prefill?.room || "");
  const [description, setDescription] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [anonymous, setAnonymous] = useState(false);

  // GPS auto-detection state
  const [photoGPS, setPhotoGPS] = useState<{ latitude: number; longitude: number; altitude?: number } | null>(null);
  const [detectedBuilding, setDetectedBuilding] = useState<string | null>(null);
  const [gpsConfirmed, setGpsConfirmed] = useState(false);
  const [suggestedFloor, setSuggestedFloor] = useState<string | null>(null);

  function handleRoomSelect(roomData: FloorPlanRoom) {
    setSelectedRoom(roomData);
    setRoom(roomData.label);
    setFloor(roomData.floor);
  }

  async function handleAnalyze() {
    if (!photoBase64) return;
    setStep("analyzing");
    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo_base64: photoBase64 }),
      });
      if (!res.ok) { toast.error("AI analysis failed"); setStep("details"); return; }
      const data = await res.json();
      setAiAnalysis(data.analysis);
      setStep("review");
    } catch { toast.error("AI analysis failed"); setStep("details"); }
    finally { setLoading(false); }
  }

  async function handleSubmit() {
    if (!aiAnalysis || !photoBase64) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          building,
          room: selectedRoom?.label || room,
          floor: selectedRoom?.floor || floor,
          description,
          photo_base64: photoBase64,
          ai_analysis: aiAnalysis,
          anonymous,
          latitude: photoGPS?.latitude,
          longitude: photoGPS?.longitude,
        }),
      });
      if (!res.ok) { toast.error("Submission failed"); return; }
      const data = await res.json();
      toast.success(data.deduplicated ? "Similar report found — upvote added!" : "Report submitted!");
      setStep("submitted");
    } catch { toast.error("Submission failed"); }
    finally { setSubmitting(false); }
  }

  function resetForm() {
    setStep("photo"); setPhotoBase64(null); setBuilding(""); setSelectedRoom(null);
    setFloor(""); setRoom(""); setDescription(""); setAiAnalysis(null); setAnonymous(false);
    setPhotoGPS(null); setDetectedBuilding(null); setGpsConfirmed(false); setSuggestedFloor(null);
  }

  const currentStepIndex = STEPS.findIndex(
    (s) => s.key === step || (step === "analyzing" && s.key === "review") || (step === "submitted" && s.key === "review")
  );

  const buildingHasFloorPlan = building ? hasFloorPlan(building) : false;
  const locationReady = building && (buildingHasFloorPlan ? !!selectedRoom : true);

  if (step === "submitted") {
    const isSafety = aiAnalysis?.safety_concern;
    const isCritical = aiAnalysis?.priority === "critical";
    return (
      <div className="p-6 text-center py-10 space-y-5">
        <div className="w-12 h-12 rounded-full bg-[#ECFDF5] dark:bg-[#10B981]/10 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-6 w-6 text-[#10B981]" />
        </div>
        <h2 className="text-[20px] font-medium text-[#111111] dark:text-[#E5E7EB]">Report submitted</h2>
        <p className="text-[14px] text-[#6B7280] dark:text-[#9CA3AF] max-w-xs mx-auto leading-relaxed">
          Our AI has analyzed and dispatched your report to the maintenance team.
        </p>

        {isSafety && (
          <div className="text-left mx-auto max-w-xs bg-[#FEF2F2] dark:bg-[#DC2626]/10 border border-[#DC2626]/20 rounded-[6px] p-4 space-y-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-[#DC2626]" />
              <span className="text-[13px] font-medium text-[#DC2626]">Safety alert triggered</span>
            </div>
            <div className="space-y-1.5 text-[13px] text-[#6B7280] dark:text-[#9CA3AF]">
              <p className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3 text-[#10B981] flex-shrink-0" />
                Safety team notified immediately
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3 text-[#10B981] flex-shrink-0" />
                Report prioritized in dispatch queue
              </p>
              {isCritical && (
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-[#10B981] flex-shrink-0" />
                  Auto-escalated to campus safety director
                </p>
              )}
              <p className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3 text-[#10B981] flex-shrink-0" />
                Technician dispatched for immediate response
              </p>
            </div>
          </div>
        )}

        {anonymous && (
          <div className="text-left mx-auto max-w-xs bg-[#ECFDF5] dark:bg-[#10B981]/10 border border-[#10B981]/20 rounded-[6px] p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <EyeOff className="h-4 w-4 text-[#10B981]" />
              <span className="text-[13px] font-medium text-[#10B981]">Identity protected</span>
            </div>
            <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF] leading-relaxed">
              Your report was submitted anonymously. Your name and email are not stored or visible to anyone.
            </p>
          </div>
        )}

        <div className="text-left mx-auto max-w-xs bg-[#FAFAFA] dark:bg-[#1C1C1E] border border-[#E5E7EB] dark:border-[#262626] rounded-[6px] p-4">
          <p className="text-[13px] font-medium text-[#6B7280] dark:text-[#9CA3AF] mb-2">What happens with your data</p>
          <div className="space-y-1 text-[12px] text-[#6B7280] dark:text-[#9CA3AF]">
            <p>Your photo is analyzed by AI and stored securely for the work order.</p>
            <p>Location data is used only to dispatch the correct maintenance team.</p>
            {!anonymous && <p>Your contact info may be used for follow-up on this report only.</p>}
            <p>Reports are automatically deleted after resolution + 90 days.</p>
          </div>
        </div>

        <Button onClick={resetForm} className="bg-[#00539F] dark:bg-[#3B82F6] hover:bg-[#003d75] dark:hover:bg-[#2563EB] text-white rounded-[6px] h-11 px-8 text-[14px] font-medium">
          Report another issue
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {STEPS.map((s, i) => {
          const isActive = i <= currentStepIndex;
          const isCurrent = i === currentStepIndex;
          return (
            <div key={s.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1 flex-1">
                <div
                  className={`w-8 h-1 rounded-full transition-colors duration-150 ${
                    isActive ? "bg-[#00539F] dark:bg-[#3B82F6]" : "bg-[#E5E7EB] dark:bg-[#262626]"
                  }`}
                />
                <span className={`text-[11px] ${isCurrent ? "font-medium text-[#00539F] dark:text-[#60A5FA]" : isActive ? "text-[#111111] dark:text-[#E5E7EB]" : "text-[#9CA3AF] dark:text-[#6B7280]"}`}>
                  {s.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step 1: Photo */}
      {step === "photo" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-[16px] font-medium text-[#111111] dark:text-[#E5E7EB]">Capture the issue</h2>
            <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF] mt-1">Take a photo or upload one from your gallery.</p>
          </div>
          <CameraCapture
            onCapture={(base64, gpsCoords) => {
              setPhotoBase64(base64);
              if (gpsCoords) {
                setPhotoGPS(gpsCoords);
                const nearest = findNearestBuilding(gpsCoords.latitude, gpsCoords.longitude);
                if (nearest) {
                  // Only auto-fill if building is in our demo set
                  if (DEMO_BUILDINGS.includes(nearest.building as typeof DEMO_BUILDINGS[number])) {
                    setDetectedBuilding(nearest.building);
                    setBuilding(nearest.building);
                    // Floor guess from altitude
                    const floorGuess = guessFloor(gpsCoords.altitude, nearest.building);
                    if (floorGuess) {
                      setSuggestedFloor(floorGuess);
                    }
                    toast.success(`Location detected: ${nearest.building}${floorGuess ? `, Floor ${floorGuess}` : ""}`);
                  }
                }
              }
            }}
            photoPreview={photoBase64}
            onClear={() => {
              setPhotoBase64(null);
              setPhotoGPS(null);
              setDetectedBuilding(null);
              setGpsConfirmed(false);
              setSuggestedFloor(null);
            }}
          />
          <Button
            onClick={() => setStep("location")}
            disabled={!photoBase64}
            className="w-full h-11 rounded-[6px] bg-[#00539F] dark:bg-[#3B82F6] hover:bg-[#003d75] dark:hover:bg-[#2563EB] text-white text-[14px] font-medium transition-colors duration-150 disabled:opacity-50"
          >
            Next: Select location <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Step 2: Location */}
      {step === "location" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-[16px] font-medium text-[#111111] dark:text-[#E5E7EB]">Where is the issue?</h2>
            <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF] mt-1">
              {detectedBuilding ? "We detected a location from your photo." : "Select the building and tap the room."}
            </p>
          </div>

          {/* GPS auto-detected confirmation banner */}
          {detectedBuilding && !gpsConfirmed && (
            <div className="flex items-center gap-3 p-3 bg-[#EFF6FF] dark:bg-[#1E293B] border border-[#00539F]/20 dark:border-[#3B82F6]/20 rounded-[6px]">
              <Navigation className="h-4 w-4 text-[#00539F] dark:text-[#60A5FA] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-[#111111] dark:text-[#E5E7EB]">
                  Photo taken near <span className="font-medium">{detectedBuilding}</span>
                  {suggestedFloor && <span className="text-[#6B7280] dark:text-[#9CA3AF]"> (Floor {suggestedFloor})</span>}
                </p>
                <p className="text-[12px] text-[#6B7280] dark:text-[#9CA3AF]">Use this location?</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setGpsConfirmed(true)}
                  className="px-3 py-1.5 text-[12px] font-medium bg-[#00539F] dark:bg-[#3B82F6] text-white rounded-[4px] hover:bg-[#003d75] dark:hover:bg-[#2563EB] transition-colors duration-150"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDetectedBuilding(null);
                    setBuilding("");
                    setPhotoGPS(null);
                    setGpsConfirmed(false);
                    setSuggestedFloor(null);
                  }}
                  className="px-3 py-1.5 text-[12px] font-medium border border-[#E5E7EB] dark:border-[#262626] text-[#6B7280] dark:text-[#9CA3AF] rounded-[4px] hover:bg-[#F3F4F6] dark:hover:bg-[#1C1C1E] transition-colors duration-150"
                >
                  Change
                </button>
              </div>
            </div>
          )}

          {detectedBuilding && gpsConfirmed && (
            <div className="flex items-center gap-2 p-3 bg-[#ECFDF5] dark:bg-[#10B981]/10 border border-[#10B981]/20 rounded-[6px]">
              <CheckCircle2 className="h-4 w-4 text-[#10B981] flex-shrink-0" />
              <span className="text-[13px] text-[#10B981]">
                Location detected: <span className="font-medium">{detectedBuilding}</span>
                {suggestedFloor && ` (Floor ${suggestedFloor})`}
              </span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF]">Building</label>
            <Select
              value={building}
              onValueChange={(val) => {
                setBuilding(val);
                setSelectedRoom(null);
                if (val !== detectedBuilding) {
                  setGpsConfirmed(false);
                  setDetectedBuilding(null);
                  setSuggestedFloor(null);
                }
              }}
            >
              <SelectTrigger className="h-10 rounded-[6px] text-[14px] border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-[#1C1C1E] text-[#111111] dark:text-[#E5E7EB]">
                <SelectValue placeholder="Select building" />
              </SelectTrigger>
              <SelectContent>
                {DEMO_BUILDINGS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {building && buildingHasFloorPlan && (
            <>
              {/* Floor guess hint */}
              {suggestedFloor && !selectedRoom && (
                <div className="flex items-center gap-2 p-2 bg-[#EFF6FF] dark:bg-[#1E293B] rounded-[6px]">
                  <MapPin className="h-3.5 w-3.5 text-[#00539F] dark:text-[#60A5FA] flex-shrink-0" />
                  <span className="text-[12px] text-[#6B7280] dark:text-[#9CA3AF]">
                    Based on GPS, you may be on {suggestedFloor === "LL" ? "Lower Level" : `Floor ${suggestedFloor}`}. Tap a room to confirm.
                  </span>
                </div>
              )}
              <FloorPlanViewer
                building={building}
                onRoomSelect={handleRoomSelect}
                selectedRoomId={selectedRoom?.id}
                initialFloor={suggestedFloor || "1"}
                showRoomDetails
              />
            </>
          )}

          {selectedRoom && (
            <div className="flex items-center gap-2 bg-[#EFF6FF] dark:bg-[#1E293B] border border-[#00539F]/20 dark:border-[#3B82F6]/20 rounded-[6px] p-3">
              <MapPin className="h-4 w-4 text-[#00539F] dark:text-[#60A5FA]" />
              <span className="text-[14px] text-[#111111] dark:text-[#E5E7EB]">
                {building}, Floor {selectedRoom.floor}, Room {selectedRoom.label}
              </span>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("photo")} className="flex-1 h-11 rounded-[6px] border-[#E5E7EB] dark:border-[#262626] text-[#6B7280] dark:text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-[#1C1C1E] hover:text-[#111111] dark:hover:text-[#E5E7EB] text-[14px]">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button
              onClick={() => setStep("details")}
              disabled={!locationReady}
              className="flex-1 h-11 rounded-[6px] bg-[#00539F] dark:bg-[#3B82F6] hover:bg-[#003d75] dark:hover:bg-[#2563EB] text-white text-[14px] font-medium disabled:opacity-50"
            >
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Details */}
      {step === "details" && (
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-[16px] font-medium text-[#111111] dark:text-[#E5E7EB]">Describe the issue</h2>
              <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF] mt-1">Type or use voice input.</p>
            </div>
            <VoiceInput
              onTranscript={(text) => setDescription((prev) => prev ? `${prev} ${text}` : text)}
            />
          </div>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue..."
            className="w-full h-[100px] px-3 py-2.5 text-[14px] border border-[#E5E7EB] dark:border-[#262626] rounded-[6px] resize-none bg-white dark:bg-[#1C1C1E] text-[#111111] dark:text-[#E5E7EB] placeholder:text-[#9CA3AF] dark:placeholder:text-[#6B7280]"
          />

          <button
            type="button"
            onClick={() => setAnonymous(!anonymous)}
            className={`flex items-center gap-2.5 w-full p-3 rounded-[6px] border transition-colors duration-150 ${
              anonymous
                ? "bg-[#ECFDF5] dark:bg-[#10B981]/10 border-[#10B981]/30"
                : "bg-white dark:bg-[#141415] border-[#E5E7EB] dark:border-[#262626] hover:bg-[#F3F4F6] dark:hover:bg-[#1C1C1E]"
            }`}
          >
            {anonymous ? (
              <EyeOff className="h-4 w-4 text-[#10B981]" />
            ) : (
              <Eye className="h-4 w-4 text-[#6B7280] dark:text-[#9CA3AF]" />
            )}
            <div className="text-left">
              <p className={`text-[13px] font-medium ${anonymous ? "text-[#10B981]" : "text-[#111111] dark:text-[#E5E7EB]"}`}>
                {anonymous ? "Anonymous report — identity protected" : "Report anonymously"}
              </p>
              <p className="text-[12px] text-[#6B7280] dark:text-[#9CA3AF]">
                {anonymous ? "Your identity will not be shared with anyone" : "Toggle to hide your identity from technicians and reports"}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-3 p-3 bg-[#FAFAFA] dark:bg-[#1C1C1E] rounded-[6px] border border-[#E5E7EB] dark:border-[#262626]">
            {photoBase64 && <img src={photoBase64} alt="Preview" className="w-10 h-10 rounded-[4px] object-cover" />}
            <div className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF]">
              <p className="font-medium text-[#111111] dark:text-[#E5E7EB]">{building}</p>
              <p>{selectedRoom ? `Floor ${selectedRoom.floor}, Room ${selectedRoom.label}` : ""}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("location")} className="flex-1 h-11 rounded-[6px] border-[#E5E7EB] dark:border-[#262626] text-[#6B7280] dark:text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-[#1C1C1E] hover:text-[#111111] dark:hover:text-[#E5E7EB] text-[14px]">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button
              onClick={handleAnalyze}
              className="flex-1 h-11 rounded-[6px] bg-[#00539F] dark:bg-[#3B82F6] hover:bg-[#003d75] dark:hover:bg-[#2563EB] text-white text-[14px] font-medium"
            >
              Analyze with AI
            </Button>
          </div>
        </div>
      )}

      {/* Analyzing */}
      {step === "analyzing" && (
        <div className="text-center py-12">
          <div className="w-10 h-10 mx-auto mb-4">
            <div className="w-10 h-10 rounded-full border-2 border-[#E5E7EB] dark:border-[#262626] border-t-[#00539F] dark:border-t-[#3B82F6] animate-spin" />
          </div>
          <h3 className="text-[16px] font-medium text-[#111111] dark:text-[#E5E7EB]">Analyzing your photo</h3>
          <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF] mt-2 max-w-xs mx-auto">
            Identifying trade type, assessing priority, and generating recommended actions...
          </p>
        </div>
      )}

      {/* Step 4: Review */}
      {step === "review" && aiAnalysis && (
        <div className="space-y-4">
          <AIAnalysisDisplay analysis={aiAnalysis} />

          <div className="flex items-center gap-3 p-3 bg-[#FAFAFA] dark:bg-[#1C1C1E] rounded-[6px] border border-[#E5E7EB] dark:border-[#262626]">
            {photoBase64 && <img src={photoBase64} alt="Preview" className="w-12 h-12 rounded-[4px] object-cover" />}
            <div className="text-[13px]">
              <p className="font-medium text-[#111111] dark:text-[#E5E7EB]">{building}{selectedRoom ? `, Room ${selectedRoom.label}` : ""}</p>
              <p className="text-[#6B7280] dark:text-[#9CA3AF]">{selectedRoom ? `Floor ${selectedRoom.floor}` : ""}</p>
              {description && <p className="text-[#9CA3AF] dark:text-[#6B7280] mt-0.5 line-clamp-1">{description}</p>}
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("details")} className="flex-1 h-11 rounded-[6px] border-[#E5E7EB] dark:border-[#262626] text-[#6B7280] dark:text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-[#1C1C1E] hover:text-[#111111] dark:hover:text-[#E5E7EB] text-[14px]">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 h-11 rounded-[6px] bg-[#00539F] dark:bg-[#3B82F6] hover:bg-[#003d75] dark:hover:bg-[#2563EB] text-white text-[14px] font-medium disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <>Submit report</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
