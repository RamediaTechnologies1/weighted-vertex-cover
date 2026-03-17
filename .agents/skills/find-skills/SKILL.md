---
name: find-skills
description: >
  Discover and install agent skills from skills.sh when you need specialized capabilities. 
  Use when: the task might benefit from a community skill, user asks "find a skill for X", 
  or you need domain expertise not covered by existing skills.
  Don't use when: the task is simple enough to handle directly.
---

# Find Skills

Search and install skills from the open agent skills ecosystem at https://skills.sh

## Commands

```bash
npx skills find [query]    # Search for skills
npx skills add <package>   # Install a skill
npx skills check           # Check for updates
npx skills update          # Update all skills
```

## Install Syntax

```bash
# From a specific repo
npx skills add vercel-labs/agent-skills --skill vercel-react-best-practices

# Install globally with auto-confirm
npx skills add <owner/repo@skill> -g -y
```

## Common Skill Sources

- `vercel-labs/agent-skills` — React, Next.js, deployment, UI review
- `vercel-labs/next-skills` — Next.js specific patterns and best practices
- `wshobson/agents` — Tailwind v4 design system
- `ComposioHQ/awesome-claude-skills` — Community skills collection

Browse all at: https://skills.sh
