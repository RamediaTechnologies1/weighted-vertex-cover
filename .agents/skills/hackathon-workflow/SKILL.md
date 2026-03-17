---
name: hackathon-workflow
description: >
  Hackathon development workflow and priorities. Use when: making architecture decisions,
  prioritizing features, or deciding between quick-and-dirty vs proper implementation.
  Biases toward speed, demo-ability, and impact over perfection.
---

# Hackathon Workflow

## Priority Order

1. **Working demo** > perfect code
2. **Visual impact** > backend completeness  
3. **Happy path** > error handling
4. **Core feature** > nice-to-haves
5. **One great feature** > three half-built ones

## Decision Framework

When choosing between approaches, ask:
- "Can I demo this in 60 seconds?" → Pick the approach that demos better
- "Will the judges see this?" → If no, skip or fake it
- "Does this block other work?" → If yes, do the minimum viable version now

## Speed Tactics

- **Mock data** is fine for demos — hardcode example data rather than building full CRUD
- **Use shadcn** for any UI component before building custom
- **Copy patterns** from CLAUDE.md rather than inventing architecture
- **Skip tests** — this is a hackathon
- **Use `gpt-4o-mini`** for non-critical AI calls (cheaper, faster)
- **Commit often** — small commits, even if messy

## Demo Preparation Checklist

- [ ] App starts without errors on `npm run dev`
- [ ] Core feature works end-to-end (camera → AI analysis → result)
- [ ] Map shows at least one real data point
- [ ] UI looks polished on a projected screen (dark theme helps)
- [ ] Have backup data/screenshots in case live demo fails
- [ ] Clear the console of warnings before presenting

## What to Fake vs Build

| Feature | Build It | Fake It |
|---------|----------|---------|
| Camera → AI analysis | ✅ Core feature | |
| Map with pins | ✅ Shows well | |
| Chat assistant | ✅ Interactive demo | |
| Email notifications | | ✅ Show Resend dashboard |
| User authentication | | ✅ Hardcode a user |
| Database | | ✅ In-memory / Zustand |
| Real-time sync | | ✅ Demo on one device |
| Deployment | Nice if time | Skip if tight |
