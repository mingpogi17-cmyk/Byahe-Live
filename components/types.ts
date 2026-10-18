export type SeatStatus = "plenty" | "few" | "full";

export interface LiveTrip {
  id: string;
  origin: string; // e.g. "Tagum Terminal"
  destination: string; // e.g. "Davao City (Ecoland)"
  vehicleType: "Van" | "Bus";
  plateOrUnit: string; // e.g. "Van 14" — kept anonymous, no personal names
  currentShed: string; // last reported checkpoint, e.g. "Sta. Cruz shed"
  seatsLeft: number;
  seatsTotal: number;
  minutesToDeparture: number; // 0 = already en route
  etaMinutes?: number; // rough estimated minutes remaining to destination
  fare: number;
  reportedSecondsAgo: number;
  verifiedByPassengers: number; // crowdsourced confirmation count
  isEnRoute: boolean; // true once it has left origin
}

export function seatStatus(left: number, total: number): SeatStatus {
  if (left <= 0) return "full";
  if (left / total <= 0.3) return "few";
  return "plenty";
}