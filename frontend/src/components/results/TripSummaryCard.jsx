function StatBadge({ label, value, unit }) {
  return (
    <div className="rounded-md bg-surface-2 px-4 py-3">
      <div className="overline">{label}</div>
      <div className="font-mono text-xl font-semibold text-text-primary">
        {value}
        {unit && <span className="text-sm text-text-muted ml-1">{unit}</span>}
      </div>
    </div>
  );
}

export default function TripSummaryCard({ summary }) {
  if (!summary) return null;
  const remaining = summary.hours_remaining_in_cycle;
  const pct = Math.max(0, Math.min(100, (remaining / 70) * 100));

  return (
    <div className="card rounded-xl">
      <h2 className="font-display text-xl font-semibold mb-4">Trip Summary</h2>
      <div className="grid grid-cols-2 gap-3">
        <StatBadge label="Distance" value={Math.round(summary.total_distance_miles)} unit="mi" />
        <StatBadge label="Duration" value={summary.total_trip_hours} unit="hrs" />
        <StatBadge label="Days" value={summary.days_required} />
        <StatBadge label="Cycle After" value={summary.cycle_hours_after} unit="hrs" />
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-[13px] mb-1">
          <span className="text-text-muted">Cycle hours remaining</span>
          <span className="font-mono font-medium">{remaining} / 70</span>
        </div>
        <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
          <div
            className="h-full rounded-full bg-success transition-all duration-medium"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
