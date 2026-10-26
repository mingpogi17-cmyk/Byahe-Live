// lib/constants.ts
export const FARE_RATES = {
  jeepney: { base: 14, baseKm: 4, perKm: 2.0, name: "Traditional Jeepney" },
  modernJeep: { base: 17, baseKm: 4, perKm: 2.4, name: "Modern Jeepney" },
  provincialBus: { base: 12, baseKm: 5, perKm: 2.2, name: "Provincial Bus" },
  cityBusOrdinary: { base: 15, baseKm: 5, perKm: 2.49, name: "City Bus (Ordinary)" },
  cityBusAircon: { base: 18, baseKm: 5, perKm: 2.97, name: "City Bus (Aircon)" },
  uvExpress: { base: 0, baseKm: 0, perKm: 2.6, name: "UV Express" },
  motor: { base: 10, baseKm: 2, perKm: 1.5, name: "Motor (Habal-habal)" },
  tricycle: { base: 15, baseKm: 2, perKm: 3.0, name: "Tricycle" },
} as const;

// 🚨 DAVAO DEL SUR SHEDS (May mga bago)
export const SHEDS = [
  { id: "digos", name: "Digos City", lat: 6.7497, lng: 125.3572 },
  { id: "sta.cruz", name: "Sta. Cruz", lat: 6.8342, lng: 125.4149 },
  { id: "bansalan", name: "Bansalan", lat: 6.78611, lng: 125.21333 },
  { id: "hagonoy", name: "Hagonoy", lat: 6.6892, lng: 125.3256 },
  { id: "magsaysay", name: "Magsaysay", lat: 6.7667, lng: 125.1833 },
  { id: "matanao", name: "Matanao", lat: 6.7092, lng: 125.2178 },
  { id: "padada", name: "Padada", lat: 6.6413, lng: 125.3451 },
  { id: "sulop", name: "Sulop", lat: 6.6, lng: 125.35 },
  { id: "malalag", name: "Malalag", lat: 6.6, lng: 125.4 },
  { id: "kiblawan", name: "Kiblawan", lat: 6.61417, lng: 125.23667 },
  // Mga Bago
  { id: "kapatagan", name: "Kapatagan", lat: 6.9290, lng: 125.3415 },
  { id: "balutakay", name: "Balutakay", lat: 6.8973, lng: 125.2656 },
  { id: "sinaragan", name: "Sinaragan", lat: 6.7092, lng: 125.2178 },
  { id: "kinuskusan", name: "Kinuskusan", lat: 6.7667, lng: 125.1833 },
  { id: "toril", name: "Toril", lat: 7.0153, lng: 125.4922 },
  { id: "ecoland", name: "Ecoland", lat: 7.0550, lng: 125.5950 },
] as const;

export type VehicleType = "Van" | "Bus" | "Taxi" | "Tricycle" | "Motor" | "MiniBus";
export type TripStatus = "Available" | "Standing" | "Full";

export interface TripData {
  tripId: string;
  status: TripStatus;
  location: { lat: number; lng: number };
  seatsAvailable?: number;
  fare?: number;
  isOutOfService?: boolean;
  isEmergency?: boolean;
  isGcashEnabled?: boolean;
  vehicleType?: VehicleType;
  isAircon?: boolean;
  plateNumber?: string;
  speed?: number;
  updatedAt: number;
  reports?: { correct: number; wrong: number };
  isVerified?: boolean;
}

export interface CommunityAlert {
  id: string;
  type: string;
  timestamp: number;
  expiresAt?: number;
}

// 🚨 ITO YUNG NAWALA KANINA, IBINALIK NATIN
export interface Shed {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export const STORAGE_KEYS = {
  points: "biyahe_points",
  dailyPoints: "biyahe_daily_points",
  dailyDate: "biyahe_daily_date",
  onboarded: "biyahe_onboarded",
  favoriteShed: "favorite_shed",
  userId: "biyahe_user_id",
  lastReportTime: "biyahe_last_report_time",
} as const;

export const COOLDOWNS = {
  communityReportMs: 10 * 60 * 1000, 
  dailyPointCap: 50,
  waitingPingTtlMs: 5 * 60 * 1000, 
  alertTtlMs: 5 * 60 * 1000,
  alarmDefaultMs: 10 * 60 * 1000,
} as const;