import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTripStore } from "../store/tripStore";
import TripSummaryCard from "../components/results/TripSummaryCard";
import StopTimeline from "../components/results/StopTimeline";
import RouteMap from "../components/results/RouteMap";
import EventEditor from "../components/results/EventEditor";

export default function ResultsPage() {
  const navigate = useNavigate();
  const tripData = useTripStore((s) => s.tripData);
  const confirmCurrentTrip = useTripStore((s) => s.confirmCurrentTrip);
  const [confirming, setConfirming] = useState(false);

  const confirmed = tripData?.status === "confirmed";

  async function handleConfirm() {
    setConfirming(true);
    try {
      await confirmCurrentTrip();
    } finally {
      setConfirming(false);
    }
  }

  if (!tripData) {
    return (
      <div className="max-w-content mx-auto px-8 py-16 text-center">
        <p className="text-text-muted mb-4">No trip calculated yet.</p>
        <button onClick={() => navigate("/plan")} className="btn-primary mx-auto">
          Plan a Trip
        </button>
      </div>
    );
  }

  return (
    <div className="results-page max-w-content mx-auto px-4 sm:px-8 py-6">
      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="w-full lg:w-[380px] shrink-0 space-y-5">
          <TripSummaryCard summary={tripData.summary} />
          <StopTimeline stops={tripData.stops} />
          {confirmed ? (
            <div className="rounded-md bg-success/10 border border-success text-success px-4 py-3 text-sm font-medium flex items-center gap-2">
              ✓ Trip confirmed — saved to your history.
            </div>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="btn-primary w-full"
            >
              {confirming ? "Confirming…" : "✓ Confirm This Ride"}
            </button>
          )}
          <button onClick={() => navigate("/logs")} className="btn-accent w-full">
            📋 View Log Sheets
          </button>
        </aside>
        <section className="flex-1 space-y-5">
          <div className="min-h-[420px] lg:h-[calc(100vh-220px)] rounded-xl overflow-hidden border border-border">
            <RouteMap geometry={tripData.route_geometry} stops={tripData.stops} />
          </div>
          <EventEditor />
        </section>
      </div>
    </div>
  );
}
