import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTripHistory, getTripById } from "../api/tripApi";
import { useTripStore } from "../store/tripStore";

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [opening, setOpening] = useState(null);

  useEffect(() => {
    let active = true;
    getTripHistory(true)
      .then((data) => active && setTrips(data))
      .catch(() => active && setError("Could not load your trip history."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  async function open(tripId) {
    setOpening(tripId);
    try {
      const data = await getTripById(tripId);
      useTripStore.setState({ tripData: data });
      navigate("/results");
    } catch {
      setError("Could not open that trip.");
    } finally {
      setOpening(null);
    }
  }

  return (
    <div className="max-w-content mx-auto px-4 sm:px-8 py-8">
      <div className="mb-6">
        <p className="overline">Driver Dashboard</p>
        <h1 className="font-display text-3xl font-semibold">Confirmed Trips</h1>
        <p className="text-sm text-text-muted mt-1">
          Only trips you've confirmed appear here. Calculate a trip and confirm it on the
          results page to add it to your history.
        </p>
      </div>

      {loading && <p className="text-text-muted">Loading…</p>}
      {error && (
        <div className="rounded-md bg-error/10 border border-error text-error px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && trips.length === 0 && (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">🗂️</div>
          <p className="text-text-secondary font-medium">No confirmed trips yet.</p>
          <button onClick={() => navigate("/plan")} className="btn-primary mx-auto mt-4">
            Plan a Trip
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {trips.map((t) => (
          <button
            key={t.trip_id}
            onClick={() => open(t.trip_id)}
            disabled={opening === t.trip_id}
            className="card text-left hover:shadow-md hover:border-border-strong transition-all duration-short disabled:opacity-60"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 text-success px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-success" /> Confirmed
              </span>
              <span className="text-[12px] text-text-muted font-mono">{fmtDate(t.created_at)}</span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-text-faint">From</span>
                <span className="font-medium text-text-primary truncate">
                  {t.pickup_address}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-text-faint">To</span>
                <span className="font-medium text-text-primary truncate">
                  {t.dropoff_address}
                </span>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
              <span className="font-mono rounded-full bg-surface-2 px-2 py-0.5">
                {Math.round(t.total_distance_miles)} mi
              </span>
              <span className="font-mono rounded-full bg-surface-2 px-2 py-0.5">
                {t.total_trip_hours} hrs
              </span>
              <span className="font-mono rounded-full bg-surface-2 px-2 py-0.5">
                {t.days_required} {t.days_required === 1 ? "day" : "days"}
              </span>
            </div>
            <p className="mt-3 text-[13px] text-primary font-medium">
              {opening === t.trip_id ? "Opening…" : "View trip & logs →"}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
