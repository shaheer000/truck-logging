import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTripStore } from "../store/tripStore";
import LocationSearchBox from "../components/wizard/LocationSearchBox";
import MiniMapPreview from "../components/wizard/MiniMapPreview";
import CycleGauge from "../components/wizard/CycleGauge";
import ProcessingOverlay from "../components/wizard/ProcessingOverlay";

const STEP_LABELS = ["Current", "Pickup", "Dropoff", "Cycle Hours"];

function ProgressBar({ step }) {
  return (
    <ol className="flex items-center gap-2 mb-8">
      {STEP_LABELS.map((label, i) => {
        const n = i + 1;
        const active = n === step;
        const complete = n < step;
        return (
          <li key={label} className="flex-1" aria-current={active ? "step" : undefined}>
            <div
              className={`h-1.5 rounded-full transition-colors duration-medium ${
                complete || active ? "bg-primary" : "bg-surface-3"
              }`}
            />
            <span
              className={`mt-2 block text-[11px] font-medium ${
                active ? "text-primary" : "text-text-muted"
              }`}
            >
              {n}. {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default function TripInputWizard() {
  const navigate = useNavigate();
  const {
    inputs,
    currentStep,
    setLocation,
    setCycleHours,
    nextStep,
    prevStep,
    submitTrip,
    error,
  } = useTripStore();
  const [processing, setProcessing] = useState(false);

  const canAdvance =
    (currentStep === 1 && inputs.current) ||
    (currentStep === 2 && inputs.pickup) ||
    (currentStep === 3 && inputs.dropoff) ||
    currentStep === 4;

  async function handleSubmit() {
    setProcessing(true);
    try {
      await submitTrip();
      // Give the step checklist a beat to finish animating.
      setTimeout(() => navigate("/results"), 1200);
    } catch {
      /* error rendered inside the overlay */
    }
  }

  const used = inputs.cycleUsedHours;

  return (
    <div className="wizard-page max-w-2xl mx-auto px-4 sm:px-8 py-10">
      {processing && (
        <ProcessingOverlay
          error={error}
          onRetry={() => {
            setProcessing(false);
          }}
        />
      )}

      <ProgressBar step={currentStep} />

      <div className="card rounded-xl">
        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="font-display text-2xl font-semibold">Where are you now?</h2>
            <LocationSearchBox
              label="Current location"
              value={inputs.current}
              onSelect={(loc) => setLocation("current", loc)}
              showGeolocate
              autoFocus
            />
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="font-display text-2xl font-semibold">Pickup location</h2>
            <LocationSearchBox
              label="Where are you picking up freight?"
              value={inputs.pickup}
              onSelect={(loc) => setLocation("pickup", loc)}
              autoFocus
            />
            <MiniMapPreview location={inputs.pickup} />
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4">
            <h2 className="font-display text-2xl font-semibold">Dropoff location</h2>
            <LocationSearchBox
              label="Where are you delivering?"
              value={inputs.dropoff}
              onSelect={(loc) => setLocation("dropoff", loc)}
              autoFocus
            />
            <MiniMapPreview location={inputs.dropoff} />
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6">
            <h2 className="font-display text-2xl font-semibold">
              Cycle hours used
            </h2>
            <p className="text-sm text-text-muted">
              Hours already used in your rolling 70-hr / 8-day cycle.
            </p>
            <CycleGauge used={used} />
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="70"
                step="0.5"
                value={used}
                onChange={(e) => setCycleHours(parseFloat(e.target.value))}
                className="flex-1 accent-primary"
                aria-label="Cycle hours used"
              />
              <input
                type="number"
                min="0"
                max="70"
                step="0.5"
                value={used}
                onChange={(e) =>
                  setCycleHours(Math.min(70, Math.max(0, parseFloat(e.target.value) || 0)))
                }
                className="input w-24 font-mono"
                aria-label="Cycle hours number"
              />
            </div>
            {used > 60 && (
              <div className="rounded-md bg-accent-100 border border-accent text-accent-600 px-4 py-3 text-sm">
                ⚠ Only {(70 - used).toFixed(1)} hours remain in your cycle. A
                34-hour restart may be needed during this trip.
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-8">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className="btn-ghost"
          >
            ← Back
          </button>
          {currentStep < 4 ? (
            <button onClick={nextStep} disabled={!canAdvance} className="btn-primary">
              Next →
            </button>
          ) : (
            <button onClick={handleSubmit} className="btn-accent">
              Calculate Trip ▶
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
