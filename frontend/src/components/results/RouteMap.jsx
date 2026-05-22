import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import "../../lib/leafletIconFix";
import { metaFor, fmtTime, STOP_META } from "../../lib/stopMeta";

function stopIcon(stop) {
  const meta = metaFor(stop.type);
  return L.divIcon({
    className: "",
    html: `<div style="
      width:32px;height:32px;border-radius:9999px;
      background:${meta.color};color:#fff;
      display:grid;place-items:center;font-size:14px;font-weight:600;
      border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4);
    ">${stop.sequence}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function FitBounds({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords.length > 0) {
      map.fitBounds(coords, { padding: [40, 40] });
    }
  }, [coords, map]);
  return null;
}

function Legend() {
  const items = ["current", "pickup", "dropoff", "fuel", "rest_30min", "rest_10hr"];
  return (
    <div className="absolute bottom-3 left-3 z-[500] bg-surface/95 backdrop-blur border border-border rounded-lg shadow-md p-3 text-[12px] space-y-1">
      {items.map((t) => (
        <div key={t} className="flex items-center gap-2">
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{ background: STOP_META[t].color }}
          />
          <span className="text-text-secondary">{STOP_META[t].label}</span>
        </div>
      ))}
    </div>
  );
}

export default function RouteMap({ geometry, stops }) {
  // GeoJSON LineString is [lon, lat]; Leaflet wants [lat, lon].
  const line = (geometry?.coordinates || []).map(([lon, lat]) => [lat, lon]);
  const center = stops.length ? [stops[0].lat, stops[0].lon] : [39.5, -98.35];

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={center}
        zoom={6}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {line.length > 1 && (
          <Polyline positions={line} pathOptions={{ color: "#2563EB", weight: 4 }} />
        )}
        {stops.map((s) => (
          <Marker key={s.sequence} position={[s.lat, s.lon]} icon={stopIcon(s)}>
            <Popup>
              <div className="text-sm">
                <strong>
                  #{s.sequence} {metaFor(s.type).label}
                </strong>
                <br />
                {s.name}
                <br />
                <span className="font-mono">
                  {fmtTime(s.arrival)} – {fmtTime(s.departure)} · {s.duration_hrs}h
                </span>
                <br />
                {s.activity}
              </div>
            </Popup>
          </Marker>
        ))}
        <FitBounds coords={line.length ? line : stops.map((s) => [s.lat, s.lon])} />
      </MapContainer>
      <Legend />
    </div>
  );
}
