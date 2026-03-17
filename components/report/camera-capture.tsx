"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, X, RotateCcw } from "lucide-react";
import exifr from "exifr";

interface CameraCaptureProps {
  onCapture: (base64: string, gpsCoords?: { latitude: number; longitude: number; altitude?: number }) => void;
  photoPreview: string | null;
  onClear: () => void;
}

export function CameraCapture({ onCapture, photoPreview, onClear }: CameraCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);

  async function handleFile(file: File) {
    setProcessing(true);

    // Extract GPS + altitude from original file BEFORE canvas resize strips EXIF
    let gpsData: { latitude: number; longitude: number; altitude?: number } | undefined;
    try {
      const exifData = await exifr.parse(file, { gps: true });
      if (exifData && typeof exifData.latitude === "number" && typeof exifData.longitude === "number") {
        gpsData = {
          latitude: exifData.latitude,
          longitude: exifData.longitude,
          altitude: typeof exifData.GPSAltitude === "number" ? exifData.GPSAltitude : undefined,
        };
      }
    } catch {
      // No GPS data or unsupported format
    }

    // Canvas resize pipeline
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      const img = document.createElement("img");
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSize = 1024;
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = (h / w) * maxSize; w = maxSize; }
          else { w = (w / h) * maxSize; h = maxSize; }
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        onCapture(canvas.toDataURL("image/jpeg", 0.8), gpsData);
        setProcessing(false);
      };
      img.onerror = () => {
        onCapture(base64, gpsData);
        setProcessing(false);
      };
      img.src = base64;
    };
    reader.readAsDataURL(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  if (photoPreview) {
    return (
      <div className="relative rounded-[6px] overflow-hidden border border-[#E5E7EB] dark:border-[#262626]">
        <img
          src={photoPreview}
          alt="Captured maintenance issue"
          className="w-full h-[200px] object-cover"
        />
        <button
          type="button"
          onClick={onClear}
          className="absolute top-2 right-2 bg-white dark:bg-[#141415] border border-[#E5E7EB] dark:border-[#262626] px-2 py-1 rounded-[4px] shadow-[0_1px_2px_rgba(0,0,0,0.05)] text-[12px] font-medium text-[#6B7280] dark:text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-[#1C1C1E] transition-colors duration-150"
        >
          Retake
        </button>
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleInputChange} className="hidden" />
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleInputChange} className="hidden" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={processing}
          className="flex-1 flex flex-col items-center justify-center gap-2 h-[200px] rounded-[6px] border-2 border-dashed border-[#D1D5DB] dark:border-[#3F3F46] bg-white dark:bg-[#141415] hover:border-[#00539F] dark:hover:border-[#3B82F6] hover:bg-[#FAFAFA] dark:hover:bg-[#1C1C1E] transition-colors duration-150"
        >
          <Camera className="h-6 w-6 text-[#9CA3AF] dark:text-[#6B7280]" />
          <span className="text-[14px] text-[#6B7280] dark:text-[#9CA3AF]">Take Photo</span>
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={processing}
          className="flex-1 flex flex-col items-center justify-center gap-2 h-[200px] rounded-[6px] border-2 border-dashed border-[#D1D5DB] dark:border-[#3F3F46] bg-white dark:bg-[#141415] hover:border-[#00539F] dark:hover:border-[#3B82F6] hover:bg-[#FAFAFA] dark:hover:bg-[#1C1C1E] transition-colors duration-150"
        >
          <ImagePlus className="h-6 w-6 text-[#9CA3AF] dark:text-[#6B7280]" />
          <span className="text-[14px] text-[#6B7280] dark:text-[#9CA3AF]">Upload Photo</span>
        </button>
      </div>

      {processing && (
        <div className="flex items-center justify-center gap-2 py-2">
          <div className="w-4 h-4 rounded-full border-2 border-[#E5E7EB] dark:border-[#262626] border-t-[#00539F] dark:border-t-[#3B82F6] animate-spin" />
          <span className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF]">Processing...</span>
        </div>
      )}

      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleInputChange} className="hidden" />
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleInputChange} className="hidden" />
    </div>
  );
}
