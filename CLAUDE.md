# CLAUDE.md — FixIt AI Project Context

## What This Project Is
FixIt AI is a smart campus maintenance reporting and automation platform for University of Delaware, built for the HenHacks 2026 hackathon (Automation Systems & Public Infrastructure category, sponsored by Bentley).

**The Problem:** UDel students report maintenance issues by emailing fixit@udel.edu. A human dispatcher manually reads emails, classifies the trade type, assesses priority, creates a work order in IBM Maximo, and routes to the correct team.

**Our Solution:** AI-powered automation that eliminates the dispatcher bottleneck:
1. Student snaps photo of issue + selects building/location
2. OpenAI Vision API analyzes image - auto-classifies trade, severity, priority
3. System auto-generates structured work order
4. Auto-sends email to correct department via Gmail SMTP
5. Live campus dashboard shows all reports on interactive map
6. Smart deduplication: multiple reports of same issue = 1 work order with upvotes
7. Pattern detection: repeated issues trigger preventive maintenance alerts

## Tech Stack
- Framework: Next.js 14 (App Router) with TypeScript
- Styling: Tailwind CSS + shadcn/ui components
- Database: Supabase (PostgreSQL)
- AI: OpenAI Vision API (GPT-4o) for image analysis
- Email: Nodemailer with Gmail SMTP for auto-dispatch
- Maps: React-Leaflet for campus map visualization
- PWA: Installable mobile app with GPS + camera access
- Deployment: Vercel (auto-deploys from main branch)

## Environment Variables
All secrets are in .env.local (not committed to git). Required keys:
- OPENAI_API_KEY
- GMAIL_USER
- GMAIL_APP_PASSWORD
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

## Database Schema (Supabase PostgreSQL)
Table: reports
- id UUID PRIMARY KEY
- created_at, updated_at TIMESTAMPTZ
- building TEXT, room TEXT, floor TEXT
- latitude DOUBLE PRECISION, longitude DOUBLE PRECISION
- description TEXT, photo_url TEXT, photo_base64 TEXT
- trade TEXT (plumbing|electrical|hvac|structural|custodial|landscaping|safety_hazard)
- priority TEXT (critical|high|medium|low)
- ai_description TEXT, suggested_action TEXT
- safety_concern BOOLEAN, estimated_cost TEXT, estimated_time TEXT, confidence_score DOUBLE PRECISION
- status TEXT (submitted|analyzing|dispatched|in_progress|resolved)
- duplicate_of UUID, upvote_count INTEGER, urgency_score DOUBLE PRECISION
- dispatched_to TEXT, dispatched_at TIMESTAMPTZ, email_sent BOOLEAN
- reporter_email TEXT, reporter_name TEXT

## Project Structure
app/
  layout.tsx - Root layout
  page.tsx - Main report submission page (mobile-first PWA)
  dashboard/page.tsx - Admin dashboard with campus map
  api/
    analyze/route.ts - POST: Send image to OpenAI Vision
    report/route.ts - POST: Save report to Supabase + send email
    reports/route.ts - GET: Fetch all reports for dashboard
components/
  report-form.tsx - Photo upload, building select, description
  camera-capture.tsx - Camera/file upload
  location-picker.tsx - Building dropdown with GPS
  campus-map.tsx - Leaflet map showing reports
  report-card.tsx - Individual report card
  ai-analysis-display.tsx - AI results with animations
lib/
  supabase.ts - Supabase client
  openai.ts - OpenAI client + analysis prompt
  email.ts - Nodemailer Gmail SMTP
  types.ts - TypeScript interfaces
  constants.ts - UDel buildings, departments, map center
  utils.ts - cn() helper

## OpenAI Vision Prompt
Analyze this campus maintenance image and return ONLY valid JSON:
{
  "trade": "plumbing|electrical|hvac|structural|custodial|landscaping|safety_hazard",
  "priority": "critical|high|medium|low",
  "description": "Brief description",
  "suggested_action": "What team should do",
  "safety_concern": true/false,
  "estimated_cost": "$X-Y range",
  "estimated_time": "repair time estimate",
  "confidence_score": 0.0-1.0
}

## Department Routing
plumbing -> plumbing-team@facilities.udel.edu
electrical -> electrical-team@facilities.udel.edu
hvac -> hvac-team@facilities.udel.edu
structural -> structural-team@facilities.udel.edu
custodial -> custodial-team@facilities.udel.edu
landscaping -> grounds-team@facilities.udel.edu
safety_hazard -> safety@facilities.udel.edu

## UDel Campus Buildings
Gore Hall: 39.6812, -75.7528
Smith Hall: 39.6800, -75.7520
Memorial Hall: 39.6795, -75.7515
Perkins Student Center: 39.6790, -75.7535
Morris Library: 39.6805, -75.7530
Trabant University Center: 39.6783, -75.7510
ISE Lab: 39.6778, -75.7505
Evans Hall: 39.6815, -75.7540
Brown Lab: 39.6808, -75.7525
Colburn Lab: 39.6803, -75.7518
Spencer Lab: 39.6798, -75.7512
DuPont Hall: 39.6810, -75.7535
Sharp Lab: 39.6807, -75.7522
Purnell Hall: 39.6792, -75.7508
Kirkbride Hall: 39.6788, -75.7502
Mitchell Hall: 39.6785, -75.7530
Willard Hall: 39.6813, -75.7532
STAR Campus: 39.6740, -75.7460
Carpenter Sports Building: 39.6760, -75.7550
Christiana Towers: 39.6710, -75.7490
Campus Center: 39.6780, -75.7506

## Smart Features
1. Deduplication: Same building + same trade within 7 days = increment upvote
2. Urgency Score: base_priority + (upvotes * 1.5) + (safety ? 3 : 0)
3. Pattern Detection: 3+ reports same trade in 90 days = preventive maintenance alert

## Design
- UDel colors: #00539F (blue), #FFD200 (gold)
- Mobile-first PWA (installable on phone)
- shadcn/ui components
- Loading animations for AI analysis

## 3-Portal Architecture

### Authentication: PIN via Gmail SMTP
- User enters email + selects role (User/Technician/Manager)
- 6-digit PIN sent via Nodemailer → enter PIN → session cookie set
- Supabase tables: auth_pins (temp), sessions (24h expiry)
- middleware.ts protects routes by role

### Portal 1: User (Student)
- Route: /user/*
- Photo capture (camera/file) → select building → interactive floor plan room select → description → submit
- AI analyzes via OpenAI Vision → auto-classifies trade/priority
- Report saved to Supabase, dispatch email sent

### Portal 2: Technician (Field Worker)
- Route: /technician/*
- Job queue showing assigned work orders
- Floor plan view showing exact room location
- Mark complete with photo + notes
- Receives email when assigned new job

### Portal 3: Manager (AI Agent Dashboard)
- Route: /manager/*
- AI auto-assigns reports to technicians (scoring: availability + building match + trade + workload)
- Override/reassign capability
- Campus map (Leaflet), reports table, pattern detection alerts
- Stats overview (open reports, response times)

### Interactive Floor Plans
- SVG-based, zero dependencies, mobile touch-friendly
- Gore Hall: 3 floors, ~12 rooms each, central atrium
- Smith Hall: 3 floors, ~10 rooms each, large lecture halls
- Clickable rooms with UDel gold highlight on selection
- Red/orange highlights for active issues (technician + manager views)

## Additional Database Tables
Table: auth_pins - id, email, role, pin_hash, expires_at
Table: sessions - id, email, role, expires_at
Table: technicians - id, name, email, trade, assigned_buildings[], is_available, current_location
Table: assignments - id, report_id FK, technician_id FK, assigned_by, status, notes, completion_notes, completion_photo_base64, started_at, completed_at

## Additional API Routes
POST /api/auth/send-pin - Generate + email PIN
POST /api/auth/verify-pin - Verify PIN, create session
GET|DELETE /api/auth/session - Check/destroy session
GET|POST /api/technicians - List/create technicians
GET|POST /api/assignments - List/create assignments
PATCH /api/assignments/[id] - Update assignment status
POST /api/ai-assign - AI auto-assign report to best technician

## AI Assignment Scoring
Score(tech) = available(+10) + building_match(+5) + trade_match(+5) + low_workload(+2 per slot under 3)

## Demo Scope
- Buildings: Gore Hall + Smith Hall only (with interactive floor plans)
- Trade: HVAC focus
- Technicians: 3 seeded HVAC techs (Mike Johnson, Sarah Chen, James Williams)

## Future Architecture (Meta Glasses + 11 Labs)
All APIs are client-agnostic JSON endpoints, ready for:
- Meta Glasses camera → /api/analyze (same base64 photo endpoint)
- 11 Labs voice → transcribe → /api/report (same submission endpoint)
- Technician completion via glasses → /api/assignments/[id] PATCH
- AR navigation → floor-plans.ts room coordinates drive overlays
- Voice guidance → 11 Labs TTS reads suggested_action field

## Commands
npm run dev - Start dev server
npm run build - Production build

## Deployment
Vercel auto-deploys from main branch
Live: https://fixitai-gamma.vercel.app
