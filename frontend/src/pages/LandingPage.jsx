import { Link } from "react-router-dom";
import { useAuthStore } from "../store/tripStore";

const features = [
  {
    icon: "🗺️",
    title: "Route Planning",
    desc: "Truck-aware routing via OpenRouteService. Fuel stops every 1,000 mi inserted automatically.",
  },
  {
    icon: "⏱️",
    title: "HOS Compliance",
    desc: "11-hr driving, 14-hr window, 30-min break, and 34-hr restart — all enforced automatically.",
  },
  {
    icon: "📋",
    title: "ELD Log Sheets",
    desc: "One SVG log per day, rendered at FMCSA proportions. Print-ready PDF export included.",
  },
];

const trust = [
  "70-hr/8-day cycle engine",
  "FMCSA §395.3 compliant",
  "PDF export ready",
  "Save your trip history",
];

export default function LandingPage() {
  const token = useAuthStore((s) => s.token);
  const planHref = token ? "/plan" : "/login";

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-content mx-auto px-4 sm:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid place-items-center w-8 h-8 rounded-md bg-primary text-sm">🚛</span>
            <span className="font-display text-lg font-semibold">
              Truck<span className="text-primary">Log</span> Pro
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login" className="btn-ghost !min-h-0 py-1.5 text-[13px]">
              {token ? "Dashboard" : "Sign In"}
            </Link>
            <Link to={planHref} className="btn-primary !min-h-0 py-1.5 text-[13px]">
              Plan My Trip
            </Link>
          </div>
        </div>
      </header>

      <section className="border-b border-border">
        <div className="max-w-content mx-auto px-4 sm:px-8 py-16 sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-50 border border-primary-100 text-primary px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.08em] font-mono mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            FMCSA-Compliant ELD Logs
          </span>

          <h1 className="font-display font-semibold tracking-[-0.03em] text-[clamp(40px,6vw,64px)] leading-[1.08] text-text-primary max-w-[640px]">
            Plan your trip.
            <br />
            Drive <span className="italic text-primary">compliant.</span>
          </h1>

          <p className="mt-6 text-lg leading-[1.55] text-text-muted max-w-[520px]">
            Enter your route and cycle hours. Get a fully calculated stop schedule and
            FMCSA-ready daily log sheets in seconds.
          </p>

          <div className="mt-8 flex items-center gap-3 flex-wrap">
            <Link to={planHref} className="btn-primary text-[15px] px-6">
              Plan My Trip →
            </Link>
            <Link to={planHref} className="btn-ghost text-[15px]">
              See a Sample Log
            </Link>
          </div>

          <div className="mt-12 flex items-center gap-x-8 gap-y-2 flex-wrap">
            {trust.map((t) => (
              <div key={t} className="flex items-center gap-2 text-[13px] text-text-muted">
                <span className="text-success">✓</span>
                <span>{t}</span>
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-surface border border-border rounded-lg shadow-sm p-5 transition-all duration-short hover:shadow-md hover:border-border-strong"
              >
                <div className="w-10 h-10 rounded-md bg-primary-50 grid place-items-center text-xl mb-3">
                  {f.icon}
                </div>
                <div className="font-semibold text-sm text-text-primary mb-1">{f.title}</div>
                <p className="text-[13px] leading-[1.5] text-text-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="mt-auto py-8 text-center text-[13px] text-text-faint">
        TruckLog Pro · Industrial Precision · Built for the driver at the wheel.
      </footer>
    </div>
  );
}
