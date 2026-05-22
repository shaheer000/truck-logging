import { forwardRef } from "react";
import { HOS_LABELS, fmtHours } from "../../lib/stopMeta";

// Darkened HOS hues, scoped to the printed log sheet only (the on-screen
// timeline/map keep the FMCSA contract colors from stopMeta). Each is one
// step deeper than the spec color for stronger contrast on white paper.
const LOG_HOS_COLORS = {
  off_duty: "#475569", // slate-600
  sleeper_berth: "#4F46E5", // indigo-600
  driving: "#15803D", // green-700
  on_duty_not_driving: "#B45309", // amber-700
};

// Coordinate system per PRODUCT_DESIGN.md Section 7.
const GRID_LEFT = 80;
const GRID_RIGHT = 860;
const GRID_WIDTH = GRID_RIGHT - GRID_LEFT; // 780
const ROW_Y = {
  off_duty: 175,
  sleeper_berth: 215,
  driving: 255,
  on_duty_not_driving: 295,
};
const ROW_ORDER = ["off_duty", "sleeper_berth", "driving", "on_duty_not_driving"];
const GRID_TOP = 155;
const GRID_BOTTOM = 315;

function timeToX(t) {
  const [h, m] = t.split(":").map(Number);
  const totalMin = h * 60 + m;
  return GRID_LEFT + (totalMin / 1440) * GRID_WIDTH;
}

function GridBackground() {
  const lines = [];
  for (let hour = 0; hour <= 24; hour++) {
    const x = GRID_LEFT + (hour / 24) * GRID_WIDTH;
    lines.push(
      <line key={`h${hour}`} x1={x} y1={GRID_TOP} x2={x} y2={GRID_BOTTOM}
        stroke="#374151" strokeWidth={hour % 6 === 0 ? 1 : 0.6} />
    );
    if (hour < 24) {
      const label = hour === 0 ? "M" : hour === 12 ? "N" : hour % 12 || 12;
      lines.push(
        <text key={`hl${hour}`} x={x} y={148} fontSize="9" fill="#374151"
          textAnchor="middle" fontFamily="Geist Mono">{label}</text>
      );
      // 15-min ticks
      for (let q = 1; q < 4; q++) {
        const qx = x + (q / 4) * (GRID_WIDTH / 24);
        lines.push(
          <line key={`q${hour}-${q}`} x1={qx} y1={GRID_TOP} x2={qx} y2={GRID_TOP + 6}
            stroke="#d1d5db" strokeWidth={0.5} />
        );
      }
    }
  }
  return (
    <g>
      <rect x={GRID_LEFT} y={GRID_TOP} width={GRID_WIDTH} height={GRID_BOTTOM - GRID_TOP}
        fill="none" stroke="#374151" strokeWidth={1.5} />
      {ROW_ORDER.map((status, i) => {
        const y = GRID_TOP + (i + 1) * 40;
        return (
          <g key={status}>
            {i < 3 && (
              <line x1={GRID_LEFT} y1={y} x2={GRID_RIGHT} y2={y}
                stroke="#d1d5db" strokeWidth={0.8} />
            )}
            <text x={GRID_LEFT - 6} y={ROW_Y[status] + 3} fontSize="9" fill="#1f2937"
              textAnchor="end" fontFamily="Geist">{HOS_LABELS[status]}</text>
          </g>
        );
      })}
      {lines}
    </g>
  );
}

function StatusLines({ events }) {
  const segments = [];
  events.forEach((ev, i) => {
    const x1 = timeToX(ev.start_time);
    const x2 = timeToX(ev.end_time);
    const y = ROW_Y[ev.status];
    segments.push(
      <line key={`s${i}`} x1={x1} y1={y} x2={x2} y2={y}
        stroke={LOG_HOS_COLORS[ev.status]} strokeWidth={3} strokeLinecap="round" />
    );
    if (i > 0) {
      const prevY = ROW_Y[events[i - 1].status];
      segments.push(
        <line key={`t${i}`} x1={x1} y1={prevY} x2={x1} y2={y}
          stroke="#374151" strokeWidth={1.5} />
      );
    }
  });
  return <g>{segments}</g>;
}

function Remarks({ events }) {
  return (
    <g>
      {events.map((ev, i) => {
        const x = timeToX(ev.start_time);
        const label = `${ev.location.split(",")[0]} — ${ev.remarks}`;
        return (
          <g key={i}>
            <line x1={x} y1={GRID_BOTTOM} x2={x} y2={GRID_BOTTOM + 10}
              stroke="#374151" strokeWidth={1} />
            <text x={x} y={GRID_BOTTOM + 15} fontSize="8" fill="#374151"
              fontFamily="Geist" transform={`rotate(-45, ${x}, ${GRID_BOTTOM + 15})`}>
              {label.length > 36 ? label.slice(0, 34) + "…" : label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function Totals({ totals, recap }) {
  const rows = [
    ["Off Duty", totals.off_duty_hrs],
    ["Sleeper Berth", totals.sleeper_berth_hrs],
    ["Driving", totals.driving_hrs],
    ["On Duty (ND)", totals.on_duty_not_driving_hrs],
  ];
  const sum =
    totals.off_duty_hrs + totals.sleeper_berth_hrs +
    totals.driving_hrs + totals.on_duty_not_driving_hrs;
  return (
    <g fontFamily="Geist">
      <text x={GRID_LEFT} y={470} fontSize="11" fontWeight="600" fill="#111827">
        Hours Recap
      </text>
      {rows.map(([label, val], i) => (
        <g key={label}>
          <text x={GRID_LEFT} y={490 + i * 20} fontSize="10" fill="#374151">{label}</text>
          <text x={300} y={490 + i * 20} fontSize="10" fill="#111827"
            fontFamily="Geist Mono" textAnchor="end">{fmtHours(val)}</text>
        </g>
      ))}
      <line x1={GRID_LEFT} y1={578} x2={300} y2={578} stroke="#374151" strokeWidth={1} />
      <text x={GRID_LEFT} y={595} fontSize="11" fontWeight="600" fill="#111827">TOTAL</text>
      <text x={300} y={595} fontSize="11" fontWeight="600" fill="#111827"
        fontFamily="Geist Mono" textAnchor="end">{fmtHours(sum)}</text>

      <g transform="translate(420, 460)">
        <text x={0} y={10} fontSize="11" fontWeight="600" fill="#111827">
          70-Hour / 8-Day Recap
        </text>
        <text x={0} y={32} fontSize="10" fill="#374151">On duty today</text>
        <text x={420} y={32} fontSize="10" fontFamily="Geist Mono" textAnchor="end"
          fill="#111827">{fmtHours(recap.on_duty_today)}</text>
        <text x={0} y={54} fontSize="10" fill="#374151">On duty last 7 days</text>
        <text x={420} y={54} fontSize="10" fontFamily="Geist Mono" textAnchor="end"
          fill="#111827">{fmtHours(recap.on_duty_last_7_days)}</text>
        <text x={0} y={76} fontSize="10" fill="#374151">Hours available (70 cap)</text>
        <text x={420} y={76} fontSize="10" fontFamily="Geist Mono" textAnchor="end"
          fill="#2563EB" fontWeight="600">{fmtHours(recap.hours_available_70cap)}</text>
      </g>
    </g>
  );
}

const LogSheetCanvas = forwardRef(function LogSheetCanvas({ sheet }, ref) {
  if (!sheet) return null;
  return (
    <div ref={ref} className="log-sheet-canvas bg-white rounded-xl border border-border p-4">
      <svg viewBox="0 0 900 620" width="100%" style={{ background: "#fff" }}>
        {/* Header */}
        <text x={GRID_LEFT} y={40} fontSize="22" fontWeight="600" fill="#111827"
          fontFamily="Fraunces">Driver's Daily Log</text>
        <text x={GRID_RIGHT} y={40} fontSize="12" fill="#374151" textAnchor="end"
          fontFamily="Geist Mono">Day {sheet.day_number} · {sheet.date}</text>
        <g fontFamily="Geist" fontSize="11" fill="#374151">
          <text x={GRID_LEFT} y={70}>Total Miles:
            <tspan fontFamily="Geist Mono" fill="#111827"> {Math.round(sheet.total_miles)}</tspan>
          </text>
          <text x={300} y={70}>Carrier:
            <tspan fill="#111827"> TruckLog Pro</tspan>
          </text>
          <text x={560} y={70}>Vehicle #:
            <tspan fontFamily="Geist Mono" fill="#111827"> ___</tspan>
          </text>
        </g>
        <line x1={GRID_LEFT} y1={90} x2={GRID_RIGHT} y2={90} stroke="#d1d5db" strokeWidth={1} />

        <GridBackground />
        <StatusLines events={sheet.events} />
        <Remarks events={sheet.events} />
        <Totals totals={sheet.totals} recap={sheet.recap} />
      </svg>
    </div>
  );
});

export default LogSheetCanvas;
