import { useEffect, useState } from "react";

const STEPS = [
  "Fetching road distance",
  "Applying HOS rules (70hr/8-day)",
  "Scheduling rest breaks",
  "Planning fuel stops",
  "Generating ELD log sheets",
];

export default function ProcessingOverlay({ error, onRetry }) {
  const [done, setDone] = useState(0);

  useEffect(() => {
    if (error) return;
    if (done >= STEPS.length) return;
    const t = setTimeout(() => setDone((d) => d + 1), 450);
    return () => clearTimeout(t);
  }, [done, error]);

  return (
    <div className="fixed inset-0 z-[2000] bg-bg/90 backdrop-blur grid place-items-center px-4">
      <div className="card max-w-md w-full text-center">
        {!error ? (
          <>
            <div className="text-4xl mb-4 animate-pulse">🚛</div>
            <h2 className="font-display text-2xl font-semibold mb-6">
              Calculating your route…
            </h2>
            <ul className="text-left space-y-3">
              {STEPS.map((s, i) => {
                const complete = i < done;
                return (
                  <li key={s} className="flex items-center gap-3 text-sm">
                    <span
                      className={`grid place-items-center w-5 h-5 rounded-full text-[11px] transition-transform duration-medium ${
                        complete
                          ? "bg-success text-white scale-100"
                          : "bg-surface-3 text-text-faint scale-90"
                      }`}
                    >
                      {complete ? "✓" : ""}
                    </span>
                    <span className={complete ? "text-text-primary" : "text-text-muted"}>
                      {s}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <>
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="font-display text-2xl font-semibold mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-text-muted mb-6">{error}</p>
            <button onClick={onRetry} className="btn-primary mx-auto">
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
