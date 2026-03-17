#!/bin/bash
# Install recommended agent skills for this project
# Run this once: bash setup-skills.sh

echo "📦 Installing Vercel Labs Next.js skills..."
npx skills add vercel-labs/next-skills --skill next-best-practices -y

echo ""
echo "📦 Installing Vercel React best practices..."
npx skills add vercel-labs/agent-skills --skill vercel-react-best-practices -y

echo ""
echo "📦 Installing Vercel web design guidelines..."
npx skills add vercel-labs/agent-skills --skill web-design-guidelines -y

echo ""
echo "📦 Installing Vercel composition patterns..."
npx skills add vercel-labs/agent-skills --skill vercel-composition-patterns -y

echo ""
echo "📦 Installing find-skills (skill discovery)..."
npx skills add vercel-labs/skills --skill find-skills -y

echo ""
echo "✅ All skills installed! Restart Claude Code to pick them up."
echo ""
echo "💡 To discover more skills: npx skills find <query>"
echo "💡 Browse all skills at: https://skills.sh"
