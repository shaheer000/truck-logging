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
  off_duty: 235,
  sleeper_berth: 275,
  driving: 315,
  on_duty_not_driving: 355,
};
const ROW_ORDER = ["off_duty", "sleeper_berth", "driving", "on_duty_not_driving"];
const GRID_TOP = 215;
const GRID_BOTTOM = 375;

// Reserved vertical space for the rotated remark labels under the grid.
const REMARKS_BAND = 95;
const REMARKS_BOTTOM = GRID_BOTTOM + REMARKS_BAND; // 470

// The shipping table starts below the rotated remarks band.
const SHIP_TOP = REMARKS_BOTTOM + 20; // 490
const SHIP_ROW_H = 14;
const SHIP_MAX_ROWS = 10;

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
        <text key={`hl${hour}`} x={x} y={208} fontSize="9" fill="#374151"
          textAnchor="middle" fontFamily="Geist Mono">{label}</text>
      );
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

// Compact rotated remark labels under the grid. We deduplicate adjacent
// segments that share a label so consecutive same-status pieces don't pile
// the same text on top of itself, and we cap label length to fit the band.
function Remarks({ events }) {
  const labels = [];
  let lastKey = null;
  events.forEach((ev, i) => {
    const key = `${ev.location}|${ev.remarks}`;
    if (key === lastKey) return;
    lastKey = key;
    const x = timeToX(ev.start_time);
    const locShort = ev.location.split(",")[0];
    const text = `${locShort} — ${ev.remarks}`;
    labels.push({ x, text: text.length > 28 ? text.slice(0, 26) + "…" : text, i });
  });
  return (
    <g>
      {labels.map(({ x, text, i }) => (
        <g key={i}>
          <line x1={x} y1={GRID_BOTTOM} x2={x} y2={GRID_BOTTOM + 8}
            stroke="#374151" strokeWidth={1} />
          <text x={x} y={GRID_BOTTOM + 14} fontSize="7.5" fill="#374151"
            fontFamily="Geist" transform={`rotate(-50, ${x}, ${GRID_BOTTOM + 14})`}>
            {text}
          </text>
        </g>
      ))}
    </g>
  );
}

function Totals({ totals, recap, yTop }) {
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
    <g fontFamily="Geist" transform={`translate(0, ${yTop})`}>
      <text x={GRID_LEFT} y={10} fontSize="11" fontWeight="600" fill="#111827">
        Hours Recap
      </text>
      {rows.map(([label, val], i) => (
        <g key={label}>
          <text x={GRID_LEFT} y={30 + i * 20} fontSize="10" fill="#374151">{label}</text>
          <text x={300} y={30 + i * 20} fontSize="10" fill="#111827"
            fontFamily="Geist Mono" textAnchor="end">{fmtHours(val)}</text>
        </g>
      ))}
      <line x1={GRID_LEFT} y1={118} x2={300} y2={118} stroke="#374151" strokeWidth={1} />
      <text x={GRID_LEFT} y={135} fontSize="11" fontWeight="600" fill="#111827">TOTAL</text>
      <text x={300} y={135} fontSize="11" fontWeight="600" fill="#111827"
        fontFamily="Geist Mono" textAnchor="end">{fmtHours(sum)}</text>

      <g transform="translate(420, 0)">
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

function HeaderFields({ sheet }) {
  const h = sheet.header || {};
  const carrier = h.carrier || "TruckLog Pro";
  const labeled = (x, y, label, value, w = 150, mono = false) => (
    <g key={`${label}-${x}-${y}`}>
      <text x={x} y={y} fontSize="9" fill="#374151" fontFamily="Geist">{label}</text>
      <text x={x + 70} y={y} fontSize="10" fill="#111827"
        fontFamily={mono ? "Geist Mono" : "Geist"}>
        {value || ""}
      </text>
      <line x1={x + 68} y1={y + 3} x2={x + 68 + w} y2={y + 3}
        stroke="#9ca3af" strokeWidth={0.6} />
    </g>
  );
  return (
    <g>
      <g fontFamily="Geist" fontSize="10" fill="#374151">
        {labeled(GRID_LEFT, 110, "Total Miles:", String(Math.round(sheet.total_miles)), 80, true)}
        {labeled(GRID_LEFT + 260, 110, "Carrier:", carrier, 220)}
        {labeled(GRID_LEFT + 600, 110, "Vehicle #:", h.truck_number || "", 90, true)}
      </g>
      <g fontFamily="Geist" fontSize="10" fill="#374151">
        {labeled(GRID_LEFT, 134, "Driver:", h.driver_name || "", 180)}
        {labeled(GRID_LEFT + 260, 134, "Co-Driver:", h.co_driver || "", 180)}
        {labeled(GRID_LEFT + 600, 134, "Plate #:", h.license_plate || "", 90, true)}
      </g>
      <g fontFamily="Geist" fontSize="10" fill="#374151">
        {labeled(GRID_LEFT, 158, "Trailer #:", h.trailer_number || "", 110, true)}
        {labeled(GRID_LEFT + 260, 158, "BOL #:", h.bol_number || "", 180, true)}
        {labeled(GRID_LEFT + 600, 158, "Shipper:", h.shipper || "", 140)}
      </g>
      <g fontFamily="Geist" fontSize="10" fill="#374151">
        {labeled(GRID_LEFT, 182, "Commodity:", h.commodity || "", 160)}
        {labeled(GRID_LEFT + 260, 182, "Main Office:", h.main_office_address || "", 200)}
        {labeled(GRID_LEFT + 600, 182, "Home Term.:", h.home_terminal_address || "", 140)}
      </g>
    </g>
  );
}

// Keep only meaningful entries and de-duplicate adjacent rows that share
// location+remark (e.g., several DRIVING slices toward the same destination).
function buildShippingRows(events) {
  const rows = [];
  const skip = (e) =>
    e.status === "off_duty" &&
    (e.remarks === "Off duty" || (/Off duty/i.test(e.remarks) && !/break/i.test(e.remarks)));
  let last = null;
  for (const e of events || []) {
    if (skip(e)) continue;
    const key = `${e.location}|${e.remarks}`;
    if (last && key === last.key) {
      last.end_time = e.end_time;
      continue;
    }
    last = { key, start_time: e.start_time, end_time: e.end_time,
             location: e.location, remarks: e.remarks };
    rows.push(last);
  }
  return rows;
}

function ShippingRemarks({ sheet, yTop }) {
  const rows = buildShippingRows(sheet.events).slice(0, SHIP_MAX_ROWS);
  return (
    <g fontFamily="Geist" transform={`translate(0, ${yTop})`}>
      <text x={GRID_LEFT} y={0} fontSize="11" fontWeight="600" fill="#111827">
        Remarks &amp; Shipping Record
      </text>
      <line x1={GRID_LEFT} y1={8} x2={GRID_RIGHT} y2={8}
        stroke="#374151" strokeWidth={0.8} />
      <text x={GRID_LEFT} y={20} fontSize="9" fill="#6b7280">Start</text>
      <text x={GRID_LEFT + 60} y={20} fontSize="9" fill="#6b7280">End</text>
      <text x={GRID_LEFT + 120} y={20} fontSize="9" fill="#6b7280">Location</text>
      <text x={GRID_LEFT + 430} y={20} fontSize="9" fill="#6b7280">Activity</text>
      <line x1={GRID_LEFT} y1={24} x2={GRID_RIGHT} y2={24}
        stroke="#e5e7eb" strokeWidth={0.5} />
      {rows.map((ev, i) => {
        const y = 36 + i * SHIP_ROW_H;
        const loc = ev.location.length > 42 ? ev.location.slice(0, 40) + "…" : ev.location;
        const rem = ev.remarks.length > 36 ? ev.remarks.slice(0, 34) + "…" : ev.remarks;
        return (
          <g key={i}>
            <text x={GRID_LEFT} y={y} fontSize="9" fontFamily="Geist Mono" fill="#111827">
              {ev.start_time}
            </text>
            <text x={GRID_LEFT + 60} y={y} fontSize="9" fontFamily="Geist Mono" fill="#111827">
              {ev.end_time}
            </text>
            <text x={GRID_LEFT + 120} y={y} fontSize="9" fill="#111827">{loc}</text>
            <text x={GRID_LEFT + 430} y={y} fontSize="9" fill="#374151">{rem}</text>
          </g>
        );
      })}
    </g>
  );
}

const LogSheetCanvas = forwardRef(function LogSheetCanvas({ sheet }, ref) {
  if (!sheet) return null;

  const shippingTop = SHIP_TOP;
  const shippingRowCount = Math.min(buildShippingRows(sheet.events).length, SHIP_MAX_ROWS);
  const shippingHeight = 36 + shippingRowCount * SHIP_ROW_H + 10;
  const totalsTop = shippingTop + shippingHeight + 16;
  const totalsHeight = 150;
  const signatureTop = totalsTop + totalsHeight + 20;
  const viewBoxHeight = signatureTop + 50;

  return (
    <div ref={ref} className="log-sheet-canvas bg-white rounded-xl border border-border p-4">
      <svg viewBox={`0 0 900 ${viewBoxHeight}`} width="100%" style={{ background: "#fff" }}>
        <text x={GRID_LEFT} y={48} fontSize="22" fontWeight="600" fill="#111827"
          fontFamily="Fraunces">Driver's Daily Log</text>
        <text x={GRID_RIGHT} y={48} fontSize="12" fill="#374151" textAnchor="end"
          fontFamily="Geist Mono">Day {sheet.day_number} · {sheet.date}</text>
        <text x={GRID_RIGHT} y={64} fontSize="9" fill="#6b7280" textAnchor="end"
          fontFamily="Geist">(24 hours)</text>
        <line x1={GRID_LEFT} y1={80} x2={GRID_RIGHT} y2={80}
          stroke="#d1d5db" strokeWidth={1} />

        <HeaderFields sheet={sheet} />
        <line x1={GRID_LEFT} y1={196} x2={GRID_RIGHT} y2={196}
          stroke="#d1d5db" strokeWidth={1} />

        <GridBackground />
        <StatusLines events={sheet.events} />
        <Remarks events={sheet.events} />

        <ShippingRemarks sheet={sheet} yTop={shippingTop} />
        <Totals totals={sheet.totals} recap={sheet.recap} yTop={totalsTop} />

        <g fontFamily="Geist" transform={`translate(0, ${signatureTop})`}>
          <text x={GRID_LEFT} y={0} fontSize="9" fill="#6b7280">Driver's signature</text>
          <line x1={GRID_LEFT} y1={20} x2={GRID_LEFT + 240} y2={20}
            stroke="#374151" strokeWidth={0.8} />
          <text x={GRID_LEFT + 320} y={0} fontSize="9" fill="#6b7280">Date</text>
          <line x1={GRID_LEFT + 320} y1={20} x2={GRID_LEFT + 460} y2={20}
            stroke="#374151" strokeWidth={0.8} />
          <text x={GRID_LEFT + 320} y={16} fontSize="10" fontFamily="Geist Mono"
            fill="#111827">{sheet.date}</text>
        </g>
      </svg>
    </div>
  );
});

export default LogSheetCanvas;
