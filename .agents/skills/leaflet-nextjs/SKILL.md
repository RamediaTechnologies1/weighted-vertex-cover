---
name: leaflet-nextjs
description: >
  Leaflet + React-Leaflet in Next.js App Router. Use when: building map features,
  adding markers, tracking location, or displaying geographic data.
  CRITICAL: Leaflet requires dynamic import with ssr: false in Next.js.
---

# Leaflet + React-Leaflet in Next.js

## Critical: Dynamic Import Required

Leaflet accesses `window` on import — it WILL crash SSR. Always use dynamic import:

```tsx
// app/map/page.tsx
import dynamic from 'next/dynamic'

const MapView = dynamic(() => import('@/components/map-view'), {
  ssr: false,
  loading: () => <div className="h-[60vh] bg-zinc-900 animate-pulse rounded-xl" />,
})

export default function MapPage() {
  return <MapView />
}
```

## Map Component

```tsx
// components/map-view.tsx
"use client"

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default marker icon (common Leaflet + bundler issue)
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

export default function MapView() {
  return (
    <MapContainer
      center={[39.6837, -75.7497]}  // University of Delaware area
      zoom={13}
      className="h-[60vh] w-full rounded-xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[39.6837, -75.7497]}>
        <Popup>Inspection Point A</Popup>
      </Marker>
    </MapContainer>
  )
}
```

## User Location Tracking

```tsx
"use client"

import { useEffect, useState } from 'react'
import { useMap } from 'react-leaflet'

function LocationTracker() {
  const map = useMap()
  
  useEffect(() => {
    if (!navigator.geolocation) return
    
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        map.setView([latitude, longitude], map.getZoom())
      },
      (err) => console.error('Geolocation error:', err),
      { enableHighAccuracy: true }
    )
    
    return () => navigator.geolocation.clearWatch(watchId)
  }, [map])
  
  return null
}
```

## Custom Markers

```tsx
const customIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div class="size-4 rounded-full bg-emerald-500 border-2 border-white shadow-lg"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

<Marker position={[lat, lng]} icon={customIcon}>
  <Popup>Custom location</Popup>
</Marker>
```

## Common Gotchas

1. **Must use `{ ssr: false }`** — Leaflet crashes on server
2. **Must import CSS** — `import 'leaflet/dist/leaflet.css'`
3. **Default icons break** with bundlers — fix with `L.Icon.Default.mergeOptions`
4. **Container must have height** — set explicit height on MapContainer
5. **Map in tabs/hidden divs** — call `map.invalidateSize()` when shown
