import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ── Day colors (duplicated here to avoid circular import) ─────────────────────
const DAY_COLORS = [
  "#f5a623", "#4caf7d", "#5b8cff", "#e05555",
  "#b57bee", "#f0c040", "#00bcd4", "#ff7043"
];
const getDayColor = (day) => DAY_COLORS[(day - 1) % DAY_COLORS.length];

// ── Auto-fit bounds when routes change ───────────────────────────────────────
function MapController({ routes }) {
  const map = useMap();
  useEffect(() => {
    const allPoints = Object.values(routes).flatMap(r => r.polyline);
    if (allPoints.length > 1) {
      map.fitBounds(allPoints, { padding: [40, 40] });
    }
  }, [routes, map]);
  return null;
}

// ── Custom pin icon per day color ────────────────────────────────────────────
const makeIcon = (color) => L.divIcon({
  className: "",
  html: `<div style="
    width:28px;height:28px;
    border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    background:${color};
    border:2px solid rgba(255,255,255,0.4);
    box-shadow:0 2px 6px rgba(0,0,0,0.5);
  "></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -30],
});

// ── Map ───────────────────────────────────────────────────────────────────────
function Map({ routes, stops }) {
  return (
    <MapContainer
      center={[39.5, -98.35]}
      zoom={4}
      style={{ width: "100%", height: "100%" }}
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution="© OpenStreetMap © CARTO"
      />

      <MapController routes={routes} />

      {/* One polyline per day, each colored by day */}
      {Object.entries(routes).map(([day, { polyline, color }]) =>
        polyline.length > 1 && (
          <Polyline
            key={day}
            positions={polyline}
            color={color}
            weight={3}
            opacity={0.9}
          />
        )
      )}

      {/* Stop markers with popup info */}
      {stops.map((stop) => (
        <Marker
          key={stop.id}
          position={[stop.lat, stop.lon]}
          icon={makeIcon(getDayColor(stop.day))}
        >
          <Popup>
            <div style={{ fontFamily: "Barlow, sans-serif", minWidth: "160px" }}>
              <strong style={{ fontSize: "13px" }}>
                {stop.name.split(",")[0]}
              </strong>
              <br />
              <span style={{ fontSize: "11px", color: "#aaa" }}>
                {stop.name.split(",").slice(1, 3).join(",")}
              </span>
              <br />
              <span style={{ fontSize: "11px", color: "#aaa" }}>
                Day {stop.day} &middot; {stop.lat.toFixed(4)}, {stop.lon.toFixed(4)}
              </span>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

export default Map;
