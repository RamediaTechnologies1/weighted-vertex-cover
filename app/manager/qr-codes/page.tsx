"use client";

import { useState } from "react";
import { QrCode, Download, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEMO_BUILDINGS } from "@/lib/constants";
import { toast } from "sonner";

const FLOORS = ["1", "2", "3"];

function generateQRSvg(text: string, size: number = 200): string {
  const encoded = encodeURIComponent(text);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&format=svg`;
}

interface QRRoom {
  building: string;
  floor: string;
  room: string;
  url: string;
}

export default function QRCodesPage() {
  const [building, setBuilding] = useState("");
  const [floor, setFloor] = useState("");
  const [rooms, setRooms] = useState<QRRoom[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  function generateRoomQRs() {
    if (!building || !floor) {
      toast.error("Select a building and floor");
      return;
    }

    const roomNumbers = Array.from({ length: 8 }, (_, i) => {
      const num = `${floor}${String(i + 1).padStart(2, "0")}`;
      return `${num}`;
    });

    const generated = roomNumbers.map((room) => ({
      building,
      floor,
      room,
      url: `${baseUrl}/user?building=${encodeURIComponent(building)}&floor=${encodeURIComponent(floor)}&room=${encodeURIComponent(room)}`,
    }));

    setRooms(generated);
    toast.success(`Generated ${generated.length} QR codes`);
  }

  async function copyUrl(url: string, room: string) {
    await navigator.clipboard.writeText(url);
    setCopied(room);
    toast.success("URL copied!");
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-[20px] font-medium text-[#111111] dark:text-[#E5E7EB] tracking-[-0.01em]">Room QR codes</h1>
        <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
          Generate QR codes for rooms — scan to pre-fill report location
        </p>
      </div>

      <div className="bg-white dark:bg-[#141415] border border-[#E5E7EB] dark:border-[#262626] rounded-[6px] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none">
        <div className="flex gap-3 flex-wrap">
          <Select value={building} onValueChange={setBuilding}>
            <SelectTrigger className="w-48 rounded-[6px] border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-[#1C1C1E] text-[#111111] dark:text-[#E5E7EB] h-10 text-[14px]">
              <SelectValue placeholder="Select building" />
            </SelectTrigger>
            <SelectContent>
              {DEMO_BUILDINGS.map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={floor} onValueChange={setFloor}>
            <SelectTrigger className="w-32 rounded-[6px] border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-[#1C1C1E] text-[#111111] dark:text-[#E5E7EB] h-10 text-[14px]">
              <SelectValue placeholder="Floor" />
            </SelectTrigger>
            <SelectContent>
              {FLOORS.map((f) => (
                <SelectItem key={f} value={f}>Floor {f}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={generateRoomQRs} className="bg-[#00539F] dark:bg-[#3B82F6] hover:bg-[#003d75] dark:hover:bg-[#2563EB] text-white rounded-[6px] h-10 px-5 text-[14px] font-medium">
            <QrCode className="h-4 w-4 mr-2" /> Generate QR codes
          </Button>
        </div>
      </div>

      {rooms.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {rooms.map((r) => (
            <div key={r.room} className="bg-white dark:bg-[#141415] border border-[#E5E7EB] dark:border-[#262626] rounded-[6px] p-4 text-center shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none hover:border-[#D1D5DB] dark:hover:border-[#3F3F46] transition-colors duration-150">
              <div className="bg-white rounded-[4px] p-2 inline-block mx-auto border border-[#E5E7EB] dark:border-[#262626]">
                <img
                  src={generateQRSvg(r.url, 150)}
                  alt={`QR for ${r.building} Room ${r.room}`}
                  className="w-[150px] h-[150px]"
                  crossOrigin="anonymous"
                />
              </div>
              <div className="mt-3">
                <p className="text-[14px] font-medium text-[#111111] dark:text-[#E5E7EB]">{r.building}</p>
                <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF]">Floor {r.floor}, Room {r.room}</p>
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyUrl(r.url, r.room)}
                  className="flex-1 rounded-[6px] border-[#E5E7EB] dark:border-[#262626] text-[#6B7280] dark:text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-[#1C1C1E] text-[12px] h-8"
                >
                  {copied === r.room ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  {copied === r.room ? "Copied" : "Copy URL"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(generateQRSvg(r.url, 400), "_blank")}
                  className="rounded-[6px] border-[#E5E7EB] dark:border-[#262626] text-[#6B7280] dark:text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-[#1C1C1E] text-[12px] h-8 px-2"
                >
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
