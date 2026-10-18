import { RadioTower } from "lucide-react";

export default function EmptyState({ destination }: { destination: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
      <RadioTower className="h-8 w-8 text-ink/25" />
      <p className="text-sm font-medium text-ink/70">
        No one's broadcasting to {destination} right now
      </p>
      <p className="max-w-[26ch] text-xs text-ink/45">
        Waiting at a shed? Tap "I'm the first passenger" once you board to
        start the live trip for everyone behind you.
      </p>
    </div>
  );
}
