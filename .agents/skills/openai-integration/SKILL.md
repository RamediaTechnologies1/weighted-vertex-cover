---
name: openai-integration
description: >
  OpenAI SDK v6 patterns for Next.js: chat completions, vision analysis, streaming.
  Use when: building AI features, creating API routes for OpenAI, handling image analysis,
  or implementing chat interfaces. Don't use for: non-AI features.
---

# OpenAI Integration (SDK v6 + Next.js)

## Setup

```ts
// lib/openai.ts
import OpenAI from 'openai'

export const openai = new OpenAI()
// Automatically reads OPENAI_API_KEY from process.env
```

**CRITICAL**: Only import in Server Components or API routes. NEVER in `"use client"` files.

## Chat Completion (API Route)

```ts
// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { openai } from '@/lib/openai'

export async function POST(req: NextRequest) {
  const { messages } = await req.json()
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    max_tokens: 1024,
  })

  return NextResponse.json({
    message: response.choices[0].message.content
  })
}
```

## Vision / Image Analysis

```ts
// app/api/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { openai } from '@/lib/openai'

export async function POST(req: NextRequest) {
  const { image, prompt } = await req.json()

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt || 'Describe what you see in this image.' },
        {
          type: 'image_url',
          image_url: { url: `data:image/jpeg;base64,${image}` }
        }
      ]
    }],
    max_tokens: 500,
  })

  return NextResponse.json({
    analysis: response.choices[0].message.content
  })
}
```

## Streaming Response

```ts
// app/api/chat/route.ts (streaming variant)
import { NextRequest } from 'next/server'
import { openai } from '@/lib/openai'

export async function POST(req: NextRequest) {
  const { messages } = await req.json()

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    stream: true,
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || ''
        controller.enqueue(encoder.encode(text))
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
```

## Client-Side Usage

```tsx
"use client"

// Chat
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages: [{ role: 'user', content: userMessage }] }),
})
const data = await response.json()

// Vision (from camera frame)
const canvas = document.createElement('canvas')
canvas.width = video.videoWidth
canvas.height = video.videoHeight
canvas.getContext('2d')!.drawImage(video, 0, 0)
const base64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1]

const response = await fetch('/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ image: base64, prompt: 'Analyze this for defects.' }),
})
```

## Error Handling

Always wrap API calls:
```ts
try {
  const response = await openai.chat.completions.create({ ... })
  return NextResponse.json({ result: response.choices[0].message.content })
} catch (error) {
  console.error('OpenAI error:', error)
  return NextResponse.json({ error: 'AI analysis failed' }, { status: 500 })
}
```

## Cost Tips (Hackathon)

- Use `max_tokens` to limit response length
- Resize/compress images before sending to Vision (0.7 quality JPEG)
- Use `gpt-4o-mini` for simple tasks (cheaper, faster)
- Cache repeated analyses when possible
