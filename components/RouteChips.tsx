"use client";

interface RouteChipsProps {
  destinations: string[];
  active: string;
  onSelect: (destination: string) => void;
}

export default function RouteChips({
  destinations,
  active,
  onSelect,
}: RouteChipsProps) {
  return (
    <div
      className="flex gap-2 overflow-x-auto px-4 pb-3 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label="Filter by destination"
    >
      {destinations.map((dest) => {
        const isActive = dest === active;
        return (
          <button
            key={dest}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(dest)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? "border-route bg-route text-paper"
                : "border-line bg-white text-ink/70 hover:border-route/40"
            }`}
          >
            {dest}
          </button>
        );
      })}
    </div>
  );
}
