import { useEffect, useRef, useState } from "react";
import { searchAddress, reverseGeocode } from "../../api/tripApi";

export default function LocationSearchBox({
  label,
  value,
  onSelect,
  showGeolocate = false,
  autoFocus = false,
}) {
  const [query, setQuery] = useState(value?.address || "");
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const boxRef = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function handleChange(e) {
    const q = e.target.value;
    setQuery(q);
    setOpen(true);
    clearTimeout(debounceRef.current);
    if (q.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        setSuggestions(await searchAddress(q));
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  function choose(s) {
    setQuery(s.address);
    setOpen(false);
    onSelect(s);
  }

  function geolocate() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const loc = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        setQuery(loc.address);
        onSelect(loc);
      } catch {
        /* fall back to manual entry */
      }
    });
  }

  return (
    <div ref={boxRef} className="relative">
      <label className="block text-[13px] font-medium text-text-secondary mb-2">
        {label}
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint">🔍</span>
          <input
            className="input pl-9"
            value={query}
            onChange={handleChange}
            onFocus={() => query && setOpen(true)}
            placeholder="Search for a city or address…"
            autoFocus={autoFocus}
            aria-label={label}
            autoComplete="off"
          />
        </div>
        {showGeolocate && (
          <button type="button" onClick={geolocate} className="btn-ghost whitespace-nowrap">
            📍 My Location
          </button>
        )}
      </div>

      {value && !open && (
        <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary-50 text-primary-700 px-3 py-1 text-sm">
          📍 <span className="truncate max-w-xs">{value.address}</span>
        </div>
      )}

      {open && (query.trim().length >= 3) && (
        <ul className="absolute z-50 mt-1 w-full bg-surface border border-border rounded-md shadow-lg overflow-hidden">
          {loading && <li className="px-4 py-3 text-sm text-text-muted">Searching…</li>}
          {!loading && suggestions.length === 0 && (
            <li className="px-4 py-3 text-sm text-text-muted">No matches found.</li>
          )}
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => choose(s)}
                className="w-full text-left px-4 py-3 text-sm hover:bg-surface-2 min-h-[44px]"
              >
                {s.address}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
