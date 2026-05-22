// Single source of truth for stop type presentation across timeline, map, logs.
export const STOP_META = {
  current: { label: "Current Location", icon: "🟢", color: "#22C55E" },
  pickup: { label: "Pickup", icon: "📦", color: "#2563EB" },
  dropoff: { label: "Dropoff", icon: "🏁", color: "#EF4444" },
  fuel: { label: "Fuel Stop", icon: "⛽", color: "#F59E0B" },
  rest_30min: { label: "30-Min Break", icon: "☕", color: "#94A3B8" },
  rest_10hr: { label: "10-Hr Rest", icon: "😴", color: "#818CF8" },
  rest_34hr: { label: "34-Hr Restart", icon: "🛌", color: "#818CF8" },
  unknown: { label: "Stop", icon: "📍", color: "#6B7280" },
};

export const HOS_COLORS = {
  off_duty: "#94A3B8",
  sleeper_berth: "#818CF8",
  driving: "#22C55E",
  on_duty_not_driving: "#F59E0B",
};

export const HOS_LABELS = {
  off_duty: "Off Duty",
  sleeper_berth: "Sleeper Berth",
  driving: "Driving",
  on_duty_not_driving: "On Duty (ND)",
};

export function metaFor(type) {
  return STOP_META[type] || STOP_META.unknown;
}

export function fmtTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function fmtHours(h) {
  if (h == null) return "0:00";
  const hours = Math.floor(h);
  const mins = Math.round((h - hours) * 60);
  return `${hours}:${String(mins).padStart(2, "0")}`;
}
