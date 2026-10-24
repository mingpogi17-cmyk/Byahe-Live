// lib/geo.ts
import { FARE_RATES, VehicleType } from "./constants";

export const getDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const computeFare = (
  distanceKm: number,
  vehicleType: VehicleType | string,
  isAircon: boolean,
  discounted = false
): number => {
  // 🚨 DITO ANG FIX: Sinabi natin na pwedeng kahit anong rate mula sa FARE_RATES ang gamitin
  let rate: { base: number; baseKm: number; perKm: number; name: string } = FARE_RATES.uvExpress;
  
  if (vehicleType === "Bus") rate = isAircon ? FARE_RATES.cityBusAircon : FARE_RATES.provincialBus;
  else if (vehicleType === "Tricycle") rate = FARE_RATES.jeepney;
  else if (vehicleType === "Taxi") rate = FARE_RATES.cityBusOrdinary;
  else if (vehicleType === "Van") rate = FARE_RATES.uvExpress;
  else if (vehicleType === "Motor") rate = FARE_RATES.motor;

  let baseFare = rate.base;
  let perKm = rate.perKm;
  
  if (discounted) {
    baseFare *= 0.8;
    perKm *= 0.8;
  }

  if (distanceKm <= rate.baseKm) return baseFare;
  return baseFare + (distanceKm - rate.baseKm) * perKm;
};

// BAGONG FEATURE: ETA Estimation
export const estimateEtaMinutes = (
  distanceKm: number,
  speedKmh?: number
): number | null => {
  if (!isFinite(distanceKm) || distanceKm < 0) return null;
  // Default sa 25 km/h kung walang speed na binigay si driver
  const speed = speedKmh && speedKmh > 3 ? speedKmh : 25; 
  return Math.max(1, Math.round((distanceKm / speed) * 60));
};

export const formatEta = (mins: number | null): string => {
  if (mins === null) return "—";
  if (mins < 1) return "<1 min";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
};