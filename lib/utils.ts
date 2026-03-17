import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { UDEL_BUILDINGS } from "./constants"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findNearestBuilding(
  lat: number,
  lng: number,
  maxDistance: number = 200
): { building: string; distance: number } | null {
  let nearest: { building: string; distance: number } | null = null;

  for (const bldg of UDEL_BUILDINGS) {
    const dist = haversineDistance(lat, lng, bldg.lat, bldg.lng);
    if (!nearest || dist < nearest.distance) {
      nearest = { building: bldg.name, distance: dist };
    }
  }

  if (nearest && nearest.distance > maxDistance) {
    return null;
  }

  return nearest;
}

const BUILDING_ELEVATION: Record<string, { groundElevation: number; floorHeight: number; floors: string[] }> = {
  "Gore Hall": { groundElevation: 25, floorHeight: 4.2, floors: ["1", "2", "3"] },
  "Smith Hall": { groundElevation: 24, floorHeight: 4.2, floors: ["LL", "1", "2", "3"] },
};

export function guessFloor(altitude: number | undefined, building: string): string | null {
  if (altitude === undefined) return null;
  const data = BUILDING_ELEVATION[building];
  if (!data) return null;

  const heightAboveGround = altitude - data.groundElevation;
  const floorIndex = Math.round(heightAboveGround / data.floorHeight);
  const clamped = Math.max(0, Math.min(floorIndex, data.floors.length - 1));
  return data.floors[clamped];
}
