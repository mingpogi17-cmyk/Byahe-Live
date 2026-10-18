import { MessageSquareText, WifiOff } from "lucide-react";

// Placeholder shortcode — wire up to the real Biyahe Live SMS gateway
// number before shipping. The SMS body is a fixed, parseable format
// so a backend gateway (or even a human dispatcher) can read it:
// "LIVE <origin> <destination> <seats>"
const SMS_GATEWAY_NUMBER = "+639171234567";
const SMS_BODY_TEMPLATE = "LIVE ";

export default function ConnectionBanner() {
  return (
    <div className="border-b border-alert/20 bg-alert/5 px-4 py-2.5">
      <div className="flex items-center gap-2.5">
        <WifiOff className="h-4 w-4 shrink-0 text-alert" />
        <p className="min-w-0 flex-1 text-xs leading-snug text-ink/70">
          No signal detected. Trip updates may be delayed until you're back
          in coverage.
        </p>
        <a
          href={`sms:${SMS_GATEWAY_NUMBER}?body=${encodeURIComponent(
            SMS_BODY_TEMPLATE,
          )}`}
          className="flex shrink-0 items-center gap-1 rounded border border-alert/30 bg-white px-2.5 py-1 text-xs font-semibold text-alert active:bg-alert/10"
        >
          <MessageSquareText className="h-3.5 w-3.5" />
          Report via SMS
        </a>
      </div>
    </div>
  );
}
