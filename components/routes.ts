export interface RouteInfo {
  destination: string;
  // Add other properties if you have them (e.g., origin, fare, etc.)
}

// Define all your routes here
const ROUTES: RouteInfo[] = [
  { destination: "Digos" },
  // Add your other routes here in the future
];

// Only these routes are shown to users.
const ACTIVE_DESTINATIONS_LIST = ["Digos"];

export const ACTIVE_ROUTES: RouteInfo[] = ROUTES.filter((r) =>
  ACTIVE_DESTINATIONS_LIST.includes(r.destination)
);

export const ACTIVE_DESTINATIONS = [
  "All",
  ...ACTIVE_ROUTES.map((r) => r.destination),
];