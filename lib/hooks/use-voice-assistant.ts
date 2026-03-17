"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface UseVoiceAssistantOptions {
  onCommand?: (transcript: string) => void;
  continuous?: boolean;
  useElevenLabs?: boolean;
}

export function useVoiceAssistant(options: UseVoiceAssistantOptions = {}) {
  const { continuous = true, useElevenLabs = true } = options;
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastTranscript, setLastTranscript] = useState("");
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const speechQueueRef = useRef<string[]>([]);
  const speakingRef = useRef(false);
  const listeningRef = useRef(false);

  // Persistent audio element for TTS — unlocked on first user tap
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const onCommandRef = useRef(options.onCommand);
  onCommandRef.current = options.onCommand;

  const resumeListening = useCallback(() => {
    if (listeningRef.current && recognitionRef.current && !speakingRef.current) {
      try { recognitionRef.current.start(); } catch { /* already running */ }
    }
  }, []);

  // Set up speech recognition once
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }

    const rec = new SR();
    rec.continuous = continuous;
    rec.interimResults = false;
    rec.lang = "en-US";

    rec.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results[event.results.length - 1];
      if (last.isFinal) {
        const t = last[0].transcript.trim();
        setLastTranscript(t);
        onCommandRef.current?.(t);
      }
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      // Auto-restart on no-speech
      if (event.error === "no-speech" || event.error === "aborted") {
        if (listeningRef.current && !speakingRef.current) {
          setTimeout(() => { try { rec.start(); } catch { /* */ } }, 100);
        }
        return;
      }
      console.error("SR error:", event.error);
    };

    rec.onend = () => {
      if (listeningRef.current && !speakingRef.current) {
        setTimeout(() => { try { rec.start(); } catch { /* */ } }, 100);
      }
    };

    recognitionRef.current = rec;
    return () => { rec.abort(); recognitionRef.current = null; };
  }, [continuous]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;

    // Unlock audio for TTS on this user gesture
    if (!audioElRef.current) {
      const a = new Audio();
      a.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";
      a.play().catch(() => {});
      audioElRef.current = a;
    }
    // Also unlock Web Speech synthesis
    const u = new SpeechSynthesisUtterance("");
    u.volume = 0;
    window.speechSynthesis.speak(u);

    listeningRef.current = true;
    try { recognitionRef.current.start(); } catch { /* */ }
    setIsListening(true);
  }, []);

  const stopListening = useCallback(() => {
    listeningRef.current = false;
    recognitionRef.current?.abort();
    setIsListening(false);
  }, []);

  // ElevenLabs TTS
  const speakElevenLabs = useCallback(async (text: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return false;

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = audioElRef.current || new Audio();
      audioElRef.current = audio;

      return new Promise<boolean>((resolve) => {
        audio.onended = () => { URL.revokeObjectURL(url); resolve(true); };
        audio.onerror = () => { URL.revokeObjectURL(url); resolve(false); };
        audio.src = url;
        audio.play().catch(() => { URL.revokeObjectURL(url); resolve(false); });
      });
    } catch {
      return false;
    }
  }, []);

  // Web Speech TTS fallback
  const speakWebSpeech = useCallback((text: string): Promise<boolean> => {
    return new Promise((resolve) => {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.05;
      u.volume = 1.0;
      u.lang = "en-US";
      u.onend = () => resolve(true);
      u.onerror = () => resolve(false);
      setTimeout(() => window.speechSynthesis.speak(u), 50);
      // Safety: don't hang forever
      setTimeout(() => resolve(true), 30000);
    });
  }, []);

  const speak = useCallback(
    (text: string, priority = false) => {
      if (priority) {
        speechQueueRef.current = [text];
        window.speechSynthesis.cancel();
        if (audioElRef.current) { audioElRef.current.pause(); audioElRef.current.currentTime = 0; }
      } else {
        speechQueueRef.current.push(text);
      }

      if (speakingRef.current && !priority) return;

      async function processQueue() {
        const next = speechQueueRef.current.shift();
        if (!next) {
          speakingRef.current = false;
          setIsSpeaking(false);
          // Resume listening after done speaking
          setTimeout(resumeListening, 200);
          return;
        }

        speakingRef.current = true;
        setIsSpeaking(true);

        // Pause mic while speaking to avoid echo
        try { recognitionRef.current?.abort(); } catch { /* */ }

        let ok = false;
        if (useElevenLabs) ok = await speakElevenLabs(next);
        if (!ok) ok = await speakWebSpeech(next);

        processQueue();
      }

      if (!speakingRef.current) processQueue();
    },
    [useElevenLabs, speakElevenLabs, speakWebSpeech, resumeListening]
  );

  const stopSpeaking = useCallback(() => {
    speechQueueRef.current = [];
    window.speechSynthesis.cancel();
    if (audioElRef.current) { audioElRef.current.pause(); audioElRef.current.currentTime = 0; }
    speakingRef.current = false;
    setIsSpeaking(false);
  }, []);

  return { isListening, isSpeaking, lastTranscript, supported, startListening, stopListening, speak, stopSpeaking };
}
