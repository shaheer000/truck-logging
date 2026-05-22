import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useTripStore } from "../store/tripStore";
import LogSheetCanvas from "../components/logs/LogSheetCanvas";

export default function LogSheetViewer() {
  const navigate = useNavigate();
  const tripData = useTripStore((s) => s.tripData);
  const [active, setActive] = useState(0);
  const [exporting, setExporting] = useState(false);
  const sheetRef = useRef(null);

  const sheets = tripData?.log_sheets || [];

  if (!tripData || sheets.length === 0) {
    return (
      <div className="max-w-content mx-auto px-8 py-16 text-center">
        <p className="text-text-muted mb-4">No log sheets available.</p>
        <button onClick={() => navigate("/plan")} className="btn-primary mx-auto">
          Plan a Trip
        </button>
      </div>
    );
  }

  async function downloadPDF() {
    setExporting(true);
    try {
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      // Render each sheet off the active ref by temporarily mounting it.
      for (let i = 0; i < sheets.length; i++) {
        setActive(i);
        await new Promise((r) => setTimeout(r, 250));
        const canvas = await html2canvas(sheetRef.current, { scale: 2, backgroundColor: "#fff" });
        const img = canvas.toDataURL("image/png");
        const ratio = canvas.height / canvas.width;
        const w = pageW - 40;
        const h = w * ratio;
        if (i > 0) pdf.addPage();
        pdf.addImage(img, "PNG", 20, 20, w, h);
      }
      pdf.save("trucklog-daily-logs.pdf");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="max-w-content mx-auto px-4 sm:px-8 py-6">
      <div className="day-tab-bar flex items-center gap-1 border-b border-border mb-4 overflow-x-auto">
        {sheets.map((s, i) => (
          <button
            key={s.day_number}
            onClick={() => setActive(i)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              i === active
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text-primary"
            }`}
          >
            Day {s.day_number}
          </button>
        ))}
      </div>

      <LogSheetCanvas ref={sheetRef} sheet={sheets[active]} />

      <div className="day-navigation flex items-center justify-between mt-4">
        <button
          onClick={() => setActive((a) => Math.max(0, a - 1))}
          disabled={active === 0}
          className="btn-ghost"
        >
          ← Prev Day
        </button>
        <span className="font-mono text-sm text-text-muted">
          Day {active + 1} of {sheets.length}
        </span>
        <button
          onClick={() => setActive((a) => Math.min(sheets.length - 1, a + 1))}
          disabled={active === sheets.length - 1}
          className="btn-ghost"
        >
          Next Day →
        </button>
      </div>

      <div className="export-bar flex items-center justify-center gap-3 mt-6">
        <button onClick={() => window.print()} className="btn-ghost">
          🖨 Print All Logs
        </button>
        <button onClick={downloadPDF} disabled={exporting} className="btn-accent">
          {exporting ? "Exporting…" : "⬇ Download PDF"}
        </button>
      </div>

      {/* Hidden full set for clean printing (one per page). */}
      <div className="hidden print:block">
        {sheets.map((s) => (
          <LogSheetCanvas key={s.day_number} sheet={s} />
        ))}
      </div>
    </div>
  );
}
