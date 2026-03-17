# DESIGN-SPEC.md — FixIt AI UI Redesign Instructions

## IMPORTANT: Read this ENTIRE file before making ANY changes.

## Goal
Redesign FixIt AI to look like it was built by a top YC startup — NOT by AI.
The current UI looks AI-generated. We need it to look like Stripe meets Linear meets Citizen app.

## Design References

### Stripe Dashboard (Data Presentation)
- URL: https://dashboard.stripe.com
- Key patterns: Clean data tables with thin borders, left-aligned text, small status pills, slide-over panels, 4-stat summary cards at top with just number + label, minimal sidebar navigation
- Why: Best-in-class SaaS dashboard. Professional, data-dense but readable.

### Linear App (Issue Tracking)
- URL: https://linear.app
- Key patterns: Ultra-minimal issue cards, left color bar for priority, tight spacing, keyboard-first feel, no visual noise, subtle hover states, monochrome + one accent color
- Why: Gold standard for clean productivity UI. Feels handcrafted, not templated.

### Citizen App (Safety Reporting)
- URL: https://citizen.com
- Key patterns: Bold safety alerts, map-centric, dark accents for urgency, clear call-to-action buttons, real-time status updates
- Why: Best mobile safety reporting UX. Trust-building, clear hierarchy.

---

## Design System — FOLLOW EXACTLY

### Typography
```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
```
- Page titles: 20px, font-weight 500, color #111111, letter-spacing -0.01em
- Section headers: 16px, font-weight 500, color #111111
- Body text: 14px, font-weight 400, color #111111
- Secondary text: 13px, font-weight 400, color #6B7280
- Labels: 13px, font-weight 500, color #6B7280, uppercase letter-spacing 0.05em ONLY for tiny labels
- Numbers/stats: 28px, font-weight 600, color #111111

### Colors
```css
--bg-primary: #FAFAFA;        /* Page background */
--bg-card: #FFFFFF;            /* Card/surface background */
--bg-hover: #F3F4F6;           /* Hover state */
--bg-active: #EFF6FF;          /* Active/selected state */

--text-primary: #111111;       /* Primary text */
--text-secondary: #6B7280;     /* Secondary/muted text */
--text-tertiary: #9CA3AF;      /* Tertiary/placeholder text */

--accent: #00539F;             /* UDel blue — ONLY accent color */
--accent-light: #EFF6FF;       /* Light blue for backgrounds */

--border: #E5E7EB;             /* All borders */
--border-strong: #D1D5DB;      /* Emphasized borders */

--priority-critical: #DC2626;  /* Red — critical only */
--priority-high: #F59E0B;      /* Amber — high priority */
--priority-medium: #00539F;    /* Blue — medium priority */
--priority-low: #10B981;       /* Green — low priority */

--status-submitted: #6B7280;
--status-assigned: #F59E0B;
--status-in-progress: #00539F;
--status-resolved: #10B981;
```

### Spacing
- Base unit: 16px
- Card padding: 16px
- Section gaps: 24px
- Page padding: 24px horizontal, 32px vertical
- Tight inner spacing: 8px-12px

### Borders & Shadows
- Default border: 1px solid #E5E7EB
- Border radius: 6px MAXIMUM. Never more.
- Shadow (cards only): 0 1px 2px rgba(0,0,0,0.05)
- Shadow (dropdowns only): 0 4px 12px rgba(0,0,0,0.1)
- NO OTHER SHADOWS ANYWHERE

### Interactions
- Hover: background-color #F3F4F6, transition 150ms ease
- Active: background-color #EFF6FF
- Focus: 2px solid #00539F outline, 2px offset
- NO animations except subtle opacity/transform transitions (150ms)
- NO loading spinners with text — use skeleton loaders (gray rectangles that pulse)

---

## Page-by-Page Specifications

### 1. Student Report Page (app/page.tsx, app/user/)
Layout: Single column, max-width 480px, centered on #FAFAFA background

Structure from top to bottom:
- Header: "FixIt AI" in 20px weight-500 #111, below it "University of Delaware" in 13px #6B7280. No logo. No colored banner.
- Camera section: Dashed border rectangle (2px dashed #D1D5DB), 200px tall, centered camera icon (24px, #9CA3AF), text "Take a photo or upload" in 14px #6B7280. On hover: border-color #00539F, bg #FAFAFA. After capture: photo fills the rectangle edge-to-edge, small "Retake" pill button overlay in top-right (white bg, 12px text)
- Building dropdown: Label "Building" in 13px #6B7280 above. Select element: 40px height, 1px border #E5E7EB, 6px radius, 14px text. Just text options, no icons.
- Room/Floor: Two inputs side by side, same style as building select
- Description: Textarea, 100px height, same border style, placeholder "Describe the issue..." in #9CA3AF
- Submit button: Full width, height 44px, bg #00539F, color white, font-weight 500, 14px, 6px radius, hover: bg #003d75. Text: "Submit Report" — NOT uppercase.

After submission — AI Analysis Card:
- White card, 1px border, 6px radius
- Left border: 3px solid (colored by priority)
- Inside: Simple grid showing Trade, Priority, Est. Cost, Est. Time
- Each as label (13px gray) above value (14px black)
- "Dispatched to [team]" at bottom in 13px #6B7280
- Small green checkmark icon + "Email sent" confirmation

### 2. Manager Dashboard (app/manager/)
Layout: Full-width with left sidebar

Sidebar (240px wide, fixed):
- White background, right border 1px #E5E7EB
- "FixIt AI" at top, 16px weight-500
- Nav items: text only, 14px, padding 8px 16px, full-width
- Active item: color #00539F, font-weight 500, bg #EFF6FF, left border 2px #00539F
- Items: Dashboard, Reports, Technicians, QR Codes, Settings
- No icons in nav

Main content area:
- Stats row: 4 cards, each white bg, 1px border, 6px radius
  - Number on top (28px, weight-600)
  - Label below (13px, #6B7280)
  - Bottom border 3px colored (blue for total, red for critical, amber for pending, green for resolved)
  - NO background colors, NO icons in stats

- Reports table (below stats):
  - Clean table: no zebra striping
  - Header row: 13px, weight-500, #6B7280, uppercase, letter-spacing 0.05em, bottom border 2px #E5E7EB
  - Body rows: 14px, #111, bottom border 1px #E5E7EB
  - Priority: Small colored dot (8px circle) + text
  - Status: Inline pill — padding 2px 8px, 4px radius, 12px text, colored border + text (no bg fill, just subtle bg + colored text)
  - Building: Plain text
  - Time: "2h ago" in 13px #9CA3AF
  - Row hover: bg #F9FAFB
  - Click: Opens slide-over panel from right (400px wide, white, shadow -4px 0 12px rgba(0,0,0,0.1))

- Campus Map (below or beside table):
  - Leaflet map in a card with 1px border
  - Simple circle markers: 12px diameter, colored by priority, 2px white border
  - Popup on click: minimal — building name, issue summary, priority pill, time

### 3. Technician View (app/technician/)
Layout: Single column, max-width 640px

Job cards in a vertical list:
- White card, 1px border, 6px radius
- Left border: 3px solid (priority color)
- Inside: Title 14px weight-500, Building + Room in 13px #6B7280, Time "2h ago" in 12px #9CA3AF
- Right side: Status pill
- Card hover: border-color #D1D5DB, bg #FAFAFA

Job detail page:
- Back arrow + "Job Details" header
- Status badge at top
- Info grid: 2 columns, label/value pairs
- Photo of issue (if available)
- Action buttons at bottom: "Start Job" / "Mark Complete" — same button style as submit, full-width

### 4. Login/Auth Pages
- Centered on #FAFAFA, max-width 400px
- White card with 1px border, 6px radius, padding 32px
- "FixIt AI" 20px weight-500 centered
- "University of Delaware" 13px #6B7280 centered below
- 24px gap
- Input fields: 40px height, 1px border, 6px radius, 14px text
- Labels above inputs: 13px weight-500 #374151
- Submit button: same style as report page
- No social login buttons, no decorative elements

---

## THINGS TO REMOVE (Critical)
- [ ] ALL gradient backgrounds (linear-gradient, radial-gradient)
- [ ] ALL box shadows deeper than "0 1px 2px rgba(0,0,0,0.05)" on cards
- [ ] ALL rounded-xl, rounded-2xl, rounded-full (except small status dots)
- [ ] ALL emoji in the UI
- [ ] ALL colored hero sections or banners
- [ ] ALL uppercase button text
- [ ] ALL animation keyframes except subtle opacity/transform (150ms)
- [ ] ALL decorative icons that don't serve a function
- [ ] ALL "glass" or "blur" effects
- [ ] ALL colored card backgrounds (cards are always white)
- [ ] ALL multiple font weights (only use 400, 500, 600)

## THINGS TO ADD
- [ ] Skeleton loaders (pulsing gray rectangles) for loading states
- [ ] Subtle hover states on every interactive element (#F3F4F6)
- [ ] Proper focus states (2px #00539F outline)
- [ ] Empty states with simple gray text ("No reports yet")
- [ ] Breadcrumb navigation on detail pages
- [ ] "Last updated 2m ago" timestamps in #9CA3AF

---

## Execution Order
1. Update globals.css with the design tokens above (CSS variables)
2. Update app/layout.tsx to set base styles
3. Redesign login/auth pages
4. Redesign student report page + all report components
5. Redesign manager dashboard + all manager components
6. Redesign technician view + all technician components
7. Run `npm run build` to verify
8. Run `npm run dev` and visually check each page

Do NOT skip any step. Do NOT add any styling not specified in this document. When in doubt, make it MORE minimal, not less.