"use client";

import { useState, useRef } from "react";
import { Camera, CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CompletionFormProps {
  assignmentId: string;
  onComplete: () => void;
}

export function CompletionForm({ assignmentId, onComplete }: CompletionFormProps) {
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const max = 800;
        let { width, height } = img;
        if (width > max || height > max) {
          if (width > height) { height = (height / width) * max; width = max; }
          else { width = (width / height) * max; height = max; }
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        setPhoto(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/assignments/${assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "completed",
          completion_notes: notes || "Job completed",
          completion_photo_base64: photo,
        }),
      });

      if (!res.ok) {
        toast.error("Failed to complete job.");
        return;
      }

      toast.success("Job marked as complete!");
      onComplete();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[14px] font-medium text-[#111111] dark:text-[#E5E7EB]">Complete this job</h3>
        <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">Add a completion photo and notes</p>
      </div>

      <div>
        {photo ? (
          <div className="relative rounded-[6px] overflow-hidden border border-[#E5E7EB] dark:border-[#262626]">
            <img src={photo} alt="Completion" className="w-full h-36 object-cover" />
            <button
              onClick={() => setPhoto(null)}
              className="absolute top-2 right-2 bg-white dark:bg-[#141415] border border-[#E5E7EB] dark:border-[#262626] px-2 py-1 rounded-[4px] shadow-[0_1px_2px_rgba(0,0,0,0.05)] text-[12px] text-[#6B7280] dark:text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-[#1C1C1E] transition-colors duration-150"
            >
              Retake
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full h-28 rounded-[6px] border-2 border-dashed border-[#D1D5DB] dark:border-[#3F3F46] bg-white dark:bg-[#141415] flex flex-col items-center justify-center gap-2 hover:border-[#00539F] dark:hover:border-[#3B82F6] hover:bg-[#FAFAFA] dark:hover:bg-[#1C1C1E] transition-colors duration-150"
          >
            <Camera className="h-6 w-6 text-[#9CA3AF] dark:text-[#6B7280]" />
            <span className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF]">Take completion photo</span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Completion notes (e.g., replaced filter, adjusted thermostat)..."
        className="w-full h-24 px-3 py-2.5 text-[14px] border border-[#E5E7EB] dark:border-[#262626] rounded-[6px] resize-none bg-white dark:bg-[#1C1C1E] text-[#111111] dark:text-[#E5E7EB] placeholder:text-[#9CA3AF] dark:placeholder:text-[#6B7280]"
      />

      <Button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full h-11 rounded-[6px] bg-[#00539F] dark:bg-[#3B82F6] hover:bg-[#003d75] dark:hover:bg-[#2563EB] text-white text-[14px] font-medium disabled:opacity-50"
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          "Mark as complete"
        )}
      </Button>
    </div>
  );
}
