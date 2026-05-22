import { metaFor, fmtTime } from "../../lib/stopMeta";

function StopCard({ stop, last }) {
  const meta = metaFor(stop.type);
  const isRest = stop.type.startsWith("rest");
  return (
    <li className="relative pl-2">
      {!last && (
        <span className="absolute left-[27px] top-12 bottom-[-12px] w-0.5 bg-border" />
      )}
      <div
        className="card !p-4 flex gap-3"
        style={{ borderLeft: `3px solid ${meta.color}` }}
      >
        <div
          className="shrink-0 w-9 h-9 rounded-full grid place-items-center text-lg"
          style={{ background: `${meta.color}22` }}
        >
          {meta.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="overline">
              #{stop.sequence} · {meta.label}
            </span>
            {isRest && (
              <span className="rounded-full bg-accent-100 text-accent-600 text-[11px] font-semibold px-2 py-0.5">
                Rest required
              </span>
            )}
          </div>
          <p className="font-medium text-text-primary truncate">{stop.name}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-[12px]">
            <span className="font-mono rounded-full bg-surface-2 px-2 py-0.5">
              {fmtTime(stop.arrival)} – {fmtTime(stop.departure)}
            </span>
            <span className="font-mono rounded-full bg-surface-2 px-2 py-0.5">
              {stop.duration_hrs}h
            </span>
            <span className="font-mono rounded-full bg-surface-2 px-2 py-0.5">
              {Math.round(stop.miles_from_prev)} mi
            </span>
          </div>
          <p className="mt-1 text-[13px] text-text-muted">{stop.activity}</p>
        </div>
      </div>
    </li>
  );
}

export default function StopTimeline({ stops }) {
  return (
    <div>
      <h2 className="font-display text-xl font-semibold mb-3">Stop-by-Stop</h2>
      <ul className="space-y-3">
        {stops.map((s, i) => (
          <StopCard key={s.sequence} stop={s} last={i === stops.length - 1} />
        ))}
      </ul>
    </div>
  );
}
