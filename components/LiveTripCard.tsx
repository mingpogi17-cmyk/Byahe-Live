import { Bus, Car, Check, Clock, MapPin, Users } from "lucide-react";
import { LiveTrip, seatStatus } from "./types";

function timeAgoLabel(seconds: number): string {
  if (seconds < 60) return "just now";
  const mins = Math.round(seconds / 60);
  return `${mins} min ago`;
}

const seatStyles = {
  plenty: "text-route border-route/30 bg-route/5",
  few: "text-alert border-alert/30 bg-alert/5",
  full: "text-ink/40 border-line bg-ink/5",
};

interface LiveTripCardProps {
  trip: LiveTrip;
  isConfirmedByMe: boolean;
  onConfirm: (tripId: string) => void;
}

export default function LiveTripCard({
  trip,
  isConfirmedByMe,
  onConfirm,
}: LiveTripCardProps) {
  const status = seatStatus(trip.seatsLeft, trip.seatsTotal);
  const VehicleIcon = trip.vehicleType === "Bus" ? Bus : Car;

  return (
    <li className="flex flex-col gap-2.5 border border-line bg-white px-4 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <VehicleIcon className="h-4 w-4 shrink-0 text-ink/50" />
          <span className="truncate font-mono text-[15px] font-semibold uppercase tracking-board text-ink">
            {trip.origin}
            <span className="mx-1.5 text-ink/30">→</span>
            {trip.destination}
          </span>
        </div>
        {trip.isEnRoute && (
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-signal/15 px-2 py-0.5 text-xs font-semibold text-ink">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-signal" />
            </span>
            LIVE
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span
          className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono font-medium ${seatStyles[status]}`}
        >
          <Users className="h-3.5 w-3.5" />
          {trip.seatsLeft}/{trip.seatsTotal} seats
        </span>
        <span className="inline-flex items-center gap-1 font-mono text-ink/60">
          <Clock className="h-3.5 w-3.5" />
          {trip.isEnRoute
            ? trip.etaMinutes !== undefined
              ? `~${trip.etaMinutes} min away`
              : "en route"
            : trip.minutesToDeparture <= 0
              ? "leaving now"
              : `leaves in ${trip.minutesToDeparture} min`}
        </span>
        <span className="ml-auto font-mono font-semibold text-ink">
          ₱{trip.fare}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-line pt-2 text-xs text-ink/50">
        <span className="flex min-w-0 items-center gap-1">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            Last seen at {trip.currentShed} · {timeAgoLabel(trip.reportedSecondsAgo)}
          </span>
        </span>
        <button
          type="button"
          onClick={() => !isConfirmedByMe && onConfirm(trip.id)}
          disabled={isConfirmedByMe}
          className={`flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 font-medium transition-colors ${
            isConfirmedByMe
              ? "border-route/30 bg-route/10 text-route"
              : "border-line text-ink/60 hover:border-route/40 hover:text-route"
          }`}
        >
          <Check className="h-3.5 w-3.5" />
          {isConfirmedByMe ? "Nakumpirma" : "Nakita ko rin"} (
          {trip.verifiedByPassengers})
        </button>
      </div>
    </li>
  );
}