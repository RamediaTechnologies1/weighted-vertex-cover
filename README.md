# FixIt AI — Smart Campus Safety & Maintenance Platform

> **HenHacks 2026** | University of Delaware
>
> **Categories:** Automation Systems & Public Infrastructure | Security & Safety
>
> **Live Demo:** [https://fixitai-gamma.vercel.app](https://fixitai-gamma.vercel.app)

---

## The Problem

UDel students report maintenance issues by emailing **fixit@udel.edu**. A human dispatcher manually reads each email, classifies the trade type, assesses priority, creates a work order in IBM Maximo, and routes it to the correct team. This process is slow, error-prone, and creates a dangerous bottleneck — especially for safety-critical issues like exposed wiring, flooded stairwells, or broken fire exits where every minute matters.

Meanwhile, students walking through campus have **zero visibility** into known hazards. A broken handrail on the 3rd floor of Gore Hall could injure someone before the email even gets triaged.

## Our Solution

**FixIt AI turns every student into a safety sensor and uses AI to transform reactive maintenance into proactive safety prevention.**

A student snaps a photo of an issue. Within seconds, our AI analyzes it — classifying the trade type, assessing safety risks (slip/fall, fire hazard, electrical shock, structural failure, and more), scoring severity on a 0-10 scale, and predicting what happens if it goes unfixed. The report is auto-dispatched to the correct department. Critical safety hazards are auto-escalated to the campus safety director. And every other student on campus can now see the hazard before they walk into it.

No emails. No dispatcher. No delays. **Photo in, safety out.**

![Student Report Flow](docs/screenshots/report-flow.png)

---

## Three-Portal Architecture

### Portal 1: Student (Report & Stay Safe)

Students capture maintenance issues and get real-time safety awareness.

| Feature | Description |
|---------|-------------|
| **Photo + AI Analysis** | Snap a photo, AI classifies trade, priority, and safety risks in seconds |
| **Interactive Floor Plans** | Tap the exact room on SVG floor plans (Gore Hall, Smith Hall) |
| **Voice Input** | Dictate descriptions via Web Speech API — hands-free accessibility |
| **Anonymous Reporting** | Toggle anonymous mode — identity stripped before storage, encouraging safety reports |
| **Safety Alerts** | See active campus hazards when opening the app — make safer choices |
| **Emergency Button** | One-tap critical safety report — dispatches safety team immediately |
| **QR Code Scan** | Scan room QR codes to pre-fill location — zero friction reporting |
| **Report Tracking** | Live status timeline with auto-refresh and progress visualization |

![Student Portal](docs/screenshots/student-portal.png)
![AI Safety Analysis](docs/screenshots/ai-analysis.png)
![Safety Alerts Banner](docs/screenshots/safety-alerts.png)

### Portal 2: Technician (Field Operations)

Technicians receive assignments, navigate to issues, and complete work orders.

| Feature | Description |
|---------|-------------|
| **Job Queue** | Active/completed/all tabs with auto-refresh |
| **Floor Plan Navigation** | See exact room location on interactive floor plans |
| **Push Notifications** | Browser notifications when new jobs are assigned |
| **Accept & Start** | Step-by-step job workflow (pending → accepted → in_progress → completed) |
| **Completion Evidence** | Photo + notes on job completion |
| **Real-time Updates** | Supabase Realtime subscription — instant assignment updates |

![Technician Portal](docs/screenshots/technician-portal.png)
![Job Detail](docs/screenshots/job-detail.png)

### Portal 3: Manager (AI Command Center)

Managers get full visibility with AI-powered analytics and safety intelligence.

| Feature | Description |
|---------|-------------|
| **AI Auto-Assignment** | Scores technicians by availability, building proximity, trade match, workload |
| **Safety Intelligence Tab** | Building Safety Index, predictive alerts, campus safety score |
| **SLA Tracking** | Color-coded time elapsed on every report and assignment |
| **Safety Heatmap** | Campus map with buildings colored by safety score |
| **Predictive Alerts** | Detects report clusters and predicts systemic risks |
| **Clickable Stats** | Filter reports by clicking stat cards |
| **QR Code Generator** | Generate printable QR codes for every room |
| **Real-time Dashboard** | Supabase Realtime — data updates without refresh |

![Manager Dashboard](docs/screenshots/manager-dashboard.png)
![Safety Intelligence](docs/screenshots/safety-intelligence.png)
![Campus Safety Map](docs/screenshots/campus-map.png)

---

## How It Answers the Categories

### Automation Systems & Public Infrastructure

> *"How might we use technology to make public systems more reliable, accessible, and adaptive to real human needs?"*

**More Reliable:**
- **Eliminates the human dispatcher** — AI classifies and routes in seconds, not hours
- **4-provider AI fallback** (OpenAI → Claude → Gemini → Groq) — system never goes down
- **Automated Escalation Engine** — unaccepted jobs auto-reassign after SLA threshold (15m critical, 60m high, 2h default), manager auto-notified on breaches, stale jobs flagged after 8h
- **Smart deduplication** — multiple reports of the same issue become a single work order with upvotes

**More Accessible:**
- **Photo-based reporting** — snap a picture, AI describes the issue. No technical vocabulary needed
- **Voice input** via Web Speech API — hands-free, accessible reporting
- **QR codes on rooms** — scan and location is pre-filled, zero friction
- **Email ingestion** — students who still email fixit@udel.edu get their emails auto-parsed by AI into structured reports. Old workflow still works, but now it's automated
- **Anonymous reporting** — lowers barriers for safety-sensitive reports

**Adaptive to Real Human Needs:**
- **Community-driven priority** — urgency score rises with upvotes: `base + (upvotes × 1.5) + (safety ? 3 : 0)`
- **Predictive maintenance** — 3+ same-trade reports in 90 days → auto-generates preventive inspection work orders (not just alerts)
- **Smart job batching** — groups same-building, same-trade reports into efficient batched work orders sorted by floor for one-trip sweeps
- **Automated follow-up** — reporters auto-receive emails at every status change (dispatched → in progress → resolved)
- **Pattern-to-prevention pipeline** — the system evolves from fixing problems to predicting and preventing them

### Security & Safety

> *"How might we create systems that keep information secure, safeguard communities, or help individuals make safer choices?"*

**Keep information secure:**
- Anonymous reporting with identity stripping — no name/email stored for anonymous reports
- PIN-based auth with 10-minute expiry, sessions expire in 24 hours
- Data transparency — students see exactly what's collected and how it's used
- Reporter identity hidden from technicians on anonymous reports

**Safeguard communities:**
- AI Safety Risk Taxonomy — every report is assessed for 8 risk categories (slip/fall, fire, electrical shock, structural failure, water damage, air quality, security vulnerability, chemical exposure)
- Building Safety Index — real-time per-building safety scores (0-10)
- Predictive Safety Alerts — report clusters trigger systemic risk warnings
- Auto-escalation — critical safety hazards auto-email the campus safety director
- One-tap emergency reporting — 2 taps to dispatch the safety team

**Help individuals make safer choices:**
- Campus Safety Alerts — students see active hazards when they open the app
- Risk Escalation Warnings — AI tells you what happens if the issue goes unfixed
- Safety heatmap on campus map — buildings color-coded by danger level
- Frictionless reporting (photo + voice + QR) lowers barriers to protecting the community

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) + TypeScript |
| **Styling** | Tailwind CSS + shadcn/ui |
| **Database** | Supabase (PostgreSQL) + Realtime subscriptions |
| **AI Vision** | Multi-provider fallback: OpenAI GPT-4o → Claude → Gemini → Groq |
| **Email** | Nodemailer + Gmail SMTP (dispatch, escalation, follow-up, ingestion) |
| **Automation** | 5 autonomous engines (escalation, batching, email ingestion, follow-up, preventive maintenance) |
| **Maps** | React-Leaflet with CARTO dark tiles |
| **Floor Plans** | Custom SVG — zero dependencies, touch-friendly |
| **Voice** | Web Speech API (SpeechRecognition) |
| **Notifications** | Browser Notifications API (PWA) |
| **Auth** | PIN via email (6-digit, 10-min expiry) |
| **Deployment** | Vercel (auto-deploy from main) |

---

## AI Pipeline

```
Photo → [OpenAI GPT-4o / Claude / Gemini / Groq]
                    ↓
        ┌──────────────────────────┐
        │  Trade Classification     │  plumbing, electrical, hvac, structural...
        │  Priority Assessment      │  critical, high, medium, low
        │  Safety Risk Taxonomy     │  8 risk categories scored 0-10
        │  Risk Escalation          │  "If unfixed: ceiling could collapse..."
        │  Recommended Action       │  "Replace corroded pipe section..."
        │  Confidence Score         │  0.0 - 1.0
        └──────────────────────────┘
                    ↓
        Auto-dispatch email → Department
        Auto-assign → Best technician
        Auto-escalate → Safety director (if critical)
        Auto-notify reporter → Status updates at every step
        Auto-batch → Group same-building jobs
        Auto-prevent → Generate inspection WOs from patterns
```

The system tries up to 4 AI providers in sequence. If OpenAI quota is exhausted, it falls back to Claude, then Gemini, then Groq — ensuring the system never goes down.

---

## Automation Engines

FixIt AI runs **5 autonomous engines** that operate without human intervention:

### 1. Escalation Engine (`POST /api/escalation`)
Time-based SLA monitoring that ensures no report falls through the cracks.

```
Report submitted → 15m (critical) / 60m (high) / 2h (default) with no assignment
  → Auto-assigns to lowest-workload technician
  → Emails manager with SLA breach details

Assignment pending → 30m (critical) / 2h (default) with no acceptance
  → Cancels assignment, reassigns to next available tech
  → Emails manager with escalation alert

Job in_progress → 8h+ without completion
  → Flags to manager as stale
```

### 2. Job Batching Engine (`POST /api/batch-jobs`)
Groups nearby reports for efficient one-trip resolution.

```
3 plumbing reports in Gore Hall (Floor 1, 2, 3)
  → Batched into single sweep: Floor 1 → Floor 2 → Floor 3
  → One technician assigned, one consolidated notification
  → 3 trips reduced to 1
```

### 3. Email Ingestion (`POST /api/email-ingest`)
Bridges the old fixit@udel.edu workflow into the automated pipeline.

```
Student emails: "There's water leaking from the ceiling in Gore Hall room 205"
  → AI parses: building=Gore Hall, room=205, trade=plumbing, priority=high
  → Auto-creates structured report → auto-dispatches → auto-assigns
  → Same pipeline as photo reports — no dispatcher needed
```

### 4. Automated Follow-up (built into assignment updates)
Reporters are auto-notified at every status change — no manual emails.

```
dispatched → "Your report has been assigned to Mike Johnson"
in_progress → "A technician is working on your issue right now"
resolved → "Issue resolved! Notes: Replaced corroded pipe coupling"
```

### 5. Preventive Maintenance Engine (`POST /api/preventive-maintenance`)
Transforms pattern detection from alerts into action.

```
3+ HVAC reports in 90 days across Gore Hall and Smith Hall
  → Auto-generates high-priority inspection work order
  → Auto-assigns to HVAC technician
  → Emails manager: "Schedule comprehensive HVAC inspection"
  → 30-day dedup prevents duplicate preventive WOs
```

**Master Hub:** `POST /api/automation` runs engines 1, 2, and 5 in sequence. Can be triggered by Vercel Cron or any external scheduler.

---

## Smart Features

| Feature | How It Works |
|---------|-------------|
| **Deduplication** | Same building + same trade within 7 days → upvote original instead of duplicate |
| **Urgency Score** | `base_priority + (upvotes × 1.5) + (safety ? 3 : 0)` — safety issues bubble to top |
| **Pattern Detection** | 3+ reports of same trade in 90 days → auto-generates preventive maintenance work order |
| **Building Safety Index** | `safety_issues × 3 + critical × 2.5 + high × 1.5 + open × 0.3` → 0-10 score |
| **SLA Tracking** | Color-coded elapsed time — green (ok), yellow (4h+), orange (warning), red (SLA breach) |
| **Predictive Alerts** | Clusters of same-trade reports → "Possible pipe deterioration. Risk: water damage, mold" |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase project with tables: `reports`, `assignments`, `technicians`, `auth_pins`, `sessions`
- At least one AI API key (OpenAI, Anthropic, Google Gemini, or Groq)
- Gmail account with App Password for SMTP

### Environment Variables

Create `.env.local`:

```env
# AI Providers (at least one required)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AI...
GROQ_API_KEY=gsk_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Email (Gmail SMTP)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

### Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build for Production

```bash
npm run build
```

---

## Project Structure

```
app/
  layout.tsx              # Root layout with Outfit + DM Sans fonts
  page.tsx                # Loading/redirect screen
  login/page.tsx          # PIN-based auth (3 roles)
  verify/page.tsx         # PIN verification
  user/
    page.tsx              # Report form with QR prefill support
    reports/page.tsx      # My Reports with status timeline
    layout.tsx            # Student layout + safety alerts + emergency button
  technician/
    page.tsx              # Job queue with realtime + notifications
    job/[id]/page.tsx     # Job detail with floor plans
    layout.tsx            # Technician layout
  manager/
    page.tsx              # Dashboard with reports, assignments, safety, map
    qr-codes/page.tsx     # QR code generator for rooms
    layout.tsx            # Manager layout
  api/
    analyze/route.ts      # AI vision analysis (4-provider fallback)
    report/route.ts       # Submit report + dedup + auto-assign + escalate
    reports/route.ts      # Fetch reports + pattern detection
    assignments/route.ts  # List/create assignments
    assignments/[id]/     # Update assignment status
    ai-assign/route.ts    # AI technician scoring algorithm
    escalation/route.ts   # SLA monitoring + auto-reassignment engine
    batch-jobs/route.ts   # Smart job batching by building + trade
    email-ingest/route.ts # AI email parsing → structured reports
    preventive-maintenance/route.ts  # Pattern → auto work orders
    automation/route.ts   # Master hub — runs all engines
    auth/                 # PIN send, verify, session management
    qr/route.ts           # QR code URL generator
    technicians/route.ts  # Technician management
components/
  report/                 # ReportForm, CameraCapture, AIAnalysisDisplay, VoiceInput, EmergencyButton, SafetyAlerts
  technician/             # JobCard, CompletionForm
  manager/                # StatsCards, ReportsTable, AssignmentPanel, SafetyDashboard
  map/                    # CampusMap with safety heatmap
  floor-plan/             # SVG FloorPlanViewer
  layout/                 # PortalHeader, BottomNav
hooks/
  use-realtime.ts         # Supabase Realtime subscription hook
  use-notifications.ts    # Browser push notification hook
lib/
  openai.ts               # Multi-provider AI with safety taxonomy prompt
  supabase.ts             # Supabase client (anon, browser-safe)
  supabase-admin.ts       # Supabase admin client (server-only, bypasses RLS)
  email.ts                # Gmail SMTP dispatch + escalation emails
  types.ts                # TypeScript interfaces (Report, Assignment, AIAnalysis, SafetyRisk...)
  constants.ts            # UDel buildings, departments, scoring weights
  floor-plans.ts          # SVG floor plan data
```

---

## Screenshots

> **To add screenshots:** Take screenshots of each portal and save them in `docs/screenshots/`. The filenames referenced above are:
>
> - `report-flow.png` — The 4-step report submission flow
> - `student-portal.png` — Student portal home (report form)
> - `ai-analysis.png` — AI Safety Analysis result with risk taxonomy
> - `safety-alerts.png` — Safety alerts banner at top of student portal
> - `technician-portal.png` — Technician job queue
> - `job-detail.png` — Job detail page with floor plan
> - `manager-dashboard.png` — Manager dashboard overview
> - `safety-intelligence.png` — Safety Intelligence tab with building index
> - `campus-map.png` — Campus map with safety heatmap

---

## Demo Scope

- **Buildings:** Gore Hall + Smith Hall (with interactive floor plans)
- **Technicians:** 3 seeded HVAC techs (Mike Johnson, Sarah Chen, James Williams)
- **AI Providers:** Groq (primary), with fallback to OpenAI/Claude/Gemini

---

## Team

Built for HenHacks 2026 at the University of Delaware.

---

## License

MIT
