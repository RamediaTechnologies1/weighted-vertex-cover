"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Glasses, Mic, MicOff, Camera, X, Loader2 } from "lucide-react";
import type { Assignment } from "@/lib/types";

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
function priorityRank(p: string) {
  return PRIORITY_ORDER[p as keyof typeof PRIORITY_ORDER] ?? 4;
}

// Silence detection config
const SILENCE_THRESHOLD = 0.015; // volume level below which = silence
const SILENCE_DURATION = 1500; // ms of silence before auto-sending
const MIN_SPEECH_DURATION = 300; // ms of speech before we consider it real

interface GlassesAssistantProps {
  email: string;
}

export function GlassesAssistant({ email }: GlassesAssistantProps) {
  const [active, setActive] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [techName, setTechName] = useState("Technician");
  const [processing, setProcessing] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState("");
  const [lastHeard, setLastHeard] = useState("");
  const [expanded, setExpanded] = useState(false);

  const assignmentsRef = useRef<Assignment[]>([]);
  const prevIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDoneRef = useRef(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const capturedImageRef = useRef<string | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  // Always-on mic refs
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number>(0);
  const isSpeechRef = useRef(false);
  const speechStartRef = useRef(0);
  const silenceStartRef = useRef(0);
  const pausedRef = useRef(false); // paused while TTS plays or processing

  assignmentsRef.current = assignments;
  capturedImageRef.current = capturedImage;

  function getActiveJobs() {
    return assignmentsRef.current
      .filter((a) => ["pending", "accepted", "in_progress"].includes(a.status))
      .sort((a, b) => priorityRank(a.report?.priority || "low") - priorityRank(b.report?.priority || "low"));
  }

  // ---- TTS: speak through glasses via ElevenLabs or Web Speech ----
  const speak = useCallback(async (text: string) => {
    setLastMessage(text);
    setSpeaking(true);
    pausedRef.current = true; // pause mic monitoring while speaking

    // Try ElevenLabs first
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = audioElRef.current || new Audio();
        audioElRef.current = audio;
        audio.src = url;
        await audio.play();
        await new Promise<void>((resolve) => {
          audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
          audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
        });
        setSpeaking(false);
        // Small delay before resuming mic to avoid echo pickup
        setTimeout(() => { pausedRef.current = false; }, 500);
        return;
      }
    } catch { /* fall through */ }

    // Fallback: Web Speech
    await new Promise<void>((resolve) => {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.05;
      u.volume = 1.0;
      u.lang = "en-US";
      u.onend = () => resolve();
      u.onerror = () => resolve();
      setTimeout(() => window.speechSynthesis.speak(u), 50);
      setTimeout(() => resolve(), 30000);
    });
    setSpeaking(false);
    setTimeout(() => { pausedRef.current = false; }, 500);
  }, []);

  // ---- Always-on mic: start stream + silence detection loop ----
  const startMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Float32Array(analyser.fftSize);
      isSpeechRef.current = false;
      silenceStartRef.current = 0;
      speechStartRef.current = 0;
      pausedRef.current = false;

      function monitor() {
        rafRef.current = requestAnimationFrame(monitor);
        if (pausedRef.current) return;

        analyser.getFloatTimeDomainData(dataArray);
        // RMS volume
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i] * dataArray[i];
        const rms = Math.sqrt(sum / dataArray.length);

        const now = Date.now();

        if (rms > SILENCE_THRESHOLD) {
          // Sound detected
          silenceStartRef.current = 0;
          if (!isSpeechRef.current) {
            // Speech just started — begin recording
            isSpeechRef.current = true;
            speechStartRef.current = now;
            startRecording(stream);
          }
        } else {
          // Silence
          if (isSpeechRef.current) {
            if (silenceStartRef.current === 0) {
              silenceStartRef.current = now;
            } else if (now - silenceStartRef.current > SILENCE_DURATION) {
              // Enough silence — check if speech was long enough
              if (now - speechStartRef.current > MIN_SPEECH_DURATION + SILENCE_DURATION) {
                // Auto-send!
                isSpeechRef.current = false;
                silenceStartRef.current = 0;
                stopRecordingAndProcess();
              } else {
                // Too short, discard
                isSpeechRef.current = false;
                silenceStartRef.current = 0;
                discardRecording();
              }
            }
          }
        }
      }

      monitor();
      setListening(true);
    } catch {
      speak("Microphone access needed. Please allow mic permission.");
    }
  }, [speak]);

  const stopMic = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    analyserRef.current = null;
    isSpeechRef.current = false;
    setListening(false);
  }, []);

  // Start a MediaRecorder segment (speech detected)
  function startRecording(stream: MediaStream) {
    chunksRef.current = [];
    try {
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
    } catch { /* ignore */ }
  }

  // Stop recording and send to Whisper
  function stopRecordingAndProcess() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;

    pausedRef.current = true; // pause monitoring during processing
    setProcessing(true);

    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      chunksRef.current = [];
      mediaRecorderRef.current = null;

      if (blob.size < 1000) {
        setProcessing(false);
        pausedRef.current = false;
        return;
      }

      // Transcribe with Whisper
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      try {
        const res = await fetch("/api/transcribe", { method: "POST", body: formData });
        if (res.ok) {
          const { text } = await res.json();
          if (text && text.trim()) {
            setLastHeard(text.trim());
            await processCommand(text.trim());
          }
        }
      } catch {
        await speak("Sorry, I couldn't hear that. Try again.");
      }
      setProcessing(false);
      // pausedRef gets unset by speak() after TTS finishes
      // If no speech happened, unset it now
      if (!pausedRef.current) return;
      pausedRef.current = false;
    };

    recorder.stop();
  }

  function discardRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "recording") {
      recorder.onstop = () => {};
      recorder.stop();
    }
    chunksRef.current = [];
    mediaRecorderRef.current = null;
  }

  // ---- Process voice commands ----
  async function processCommand(transcript: string) {
    const cmd = transcript.toLowerCase().trim();
    const activeJobs = getActiveJobs();
    const currentJob = activeJobs.find((a) => a.status === "in_progress") ||
      activeJobs.find((a) => a.status === "accepted") || activeJobs[0];

    // Camera
    if (cmd.includes("take photo") || cmd.includes("camera") || cmd.includes("picture")) {
      cameraInputRef.current?.click();
      return;
    }

    // Image query
    if (capturedImageRef.current) {
      await sendImageQuery(transcript);
      return;
    }

    // Accept
    if (cmd.includes("accept") || cmd === "yes") {
      const pending = activeJobs.find((a) => a.status === "pending");
      if (!pending) { await speak("No pending jobs to accept."); return; }
      try {
        const res = await fetch(`/api/assignments/${pending.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "accepted" }),
        });
        if (res.ok) {
          const r = pending.report;
          await speak(`Job accepted. ${r?.priority || ""} priority ${r?.trade || ""} at ${r?.building || "building"}${r?.room ? ", room " + r.room : ""}. ${r?.suggested_action || ""}`);
          loadAssignments();
        }
      } catch { await speak("Error accepting job."); }
      return;
    }

    // Start
    if (cmd.includes("start")) {
      const target = activeJobs.find((a) => a.status === "accepted");
      if (!target) { await speak("No accepted jobs to start."); return; }
      try {
        await fetch(`/api/assignments/${target.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "in_progress" }),
        });
        const r = target.report;
        await speak(`Job started. Head to ${r?.building || "building"}${r?.room ? ", room " + r.room : ""}. ${r?.suggested_action || ""}`);
        loadAssignments();
      } catch { await speak("Error starting job."); }
      return;
    }

    // Complete
    if (cmd.includes("complete") || cmd.includes("finish") || cmd.includes("done")) {
      const target = activeJobs.find((a) => a.status === "in_progress");
      if (!target) { await speak("No job in progress to complete."); return; }
      try {
        await fetch(`/api/assignments/${target.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "completed", completion_notes: "Completed via smart glasses" }),
        });
        await speak("Job marked complete. Great work!");
        loadAssignments();
      } catch { await speak("Error completing job."); }
      return;
    }

    // Queue / jobs
    if (cmd.includes("job") || cmd.includes("queue") || cmd.includes("next") || cmd.includes("list") || cmd.includes("assignment")) {
      if (activeJobs.length === 0) { await speak("No active jobs. You're all clear."); return; }
      const summary = activeJobs.map((a, i) => `Job ${i + 1}: ${a.report?.priority || "medium"} priority ${a.report?.trade || ""} at ${a.report?.building || "building"}. Status: ${a.status}.`).join(" ");
      await speak(`You have ${activeJobs.length} active job${activeJobs.length > 1 ? "s" : ""}. ${summary}`);
      return;
    }

    // Describe
    if (cmd.includes("describe") || cmd.includes("detail") || cmd.includes("tell me") || cmd.includes("current") || cmd.includes("this")) {
      if (!currentJob?.report) { await speak("No current job to describe."); return; }
      const r = currentJob.report;
      await speak(`${r.priority} priority ${r.trade?.replace("_", " ")} at ${r.building}${r.room ? ", room " + r.room : ""}. ${r.ai_description || r.description || "No description."}. Recommended: ${r.suggested_action || "Check on site."}. ${r.safety_concern ? "Warning: safety concern flagged." : ""}`);
      return;
    }

    // AI fallback — any other question
    try {
      const jobContext = activeJobs.map((a) => ({
        id: a.report?.id || "", assignmentId: a.id, status: a.status,
        building: a.report?.building || "", room: a.report?.room || "",
        trade: a.report?.trade || "", priority: a.report?.priority || "",
        description: a.report?.description || "",
        aiDescription: a.report?.ai_description || "",
        suggestedAction: a.report?.suggested_action || "",
      }));
      const res = await fetch("/api/voice-command", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: transcript, context: { technicianName: techName, currentJobs: jobContext } }),
      });
      if (res.ok) {
        const { response } = await res.json();
        await speak(response);
      } else { await speak("Sorry, couldn't process that."); }
    } catch { await speak("Error connecting to AI."); }
  }

  // ---- Image analysis ----
  function handleImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(reader.result as string);
      speak("Photo captured. Just ask your question aloud.");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function sendImageQuery(question: string) {
    const image = capturedImageRef.current;
    if (!image) return;
    setCapturedImage(null);
    try {
      const jobContext = getActiveJobs().map((a) => ({
        id: a.report?.id || "", assignmentId: a.id, status: a.status,
        building: a.report?.building || "", room: a.report?.room || "",
        trade: a.report?.trade || "", priority: a.report?.priority || "",
        description: a.report?.description || "",
        aiDescription: a.report?.ai_description || "",
        suggestedAction: a.report?.suggested_action || "",
      }));
      const res = await fetch("/api/voice-command", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: question, image, context: { technicianName: techName, currentJobs: jobContext } }),
      });
      if (res.ok) {
        const { response } = await res.json();
        await speak(response);
      }
    } catch { await speak("Error analyzing image."); }
  }

  // ---- Load assignments + poll ----
  const loadAssignments = useCallback(async () => {
    try {
      const res = await fetch(`/api/assignments?technician_email=${encodeURIComponent(email)}`);
      if (!res.ok) return;
      const data = await res.json();
      const list: Assignment[] = data.assignments || [];
      setAssignments(list);
      if (list.length > 0 && list[0].technician?.name) setTechName(list[0].technician.name);

      const currentPendingIds = new Set(list.filter((a) => a.status === "pending").map((a) => a.id));
      const newJobs = list.filter((a) => a.status === "pending" && !prevIdsRef.current.has(a.id));

      if (initialLoadDoneRef.current && newJobs.length > 0 && active) {
        for (const job of newJobs) {
          const r = job.report;
          speak(`Attention. New job assigned. ${r?.priority || ""} priority ${r?.trade || ""} at ${r?.building || "building"}${r?.room ? ", room " + r.room : ""}. ${r?.ai_description || r?.description || ""}. Say accept to take this job.`);
        }
      }
      prevIdsRef.current = currentPendingIds;
      initialLoadDoneRef.current = true;
    } catch { /* ignore */ }
  }, [email, speak, active]);

  useEffect(() => {
    loadAssignments();
    const interval = setInterval(loadAssignments, 10000);
    return () => clearInterval(interval);
  }, [loadAssignments]);

  // Wake lock
  useEffect(() => {
    if (!active) return;
    let wl: WakeLockSentinel | null = null;
    navigator.wakeLock?.request("screen").then((l) => { wl = l; }).catch(() => {});
    return () => { wl?.release(); };
  }, [active]);

  // Activate — start always-on mic
  async function handleActivate() {
    // Unlock audio on user gesture
    if (!audioElRef.current) {
      const a = new Audio();
      a.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";
      a.play().catch(() => {});
      audioElRef.current = a;
    }
    setActive(true);
    await startMic();
    const jobs = getActiveJobs();
    speak(`FixIt AI glasses connected. Welcome ${techName}. You have ${jobs.length} active job${jobs.length !== 1 ? "s" : ""}. ${jobs.length > 0 ? "Just speak naturally. Say what's my queue, or accept to take a job." : "No jobs right now. I'll notify you when one comes in."}`);
  }

  function handleDeactivate() {
    setActive(false);
    stopMic();
    window.speechSynthesis.cancel();
    if (audioElRef.current) { audioElRef.current.pause(); }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopMic(); };
  }, [stopMic]);

  return (
    <>
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelected} />

      {/* Floating glasses button */}
      {!active && (
        <button
          onClick={handleActivate}
          className="fixed bottom-24 right-4 z-50 h-14 w-14 rounded-full bg-[#3B82F6] text-white shadow-lg shadow-[#3B82F6]/25 flex items-center justify-center active:scale-95 transition-all"
        >
          <Glasses className="h-6 w-6" />
        </button>
      )}

      {/* Active panel */}
      {active && (
        <div className="fixed bottom-16 left-0 right-0 z-50 px-3 pb-2">
          <div className="max-w-[640px] mx-auto">
            {/* Image preview */}
            {capturedImage && (
              <div className="mb-2 bg-[#141415] border border-[#262626] rounded-xl p-3 flex items-center gap-3">
                <img src={capturedImage} alt="Captured" className="w-14 h-14 object-cover rounded-lg border border-[#262626]" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-[#E5E7EB]">Photo ready</p>
                  <p className="text-[11px] text-[#9CA3AF]">Ask your question aloud</p>
                </div>
                <button onClick={() => setCapturedImage(null)} className="h-7 w-7 flex items-center justify-center rounded-full bg-[#262626] text-[#9CA3AF]">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Control bar */}
            <div className="bg-[#141415] border border-[#262626] rounded-2xl shadow-xl shadow-black/20 overflow-hidden">
              {/* Expandable message */}
              {expanded && lastMessage && (
                <div className="px-4 py-3 border-b border-[#262626] max-h-32 overflow-y-auto">
                  <p className="text-[13px] text-[#E5E7EB] leading-relaxed">{lastMessage}</p>
                </div>
              )}

              <div className="flex items-center gap-2 px-3 py-2.5">
                {/* Status / expand */}
                <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 flex-1 min-w-0">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    speaking ? "bg-purple-500/15" : "bg-[#3B82F6]/15"
                  }`}>
                    <Glasses className={`h-5 w-5 ${speaking ? "text-purple-400" : "text-[#3B82F6]"}`} />
                  </div>
                  <div className="min-w-0 text-left">
                    {processing ? (
                      <span className="text-[12px] text-[#3B82F6] flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Thinking...</span>
                    ) : speaking ? (
                      <span className="text-[12px] text-purple-400 flex items-center gap-1">
                        <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" /> Speaking...
                      </span>
                    ) : listening ? (
                      <span className="text-[12px] text-emerald-400 flex items-center gap-1">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" /> Listening — just speak
                      </span>
                    ) : (
                      <span className="text-[12px] text-[#6B7280]">Mic off</span>
                    )}
                    {lastHeard && !expanded && (
                      <p className="text-[11px] text-[#9CA3AF] truncate max-w-[160px]">&quot;{lastHeard}&quot;</p>
                    )}
                  </div>
                </button>

                {/* Camera */}
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="h-10 w-10 flex items-center justify-center rounded-full bg-[#1C1C1E] text-[#9CA3AF] border border-[#262626] flex-shrink-0 active:scale-95"
                >
                  <Camera className="h-4.5 w-4.5" />
                </button>

                {/* Mic toggle (mute/unmute) */}
                <button
                  onClick={() => { if (listening) { stopMic(); } else { startMic(); } }}
                  disabled={processing}
                  className={`h-12 w-12 flex items-center justify-center rounded-full flex-shrink-0 active:scale-95 transition-all ${
                    listening
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                      : "bg-[#262626] text-[#6B7280] border border-[#333]"
                  }`}
                >
                  {listening ? (
                    <Mic className="h-5 w-5" />
                  ) : (
                    <MicOff className="h-5 w-5" />
                  )}
                </button>

                {/* Close */}
                <button
                  onClick={handleDeactivate}
                  className="h-10 w-10 flex items-center justify-center rounded-full bg-[#1C1C1E] text-[#6B7280] border border-[#262626] flex-shrink-0 active:scale-95"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
