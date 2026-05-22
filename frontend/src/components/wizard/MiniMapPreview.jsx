import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import { useEffect } from "react";
import "../../lib/leafletIconFix";

function Recenter({ lat, lon }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lon], 11);
  }, [lat, lon, map]);
  return null;
}

export default function MiniMapPreview({ location }) {
  if (!location) {
    return (
      <div className="h-[200px] rounded-md border border-border bg-surface-2 grid place-items-center text-sm text-text-muted">
        Select a location to preview it on the map.
      </div>
    );
  }
  return (
    <div className="h-[200px] rounded-md overflow-hidden border border-border">
      <MapContainer
        center={[location.lat, location.lon]}
        zoom={11}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[location.lat, location.lon]} />
        <Recenter lat={location.lat} lon={location.lon} />
      </MapContainer>
    </div>
  );
}
