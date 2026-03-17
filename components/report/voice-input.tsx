"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function VoiceInput({ onTranscript, disabled }: VoiceInputProps) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const last = event.results[event.results.length - 1];
        if (last.isFinal) {
          onTranscript(last[0].transcript);
        }
      };

      recognition.onerror = () => {
        setListening(false);
      };

      recognition.onend = () => {
        setListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [onTranscript]);

  function toggle() {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      recognitionRef.current.start();
      setListening(true);
    }
  }

  if (!supported) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={toggle}
      disabled={disabled}
      className={`rounded-[6px] h-9 px-3 border-[#E5E7EB] dark:border-[#262626] transition-colors duration-150 ${
        listening
          ? "bg-[#FEF2F2] dark:bg-[#DC2626]/10 border-[#DC2626]/30 text-[#DC2626]"
          : "text-[#6B7280] dark:text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-[#1C1C1E] hover:text-[#111111] dark:hover:text-[#E5E7EB]"
      }`}
    >
      {listening ? (
        <>
          <MicOff className="h-3.5 w-3.5 mr-1.5" />
          <span className="text-[12px]">Stop</span>
        </>
      ) : (
        <>
          <Mic className="h-3.5 w-3.5 mr-1.5" />
          <span className="text-[12px]">Voice</span>
        </>
      )}
    </Button>
  );
}
