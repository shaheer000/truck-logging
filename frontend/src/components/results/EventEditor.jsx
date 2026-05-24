import { useEffect, useState } from "react";
import { HOS_LABELS, HOS_COLORS } from "../../lib/stopMeta";
import { useTripStore } from "../../store/tripStore";

const STATUS_OPTIONS = ["off_duty", "sleeper_berth", "driving", "on_duty_not_driving"];

const PRESET_REMARKS = [
  "Pre-trip inspection",
  "Post-trip inspection",
  "Pickup - loading freight",
  "Dropoff - unloading freight",
  "Fuel stop",
  "30-min rest break (8-hr driving rule)",
  "Off duty - break",
  "Sleeper berth rest",
  "Meal break",
  "Personal conveyance",
];

function timeToMin(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// Deep-clone the sheet array we get from tripData so edits stay isolated
// until the user explicitly saves.
function cloneSheets(sheets) {
  return (sheets || []).map((s) => ({
    ...s,
    events: (s.events || []).map((e) => ({ ...e })),
  }));
}

function EventRow({ event, onChange, onDelete }) {
  return (
    <div className="grid grid-cols-12 gap-2 items-center py-2 border-b border-border last:border-0">
      <div className="col-span-3">
        <select
          value={event.status}
          onChange={(e) => onChange({ ...event, status: e.target.value })}
          className="input !py-1.5 text-sm w-full"
          style={{ borderLeft: `4px solid ${HOS_COLORS[event.status]}` }}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{HOS_LABELS[s]}</option>
          ))}
        </select>
      </div>
      <div className="col-span-1">
        <input
          type="time"
          value={event.start_time}
          onChange={(e) => onChange({ ...event, start_time: e.target.value })}
          className="input !py-1.5 text-sm w-full font-mono"
        />
      </div>
      <div className="col-span-1">
        <input
          type="time"
          value={event.end_time === "23:59" ? "23:59" : event.end_time}
          onChange={(e) => onChange({ ...event, end_time: e.target.value })}
          className="input !py-1.5 text-sm w-full font-mono"
        />
      </div>
      <div className="col-span-3">
        <input
          type="text"
          value={event.location || ""}
          placeholder="Location"
          onChange={(e) => onChange({ ...event, location: e.target.value })}
          className="input !py-1.5 text-sm w-full"
        />
      </div>
      <div className="col-span-3">
        <input
          type="text"
          value={event.remarks || ""}
          placeholder="Remarks"
          list="preset-remarks"
          onChange={(e) => onChange({ ...event, remarks: e.target.value })}
          className="input !py-1.5 text-sm w-full"
        />
      </div>
      <div className="col-span-1 text-right">
        <button
          type="button"
          onClick={onDelete}
          className="text-text-muted hover:text-red-600 text-lg leading-none"
          aria-label="Delete event"
          title="Delete event"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export default function EventEditor() {
  const tripData = useTripStore((s) => s.tripData);
  const saveEditedSheets = useTripStore((s) => s.saveEditedSheets);
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState(() => cloneSheets(tripData?.log_sheets));
  const [activeDay, setActiveDay] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [dirty, setDirty] = useState(false);

  // If trip changes underneath us (e.g., after a save), reset the draft.
  useEffect(() => {
    setDraft(cloneSheets(tripData?.log_sheets));
    setDirty(false);
  }, [tripData?.trip_id, tripData?.log_sheets]);

  if (!tripData?.log_sheets?.length) return null;

  const day = draft[activeDay];

  function updateEvent(idx, next) {
    const newDraft = [...draft];
    const events = [...newDraft[activeDay].events];
    events[idx] = next;
    newDraft[activeDay] = { ...newDraft[activeDay], events };
    setDraft(newDraft);
    setDirty(true);
  }

  function deleteEvent(idx) {
    const newDraft = [...draft];
    const events = newDraft[activeDay].events.filter((_, i) => i !== idx);
    newDraft[activeDay] = { ...newDraft[activeDay], events };
    setDraft(newDraft);
    setDirty(true);
  }

  function addEvent() {
    const newDraft = [...draft];
    const events = [...newDraft[activeDay].events];
    const last = events[events.length - 1];
    const startTime = last ? last.end_time : "12:00";
    events.push({
      status: "on_duty_not_driving",
      start_time: startTime === "23:59" ? "23:00" : startTime,
      end_time: "23:59",
      location: last?.location || "",
      remarks: "",
    });
    newDraft[activeDay] = { ...newDraft[activeDay], events };
    setDraft(newDraft);
    setDirty(true);
  }

  function sortAndValidate(events) {
    const sorted = [...events].sort(
      (a, b) => timeToMin(a.start_time) - timeToMin(b.start_time)
    );
    for (const ev of sorted) {
      if (timeToMin(ev.end_time) <= timeToMin(ev.start_time) && ev.end_time !== "23:59") {
        return { error: `Event "${ev.remarks || ev.status}" has end ≤ start (${ev.start_time}–${ev.end_time}).` };
      }
    }
    return { events: sorted };
  }

  async function handleSave() {
    setError(null);
    const cleaned = draft.map((s) => {
      const v = sortAndValidate(s.events);
      return { ...s, events: v.events || s.events, _err: v.error };
    });
    const firstErr = cleaned.find((s) => s._err);
    if (firstErr) {
      setError(firstErr._err);
      return;
    }
    setSaving(true);
    try {
      await saveEditedSheets(cleaned.map(({ _err, ...rest }) => rest));
      setDirty(false);
    } catch (e) {
      setError(e.response?.data?.detail || "Could not save your edits.");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setDraft(cloneSheets(tripData?.log_sheets));
    setDirty(false);
    setError(null);
  }

  return (
    <div className="card rounded-xl">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between text-left"
      >
        <div>
          <h3 className="font-display text-lg font-semibold">Edit Log Events</h3>
          <p className="text-sm text-text-muted">
            Add, edit, or remove activities. Logs regenerate on save.
          </p>
        </div>
        <span className="text-text-muted text-xl">{expanded ? "−" : "+"}</span>
      </button>

      {expanded && (
        <div className="mt-4 space-y-3">
          <datalist id="preset-remarks">
            {PRESET_REMARKS.map((r) => <option key={r} value={r} />)}
          </datalist>

          <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
            {draft.map((s, i) => (
              <button
                key={s.day_number}
                onClick={() => setActiveDay(i)}
                className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px ${
                  i === activeDay
                    ? "border-primary text-primary"
                    : "border-transparent text-text-muted hover:text-text-primary"
                }`}
              >
                Day {s.day_number}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold text-text-muted uppercase tracking-wide px-1">
            <div className="col-span-3">Status</div>
            <div className="col-span-1">Start</div>
            <div className="col-span-1">End</div>
            <div className="col-span-3">Location</div>
            <div className="col-span-3">Remarks</div>
            <div className="col-span-1"></div>
          </div>

          <div className="max-h-[420px] overflow-y-auto pr-1">
            {day?.events?.map((ev, idx) => (
              <EventRow
                key={idx}
                event={ev}
                onChange={(next) => updateEvent(idx, next)}
                onDelete={() => deleteEvent(idx)}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <button onClick={addEvent} className="btn-ghost text-sm">
              + Add Event
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                disabled={!dirty || saving}
                className="btn-ghost text-sm"
              >
                Reset
              </button>
              <button
                onClick={handleSave}
                disabled={!dirty || saving}
                className="btn-primary text-sm"
              >
                {saving ? "Saving…" : "Save & Recompute"}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
              {error}
            </div>
          )}
          {dirty && !error && (
            <p className="text-xs text-text-muted">
              You have unsaved edits — they won't show in the printed log until you save.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
